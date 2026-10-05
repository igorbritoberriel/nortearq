-- NorteArq — renders do projeto como espaço próprio. Rodar depois de 0039.
--
-- O render deixa de ser um tipo de arquivo das etapas: o arquiteto adiciona e exclui renders direto no projeto
-- (até 12, só imagem), sem etapa e sem aprovação, e o cliente já pode abrir e baixar. Nas etapas, os tipos são
-- Prancha técnica, Documento e Outro.
-- Substitui o "destaque" da 0039: a lista renders_destaque e destacar_render saem.
-- Capa: o render escolhido na estrela ou, sem escolha, o primeiro render adicionado. Sem render, sem capa.

-- Arquivos de etapa que estavam como Render 3D: desenho em imagem vira prancha; o resto, "outro".
update arquivos set categoria = case
    when nome ~* '(planta|layout|corte|eleva[cç][aã]o|detalhamento|prancha|humanizad|implanta[cç][aã]o|pagina[cç][aã]o|forro)' then 'prancha'
    else 'outro'
  end
where categoria = 'render' and etapa_id is not null;

update projetos set capa_arquivo_id = null
where capa_arquivo_id in (select id from arquivos where etapa_id is not null);

alter table arquivos drop constraint if exists arquivos_render_sem_etapa;
alter table arquivos add constraint arquivos_render_sem_etapa check (categoria <> 'render' or etapa_id is null);

drop function if exists destacar_render(uuid, uuid, boolean);
alter table projetos drop column if exists renders_destaque;

-- Render do projeto: só imagem, até 12, sempre visível ao cliente. O navegador já subiu o arquivo (e a miniatura).
create or replace function registrar_render(
  p_projeto uuid, p_nome text, p_caminho text, p_tamanho bigint, p_tipo text,
  p_miniatura text, p_previa text, p_derivados_bytes bigint
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  novo_id uuid;
  v_escritorio uuid;
  v_prefixo text := p_projeto::text || '/';
begin
  perform exigir_escrita();
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if p_caminho not like v_prefixo || '%' or p_caminho like '%..%'
    or (p_miniatura is not null and (p_miniatura not like v_prefixo || '%' or p_miniatura like '%..%'))
    or (p_previa is not null and (p_previa not like v_prefixo || '%' or p_previa like '%..%')) then
    raise exception 'caminho_invalido';
  end if;
  if not (coalesce(p_tipo, '') in ('image/jpeg', 'image/png', 'image/webp') or lower(p_nome) ~ '\.(jpe?g|png|webp)$') then
    raise exception 'render_nao_imagem';
  end if;
  if (select count(*) from arquivos where projeto_id = p_projeto and etapa_id is null and categoria = 'render') >= 12 then
    raise exception 'limite_renders';
  end if;

  select escritorio_id into v_escritorio from projetos where id = p_projeto;
  if espaco_usado(v_escritorio) + coalesce(p_tamanho, 0) + coalesce(p_derivados_bytes, 0) > espaco_do_plano(v_escritorio) then
    raise exception 'espaco_esgotado';
  end if;

  insert into arquivos (projeto_id, etapa_id, nome, versao, caminho_storage, tamanho_bytes, tipo, visivel_cliente, enviado_por,
    categoria, miniatura_caminho, previa_caminho, derivados_bytes, miniatura_tentada_em)
  values (p_projeto, null, left(trim(p_nome), 200), 1, p_caminho, p_tamanho, left(p_tipo, 120), true, auth.uid(),
    'render', p_miniatura, p_previa, greatest(coalesce(p_derivados_bytes, 0), 0), now())
  returning id into novo_id;

  update projetos set atualizado_em = now() where id = p_projeto;
  return novo_id;
end;
$$;
revoke all on function registrar_render(uuid, text, text, bigint, text, text, text, bigint) from public;
grant execute on function registrar_render(uuid, text, text, bigint, text, text, text, bigint) to authenticated;

-- Arquivo de etapa: Prancha técnica, Documento ou Outro (Render 3D é só dos renders do projeto).
create or replace function mudar_categoria_arquivo(p_arquivo uuid, p_categoria text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if p_categoria not in ('prancha','documento','outro') then
    raise exception 'categoria_invalida';
  end if;
  update arquivos set categoria = p_categoria
  where id = p_arquivo and etapa_id is not null and projeto_do_escritorio(projeto_id);
  if not found then
    raise exception 'arquivo_nao_encontrado';
  end if;
end;
$$;
revoke all on function mudar_categoria_arquivo(uuid, text) from public;
grant execute on function mudar_categoria_arquivo(uuid, text) to authenticated;

-- Capa: o render escolhido (se ainda existe) ou o primeiro render adicionado.
create or replace function capa_do_projeto(p_projeto uuid, p_para_cliente boolean) returns uuid
language sql stable security definer set search_path = public as $$
  select a.id
  from arquivos a join projetos p on p.id = a.projeto_id
  where a.projeto_id = p_projeto and a.etapa_id is null and a.categoria = 'render'
  order by (a.id = p.capa_arquivo_id) desc, a.criado_em, a.id
  limit 1
$$;
revoke all on function capa_do_projeto(uuid, boolean) from public;

create or replace function definir_capa(p_projeto uuid, p_arquivo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if not projeto_do_escritorio(p_projeto) then
    raise exception 'projeto_nao_encontrado';
  end if;
  if p_arquivo is not null and not exists (
    select 1 from arquivos where id = p_arquivo and projeto_id = p_projeto and etapa_id is null and categoria = 'render'
  ) then
    raise exception 'capa_invalida';
  end if;
  update projetos set capa_arquivo_id = p_arquivo where id = p_projeto;
end;
$$;
revoke all on function definir_capa(uuid, uuid) from public;
grant execute on function definir_capa(uuid, uuid) to authenticated;

-- Baixar pelo link do cliente: arquivo de etapa já enviado ou render do projeto.
create or replace function arquivo_do_link(p_token text, p_arquivo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype := projeto_do_link(p_token);
begin
  return (
    select jsonb_build_object('caminho', a.caminho_storage, 'nome', a.nome, 'versao', a.versao)
    from arquivos a left join etapas e on e.id = a.etapa_id
    where a.id = p_arquivo and a.projeto_id = pr.id
      and ((a.etapa_id is null and a.categoria = 'render') or (e.id is not null and arquivo_enviado(a, e)))
  );
end;
$$;
revoke all on function arquivo_do_link(text, uuid) from public;
grant execute on function arquivo_do_link(text, uuid) to anon, authenticated;

-- Cliente: a mesma resposta de antes, com os renders do projeto no lugar da lista de destaques.
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
    'renders', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'versao', a.versao, 'caminho', a.caminho_storage,
        'tipo', a.tipo, 'tamanho', a.tamanho_bytes, 'criado_em', a.criado_em,
        'miniatura', a.miniatura_caminho, 'previa', a.previa_caminho) order by a.criado_em, a.id)
      from arquivos a where a.projeto_id = pr.id and a.etapa_id is null and a.categoria = 'render'
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
