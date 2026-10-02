-- NorteArq — aditivos (RN-03.15, RN-03.16) e aprovações externas (RN-03.17).
-- Rodar depois de 0016.
--
-- Aditivo: descrição, valor, impacto no prazo, revisões/visitas extras e parcelas.
-- O cliente aprova ou recusa pelo link do projeto (data, hora e IP). Aprovado: vira parcelas nos
-- Pagamentos (com a mesma proteção) e soma as revisões/visitas extras ao projeto.

-- =========================================================
-- Aditivos
-- =========================================================

alter table aditivos
  add column if not exists escritorio_id uuid references escritorios(id) on delete cascade,
  add column if not exists numero int,
  add column if not exists prazo_dias int not null default 0,
  add column if not exists revisoes_extras int not null default 0,
  add column if not exists visitas_extras int not null default 0,
  add column if not exists parcelas int not null default 1,
  add column if not exists aprovacao_id uuid references aprovacoes(id) on delete set null, -- revisão excedente que originou
  add column if not exists motivo_recusa text,
  add column if not exists resposta_ip text,
  add column if not exists criado_por uuid references auth.users(id),
  add column if not exists criado_em timestamptz not null default now();

alter table aditivos drop constraint if exists aditivos_status_check;
alter table aditivos add constraint aditivos_status_check check (status in ('enviado','aprovado','recusado','cancelado'));
alter table aditivos add constraint aditivos_valores_check check (
  coalesce(valor, 0) >= 0 and prazo_dias between 0 and 3650 and revisoes_extras between 0 and 50
  and visitas_extras between 0 and 100 and parcelas between 1 and 24
);

create index if not exists aditivos_projeto on aditivos (projeto_id, criado_em);

alter table aditivos enable row level security;
create policy "membro vê aditivos do escritório" on aditivos
  for select to authenticated using (escritorio_id = meu_escritorio());
revoke insert, update, delete on aditivos from authenticated, anon;

-- Revisão excedente ligada ao aditivo que a cobra.
alter table aprovacoes add column if not exists aditivo_id uuid references aditivos(id) on delete set null;

-- Notificação nova: o cliente respondeu um aditivo.
alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('contato','briefing','proposta','contrato','etapa','aditivo'));

-- ---------- Criar (arquiteto) ----------

create or replace function criar_aditivo(
  p_projeto uuid, p_descricao text, p_valor numeric, p_prazo_dias int,
  p_revisoes int, p_visitas int, p_parcelas int, p_aprovacao uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype;
  v_numero int;
  novo uuid;
begin
  select * into pr from projetos where id = p_projeto and escritorio_id = meu_escritorio() for update;
  if not found then
    raise exception 'projeto_nao_encontrado';
  end if;
  if length(trim(coalesce(p_descricao, ''))) < 5 then
    raise exception 'descricao_obrigatoria';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor_invalido';
  end if;
  if p_aprovacao is not null and not exists (
    select 1 from aprovacoes a join etapas e on e.id = a.etapa_id
    where a.id = p_aprovacao and e.projeto_id = pr.id and a.conta_revisao and not a.cortesia and a.aditivo_id is null
  ) then
    raise exception 'revisao_invalida';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero from aditivos where projeto_id = pr.id;
  insert into aditivos (projeto_id, escritorio_id, numero, descricao, valor, prazo_dias, impacto_prazo,
    revisoes_extras, visitas_extras, parcelas, aprovacao_id, criado_por)
  values (pr.id, pr.escritorio_id, v_numero, left(trim(p_descricao), 2000), round(p_valor, 2), coalesce(p_prazo_dias, 0),
    case when coalesce(p_prazo_dias, 0) > 0 then '+' || p_prazo_dias || ' dias' else 'sem impacto no prazo' end,
    coalesce(p_revisoes, 0), coalesce(p_visitas, 0), greatest(1, coalesce(p_parcelas, 1)), p_aprovacao, auth.uid())
  returning id into novo;

  if p_aprovacao is not null then
    update aprovacoes set aditivo_id = novo where id = p_aprovacao;
  end if;
  return novo;
end;
$$;

revoke all on function criar_aditivo(uuid, text, numeric, int, int, int, int, uuid) from public;
grant execute on function criar_aditivo(uuid, text, numeric, int, int, int, int, uuid) to authenticated;

-- ---------- Cancelar (arquiteto, só enquanto o cliente não respondeu) ----------

create or replace function cancelar_aditivo(p_aditivo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update aditivos set status = 'cancelado', respondido_em = now()
  where id = p_aditivo and escritorio_id = meu_escritorio() and status = 'enviado';
  if not found then
    raise exception 'aditivo_respondido';
  end if;
  -- A revisão excedente volta a ficar em aberto (cortesia ou novo aditivo).
  update aprovacoes set aditivo_id = null where aditivo_id = p_aditivo;
end;
$$;

revoke all on function cancelar_aditivo(uuid) from public;
grant execute on function cancelar_aditivo(uuid) to authenticated;

-- ---------- Responder (cliente, pelo link do projeto) ----------

create or replace function responder_aditivo(p_token text, p_aditivo uuid, p_decisao text, p_motivo text, p_ip text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
  a aditivos%rowtype;
  v_motivo text := nullif(left(trim(coalesce(p_motivo, '')), 1000), '');
  base numeric;
  i int;
begin
  select * into a from aditivos where id = p_aditivo and projeto_id = pr.id for update;
  if not found then
    raise exception 'aditivo_nao_encontrado';
  end if;
  if a.status <> 'enviado' then
    raise exception 'aditivo_respondido';
  end if;
  if p_decisao not in ('aprovado', 'recusado') then
    raise exception 'decisao_invalida';
  end if;
  if p_decisao = 'recusado' and v_motivo is null then
    raise exception 'motivo_obrigatorio';
  end if;

  update aditivos set status = p_decisao, respondido_em = now(), resposta_ip = left(p_ip, 64),
    motivo_recusa = case when p_decisao = 'recusado' then v_motivo end
  where id = a.id;

  if p_decisao = 'aprovado' then
    -- RN-03.16: soma revisões e visitas ao projeto.
    update projetos set
      revisoes_incluidas = revisoes_incluidas + a.revisoes_extras,
      visitas_incluidas = visitas_incluidas + a.visitas_extras,
      atualizado_em = now()
    where id = pr.id;

    -- Parcelas nos Pagamentos do contrato (mesma proteção dos demais).
    if pr.contrato_id is not null and coalesce(a.valor, 0) > 0 then
      base := round(floor(a.valor * 100 / a.parcelas) / 100, 2);
      for i in 1..a.parcelas loop
        insert into pagamentos (escritorio_id, contrato_id, descricao, valor, ordem)
        values (pr.escritorio_id, pr.contrato_id,
          'Aditivo ' || a.numero || case when a.parcelas > 1 then ', parcela ' || i || ' de ' || a.parcelas else '' end,
          case when i = a.parcelas then a.valor - base * (a.parcelas - 1) else base end,
          1000 + a.numero * 50 + i);
      end loop;
    end if;
  else
    -- Recusado: a revisão excedente volta a ficar em aberto.
    update aprovacoes set aditivo_id = null where aditivo_id = a.id;
  end if;

  update projetos set atualizado_em = now() where id = pr.id;
  return a.id;
end;
$$;

revoke all on function responder_aditivo(text, uuid, text, text, text) from public;
grant execute on function responder_aditivo(text, uuid, text, text, text) to anon, authenticated;

-- =========================================================
-- Aprovações externas (condomínio, prefeitura, bombeiros...) — controle do arquiteto
-- =========================================================

create table if not exists aprovacoes_externas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  projeto_id uuid not null references projetos(id) on delete cascade,
  orgao text not null,
  protocolo text,
  entrada_em date,
  situacao text not null default 'em_preparo'
    check (situacao in ('em_preparo','em_analise','exigencia','aprovado','indeferido')),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists aprovacoes_externas_projeto on aprovacoes_externas (projeto_id, criado_em);

alter table aprovacoes_externas enable row level security;
create policy "membro gerencia aprovações externas" on aprovacoes_externas
  for all to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio() and projeto_do_escritorio(projeto_id));

-- =========================================================
-- Visão do cliente: o link do projeto passa a mostrar aditivos e aprovações externas
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
    ), '[]'),
    'aditivos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ad.id, 'numero', ad.numero, 'descricao', ad.descricao, 'valor', ad.valor, 'prazo_dias', ad.prazo_dias,
        'revisoes_extras', ad.revisoes_extras, 'visitas_extras', ad.visitas_extras, 'parcelas', ad.parcelas,
        'status', ad.status, 'criado_em', ad.criado_em, 'respondido_em', ad.respondido_em, 'motivo_recusa', ad.motivo_recusa
      ) order by ad.criado_em)
      from aditivos ad where ad.projeto_id = pr.id and ad.status <> 'cancelado'
    ), '[]'),
    'aprovacoes_externas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'orgao', ax.orgao, 'protocolo', ax.protocolo, 'entrada_em', ax.entrada_em, 'situacao', ax.situacao
      ) order by ax.criado_em)
      from aprovacoes_externas ax where ax.projeto_id = pr.id
    ), '[]')
  );
end;
$$;
