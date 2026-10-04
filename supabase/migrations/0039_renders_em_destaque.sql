-- NorteArq — renders em destaque, escolhidos pelo arquiteto. Rodar depois de 0038.
--
-- O mural "Renders do projeto" deixa de juntar sozinho toda imagem do tipo Render 3D: mostra só os renders
-- que o arquiteto destacou (até 12, na ordem em que foram destacados). Cada destaque vale para o arquivo
-- (etapa + nome): uma versão nova do mesmo arquivo continua em destaque.
-- A capa sai dessa seleção: a escolhida (estrela) ou, sem escolha, o primeiro destaque visível ao cliente.
-- Sem destaque, o projeto fica sem capa (sem quadro com iniciais).

alter table projetos add column if not exists renders_destaque uuid[] not null default '{}';

-- Projetos que já existiam: destaca os renders visíveis atuais (versão mais recente de cada um, até 12),
-- para o cliente continuar vendo o mesmo mural.
update projetos p set renders_destaque = coalesce((
  select array_agg(id order by criado_em) from (
    select id, criado_em from (
      select distinct on (a.etapa_id, lower(a.nome)) a.id, a.criado_em
      from arquivos a
      where a.projeto_id = p.id and a.categoria = 'render' and a.visivel_cliente
        and (a.tipo like 'image/%' or lower(a.nome) ~ '\.(jpe?g|png|webp)$')
      order by a.etapa_id, lower(a.nome), a.versao desc
    ) atuais
    order by criado_em
    limit 12
  ) primeiros
), '{}')
where renders_destaque = '{}';

-- Destacar ou tirar do destaque (só render em imagem do próprio projeto). Devolve a lista nova.
create or replace function destacar_render(p_projeto uuid, p_arquivo uuid, p_destacar boolean) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  a arquivos%rowtype;
  v_lista uuid[];
begin
  perform exigir_escrita();
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  select * into a from arquivos where id = p_arquivo and projeto_id = p_projeto;
  if not found then
    raise exception 'arquivo_nao_encontrado';
  end if;

  -- Tira qualquer versão do mesmo arquivo (etapa + nome) antes de decidir.
  select coalesce(array_agg(x order by ord), '{}') into v_lista
  from unnest((select renders_destaque from projetos where id = p_projeto)) with ordinality t(x, ord)
  where not exists (select 1 from arquivos o where o.id = t.x and o.etapa_id = a.etapa_id and lower(o.nome) = lower(a.nome))
    and exists (select 1 from arquivos o where o.id = t.x);

  if p_destacar then
    if a.categoria <> 'render' or not (a.tipo like 'image/%' or lower(a.nome) ~ '\.(jpe?g|png|webp)$') then
      raise exception 'destaque_invalido'; -- só render em imagem
    end if;
    if cardinality(v_lista) >= 12 then
      raise exception 'limite_destaque';
    end if;
    v_lista := v_lista || p_arquivo;
  else
    -- Saiu do destaque: se era a capa escolhida, a capa volta para o primeiro destaque.
    update projetos set capa_arquivo_id = null
    where id = p_projeto and capa_arquivo_id in (
      select o.id from arquivos o where o.projeto_id = p_projeto and o.etapa_id = a.etapa_id and lower(o.nome) = lower(a.nome)
    );
  end if;

  update projetos set renders_destaque = v_lista where id = p_projeto;
  return v_lista;
end;
$$;
revoke all on function destacar_render(uuid, uuid, boolean) from public;
grant execute on function destacar_render(uuid, uuid, boolean) to authenticated;

-- Mudou o tipo para algo que não é render: sai do destaque e da capa.
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
  if p_categoria <> 'render' then
    update projetos set capa_arquivo_id = null where capa_arquivo_id = p_arquivo;
    update projetos set renders_destaque = array_remove(renders_destaque, p_arquivo) where p_arquivo = any(renders_destaque);
  end if;
end;
$$;
revoke all on function mudar_categoria_arquivo(uuid, text) from public;
grant execute on function mudar_categoria_arquivo(uuid, text) to authenticated;

-- Capa: só render visível em destaque (a estrela escolhe; sem escolha, o primeiro destaque).
-- Vale para a versão mais recente do arquivo destacado; para o cliente, só entre os já enviados.
create or replace function capa_do_projeto(p_projeto uuid, p_para_cliente boolean) returns uuid
language sql stable security definer set search_path = public as $$
  with destaque as (
    select o.etapa_id, lower(o.nome) as nome, t.ord,
      (o.id = p.capa_arquivo_id) as escolhida
    from projetos p
    cross join lateral unnest(p.renders_destaque) with ordinality t(id, ord)
    join arquivos o on o.id = t.id
    where p.id = p_projeto
  )
  select a.id
  from destaque d
  join arquivos a on a.projeto_id = p_projeto and a.etapa_id = d.etapa_id and lower(a.nome) = d.nome
  left join etapas e on e.id = a.etapa_id
  where a.categoria = 'render' and a.visivel_cliente
    and (a.tipo like 'image/%' or lower(a.nome) ~ '\.(jpe?g|png|webp)$')
    and (not p_para_cliente or (e.enviada_em is not null and a.criado_em <= e.enviada_em))
  order by d.escolhida desc, d.ord, a.versao desc
  limit 1
$$;
revoke all on function capa_do_projeto(uuid, boolean) from public;

-- Estrela: só um render em destaque e visível ao cliente vira capa.
create or replace function definir_capa(p_projeto uuid, p_arquivo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if p_arquivo is not null and not exists (
    select 1 from arquivos a join projetos p on p.id = a.projeto_id
    where a.id = p_arquivo and a.projeto_id = p_projeto and a.categoria = 'render' and a.visivel_cliente
      and (a.tipo like 'image/%' or lower(a.nome) ~ '\.(jpe?g|png|webp)$')
      and exists (
        select 1 from arquivos o where o.id = any(p.renders_destaque) and o.etapa_id = a.etapa_id and lower(o.nome) = lower(a.nome)
      )
  ) then
    raise exception 'capa_invalida';
  end if;
  update projetos set capa_arquivo_id = p_arquivo where id = p_projeto;
end;
$$;
revoke all on function definir_capa(uuid, uuid) from public;
grant execute on function definir_capa(uuid, uuid) to authenticated;

-- Cliente: a mesma resposta de antes + a lista de destaques (etapa e nome, só de arquivos visíveis).
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
    'destaque', coalesce((
      select jsonb_agg(jsonb_build_object('etapa_id', a.etapa_id, 'nome', a.nome) order by t.ord)
      from unnest(pr.renders_destaque) with ordinality t(id, ord)
      join arquivos a on a.id = t.id and a.visivel_cliente
    ), '[]'),
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
