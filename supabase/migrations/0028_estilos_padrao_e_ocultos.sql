-- NorteArq — quiz de estilo: imagens padrão visíveis no editor, trocar pelas suas e voltar ao padrão.
-- Rodar depois de 0027.
--
-- * As imagens padrão do NorteArq (escritorio_id null) são de todos: o escritório não apaga, só esconde
--   as que não quer no quiz dele (estilos_ocultos). "Voltar ao padrão" desfaz o esconder.
-- * Limite de 20 imagens próprias por estilo (o quiz usa no máximo 24 imagens ao todo).
-- * As imagens próprias chegam já recortadas em 4:3 pelo navegador (mesmo formato das padrão).

create table if not exists estilos_ocultos (
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  imagem_id uuid not null references estilos_imagens(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (escritorio_id, imagem_id)
);

alter table estilos_ocultos enable row level security;
create policy "membro vê imagens escondidas" on estilos_ocultos
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro esconde imagem padrão" on estilos_ocultos
  for insert to authenticated with check (
    escritorio_id = meu_escritorio()
    and exists (select 1 from estilos_imagens i where i.id = imagem_id and i.escritorio_id is null)
  );
create policy "membro mostra de novo imagem padrão" on estilos_ocultos
  for delete to authenticated using (escritorio_id = meu_escritorio());
grant select, insert, delete on estilos_ocultos to authenticated;

drop trigger if exists exigir_assinatura on estilos_ocultos;
create trigger exigir_assinatura before insert on estilos_ocultos
  for each row execute function exigir_assinatura_em_dia();

-- Limite de imagens próprias por estilo.
create or replace function limitar_imagens_estilo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.escritorio_id is not null and (
    select count(*) from estilos_imagens where escritorio_id = new.escritorio_id and estilo = new.estilo
  ) >= 20 then
    raise exception 'limite_imagens_estilo';
  end if;
  return new;
end;
$$;

drop trigger if exists limitar_imagens_estilo on estilos_imagens;
create trigger limitar_imagens_estilo before insert on estilos_imagens
  for each row execute function limitar_imagens_estilo();

-- Volta um estilo ao padrão de fábrica: as padrão aparecem de novo. As próprias o servidor apaga
-- junto com o arquivo (Storage), pela ação do editor.
create or replace function restaurar_estilo_padrao(p_estilo text) returns void
language sql security definer set search_path = public as $$
  delete from estilos_ocultos o
  using estilos_imagens i
  where o.imagem_id = i.id and o.escritorio_id = meu_escritorio() and i.estilo = p_estilo;
$$;
revoke all on function restaurar_estilo_padrao(text) from public;
grant execute on function restaurar_estilo_padrao(text) to authenticated;

-- Cria o briefing com a cópia das perguntas e das imagens do quiz, agora sem as padrão escondidas.
create or replace function criar_briefing(p_cliente_id uuid) returns uuid
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

  -- RN-02.1: só os blocos dos serviços contratados que têm briefing.
  select coalesce(array_agg(distinct s.tipo_briefing) filter (where s.tipo_briefing is not null), '{}')
  into tipos_cliente
  from servicos s
  where s.escritorio_id = cli.escritorio_id and s.tem_briefing and s.id = any(cli.servicos);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'secao', p.tipo_briefing, 'ambiente', p.ambiente, 'texto', p.texto,
      'ajuda', p.ajuda, 'tipo', p.tipo_resposta, 'opcoes', p.opcoes
    ) order by p.ordem, p.criado_em), '[]')
  into copia_perguntas
  from briefing_perguntas p
  where p.escritorio_id = cli.escritorio_id and p.ativa
    and (p.tipo_briefing = 'comum' or p.tipo_briefing = any(tipos_cliente));

  -- RN-02.5: o quiz só entra com 12 imagens ou mais (as do escritório primeiro, depois as padrão
  -- que ele não escondeu).
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

  insert into briefings (escritorio_id, cliente_id, tipos, perguntas, estilos)
  values (cli.escritorio_id, cli.id, tipos_cliente, copia_perguntas, copia_estilos)
  returning id into novo_id;

  update clientes set etapa = 'briefing' where id = cli.id and etapa = 'contato';
  return novo_id;
end;
$$;

revoke all on function criar_briefing(uuid) from public;
