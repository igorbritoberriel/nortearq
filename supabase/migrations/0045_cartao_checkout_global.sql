-- Regra global: quantidade escolhida no Asaas, Pix/boleto mantêm condições do escritório.
alter table propostas add column if not exists cartao_no_asaas boolean not null default false;
alter table pagamentos add column if not exists asaas_checkout_id text;
create table if not exists cobranca_checkout_sessoes (
 id uuid primary key, pagamento_id uuid not null references pagamentos(id), escritorio_id uuid not null references escritorios(id),
 valor numeric not null check(valor>=5), asaas_id text unique, link text,
 estado text not null default 'SOLICITADO' check(estado in('SOLICITADO','ACTIVE','PAID','EXPIRED','CANCELED','RECUSADO')),
 criado_em timestamptz not null default now()
);
create unique index if not exists checkout_um_ativo on cobranca_checkout_sessoes(pagamento_id) where estado in('SOLICITADO','ACTIVE');
alter table cobranca_checkout_sessoes enable row level security;
revoke all on cobranca_checkout_sessoes from public,anon,authenticated;
grant all on cobranca_checkout_sessoes to service_role;
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
    if p_meio = 'cartao' and (p.valor_total < 5 or coalesce(p_avista,false) or p_parcelas is not null) then raise exception 'cartao_condicoes'; end if;
  end if;
  v_id := responder_proposta_v0043(p_token,p_acao,p_comentario,p_motivo,p_ip,case when p_meio='cartao' then 1 else p_parcelas end,p_avista);
  if p_acao = 'aprovar' then
    update propostas set meio_escolhido = p_meio, cartao_valor_total = (p_meio = 'cartao'), cartao_no_asaas = (p_meio = 'cartao'),
      parcelas = case when p_meio = 'cartao' and not coalesce(p_avista,false) then jsonb_build_array(jsonb_build_object('descricao','Valor total no cartão','valor',p.valor_total)) else parcelas end,
      parcelas_escolhidas = case when p_meio = 'cartao' and not coalesce(p_avista,false) then null else parcelas_escolhidas end
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
    if p.meio_escolhido = 'cartao' and p.cartao_no_asaas then
      texto := texto || 'O valor total aprovado é pago no cartão, sem entrada separada. O cliente escolhe à vista ou parcelado na página segura do Asaas, conforme as opções disponíveis para o cartão. A entrada e as parcelas mensais desta proposta aplicam-se somente ao Pix ou boleto.';
    elsif p.meio_escolhido = 'cartao' and p.cartao_valor_total then
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
create or replace function proposta_publica(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p propostas%rowtype; ativa boolean;
begin
  p := proposta_do_link(p_token);
  select cobranca_ativa into ativa from escritorios where id = p.escritorio_id;
  return proposta_publica_v0043(p_token) || jsonb_build_object(
    'meios_pagamento', case when ativa then p.meios_pagamento else array(select unnest(p.meios_pagamento) intersect select 'pix') end,
    'meio_escolhido', p.meio_escolhido,'cartao_valor_total',p.cartao_valor_total,'cartao_no_asaas',p.cartao_no_asaas);
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
    'cobranca_ativa',ativa,'parcelas',parcelas,'condicoes',p.parcelas,'modo',p.modo_pagamento,'cartao_total',p.cartao_valor_total,'cartao_no_asaas',p.cartao_no_asaas);
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
    if p.valor_total < 5 or p.avista then raise exception 'cartao_condicoes'; end if;
    update propostas set meio_escolhido=p_meio,cartao_valor_total=true,cartao_no_asaas=true,parcelas_escolhidas=null,
      parcelas=jsonb_build_array(jsonb_build_object('descricao','Valor total no cartão','valor',p.valor_total)) where id=p.id;
  else
    update propostas set meio_escolhido = p_meio where id = p.id;
  end if;
end $$;
-- Resposta do POST e webhook usam a mesma transação. O callback do navegador nunca baixa pagamento.
create or replace function registrar_checkout(p_sessao uuid,p_escritorio uuid,p_asaas text,p_estado text,p_total numeric,p_link text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s cobranca_checkout_sessoes%rowtype; pg pagamentos%rowtype; novo boolean := false; link_checkout text;
begin
 select * into s from cobranca_checkout_sessoes where id=p_sessao and escritorio_id=p_escritorio for update;
 if not found then raise exception 'checkout_nao_encontrado'; end if;
 select * into pg from pagamentos where id=s.pagamento_id and escritorio_id=p_escritorio for update;
 if not found or p_total<>s.valor or p_total<>pg.valor or p_total is null then raise exception 'checkout_valor_invalido'; end if;
 if p_asaas is null or (s.asaas_id is not null and s.asaas_id<>p_asaas) then raise exception 'checkout_id_invalido'; end if;
 if p_estado not in('ACTIVE','PAID','EXPIRED','CANCELED') then raise exception 'checkout_estado_invalido'; end if;
 if s.estado='PAID' or (s.estado in('EXPIRED','CANCELED') and p_estado='ACTIVE') then return jsonb_build_object('novo_pagamento',false); end if;
 if pg.pago_em is not null and p_estado<>'PAID' then return jsonb_build_object('novo_pagamento',false); end if;
 link_checkout:=coalesce(p_link,s.link);
 update cobranca_checkout_sessoes set asaas_id=p_asaas,estado=p_estado,link=link_checkout where id=s.id;
 if p_estado in('ACTIVE','PAID') then
   update pagamentos set asaas_checkout_id=p_asaas,asaas_link=link_checkout,asaas_status=p_estado,asaas_forma='CREDIT_CARD',cobranca_gerada_em=coalesce(cobranca_gerada_em,now()) where id=pg.id;
 elsif pg.asaas_checkout_id=p_asaas and pg.pago_em is null then
   update pagamentos set asaas_link=null,asaas_status=p_estado where id=pg.id;
 end if;
 if p_estado='PAID' and pg.pago_em is null then
   perform baixa_automatica(pg.id,null,'cartao','Compra aprovada no checkout Asaas ('||p_asaas||'). O recebimento segue as condições do Asaas.');
   novo:=true;
 end if;
 return jsonb_build_object('novo_pagamento',novo,'pagamento_id',pg.id,'contrato_id',pg.contrato_id,'valor',pg.valor);
end $$;
revoke all on function registrar_checkout(uuid,uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function registrar_checkout(uuid,uuid,text,text,numeric,text) to service_role;
notify pgrst, 'reload schema';
