-- Escolha do meio na proposta, resumo no contrato e preparo idempotente do Asaas.
-- Independente da migração 0042. Não cria cobranças e não altera condições já aprovadas.

alter table propostas
  add column if not exists meios_pagamento text[] not null default array['pix','boleto','cartao'],
  add column if not exists meio_escolhido text;
alter table propostas drop constraint if exists propostas_meios_pagamento_check;
alter table propostas add constraint propostas_meios_pagamento_check check (
  cardinality(meios_pagamento) between 1 and 3 and meios_pagamento <@ array['pix','boleto','cartao']::text[]);
alter table propostas drop constraint if exists propostas_meio_escolhido_check;
alter table propostas add constraint propostas_meio_escolhido_check check (meio_escolhido in ('pix','boleto','cartao'));
grant insert (meios_pagamento), update (meios_pagamento) on propostas to authenticated;

alter table pagamentos add column if not exists asaas_parcelamento_id text;
create table if not exists cobranca_preparos (
  contrato_id uuid primary key references contratos(id) on delete cascade,
  dono uuid not null,
  iniciado_em timestamptz not null default now()
);
alter table cobranca_preparos enable row level security;
revoke all on cobranca_preparos from public, anon, authenticated;
grant all on cobranca_preparos to service_role;
create table if not exists cobranca_solicitacoes (
  referencia text primary key,
  contrato_id uuid not null references contratos(id) on delete cascade,
  enviado_em timestamptz not null default now()
);
alter table cobranca_solicitacoes enable row level security;
revoke all on cobranca_solicitacoes from public,anon,authenticated;
grant all on cobranca_solicitacoes to service_role;

-- Preserva as versões instaladas do banco; os auxiliares só são chamados pelos wrappers.
do $$ begin
  if to_regprocedure('responder_proposta_v0043(text,text,text,text,text,integer,boolean)') is null then
    alter function responder_proposta(text,text,text,text,text,integer,boolean) rename to responder_proposta_v0043;
    alter function proposta_publica(text) rename to proposta_publica_v0043;
    alter function renderizar_contrato(uuid,text,text,text,date) rename to renderizar_contrato_v0043;
    alter function nova_versao_proposta(uuid) rename to nova_versao_proposta_v0043;
    alter function assinar_contrato(text,text,text,text,text,text) rename to assinar_contrato_v0043;
  end if;
end $$;
revoke all on function responder_proposta_v0043(text,text,text,text,text,integer,boolean),
  proposta_publica_v0043(text), renderizar_contrato_v0043(uuid,text,text,text,date),
  nova_versao_proposta_v0043(uuid), assinar_contrato_v0043(text,text,text,text,text,text)
  from public, anon, authenticated;

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
      if p.modo_pagamento = 'parcelado' and coalesce(p_parcelas, 0) > 12 then raise exception 'cartao_maximo'; end if;
      select min((x->>'valor')::numeric) into minimo from jsonb_array_elements(
        case when p.modo_pagamento = 'parcelado' then gerar_parcelas(p.valor_total, p.entrada_pct, p_parcelas)
             when jsonb_array_length(p.parcelas) > 0 then p.parcelas
             else jsonb_build_array(jsonb_build_object('valor', p.valor_total)) end) x;
      if minimo < 5 then raise exception 'cartao_minimo'; end if;
    end if;
  end if;
  v_id := responder_proposta_v0043(p_token,p_acao,p_comentario,p_motivo,p_ip,p_parcelas,p_avista);
  if p_acao = 'aprovar' then update propostas set meio_escolhido = p_meio where id = v_id; end if;
  return v_id;
end $$;
revoke all on function responder_proposta(text,text,text,text,text,integer,boolean,text) from public;
grant execute on function responder_proposta(text,text,text,text,text,integer,boolean,text) to anon, authenticated;

-- Compatibilidade com páginas antigas abertas: aprovação pede atualização para escolher o meio.
create or replace function responder_proposta(
  p_token text, p_acao text, p_comentario text, p_motivo text, p_ip text,
  p_parcelas integer default null, p_avista boolean default false
) returns uuid language sql security definer set search_path = public as $$
  select responder_proposta(p_token,p_acao,p_comentario,p_motivo,p_ip,p_parcelas,p_avista,null)
$$;
revoke all on function responder_proposta(text,text,text,text,text,integer,boolean) from public;
grant execute on function responder_proposta(text,text,text,text,text,integer,boolean) to anon, authenticated;

create or replace function proposta_publica(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p propostas%rowtype; ativa boolean;
begin
  p := proposta_do_link(p_token);
  select cobranca_ativa into ativa from escritorios where id = p.escritorio_id;
  return proposta_publica_v0043(p_token) || jsonb_build_object(
    'meios_pagamento', case when ativa then p.meios_pagamento else array(select unnest(p.meios_pagamento) intersect select 'pix') end,
    'meio_escolhido', p.meio_escolhido);
end $$;
revoke all on function proposta_publica(text) from public;
grant execute on function proposta_publica(text) to anon, authenticated;

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
    if p.meio_escolhido = 'cartao' and p.modo_pagamento = 'parcelado' and not p.avista then
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
revoke all on function renderizar_contrato(uuid,text,text,text,date) from public, anon, authenticated;

create or replace function nova_versao_proposta(p_proposta uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  novo := nova_versao_proposta_v0043(p_proposta);
  update propostas set meios_pagamento = (select meios_pagamento from propostas where id = p_proposta), meio_escolhido = null
    where id = novo and status = 'rascunho';
  return novo;
end $$;
revoke all on function nova_versao_proposta(uuid) from public;
grant execute on function nova_versao_proposta(uuid) to authenticated;

-- Mesmo link do contrato e do projeto/portal, sem expor dados de cartão ou credenciais.
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
    'cobranca_ativa',ativa,'parcelas',parcelas,'condicoes',p.parcelas,'modo',p.modo_pagamento);
end $$;
revoke all on function resumo_pagamento_cliente(text) from public;
grant execute on function resumo_pagamento_cliente(text) to anon, authenticated;

-- Completa a escolha em propostas antigas sem alterar quantidade, valor ou entrada.
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
  if p_meio = 'cartao' and (coalesce((select min((x->>'valor')::numeric) from jsonb_array_elements(p.parcelas) x),p.valor_total) < 5
      or (p.modo_pagamento = 'parcelado' and not p.avista and coalesce(p.parcelas_escolhidas, jsonb_array_length(p.parcelas)) > 12)) then
    raise exception 'cartao_limite';
  end if;
  update propostas set meio_escolhido = p_meio where id = p.id;
end $$;
revoke all on function escolher_meio_contrato(text,text) from public;
grant execute on function escolher_meio_contrato(text,text) to anon, authenticated;

create or replace function assinar_contrato(p_token text,p_nome text,p_documento text,p_endereco text,p_ip text,p_navegador text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c contratos%rowtype; meio text;
begin
  c := contrato_do_link(p_token);
  perform 1 from contratos where id = c.id for update;
  select meio_escolhido into meio from propostas where id = c.proposta_id;
  if meio is null then raise exception 'meio_obrigatorio'; end if;
  return assinar_contrato_v0043(p_token,p_nome,p_documento,p_endereco,p_ip,p_navegador);
end $$;
revoke all on function assinar_contrato(text,text,text,text,text,text) from public;
grant execute on function assinar_contrato(text,text,text,text,text,text) to anon, authenticated;

-- Trava com prazo suficiente para chamadas externas; só o servidor pode preparar cobranças.
create or replace function iniciar_preparo_cobranca(p_contrato uuid,p_dono uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare resultado uuid;
begin
  insert into cobranca_preparos(contrato_id,dono) values(p_contrato,p_dono)
  on conflict(contrato_id) do update set dono = excluded.dono,iniciado_em = now()
    where cobranca_preparos.iniciado_em < now() - interval '5 minutes'
  returning dono into resultado;
  return resultado is not null;
end $$;
revoke all on function iniciar_preparo_cobranca(uuid,uuid) from public,anon,authenticated;
grant execute on function iniciar_preparo_cobranca(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
