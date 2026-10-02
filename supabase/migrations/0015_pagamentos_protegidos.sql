-- NorteArq — pagamentos protegidos: baixa definitiva, estorno com motivo (só o dono), histórico,
-- recibo com número e código, e visão do cliente. Rodar depois de 0014.
--
-- Regras:
-- * Dar baixa registra data (não futura), forma e observação. Depois disso o pagamento não muda.
-- * Errou? Só por estorno: motivo obrigatório, só o dono do escritório, e tudo fica no histórico.
-- * Valor, descrição e vencimento nunca mudam (vêm do contrato assinado; mudança é aditivo).
-- * A trava está no banco (gatilho), não só na tela.

-- =========================================================
-- Ordem das parcelas (Entrada, 1, 2, 3...)
-- =========================================================

alter table pagamentos
  add column if not exists ordem int not null default 0,
  add column if not exists baixa_id uuid; -- baixa em vigor (null = pendente)

update pagamentos set ordem = case
  when descricao ilike 'entrada%' then 0
  when descricao ~* '^parcela \d+' then substring(descricao from '(?i)^parcela (\d+)')::int
  else 1
end;

create index if not exists pagamentos_contrato_ordem on pagamentos (contrato_id, ordem);

-- =========================================================
-- Histórico: cada baixa é um recibo; cada estorno cancela uma baixa
-- =========================================================

create table if not exists pagamentos_eventos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  tipo text not null check (tipo in ('baixa', 'estorno')),
  pago_em date,                                   -- baixa: data do pagamento
  forma text check (forma in ('pix','transferencia','boleto','cartao','dinheiro','outro','nao_informada')),
  observacao text,
  motivo text,                                    -- estorno: obrigatório
  baixa_estornada_id uuid references pagamentos_eventos(id),
  recibo_numero int,                              -- baixa: número sequencial do escritório
  recibo_codigo text unique,                      -- baixa: código do link público do recibo
  estornado_em timestamptz,                       -- baixa: preenchido quando estornada
  feito_por uuid references auth.users(id),
  feito_por_nome text,
  criado_em timestamptz not null default now()
);

create index if not exists pagamentos_eventos_pagamento on pagamentos_eventos (pagamento_id, criado_em);
create unique index if not exists pagamentos_eventos_recibo_numero on pagamentos_eventos (escritorio_id, recibo_numero)
  where recibo_numero is not null;

alter table pagamentos add constraint pagamentos_baixa_fk
  foreign key (baixa_id) references pagamentos_eventos(id);

alter table pagamentos_eventos enable row level security;

create policy "membro vê o histórico de pagamentos" on pagamentos_eventos
  for select to authenticated using (escritorio_id = meu_escritorio());

-- Ninguém escreve direto: só pelas funções abaixo.
revoke insert, update, delete on pagamentos_eventos from authenticated, anon;

-- O arquiteto não altera mais a tabela de pagamentos diretamente.
drop policy if exists "membro marca pagamentos" on pagamentos;
revoke update on pagamentos from authenticated;

-- =========================================================
-- Trava no banco: vale até para quem mexer por fora do app
-- =========================================================

create or replace function proteger_pagamento() returns trigger
language plpgsql as $$
begin
  if new.valor is distinct from old.valor
     or new.descricao is distinct from old.descricao
     or new.vencimento is distinct from old.vencimento
     or new.contrato_id is distinct from old.contrato_id
     or new.escritorio_id is distinct from old.escritorio_id then
    raise exception 'pagamento_imutavel';
  end if;
  -- Baixa só se desfaz pelo estorno (que liga esta marca durante a transação).
  if old.pago_em is not null and new.pago_em is distinct from old.pago_em
     and coalesce(current_setting('nortearq.estorno', true), '') <> 'on' then
    raise exception 'pagamento_ja_baixado';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pagamento on pagamentos;
create trigger proteger_pagamento before update on pagamentos
  for each row execute function proteger_pagamento();

create or replace function proteger_evento_pagamento() returns trigger
language plpgsql as $$
begin
  -- Do histórico só muda a marca de estornado, uma vez.
  if tg_op = 'DELETE' then
    raise exception 'historico_imutavel';
  end if;
  if (to_jsonb(new) - 'estornado_em') is distinct from (to_jsonb(old) - 'estornado_em')
     or old.estornado_em is not null then
    raise exception 'historico_imutavel';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_evento_pagamento on pagamentos_eventos;
create trigger proteger_evento_pagamento before update or delete on pagamentos_eventos
  for each row execute function proteger_evento_pagamento();

-- =========================================================
-- Registrar pagamento (baixa)
-- =========================================================

create or replace function registrar_pagamento(p_pagamento uuid, p_data date, p_forma text, p_observacao text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pg pagamentos%rowtype;
  v_nome text;
  v_numero int;
  v_evento uuid;
begin
  select * into pg from pagamentos where id = p_pagamento and escritorio_id = meu_escritorio() for update;
  if not found then
    raise exception 'pagamento_nao_encontrado';
  end if;
  if pg.pago_em is not null then
    raise exception 'pagamento_ja_baixado';
  end if;
  if p_data is null or p_data > hoje_brasilia() or p_data < date '2000-01-01' then
    raise exception 'data_invalida';
  end if;
  if p_forma is null or p_forma not in ('pix','transferencia','boleto','cartao','dinheiro','outro') then
    raise exception 'forma_invalida';
  end if;

  select nome into v_nome from membros where id = auth.uid();
  -- Número do recibo: sequência por escritório (trava o escritório para não repetir).
  perform 1 from escritorios where id = pg.escritorio_id for update;
  select coalesce(max(recibo_numero), 0) + 1 into v_numero from pagamentos_eventos where escritorio_id = pg.escritorio_id;

  insert into pagamentos_eventos (escritorio_id, pagamento_id, tipo, pago_em, forma, observacao,
    recibo_numero, recibo_codigo, feito_por, feito_por_nome)
  values (pg.escritorio_id, pg.id, 'baixa', p_data, p_forma, nullif(left(trim(coalesce(p_observacao, '')), 300), ''),
    v_numero, encode(extensions.gen_random_bytes(18), 'hex'), auth.uid(), v_nome)
  returning id into v_evento;

  update pagamentos set pago_em = p_data, baixa_id = v_evento where id = pg.id;
  return v_evento;
end;
$$;

revoke all on function registrar_pagamento(uuid, date, text, text) from public;
grant execute on function registrar_pagamento(uuid, date, text, text) to authenticated;

-- =========================================================
-- Estornar (só o dono, com motivo)
-- =========================================================

create or replace function estornar_pagamento(p_pagamento uuid, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pg pagamentos%rowtype;
  v_nome text;
  v_papel text;
begin
  select nome, papel into v_nome, v_papel from membros where id = auth.uid();
  if v_papel is distinct from 'dono' then
    raise exception 'somente_dono';
  end if;
  select * into pg from pagamentos where id = p_pagamento and escritorio_id = meu_escritorio() for update;
  if not found then
    raise exception 'pagamento_nao_encontrado';
  end if;
  if pg.pago_em is null or pg.baixa_id is null then
    raise exception 'pagamento_pendente';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'motivo_obrigatorio';
  end if;

  update pagamentos_eventos set estornado_em = now() where id = pg.baixa_id;
  insert into pagamentos_eventos (escritorio_id, pagamento_id, tipo, motivo, baixa_estornada_id, feito_por, feito_por_nome)
  values (pg.escritorio_id, pg.id, 'estorno', left(trim(p_motivo), 300), pg.baixa_id, auth.uid(), v_nome);

  perform set_config('nortearq.estorno', 'on', true);
  update pagamentos set pago_em = null, baixa_id = null where id = pg.id;
  perform set_config('nortearq.estorno', '', true);
end;
$$;

revoke all on function estornar_pagamento(uuid, text) from public;
grant execute on function estornar_pagamento(uuid, text) to authenticated;

-- =========================================================
-- Pagamentos já marcados antes desta versão ganham a baixa e o recibo
-- =========================================================

do $$
declare
  r record;
  v_numero int;
  v_evento uuid;
begin
  for r in
    select * from pagamentos where pago_em is not null and baixa_id is null order by escritorio_id, pago_em, ordem
  loop
    select coalesce(max(recibo_numero), 0) + 1 into v_numero from pagamentos_eventos where escritorio_id = r.escritorio_id;
    insert into pagamentos_eventos (escritorio_id, pagamento_id, tipo, pago_em, forma, recibo_numero, recibo_codigo, feito_por_nome)
    values (r.escritorio_id, r.id, 'baixa', r.pago_em, 'nao_informada', v_numero, encode(extensions.gen_random_bytes(18), 'hex'), 'Registro anterior')
    returning id into v_evento;
    update pagamentos set baixa_id = v_evento where id = r.id;
  end loop;
end $$;

-- =========================================================
-- Recibo público (/r/[codigo]): link pessoal do cliente, com a marca do escritório
-- =========================================================

create or replace function recibo_publico(p_codigo text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'numero', ev.recibo_numero,
    'pago_em', ev.pago_em,
    'forma', ev.forma,
    'observacao', ev.observacao,
    'emitido_em', ev.criado_em,
    'cancelado_em', ev.estornado_em,
    'descricao', pg.descricao,
    'valor', pg.valor,
    'contrato_codigo', ct.codigo_verificacao,
    'cliente', jsonb_build_object('nome', cl.nome, 'documento', cl.documento),
    'escritorio', jsonb_build_object(
      'nome', e.nome, 'documento', e.documento, 'endereco', e.endereco, 'responsavel', e.responsavel,
      'registro', e.registro_profissional, 'logo_url', e.logo_url, 'cor_primaria', e.cor_primaria, 'whatsapp', e.whatsapp
    )
  )
  from pagamentos_eventos ev
  join pagamentos pg on pg.id = ev.pagamento_id
  join contratos ct on ct.id = pg.contrato_id
  join clientes cl on cl.id = ct.cliente_id
  join escritorios e on e.id = ev.escritorio_id
  where ev.recibo_codigo = p_codigo and ev.tipo = 'baixa' and length(p_codigo) >= 32
$$;

revoke all on function recibo_publico(text) from public;
grant execute on function recibo_publico(text) to anon, authenticated;

-- =========================================================
-- Visão do cliente: o link do projeto passa a mostrar os pagamentos
-- =========================================================

create or replace function projeto_publico(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
begin
  update links_cliente set usado_em = coalesce(usado_em, now()) where token = p_token;
  return jsonb_build_object(
    'id', pr.id,
    'nome', pr.nome,
    'revisoes_incluidas', pr.revisoes_incluidas,
    'revisoes_usadas', revisoes_usadas(pr.id),
    'etapas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'nome', e.nome, 'ordem', e.ordem, 'status', e.status, 'prazo', e.prazo,
        'enviada_em', e.enviada_em, 'aprovada_em', e.aprovada_em,
        'arquivos', coalesce((
          select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'versao', a.versao, 'caminho', a.caminho_storage,
            'tipo', a.tipo, 'tamanho', a.tamanho_bytes, 'criado_em', a.criado_em) order by a.nome, a.versao desc)
          from arquivos a where a.etapa_id = e.id and a.visivel_cliente
        ), '[]'),
        'historico', coalesce((
          select jsonb_agg(jsonb_build_object('decisao', ap.decisao, 'comentario', ap.comentario, 'em', ap.decidido_em) order by ap.decidido_em)
          from aprovacoes ap where ap.etapa_id = e.id
        ), '[]')
      ) order by e.ordem)
      from etapas e where e.projeto_id = pr.id
    ), '[]'),
    'pagamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', pg.descricao, 'valor', pg.valor, 'vencimento', pg.vencimento, 'pago_em', pg.pago_em,
        'recibo_codigo', ev.recibo_codigo, 'recibo_numero', ev.recibo_numero
      ) order by pg.ordem, pg.descricao)
      from pagamentos pg
      left join pagamentos_eventos ev on ev.id = pg.baixa_id
      where pg.contrato_id = pr.contrato_id
    ), '[]')
  );
end;
$$;

-- =========================================================
-- Contratos novos já gravam a ordem das parcelas
-- =========================================================

create or replace function ordenar_pagamento_novo() returns trigger
language plpgsql as $$
begin
  if new.ordem = 0 and new.descricao !~* '^entrada' then
    new.ordem := case
      when new.descricao ~* '^parcela \d+' then substring(new.descricao from '(?i)^parcela (\d+)')::int
      else 1
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists ordenar_pagamento_novo on pagamentos;
create trigger ordenar_pagamento_novo before insert on pagamentos
  for each row execute function ordenar_pagamento_novo();
