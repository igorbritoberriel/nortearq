-- NorteArq — etapa 5: briefing detalhado (módulo 02).
-- Rodar depois de 0005.

-- =========================================================
-- Serviços: qual bloco de briefing cada um abre (RN-02.1)
-- =========================================================

alter table servicos
  add column if not exists tipo_briefing text check (tipo_briefing in ('arquitetura','interiores','reforma'));

-- Descobre o bloco pelo nome ("Design de interiores" → interiores). O arquiteto pode trocar depois.
create or replace function tipo_briefing_do_servico(nome text) returns text
language sql immutable as $$
  select case
    when gerar_slug(nome) like '%interiores%' then 'interiores'
    when gerar_slug(nome) like '%reforma%' then 'reforma'
    when gerar_slug(nome) like '%arquitetura%' then 'arquitetura'
  end
$$;

update servicos set tipo_briefing = tipo_briefing_do_servico(nome) where tipo_briefing is null and tem_briefing;

create or replace function preencher_tipo_briefing() returns trigger
language plpgsql as $$
begin
  if new.tipo_briefing is null and new.tem_briefing then
    new.tipo_briefing := tipo_briefing_do_servico(new.nome);
  end if;
  return new;
end;
$$;

drop trigger if exists servico_tipo_briefing on servicos;
create trigger servico_tipo_briefing before insert on servicos
  for each row execute function preencher_tipo_briefing();

-- =========================================================
-- Perguntas: modelo NorteArq (escritorio_id null) copiado para cada escritório
-- =========================================================

alter table briefing_perguntas drop constraint if exists briefing_perguntas_tipo_briefing_check;
alter table briefing_perguntas add constraint briefing_perguntas_tipo_briefing_check
  check (tipo_briefing in ('comum','arquitetura','interiores','reforma'));

alter table briefing_perguntas
  add column if not exists ajuda text,
  add column if not exists padrao boolean not null default false, -- RN-02.11: padrão desativa, não apaga
  add column if not exists chave text,                            -- identifica a pergunta do modelo
  add column if not exists criado_em timestamptz not null default now();

alter table briefing_perguntas add constraint briefing_perguntas_opcoes_formato
  check (opcoes is null or jsonb_typeof(opcoes) = 'array');

create unique index if not exists briefing_perguntas_modelo_chave
  on briefing_perguntas (chave) where escritorio_id is null;
create unique index if not exists briefing_perguntas_escritorio_chave
  on briefing_perguntas (escritorio_id, chave) where escritorio_id is not null;
create index if not exists briefing_perguntas_escritorio on briefing_perguntas (escritorio_id, tipo_briefing, ordem);

insert into briefing_perguntas (escritorio_id, padrao, chave, tipo_briefing, ambiente, ordem, texto, ajuda, tipo_resposta, opcoes) values
  -- Arquitetura
  (null, true, 'arq_moradores', 'arquitetura', null, 10, 'Quem vai morar na casa?', 'Quantas pessoas, idades e se tem alguém com necessidade especial.', 'texto', null),
  (null, true, 'arq_quartos', 'arquitetura', null, 20, 'Quantos quartos?', null, 'numero', null),
  (null, true, 'arq_suites', 'arquitetura', null, 30, 'Quantos deles são suítes?', null, 'numero', null),
  (null, true, 'arq_escritorio', 'arquitetura', null, 40, 'Alguém trabalha em casa e precisa de escritório?', null, 'sim_nao', null),
  (null, true, 'arq_hospedes', 'arquitetura', null, 50, 'Recebe visitas para dormir (quarto de hóspedes)?', null, 'sim_nao', null),
  (null, true, 'arq_lazer', 'arquitetura', null, 60, 'O que não pode faltar na área de lazer?', null, 'multipla',
    '["Piscina","Churrasqueira / área gourmet","Jardim","Playground","Academia","Sauna"]'),
  (null, true, 'arq_vagas', 'arquitetura', null, 70, 'Quantas vagas de garagem?', null, 'numero', null),
  (null, true, 'arq_terreno', 'arquitetura', null, 80, 'Qual a metragem do terreno (m²)?', null, 'numero', null),
  (null, true, 'arq_fachada', 'arquitetura', null, 90, 'Fachadas que você gosta', 'Fotos ou prints de casas que chamaram sua atenção.', 'foto', null),
  -- Interiores: sala
  (null, true, 'int_sala_pessoas', 'interiores', 'sala', 10, 'Quantas pessoas costumam ficar na sala ao mesmo tempo?', null, 'numero', null),
  (null, true, 'int_sala_itens', 'interiores', 'sala', 20, 'O que a sala precisa ter?', null, 'multipla',
    '["Sofá grande","TV","Home theater","Mesa de jantar","Bar / aparador","Canto de leitura"]'),
  (null, true, 'int_sala_luz', 'interiores', 'sala', 30, 'Que tipo de iluminação você prefere?', null, 'escolha',
    '["Direta","Indireta","As duas"]'),
  -- Interiores: quarto
  (null, true, 'int_quarto_quem', 'interiores', 'quarto', 10, 'De quem é o quarto?', 'Se forem vários quartos, conte um pouco de cada um.', 'texto', null),
  (null, true, 'int_quarto_cama', 'interiores', 'quarto', 20, 'Tamanho da cama', null, 'escolha',
    '["Solteiro","Viúva","Casal","Queen","King"]'),
  (null, true, 'int_quarto_itens', 'interiores', 'quarto', 30, 'O quarto precisa de…', null, 'multipla',
    '["Espelho","Penteadeira","Escrivaninha","Closet ou armário grande","TV","Poltrona"]'),
  (null, true, 'int_quarto_luz', 'interiores', 'quarto', 40, 'Que tipo de iluminação você prefere?', null, 'escolha',
    '["Direta","Indireta","As duas"]'),
  -- Interiores: cozinha
  (null, true, 'int_cozinha_uso', 'interiores', 'cozinha', 10, 'Como você usa a cozinha?', null, 'escolha',
    '["Cozinho todo dia","Cozinho às vezes","Quase não cozinho"]'),
  (null, true, 'int_cozinha_integrada', 'interiores', 'cozinha', 20, 'Quer a cozinha integrada à sala?', null, 'escolha',
    '["Sim","Não","Tanto faz"]'),
  (null, true, 'int_cozinha_eletros', 'interiores', 'cozinha', 30, 'Quais eletrodomésticos precisam de espaço?', null, 'multipla',
    '["Cooktop","Forno embutido","Micro-ondas","Lava-louças","Adega","Geladeira grande (duplex / inverse)"]'),
  -- Interiores: banheiro
  (null, true, 'int_banheiro_banho', 'interiores', 'banheiro', 10, 'Box ou banheira?', null, 'escolha', '["Box","Banheira","Os dois"]'),
  (null, true, 'int_banheiro_cubas', 'interiores', 'banheiro', 20, 'Quantas cubas na bancada?', null, 'escolha', '["Uma","Duas"]'),
  (null, true, 'int_banheiro_armario', 'interiores', 'banheiro', 30, 'Precisa de nichos ou armário extra?', null, 'sim_nao', null),
  -- Interiores: varanda
  (null, true, 'int_varanda_uso', 'interiores', 'varanda', 10, 'Como quer usar a varanda?', null, 'multipla',
    '["Refeições","Churrasqueira","Descanso","Plantas e horta","Trabalho"]'),
  -- Interiores: home office
  (null, true, 'int_office_pessoas', 'interiores', 'home_office', 10, 'Quantas pessoas trabalham ao mesmo tempo?', null, 'numero', null),
  (null, true, 'int_office_video', 'interiores', 'home_office', 20, 'Faz videochamadas com frequência?', null, 'sim_nao', null),
  (null, true, 'int_office_itens', 'interiores', 'home_office', 30, 'O que precisa caber?', null, 'multipla',
    '["Dois monitores","Impressora","Estante de livros","Arquivo / gaveteiro"]'),
  -- Reforma
  (null, true, 'ref_mudancas', 'reforma', null, 10, 'O que você quer mudar?', null, 'texto', null),
  (null, true, 'ref_prioridades', 'reforma', null, 20, 'O que é prioridade na reforma?', null, 'multipla',
    '["Elétrica","Hidráulica","Piso","Revestimentos","Marcenaria","Iluminação","Pintura","Mudar a planta (layout)"]'),
  (null, true, 'ref_estado', 'reforma', null, 30, 'Fotos do estado atual', 'Tire fotos de cada ambiente que vai mudar.', 'foto', null),
  (null, true, 'ref_medidas', 'reforma', null, 40, 'Medidas que você já tem', 'Pode ser aproximado. Se tiver a planta, envie nas fotos do imóvel.', 'texto', null),
  (null, true, 'ref_morando', 'reforma', null, 50, 'Vai morar no imóvel durante a obra?', null, 'sim_nao', null),
  -- Comum a todos
  (null, true, 'com_rotina', 'comum', null, 10, 'Como é a rotina de quem vai usar o espaço?', 'Horários, hobbies, se recebe amigos, se tem crianças ou idosos.', 'texto', null),
  (null, true, 'com_pets', 'comum', null, 20, 'Tem animais de estimação?', null, 'sim_nao', null),
  (null, true, 'com_prioridades', 'comum', null, 30, 'O que é mais importante para você?', null, 'multipla',
    '["Conforto","Praticidade no dia a dia","Beleza","Fácil de limpar","Durabilidade","Economia","Sustentabilidade"]'),
  (null, true, 'com_evitar', 'comum', null, 40, 'Tem algo que você não quer de jeito nenhum?', null, 'texto', null),
  (null, true, 'com_investimento', 'comum', null, 50, 'Até quanto pretende investir na obra e nos móveis (R$)?', 'Um valor aproximado ajuda a propor soluções possíveis.', 'numero', null),
  (null, true, 'com_referencias', 'comum', null, 60, 'Fotos de referência', 'Prints do Pinterest, do Instagram ou de lugares que você gostou. Até 20 fotos.', 'foto', null),
  (null, true, 'com_imovel', 'comum', null, 70, 'Fotos e documentos do imóvel', 'Fotos de como está hoje, planta e medidas, se tiver.', 'foto', null)
on conflict do nothing;

-- Copia as perguntas do modelo que o escritório ainda não tem.
create or replace function copiar_modelo_briefing(p_escritorio uuid) returns void
language sql security definer set search_path = public as $$
  insert into briefing_perguntas (escritorio_id, padrao, chave, tipo_briefing, ambiente, ordem, texto, ajuda, tipo_resposta, opcoes, ativa)
  select p_escritorio, true, m.chave, m.tipo_briefing, m.ambiente, m.ordem, m.texto, m.ajuda, m.tipo_resposta, m.opcoes, true
  from briefing_perguntas m
  where m.escritorio_id is null
    and not exists (select 1 from briefing_perguntas p where p.escritorio_id = p_escritorio and p.chave = m.chave)
$$;

revoke all on function copiar_modelo_briefing(uuid) from public;

-- Versão para o arquiteto: só copia para o próprio escritório.
create or replace function garantir_modelo_briefing() returns void
language sql security definer set search_path = public as $$
  select copiar_modelo_briefing(meu_escritorio()) where meu_escritorio() is not null
$$;

revoke all on function garantir_modelo_briefing() from public;
grant execute on function garantir_modelo_briefing() to authenticated;

create or replace function escritorio_novo_modelo_briefing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform copiar_modelo_briefing(new.id);
  return new;
end;
$$;

drop trigger if exists escritorio_modelo_briefing on escritorios;
create trigger escritorio_modelo_briefing after insert on escritorios
  for each row execute function escritorio_novo_modelo_briefing();

select copiar_modelo_briefing(id) from escritorios;

-- Segurança (RN-00.1, RN-02.10, RN-02.11)
create policy "membro vê as perguntas do escritório" on briefing_perguntas
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro cria perguntas" on briefing_perguntas
  for insert to authenticated with check (escritorio_id = meu_escritorio() and not padrao);
create policy "membro edita perguntas" on briefing_perguntas
  for update to authenticated using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());
create policy "membro apaga só perguntas próprias" on briefing_perguntas
  for delete to authenticated using (escritorio_id = meu_escritorio() and not padrao);

revoke insert, update on briefing_perguntas from authenticated;
grant insert (escritorio_id, tipo_briefing, ambiente, texto, ajuda, tipo_resposta, opcoes, ativa, ordem)
  on briefing_perguntas to authenticated;
grant update (texto, ajuda, opcoes, ativa, ordem) on briefing_perguntas to authenticated;

-- =========================================================
-- Imagens do quiz de estilo (RN-02.5, RN-02.10)
-- =========================================================

alter table estilos_imagens
  add column if not exists caminho text, -- arquivo no bucket "estilos" (para apagar)
  add column if not exists criado_em timestamptz not null default now();

alter table estilos_imagens add constraint estilos_imagens_estilo_valido
  check (estilo in ('contemporaneo','minimalista','industrial','classico','escandinavo','rustico','boho','japandi'))
  not valid;

create index if not exists estilos_imagens_escritorio on estilos_imagens (escritorio_id);

create policy "membro vê imagens de estilo" on estilos_imagens
  for select to authenticated using (escritorio_id = meu_escritorio() or escritorio_id is null);
create policy "membro adiciona imagens de estilo" on estilos_imagens
  for insert to authenticated with check (escritorio_id = meu_escritorio());
create policy "membro apaga imagens de estilo" on estilos_imagens
  for delete to authenticated using (escritorio_id = meu_escritorio());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('estilos', 'estilos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "membro envia imagens de estilo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'estilos' and (storage.foldername(name))[1] = meu_escritorio()::text);
create policy "membro vê os arquivos de estilo" on storage.objects
  for select to authenticated
  using (bucket_id = 'estilos' and (storage.foldername(name))[1] = meu_escritorio()::text);
create policy "membro apaga imagens de estilo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'estilos' and (storage.foldername(name))[1] = meu_escritorio()::text);

-- =========================================================
-- Briefings
-- =========================================================

alter table briefings
  add column if not exists perguntas jsonb not null default '[]',      -- cópia das perguntas (RN-02.12)
  add column if not exists estilos jsonb not null default '[]',        -- cópia das imagens do quiz
  add column if not exists estilos_rejeitados uuid[] not null default '{}',
  add column if not exists estilos_principais text[] not null default '{}', -- empate: mais de um (RN-02.5)
  add column if not exists estilos_pontuacao jsonb,                    -- { estilo: % de "gosto" }
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists validado_em timestamptz;

create index if not exists briefings_escritorio_data on briefings (escritorio_id, atualizado_em desc);
create index if not exists briefings_cliente on briefings (cliente_id, criado_em desc);

create policy "membro vê briefings do escritório" on briefings
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro reabre e valida briefings" on briefings
  for update to authenticated using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- O arquiteto não altera as respostas do cliente: só reabre (RN-02.7) e valida (RN-02.9).
revoke insert, update, delete on briefings from authenticated;
grant update (status, validado_em, atualizado_em) on briefings to authenticated;

-- Cria o briefing com a cópia das perguntas e das imagens do quiz. Uso interno.
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

  -- RN-02.5: o quiz só entra com 12 imagens ou mais (do escritório e, se faltar, do banco padrão).
  if (select count(*) from estilos_imagens where escritorio_id = cli.escritorio_id or escritorio_id is null) >= 12 then
    select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'estilo', i.estilo, 'url', i.imagem_url)), '[]')
    into copia_estilos
    from (
      select * from estilos_imagens
      where escritorio_id = cli.escritorio_id or escritorio_id is null
      order by (escritorio_id is null), random()
      limit 24
    ) i;
  end if;

  insert into briefings (escritorio_id, cliente_id, tipos, perguntas, estilos)
  values (cli.escritorio_id, cli.id, tipos_cliente, copia_perguntas, copia_estilos)
  returning id into novo_id;

  update clientes set etapa = 'briefing' where id = cli.id and etapa = 'contato';
  return novo_id;
end;
$$;

revoke all on function criar_briefing(uuid) from public;

-- Chamado ao gerar o link de briefing: reaproveita o briefing do cliente ou cria um.
create or replace function preparar_briefing(p_cliente_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  existente uuid;
begin
  if not exists (select 1 from clientes where id = p_cliente_id and escritorio_id = meu_escritorio()) then
    raise exception 'cliente_nao_encontrado';
  end if;
  select id into existente from briefings where cliente_id = p_cliente_id order by criado_em desc limit 1;
  return coalesce(existente, criar_briefing(p_cliente_id));
end;
$$;

revoke all on function preparar_briefing(uuid) from public;
grant execute on function preparar_briefing(uuid) to authenticated;

-- =========================================================
-- Lado do cliente (/c/[token]/briefing): tudo passa pelo código do link (RG-7)
-- =========================================================

-- Briefing do link, se o link for válido e de briefing. Uso interno.
create or replace function briefing_do_link(p_token text) returns briefings
language plpgsql security definer set search_path = public as $$
declare
  l links_cliente%rowtype;
  b briefings%rowtype;
  novo_id uuid;
begin
  select * into l from links_cliente
  where token = p_token and length(p_token) >= 32 and destino = 'briefing' and expira_em > now();
  if not found then
    raise exception 'link_invalido';
  end if;

  select * into b from briefings where cliente_id = l.cliente_id order by criado_em desc limit 1;
  if not found then
    -- Link gerado antes do briefing existir: cria agora.
    novo_id := criar_briefing(l.cliente_id);
    select * into b from briefings where id = novo_id;
  end if;
  return b;
end;
$$;

revoke all on function briefing_do_link(text) from public;

create or replace function briefing_publico(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
begin
  update links_cliente set usado_em = coalesce(usado_em, now()) where token = p_token;
  return jsonb_build_object(
    'id', b.id,
    'status', b.status,
    'tipos', to_jsonb(b.tipos),
    'ambientes', to_jsonb(b.ambientes),
    'perguntas', b.perguntas,
    'respostas', b.respostas,
    'estilos', b.estilos,
    'curtidos', to_jsonb(b.estilos_curtidos),
    'rejeitados', to_jsonb(b.estilos_rejeitados)
  );
end;
$$;

revoke all on function briefing_publico(text) from public;
grant execute on function briefing_publico(text) to anon, authenticated;

-- Salvamento automático (RN-02.3). Fotos têm funções próprias.
create or replace function salvar_briefing(
  p_token text,
  p_respostas jsonb,
  p_ambientes text[],
  p_curtidos uuid[],
  p_rejeitados uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
  novas jsonb;
  fotos jsonb;
begin
  if b.status not in ('pendente', 'em_andamento') then
    raise exception 'briefing_fechado'; -- RN-02.7
  end if;
  if jsonb_typeof(p_respostas) <> 'object' or pg_column_size(p_respostas) > 200000 then
    raise exception 'dados_invalidos';
  end if;

  -- Só respostas de perguntas que existem na cópia deste briefing.
  select coalesce(jsonb_object_agg(r.key, r.value), '{}') into novas
  from jsonb_each(p_respostas) r
  join jsonb_array_elements(b.perguntas) p on p->>'id' = r.key and p->>'tipo' <> 'foto';

  select coalesce(jsonb_object_agg(r.key, r.value), '{}') into fotos
  from jsonb_each(b.respostas) r
  join jsonb_array_elements(b.perguntas) p on p->>'id' = r.key and p->>'tipo' = 'foto';

  update briefings set
    respostas = novas || fotos,
    ambientes = coalesce((
      select array_agg(distinct a) from unnest(p_ambientes) a
      where exists (select 1 from jsonb_array_elements(b.perguntas) p where p->>'ambiente' = a)
    ), '{}'),
    estilos_curtidos = coalesce((
      select array_agg(distinct c) from unnest(p_curtidos) c
      where exists (select 1 from jsonb_array_elements(b.estilos) e where (e->>'id')::uuid = c)
    ), '{}'),
    estilos_rejeitados = coalesce((
      select array_agg(distinct c) from unnest(p_rejeitados) c
      where exists (select 1 from jsonb_array_elements(b.estilos) e where (e->>'id')::uuid = c)
    ), '{}'),
    status = 'em_andamento',
    atualizado_em = now()
  where id = b.id;
end;
$$;

revoke all on function salvar_briefing(text, jsonb, text[], uuid[], uuid[]) from public;
grant execute on function salvar_briefing(text, jsonb, text[], uuid[], uuid[]) to anon, authenticated;

-- Envio final: calcula o estilo (RN-02.5) e fecha para edição (RN-02.7). Devolve o id para o aviso.
create or replace function enviar_briefing(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
  pontuacao jsonb;
  maior numeric;
  principais text[] := '{}';
  secundarios text[] := '{}';
begin
  if b.status not in ('pendente', 'em_andamento') then
    raise exception 'briefing_fechado';
  end if;

  -- % de "gosto" entre as imagens mostradas de cada estilo.
  select jsonb_object_agg(estilo, pct) into pontuacao from (
    select e->>'estilo' as estilo,
      round(100.0 * count(*) filter (where (e->>'id')::uuid = any(b.estilos_curtidos)) / count(*)) as pct
    from jsonb_array_elements(b.estilos) e
    group by e->>'estilo'
  ) t;

  select max(value::numeric) into maior from jsonb_each_text(coalesce(pontuacao, '{}'));
  if maior > 0 then
    -- Empate no topo: todos viram principais.
    select array_agg(key order by key) into principais
    from jsonb_each_text(pontuacao) where value::numeric = maior;
    select coalesce(array_agg(key), '{}') into secundarios from (
      select key from jsonb_each_text(pontuacao)
      where value::numeric > 0 and value::numeric < maior
      order by value::numeric desc, key limit 2
    ) s;
  end if;

  update briefings set
    status = 'respondido',
    respondido_em = now(),
    atualizado_em = now(),
    estilos_pontuacao = pontuacao,
    estilos_principais = principais,
    estilo_principal = principais[1],
    estilos_secundarios = secundarios
  where id = b.id;

  return b.id;
end;
$$;

revoke all on function enviar_briefing(text) from public;
grant execute on function enviar_briefing(text) to anon, authenticated;

-- =========================================================
-- Fotos do briefing (RN-02.6): até 20 por pergunta, 10 MB cada.
-- O arquivo sobe direto para o Storage com uma URL assinada pelo servidor;
-- estas funções só conferem o link e registram o caminho.
-- =========================================================

create or replace function briefing_foto_permitida(p_token text, p_pergunta text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
begin
  if b.status not in ('pendente', 'em_andamento') then
    raise exception 'briefing_fechado';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(b.perguntas) p where p->>'id' = p_pergunta and p->>'tipo' = 'foto'
  ) then
    raise exception 'pergunta_invalida';
  end if;
  return jsonb_build_object(
    'briefing_id', b.id,
    'quantidade', coalesce(jsonb_array_length(b.respostas->p_pergunta), 0)
  );
end;
$$;

revoke all on function briefing_foto_permitida(text, text) from public;
grant execute on function briefing_foto_permitida(text, text) to anon, authenticated;

create or replace function adicionar_foto_briefing(p_token text, p_pergunta text, p_caminho text) returns void
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
  atuais jsonb;
begin
  perform briefing_foto_permitida(p_token, p_pergunta);
  if p_caminho !~ ('^' || b.id || '/' || p_pergunta || '/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$') then
    raise exception 'caminho_invalido';
  end if;
  atuais := coalesce(b.respostas->p_pergunta, '[]');
  if jsonb_array_length(atuais) >= 20 then
    raise exception 'limite_fotos';
  end if;
  if atuais ? p_caminho then
    return;
  end if;
  update briefings set
    respostas = respostas || jsonb_build_object(p_pergunta, atuais || to_jsonb(p_caminho)),
    status = 'em_andamento',
    atualizado_em = now()
  where id = b.id;
end;
$$;

revoke all on function adicionar_foto_briefing(text, text, text) from public;
grant execute on function adicionar_foto_briefing(text, text, text) to anon, authenticated;

create or replace function remover_foto_briefing(p_token text, p_pergunta text, p_caminho text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  b briefings%rowtype := briefing_do_link(p_token);
begin
  perform briefing_foto_permitida(p_token, p_pergunta);
  if not coalesce(b.respostas->p_pergunta, '[]') ? p_caminho then
    return false;
  end if;
  update briefings set
    respostas = jsonb_set(respostas, array[p_pergunta], (respostas->p_pergunta) - p_caminho),
    atualizado_em = now()
  where id = b.id;
  return true;
end;
$$;

revoke all on function remover_foto_briefing(text, text, text) from public;
grant execute on function remover_foto_briefing(text, text, text) to anon, authenticated;

-- Bucket privado: o cliente envia pela URL assinada; o arquiteto lê os do próprio escritório.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('briefings', 'briefings', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "membro vê as fotos dos briefings do escritório" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'briefings'
    and exists (
      select 1 from briefings b
      where b.id::text = (storage.foldername(name))[1] and b.escritorio_id = meu_escritorio()
    )
  );
