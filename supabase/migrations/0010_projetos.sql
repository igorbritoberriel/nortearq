-- NorteArq — etapa 8: projeto, etapas, arquivos e aprovações (módulo 03, RN-03.1 a RN-03.14).
-- Rodar depois de 0009.
-- V1: o cliente aprova cada etapa por link no WhatsApp (/c/[token]/projeto). O portal com login vem depois.

-- =========================================================
-- Campos novos
-- =========================================================

alter table etapas
  add column if not exists enviada_em timestamptz,
  add column if not exists aprovada_em timestamptz,
  add column if not exists atualizado_em timestamptz not null default now();

create index if not exists etapas_projeto on etapas (projeto_id, ordem);

alter table arquivos
  add column if not exists visivel_cliente boolean not null default true, -- RN-03.12
  add column if not exists tipo text;                                     -- mime type

create index if not exists arquivos_projeto on arquivos (projeto_id, etapa_id, nome, versao);

alter table aprovacoes
  add column if not exists ip text,                                   -- RN-03.4
  add column if not exists conta_revisao boolean not null default false, -- consumiu 1 revisão (RN-03.8)
  add column if not exists cortesia boolean not null default false;      -- RN-03.10: arquiteto não cobra

alter table projetos add column if not exists atualizado_em timestamptz not null default now();

-- Link do cliente para acompanhar o projeto.
alter table links_cliente drop constraint if exists links_cliente_destino_check;
alter table links_cliente add constraint links_cliente_destino_check
  check (destino in ('briefing','proposta','contrato','projeto'));

-- =========================================================
-- Segurança
-- =========================================================

create or replace function projeto_do_escritorio(p_projeto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projetos where id = p_projeto and escritorio_id = meu_escritorio())
$$;

revoke all on function projeto_do_escritorio(uuid) from public;
grant execute on function projeto_do_escritorio(uuid) to authenticated;

-- Versão para o Storage: compara texto, sem converter a pasta para uuid (pasta inválida não dá erro).
create or replace function pasta_de_projeto_do_escritorio(p_pasta text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projetos where id::text = p_pasta and escritorio_id = meu_escritorio())
$$;

revoke all on function pasta_de_projeto_do_escritorio(text) from public;
grant execute on function pasta_de_projeto_do_escritorio(text) to authenticated;

-- Etapas: o arquiteto organiza (RN-03.1) e trabalha nelas, mas aprovar é só do cliente (RN-03.4).
create policy "membro cria etapas" on etapas
  for insert to authenticated with check (projeto_do_escritorio(projeto_id) and status = 'pendente');
create policy "membro edita etapas abertas" on etapas
  for update to authenticated
  using (projeto_do_escritorio(projeto_id) and status in ('pendente','em_andamento','revisao'))
  with check (projeto_do_escritorio(projeto_id) and status in ('pendente','em_andamento','revisao'));
create policy "membro apaga etapa não iniciada" on etapas
  for delete to authenticated using (projeto_do_escritorio(projeto_id) and status = 'pendente');

revoke insert, update, delete on etapas from authenticated;
grant insert (projeto_id, nome, ordem, prazo) on etapas to authenticated;
grant update (nome, ordem, prazo, status, atualizado_em) on etapas to authenticated;
grant delete on etapas to authenticated;

-- Arquivos: versão nova nunca apaga a anterior (RN-03.11). Apagar só enquanto a etapa não foi enviada.
create policy "membro vê arquivos" on arquivos
  for select to authenticated using (projeto_do_escritorio(projeto_id));
create policy "membro muda visibilidade" on arquivos
  for update to authenticated using (projeto_do_escritorio(projeto_id)) with check (projeto_do_escritorio(projeto_id));
create policy "membro apaga arquivo de etapa aberta" on arquivos
  for delete to authenticated
  using (
    projeto_do_escritorio(projeto_id)
    and not exists (select 1 from etapas e where e.id = etapa_id and e.status in ('aguardando_aprovacao','aprovada'))
  );

revoke insert, update, delete on arquivos from authenticated;
grant update (visivel_cliente) on arquivos to authenticated;
grant delete on arquivos to authenticated;

create policy "membro vê aprovações" on aprovacoes
  for select to authenticated
  using (exists (select 1 from etapas e where e.id = etapa_id and projeto_do_escritorio(e.projeto_id)));
revoke insert, update, delete on aprovacoes from authenticated;

-- Bucket privado. Pasta = id do projeto. Limite do plano grátis do Supabase: 50 MB por arquivo.
insert into storage.buckets (id, name, public, file_size_limit)
values ('projetos', 'projetos', false, 52428800)
on conflict (id) do nothing;

create policy "membro envia arquivos do projeto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projetos' and pasta_de_projeto_do_escritorio((storage.foldername(name))[1]));
create policy "membro lê arquivos do projeto" on storage.objects
  for select to authenticated
  using (bucket_id = 'projetos' and pasta_de_projeto_do_escritorio((storage.foldername(name))[1]));
create policy "membro apaga arquivos do projeto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'projetos' and pasta_de_projeto_do_escritorio((storage.foldername(name))[1]));

-- =========================================================
-- Arquiteto
-- =========================================================

-- Registra o arquivo já enviado ao Storage. Mesmo nome na mesma etapa = versão nova (Rev02...).
create or replace function registrar_arquivo(
  p_projeto uuid, p_etapa uuid, p_nome text, p_caminho text, p_tamanho bigint, p_tipo text, p_visivel boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  novo_id uuid;
begin
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if not exists (select 1 from etapas where id = p_etapa and projeto_id = p_projeto and status <> 'aprovada') then
    raise exception 'etapa_fechada'; -- RN-03.5: etapa aprovada não recebe arquivo novo
  end if;
  if p_caminho not like p_projeto::text || '/%' or p_caminho like '%..%' then
    raise exception 'caminho_invalido';
  end if;

  insert into arquivos (projeto_id, etapa_id, nome, versao, caminho_storage, tamanho_bytes, tipo, visivel_cliente, enviado_por)
  values (
    p_projeto, p_etapa, left(trim(p_nome), 200),
    coalesce((select max(versao) from arquivos where etapa_id = p_etapa and lower(nome) = lower(trim(p_nome))), 0) + 1,
    p_caminho, p_tamanho, left(p_tipo, 120), coalesce(p_visivel, true), auth.uid()
  )
  returning id into novo_id;

  update etapas set status = 'em_andamento', atualizado_em = now() where id = p_etapa and status = 'pendente';
  update projetos set atualizado_em = now() where id = p_projeto;
  return novo_id;
end;
$$;

revoke all on function registrar_arquivo(uuid, uuid, text, text, bigint, text, boolean) from public;
grant execute on function registrar_arquivo(uuid, uuid, text, text, bigint, text, boolean) to authenticated;

-- Link do projeto para o cliente (um ativo por projeto; o anterior deixa de valer).
create or replace function link_do_projeto(p_projeto uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype;
  novo_token text;
begin
  select * into pr from projetos where id = p_projeto and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'projeto_nao_encontrado';
  end if;
  update links_cliente set expira_em = now()
  where referencia_id = pr.id and destino = 'projeto' and expira_em > now();
  insert into links_cliente (escritorio_id, cliente_id, destino, referencia_id, expira_em)
  values (pr.escritorio_id, pr.cliente_id, 'projeto', pr.id, now() + interval '90 days')
  returning token into novo_token;
  return novo_token;
end;
$$;

revoke all on function link_do_projeto(uuid) from public;
grant execute on function link_do_projeto(uuid) to authenticated;

-- Envia a etapa para aprovação (RN-03.2: precisa de pelo menos 1 arquivo visível ao cliente).
create or replace function enviar_etapa(p_etapa uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  e etapas%rowtype;
begin
  select * into e from etapas where id = p_etapa;
  if not found or not projeto_do_escritorio(e.projeto_id) then
    raise exception 'etapa_nao_encontrada';
  end if;
  if e.status not in ('pendente', 'em_andamento', 'revisao', 'aguardando_aprovacao') then
    raise exception 'etapa_fechada';
  end if;
  if not exists (select 1 from arquivos where etapa_id = e.id and visivel_cliente) then
    raise exception 'sem_arquivo_visivel';
  end if;

  update etapas set status = 'aguardando_aprovacao', enviada_em = now(), atualizado_em = now() where id = e.id;
  update projetos set atualizado_em = now() where id = e.projeto_id;
  return link_do_projeto(e.projeto_id);
end;
$$;

revoke all on function enviar_etapa(uuid) from public;
grant execute on function enviar_etapa(uuid) to authenticated;

-- RN-03.10: revisão acima do limite que o arquiteto decide não cobrar.
create or replace function conceder_cortesia(p_aprovacao uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update aprovacoes a set cortesia = true
  from etapas e
  where a.id = p_aprovacao and e.id = a.etapa_id and projeto_do_escritorio(e.projeto_id) and a.conta_revisao;
  if not found then
    raise exception 'aprovacao_nao_encontrada';
  end if;
end;
$$;

revoke all on function conceder_cortesia(uuid) from public;
grant execute on function conceder_cortesia(uuid) to authenticated;

-- Revisões usadas no projeto (as de cortesia não contam).
create or replace function revisoes_usadas(p_projeto uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from aprovacoes a join etapas e on e.id = a.etapa_id
  where e.projeto_id = p_projeto and a.conta_revisao and not a.cortesia
$$;

revoke all on function revisoes_usadas(uuid) from public;
grant execute on function revisoes_usadas(uuid) to authenticated;

-- =========================================================
-- Cliente (/c/[token]/projeto)
-- =========================================================

create or replace function projeto_do_link(p_token text) returns projetos
language plpgsql security definer set search_path = public as $$
declare
  l links_cliente%rowtype;
  pr projetos%rowtype;
begin
  select * into l from links_cliente
  where token = p_token and length(p_token) >= 32 and destino = 'projeto' and expira_em > now();
  if not found then
    raise exception 'link_invalido';
  end if;
  select * into pr from projetos where id = l.referencia_id;
  if not found then
    raise exception 'projeto_nao_encontrado';
  end if;
  return pr;
end;
$$;

revoke all on function projeto_do_link(text) from public;

-- Só o que o cliente pode ver: etapas, arquivos visíveis e o contador de revisões (RN-03.9).
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
    ), '[]')
  );
end;
$$;

revoke all on function projeto_publico(text) from public;
grant execute on function projeto_publico(text) to anon, authenticated;

-- Aprovar ou pedir revisão (RN-03.3 a RN-03.5, RN-03.8). Devolve se passou do limite de revisões.
create or replace function responder_etapa(
  p_token text, p_etapa uuid, p_decisao text, p_comentario text, p_ip text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
  e etapas%rowtype;
  v_comentario text := nullif(left(trim(coalesce(p_comentario, '')), 3000), '');
  usadas int;
begin
  select * into e from etapas where id = p_etapa and projeto_id = pr.id;
  if not found then
    raise exception 'etapa_nao_encontrada';
  end if;
  if e.status <> 'aguardando_aprovacao' then
    raise exception 'etapa_respondida';
  end if;
  if p_decisao not in ('aprovada', 'revisao_pedida') then
    raise exception 'decisao_invalida';
  end if;
  if p_decisao = 'revisao_pedida' and v_comentario is null then
    raise exception 'comentario_obrigatorio';
  end if;

  insert into aprovacoes (etapa_id, decisao, comentario, decidido_por, ip, conta_revisao)
  values (e.id, p_decisao, v_comentario, auth.uid(), left(p_ip, 64), p_decisao = 'revisao_pedida');

  update etapas set
    status = case when p_decisao = 'aprovada' then 'aprovada' else 'revisao' end,
    aprovada_em = case when p_decisao = 'aprovada' then now() end,
    atualizado_em = now()
  where id = e.id;
  update projetos set atualizado_em = now() where id = pr.id;

  usadas := revisoes_usadas(pr.id);
  return jsonb_build_object(
    'etapa_id', e.id,
    'revisoes_usadas', usadas,
    'revisoes_incluidas', pr.revisoes_incluidas,
    'excedeu', p_decisao = 'revisao_pedida' and usadas > pr.revisoes_incluidas
  );
end;
$$;

revoke all on function responder_etapa(text, uuid, text, text, text) from public;
grant execute on function responder_etapa(text, uuid, text, text, text) to anon, authenticated;
