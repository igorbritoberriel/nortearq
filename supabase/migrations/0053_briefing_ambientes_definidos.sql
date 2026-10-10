-- Guarda separado do que o arquiteto definiu (quais ambientes entram no briefing) e do que o
-- cliente escolheu responder (coluna "ambientes", já existente) — são coisas diferentes.
alter table briefings add column if not exists ambientes_definidos text[];

create or replace function criar_briefing(
  p_cliente_id uuid,
  p_tipos text[] default null,
  p_ambientes text[] default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cli clientes%rowtype;
  tipos_cliente text[];
  copia_perguntas jsonb;
  copia_estilos jsonb := '[]';
  novo_id uuid;
begin
  select * into cli from clientes where id = p_cliente_id;
  if not found then
    raise exception 'cliente_nao_encontrado';
  end if;

  perform copiar_modelo_briefing(cli.escritorio_id);

  if p_tipos is not null then
    select coalesce(array_agg(distinct t), '{}') into tipos_cliente
    from unnest(p_tipos) t where t in ('arquitetura','interiores','reforma');
  else
    -- RN-02.1: só os blocos dos serviços contratados que têm briefing.
    select coalesce(array_agg(distinct s.tipo_briefing) filter (where s.tipo_briefing is not null), '{}')
    into tipos_cliente
    from servicos s
    where s.escritorio_id = cli.escritorio_id and s.tem_briefing and s.id = any(cli.servicos);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'secao', p.tipo_briefing, 'ambiente', p.ambiente, 'texto', p.texto,
      'ajuda', p.ajuda, 'tipo', p.tipo_resposta, 'opcoes', p.opcoes
    ) order by p.ordem, p.criado_em), '[]')
  into copia_perguntas
  from briefing_perguntas p
  where p.escritorio_id = cli.escritorio_id and p.ativa
    and (p.tipo_briefing = 'comum' or p.tipo_briefing = any(tipos_cliente))
    and (p_ambientes is null or p.ambiente is null or p.ambiente = any(p_ambientes));

  with disponiveis as (
    select i.* from estilos_imagens i
    where (i.escritorio_id = cli.escritorio_id or i.escritorio_id is null)
      and not exists (select 1 from estilos_ocultos o where o.imagem_id = i.id and o.escritorio_id = cli.escritorio_id)
  )
  select case when (select count(*) from disponiveis) >= 12 then
    (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'estilo', d.estilo, 'url', d.imagem_url)), '[]')
     from (select * from disponiveis order by (escritorio_id is null), random() limit 24) d)
  else '[]'::jsonb end
  into copia_estilos;

  insert into briefings (escritorio_id, cliente_id, tipos, ambientes_definidos, perguntas, estilos)
  values (cli.escritorio_id, cli.id, tipos_cliente, p_ambientes, copia_perguntas, copia_estilos)
  returning id into novo_id;

  update clientes set etapa = 'briefing' where id = cli.id and etapa = 'contato';
  return novo_id;
end;
$$;

create or replace function ajustar_escopo_briefing(
  p_briefing_id uuid,
  p_tipos text[],
  p_ambientes text[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype;
  tipos_novos text[];
  perguntas_novas jsonb;
begin
  select * into b from briefings where id = p_briefing_id and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'briefing_nao_encontrado';
  end if;
  if b.status not in ('pendente', 'em_andamento') then
    raise exception 'briefing_fechado';
  end if;

  select coalesce(array_agg(distinct t), '{}') into tipos_novos
  from unnest(p_tipos) t where t in ('arquitetura','interiores','reforma');

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'secao', p.tipo_briefing, 'ambiente', p.ambiente, 'texto', p.texto,
      'ajuda', p.ajuda, 'tipo', p.tipo_resposta, 'opcoes', p.opcoes
    ) order by p.ordem, p.criado_em), '[]')
  into perguntas_novas
  from briefing_perguntas p
  where p.escritorio_id = b.escritorio_id and p.ativa
    and (p.tipo_briefing = 'comum' or p.tipo_briefing = any(tipos_novos))
    and (p_ambientes is null or p.ambiente is null or p.ambiente = any(p_ambientes));

  update briefings set
    tipos = tipos_novos,
    ambientes_definidos = p_ambientes,
    perguntas = perguntas_novas,
    atualizado_em = now()
  where id = p_briefing_id;
end;
$$;
