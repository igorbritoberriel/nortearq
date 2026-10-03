-- NorteArq — arquivos do projeto: miniaturas, prévia, tipo (Render 3D...), capa e espaço do plano.
-- Rodar depois de 0028.
--
-- * Cada arquivo tem um tipo: prancha técnica, render 3D, documento ou outro (sugerido pela extensão).
-- * O navegador gera a miniatura (~600 px) e, nas imagens grandes, uma prévia (2.400 px). Ficam no mesmo
--   bucket privado, ao lado do original, e contam no espaço do plano (derivados_bytes).
-- * O cliente só vê o que já foi ENVIADO: arquivo visível de etapa enviada, criado até o último envio.
--   Arquivo novo de uma etapa em andamento ou em revisão só aparece quando a etapa for enviada de novo.
-- * Capa do projeto: um render visível escolhido pelo arquiteto. Sem capa válida, vale o render mais recente.
-- * Espaço do plano (2 GB / 30 GB / 150 GB) travado no banco: registrar_arquivo recusa quando passa.

-- =========================================================
-- Campos novos
-- =========================================================

alter table arquivos
  add column if not exists categoria text not null default 'outro'
    check (categoria in ('prancha','render','documento','outro')),
  add column if not exists miniatura_caminho text,
  add column if not exists previa_caminho text,
  add column if not exists derivados_bytes bigint not null default 0,
  add column if not exists miniatura_tentada_em timestamptz; -- trava para gerar a miniatura uma vez só

-- Arquivos que já existiam: tipo pela extensão.
update arquivos set categoria = case
    when lower(nome) ~ '\.(pdf|dwg|dxf|skp|rvt|ifc|pln)$' then 'prancha'
    when lower(nome) ~ '\.(jpe?g|png|webp)$' then 'render'
    when lower(nome) ~ '\.(docx?|xlsx?|odt|ods|txt|csv)$' then 'documento'
    else 'outro'
  end
where categoria = 'outro';

alter table projetos add column if not exists capa_arquivo_id uuid references arquivos(id) on delete set null;

create index if not exists arquivos_renders on arquivos (projeto_id, criado_em desc) where categoria = 'render';

-- Tipo e capa só mudam por funções (que conferem o modo leitura). O arquiteto continua podendo
-- atualizar direto apenas visivel_cliente (grant da 0010).

-- =========================================================
-- Espaço do plano
-- =========================================================

create or replace function espaco_do_plano(p_escritorio uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select (case coalesce(case when e.plano = 'trial' then e.plano_escolhido else e.plano end, 'profissional')
    when 'briefing' then 2
    when 'escritorio' then 150
    else 30
  end)::bigint * 1024 * 1024 * 1024
  from escritorios e where e.id = p_escritorio
$$;

create or replace function espaco_usado(p_escritorio uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(a.tamanho_bytes, 0) + a.derivados_bytes), 0)::bigint
  from arquivos a join projetos p on p.id = a.projeto_id
  where p.escritorio_id = p_escritorio
$$;

revoke all on function espaco_do_plano(uuid) from public;
revoke all on function espaco_usado(uuid) from public;

-- Para a tela: "12,4 GB de 30 GB".
create or replace function meu_espaco() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
begin
  if v_escritorio is null then
    return null;
  end if;
  return jsonb_build_object('usado', espaco_usado(v_escritorio), 'limite', espaco_do_plano(v_escritorio));
end;
$$;
revoke all on function meu_espaco() from public;
grant execute on function meu_espaco() to authenticated;

-- =========================================================
-- Registrar arquivo (agora com tipo, miniatura, prévia e espaço do plano)
-- =========================================================

drop function if exists registrar_arquivo(uuid, uuid, text, text, bigint, text, boolean);

create or replace function registrar_arquivo(
  p_projeto uuid, p_etapa uuid, p_nome text, p_caminho text, p_tamanho bigint, p_tipo text, p_visivel boolean,
  p_categoria text, p_miniatura text, p_previa text, p_derivados_bytes bigint
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  novo_id uuid;
  v_escritorio uuid;
  v_prefixo text := p_projeto::text || '/';
begin
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if not exists (select 1 from etapas where id = p_etapa and projeto_id = p_projeto and status <> 'aprovada') then
    raise exception 'etapa_fechada'; -- RN-03.5: etapa aprovada não recebe arquivo novo
  end if;
  if p_caminho not like v_prefixo || '%' or p_caminho like '%..%'
    or (p_miniatura is not null and (p_miniatura not like v_prefixo || '%' or p_miniatura like '%..%'))
    or (p_previa is not null and (p_previa not like v_prefixo || '%' or p_previa like '%..%')) then
    raise exception 'caminho_invalido';
  end if;

  select escritorio_id into v_escritorio from projetos where id = p_projeto;
  if espaco_usado(v_escritorio) + coalesce(p_tamanho, 0) + coalesce(p_derivados_bytes, 0) > espaco_do_plano(v_escritorio) then
    raise exception 'espaco_esgotado';
  end if;

  insert into arquivos (projeto_id, etapa_id, nome, versao, caminho_storage, tamanho_bytes, tipo, visivel_cliente, enviado_por,
    categoria, miniatura_caminho, previa_caminho, derivados_bytes, miniatura_tentada_em)
  values (
    p_projeto, p_etapa, left(trim(p_nome), 200),
    coalesce((select max(versao) from arquivos where etapa_id = p_etapa and lower(nome) = lower(trim(p_nome))), 0) + 1,
    p_caminho, p_tamanho, left(p_tipo, 120), coalesce(p_visivel, true), auth.uid(),
    case when p_categoria in ('prancha','render','documento','outro') then p_categoria else 'outro' end,
    p_miniatura, p_previa, greatest(coalesce(p_derivados_bytes, 0), 0), now()
  )
  returning id into novo_id;

  update etapas set status = 'em_andamento', atualizado_em = now() where id = p_etapa and status = 'pendente';
  update projetos set atualizado_em = now() where id = p_projeto;
  return novo_id;
end;
$$;

revoke all on function registrar_arquivo(uuid, uuid, text, text, bigint, text, boolean, text, text, text, bigint) from public;
grant execute on function registrar_arquivo(uuid, uuid, text, text, bigint, text, boolean, text, text, text, bigint) to authenticated;

-- =========================================================
-- Miniaturas dos arquivos antigos (geradas uma vez, pelo navegador do arquiteto)
-- =========================================================

-- Reserva o arquivo por 10 minutos: se duas pessoas abrirem o projeto juntas, só uma gera.
create or replace function reservar_miniatura(p_arquivo uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update arquivos set miniatura_tentada_em = now()
  where id = p_arquivo and projeto_do_escritorio(projeto_id) and miniatura_caminho is null
    and (miniatura_tentada_em is null or miniatura_tentada_em < now() - interval '10 minutes');
  return found;
end;
$$;
revoke all on function reservar_miniatura(uuid) from public;
grant execute on function reservar_miniatura(uuid) to authenticated;

create or replace function registrar_miniatura(p_arquivo uuid, p_miniatura text, p_previa text, p_bytes bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  a arquivos%rowtype;
  v_prefixo text;
begin
  select * into a from arquivos where id = p_arquivo and projeto_do_escritorio(projeto_id);
  if not found then
    raise exception 'arquivo_nao_encontrado';
  end if;
  -- Sem miniatura = o navegador não conseguiu gerar (arquivo corrompido, formato raro): não tenta mais.
  if p_miniatura is null then
    update arquivos set miniatura_tentada_em = 'infinity' where id = a.id and miniatura_caminho is null;
    return;
  end if;
  v_prefixo := a.projeto_id::text || '/';
  if p_miniatura not like v_prefixo || '%' or p_miniatura like '%..%'
    or (p_previa is not null and (p_previa not like v_prefixo || '%' or p_previa like '%..%')) then
    raise exception 'caminho_invalido';
  end if;
  if a.miniatura_caminho is not null then
    raise exception 'ja_tem_miniatura';
  end if;
  update arquivos set miniatura_caminho = p_miniatura, previa_caminho = p_previa,
    derivados_bytes = greatest(coalesce(p_bytes, 0), 0)
  where id = a.id;
end;
$$;
revoke all on function registrar_miniatura(uuid, text, text, bigint) from public;
grant execute on function registrar_miniatura(uuid, text, text, bigint) to authenticated;

-- =========================================================
-- Tipo do arquivo e capa do projeto
-- =========================================================

create or replace function exigir_escrita() returns void
language plpgsql stable security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
begin
  if v_escritorio is null then
    raise exception 'sem_permissao';
  end if;
  if situacao_escritorio(v_escritorio) in ('leitura', 'suspenso') then
    raise exception 'assinatura_pendente';
  end if;
end;
$$;
revoke all on function exigir_escrita() from public;

create or replace function mudar_categoria_arquivo(p_arquivo uuid, p_categoria text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if p_categoria not in ('prancha','render','documento','outro') then
    raise exception 'categoria_invalida';
  end if;
  update arquivos set categoria = p_categoria where id = p_arquivo and projeto_do_escritorio(projeto_id);
  if not found then
    raise exception 'arquivo_nao_encontrado';
  end if;
  -- Deixou de ser render: não pode continuar como capa.
  if p_categoria <> 'render' then
    update projetos set capa_arquivo_id = null where capa_arquivo_id = p_arquivo;
  end if;
end;
$$;
revoke all on function mudar_categoria_arquivo(uuid, text) from public;
grant execute on function mudar_categoria_arquivo(uuid, text) to authenticated;

-- p_arquivo null = tirar a capa escolhida (volta para o render mais recente).
create or replace function definir_capa(p_projeto uuid, p_arquivo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if p_arquivo is not null and not exists (
    select 1 from arquivos where id = p_arquivo and projeto_id = p_projeto and categoria = 'render' and visivel_cliente
      and (tipo like 'image/%' or lower(nome) ~ '\.(jpe?g|png|webp)$')
  ) then
    raise exception 'capa_invalida'; -- só um render visível ao cliente vira capa
  end if;
  update projetos set capa_arquivo_id = p_arquivo where id = p_projeto;
end;
$$;
revoke all on function definir_capa(uuid, uuid) from public;
grant execute on function definir_capa(uuid, uuid) to authenticated;

-- Capa que vale: a escolhida (se ainda é render visível) ou o render visível mais recente.
-- Para o cliente, só entre os arquivos já enviados.
create or replace function capa_do_projeto(p_projeto uuid, p_para_cliente boolean) returns uuid
language sql stable security definer set search_path = public as $$
  select a.id
  from arquivos a
  join projetos p on p.id = a.projeto_id
  left join etapas e on e.id = a.etapa_id
  where a.projeto_id = p_projeto and a.categoria = 'render' and a.visivel_cliente
    and (a.tipo like 'image/%' or lower(a.nome) ~ '\.(jpe?g|png|webp)$') -- capa é sempre imagem
    and (not p_para_cliente or (e.enviada_em is not null and a.criado_em <= e.enviada_em))
  order by (a.id = p.capa_arquivo_id) desc, a.criado_em desc
  limit 1
$$;
revoke all on function capa_do_projeto(uuid, boolean) from public;

-- Lista de projetos do arquiteto: a capa de cada um.
create or replace function capas_dos_projetos(p_projetos uuid[]) returns table (projeto_id uuid, arquivo_id uuid, miniatura text, previa text, caminho text)
language sql stable security definer set search_path = public as $$
  select p.id, a.id, a.miniatura_caminho, a.previa_caminho, a.caminho_storage
  from projetos p
  join arquivos a on a.id = capa_do_projeto(p.id, false)
  where p.id = any(p_projetos) and projeto_do_escritorio(p.id)
$$;
revoke all on function capas_dos_projetos(uuid[]) from public;
grant execute on function capas_dos_projetos(uuid[]) to authenticated;

-- =========================================================
-- Cliente: só o que já foi enviado
-- =========================================================

create or replace function arquivo_enviado(a arquivos, e etapas) returns boolean
language sql immutable as $$
  select a.visivel_cliente and e.enviada_em is not null and a.criado_em <= e.enviada_em
$$;

create or replace function projeto_publico(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
  v_capa uuid := capa_do_projeto(pr.id, true);
begin
  update links_cliente set usado_em = coalesce(usado_em, now()) where token = p_token;
  return jsonb_build_object(
    'id', pr.id,
    'nome', pr.nome,
    'revisoes_incluidas', pr.revisoes_incluidas,
    'revisoes_usadas', revisoes_usadas(pr.id),
    'capa', (
      select jsonb_build_object('id', a.id, 'nome', a.nome, 'caminho', a.caminho_storage,
        'miniatura', a.miniatura_caminho, 'previa', a.previa_caminho)
      from arquivos a where a.id = v_capa
    ),
    'etapas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'nome', e.nome, 'ordem', e.ordem, 'status', e.status, 'prazo', e.prazo,
        'enviada_em', e.enviada_em, 'aprovada_em', e.aprovada_em,
        'arquivos', coalesce((
          select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'versao', a.versao, 'caminho', a.caminho_storage,
            'tipo', a.tipo, 'tamanho', a.tamanho_bytes, 'criado_em', a.criado_em, 'categoria', a.categoria,
            'miniatura', a.miniatura_caminho, 'previa', a.previa_caminho) order by a.nome, a.versao desc)
          from arquivos a where a.etapa_id = e.id and arquivo_enviado(a, e)
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
grant execute on function projeto_publico(text) to anon, authenticated;

-- Baixar com o nome certo pelo link do cliente: confere que o arquivo é dele e já foi enviado.
create or replace function arquivo_do_link(p_token text, p_arquivo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
begin
  return (
    select jsonb_build_object('caminho', a.caminho_storage, 'nome', a.nome, 'versao', a.versao)
    from arquivos a join etapas e on e.id = a.etapa_id
    where a.id = p_arquivo and a.projeto_id = pr.id and arquivo_enviado(a, e)
  );
end;
$$;
revoke all on function arquivo_do_link(text, uuid) from public;
grant execute on function arquivo_do_link(text, uuid) to anon, authenticated;
