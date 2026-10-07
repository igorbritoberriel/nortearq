-- Cartão: valor total sem entrada. Pix/boleto: entrada e saldo mensais.
-- Propostas aprovadas e contratos assinados não são reescritos pela migração.
alter table propostas add column if not exists cartao_valor_total boolean not null default false;
create or replace function responder_proposta(
  p_token text, p_acao text, p_comentario text, p_motivo text, p_ip text,
  p_parcelas integer, p_avista boolean, p_meio text
) returns uuid language plpgsql security definer set search_path = public as $$
declare p propostas%rowtype; v_id uuid; ativa boolean; minimo numeric;
begin
  p := proposta_do_link(p_token);
  select * into p from propostas where id = p.id for update;
  if p_acao = 'aprovar' then
    if p_meio is null or not p_meio = any(p.meios_pagamento) then raise exception 'meio_invalido'; end if;
    select cobranca_ativa into ativa from escritorios where id = p.escritorio_id;
    if p_meio <> 'pix' and not coalesce(ativa, false) then raise exception 'cobranca_desativada'; end if;
    if p_meio = 'cartao' and p_avista and round(p.valor_total * (1 - coalesce(p.desconto_avista_pct,0)/100),2) < 5 then
      raise exception 'cartao_minimo';
    end if;
    if p_meio = 'cartao' and not coalesce(p_avista,false) then
      if coalesce(p_parcelas, 1) > least(12,coalesce(p.parcelas_max,1)) or coalesce(p_parcelas,1) < 1 then raise exception 'cartao_maximo'; end if;
      select min((x->>'valor')::numeric) into minimo from jsonb_array_elements(
        case when p_meio = 'cartao' then gerar_parcelas(p.valor_total, 0, coalesce(p_parcelas,1))
             when p.modo_pagamento = 'parcelado' then gerar_parcelas(p.valor_total, p.entrada_pct, p_parcelas)
             when jsonb_array_length(p.parcelas) > 0 then p.parcelas
             else jsonb_build_array(jsonb_build_object('valor', p.valor_total)) end) x;
      if minimo < 5 then raise exception 'cartao_minimo'; end if;
    end if;
  end if;
  v_id := responder_proposta_v0043(p_token,p_acao,p_comentario,p_motivo,p_ip,p_parcelas,p_avista);
  if p_acao = 'aprovar' then
    update propostas set meio_escolhido = p_meio, cartao_valor_total = (p_meio = 'cartao'),
      parcelas = case when p_meio = 'cartao' and not coalesce(p_avista,false) then gerar_parcelas(p.valor_total,0,coalesce(p_parcelas,1)) else parcelas end,
      parcelas_escolhidas = case when p_meio = 'cartao' and not coalesce(p_avista,false) then coalesce(p_parcelas,1) else parcelas_escolhidas end
    where id = v_id;
  end if;
  return v_id;
end $$;
create or replace function renderizar_contrato(p_contrato uuid, p_nome text, p_documento text, p_endereco text, p_data date)
returns text language plpgsql stable security definer set search_path = public as $$
declare texto text; p propostas%rowtype; meio text;
begin
  texto := renderizar_contrato_v0043(p_contrato,p_nome,p_documento,p_endereco,p_data);
  select pr.* into p from propostas pr join contratos c on c.proposta_id = pr.id where c.id = p_contrato;
  if p.meio_escolhido is not null then
    meio := case p.meio_escolhido when 'cartao' then 'Cartão de crédito' when 'boleto' then 'Boleto' else 'Pix' end;
    texto := replace(texto, 'Pagamento por Pix ou transferência bancária.', '');
    texto := texto || E'\n\nCONDIÇÃO DE PAGAMENTO ESCOLHIDA\nForma: ' || meio || E'.\n';
    if p.meio_escolhido = 'cartao' and p.cartao_valor_total then
      texto := texto || 'O valor total aprovado é pago em uma única compra no cartão de crédito, na quantidade de parcelas escolhida. Não há entrada separada nem novo parcelamento de cada mensalidade.';
    elsif p.meio_escolhido = 'cartao' and p.modo_pagamento = 'parcelado' and not p.avista then
      texto := texto || 'A entrada, quando prevista, é paga separadamente. O saldo mensal é uma compra parcelada no cartão, na quantidade aprovada. Não há novo parcelamento de cada mensalidade.';
    elsif p.meio_escolhido = 'cartao' then
      texto := texto || 'As cobranças seguem os valores e vencimentos aprovados, sem parcelamento adicional de cada cobrança.';
    else
      texto := texto || 'Cada parcela é paga no seu vencimento, conforme os valores aprovados. Não há débito automático.';
    end if;
    texto := texto || E'\nAssinatura do contrato e confirmação do pagamento são etapas separadas.';
  end if;
  return texto;
end $$;
create or replace function resumo_pagamento_cliente(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c contratos%rowtype; p propostas%rowtype; ativa boolean; parcelas jsonb;
begin
  select ct.* into c from links_cliente l
    left join projetos pr on l.destino = 'projeto' and pr.id = l.referencia_id
    join contratos ct on ct.id = case when l.destino = 'contrato' then l.referencia_id else pr.contrato_id end
    where l.token = p_token and p_token ~ '^[0-9a-f]{32,128}$' and l.expira_em > now()
      and l.destino in ('contrato','projeto') and ct.cliente_id = l.cliente_id and ct.escritorio_id = l.escritorio_id;
  if not found or c.status = 'cancelado' then raise exception 'link_invalido'; end if;
  select * into p from propostas where id = c.proposta_id;
  select cobranca_ativa into ativa from escritorios where id = c.escritorio_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',pg.id,'descricao',pg.descricao,'valor',pg.valor,
    'vencimento',pg.vencimento,'pago_em',pg.pago_em,'link',pg.asaas_link,'status',pg.asaas_status,
    'parcelamento',pg.asaas_parcelamento_id) order by pg.ordem,pg.descricao), '[]') into parcelas
    from pagamentos pg where pg.contrato_id = c.id and (
      exists(select 1 from jsonb_array_elements(p.parcelas) x where x->>'descricao' = pg.descricao and (x->>'valor')::numeric = pg.valor)
      or (jsonb_array_length(p.parcelas) = 0 and pg.descricao = 'Valor total'));
  return jsonb_build_object('contrato_id',c.id,'status',c.status,'meio',p.meio_escolhido,
    'meios',case when ativa then p.meios_pagamento else array(select unnest(p.meios_pagamento) intersect select 'pix') end,
    'cobranca_ativa',ativa,'parcelas',parcelas,'condicoes',p.parcelas,'modo',p.modo_pagamento,'cartao_total',p.cartao_valor_total);
end $$;
create or replace function proposta_publica(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p propostas%rowtype; ativa boolean;
begin
  p := proposta_do_link(p_token);
  select cobranca_ativa into ativa from escritorios where id = p.escritorio_id;
  return proposta_publica_v0043(p_token) || jsonb_build_object(
    'meios_pagamento', case when ativa then p.meios_pagamento else array(select unnest(p.meios_pagamento) intersect select 'pix') end,
    'meio_escolhido', p.meio_escolhido,'cartao_valor_total',p.cartao_valor_total);
end $$;
create or replace function escolher_meio_contrato(p_token text, p_meio text) returns void
language plpgsql security definer set search_path = public as $$
declare info jsonb; c contratos%rowtype; p propostas%rowtype;
begin
  info := resumo_pagamento_cliente(p_token);
  select * into c from contratos where id = (info->>'contrato_id')::uuid for update;
  select * into p from propostas where id = c.proposta_id for update;
  if p.meio_escolhido is not null then
    if p.meio_escolhido = p_meio then return; end if;
    raise exception 'meio_ja_escolhido';
  end if;
  if c.status not in ('aguardando_assinatura','assinado') then raise exception 'contrato_fechado'; end if;
  if p_meio is null or not p_meio = any(p.meios_pagamento) then raise exception 'meio_invalido'; end if;
  if p_meio <> 'pix' and not (info->>'cobranca_ativa')::boolean then raise exception 'cobranca_desativada'; end if;
  if exists (select 1 from pagamentos where contrato_id = c.id and (asaas_cobranca_id is not null or pago_em is not null)) then
    raise exception 'cobranca_ja_existente';
  end if;
  if p_meio = 'cartao' and c.status = 'assinado' and (coalesce((select min((x->>'valor')::numeric) from jsonb_array_elements(p.parcelas) x),p.valor_total) < 5
      or (p.modo_pagamento = 'parcelado' and not p.avista and coalesce(p.parcelas_escolhidas, jsonb_array_length(p.parcelas)) > 12)) then
    raise exception 'cartao_limite';
  end if;
  if p_meio = 'cartao' and c.status = 'aguardando_assinatura' then
    if (p.avista and (select min((x->>'valor')::numeric) from jsonb_array_elements(p.parcelas) x) < 5) or coalesce(p.parcelas_escolhidas,1) > 12 or
       (select min((x->>'valor')::numeric) from jsonb_array_elements(gerar_parcelas(p.valor_total,0,coalesce(p.parcelas_escolhidas,1))) x) < 5 then
      raise exception 'cartao_limite';
    end if;
    update propostas set meio_escolhido=p_meio,cartao_valor_total=true,
      parcelas=case when p.avista then p.parcelas else gerar_parcelas(p.valor_total,0,coalesce(p.parcelas_escolhidas,1)) end
      where id=p.id;
  else
    update propostas set meio_escolhido = p_meio where id = p.id;
  end if;
end $$;
notify pgrst, 'reload schema';
