-- NorteArq — esquema inicial (rascunho do esqueleto).
-- Rodar no Supabase: SQL Editor > colar e executar, ou `supabase db push`.
-- Convenção: tudo pertence a um `escritorio` (multi-inquilino).

create extension if not exists "pgcrypto";

-- =========================================================
-- 00 · BASE
-- =========================================================

create table escritorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,                 -- usado em /e/[escritorio]
  logo_url text,
  cor_primaria text default '#1f3a5f',
  whatsapp text,
  plano text not null default 'trial' check (plano in ('trial','briefing','profissional','escritorio')),
  trial_ate date default (current_date + 14),
  faixa_preco_min numeric,                   -- filtro de compatibilidade (01)
  faixa_preco_max numeric,
  criado_em timestamptz not null default now()
);

-- Usuários do escritório (arquiteto dono + equipe). id = auth.users.id
create table membros (
  id uuid primary key references auth.users(id) on delete cascade,
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null,
  papel text not null default 'dono' check (papel in ('dono','equipe')),
  criado_em timestamptz not null default now()
);

create table servicos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null,                         -- Arquitetura, Interiores, Reforma, Legalização...
  tem_briefing boolean not null default true, -- Legalização = false
  ordem int not null default 0
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  usuario_id uuid references auth.users(id),  -- preenchido quando o cliente cria senha do portal
  nome text not null,
  documento text,                              -- CPF/CNPJ
  telefone text,
  email text,
  endereco_imovel text,
  etapa text not null default 'contato'
    check (etapa in ('contato','briefing','proposta','contrato','projeto','obra','entregue','encerrado')),
  criado_em timestamptz not null default now()
);

-- Links sem login enviados por WhatsApp (/c/[token]/...)
create table links_cliente (
  token text primary key default encode(gen_random_bytes(24), 'hex'),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  destino text not null check (destino in ('briefing','proposta','contrato')),
  referencia_id uuid,                          -- proposta/contrato específico
  expira_em timestamptz not null default (now() + interval '30 days'),
  usado_em timestamptz
);

-- =========================================================
-- 01 · CAPTAÇÃO E FECHAMENTO
-- =========================================================

create table contatos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null,
  whatsapp text,
  email text,
  servicos uuid[] not null default '{}',
  area_m2 numeric,
  localizacao text,
  orcamento_disponivel numeric,
  prazo_desejado text,
  compativel boolean,                          -- calculado pelo filtro
  status text not null default 'novo'
    check (status in ('novo','compativel','fora_do_perfil','convertido','encerrado')),
  motivo_encerramento text,
  cliente_id uuid references clientes(id),
  criado_em timestamptz not null default now()
);

create table propostas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  escopo text,
  entregaveis text,
  nao_incluido text,
  valor_total numeric,
  forma_pagamento text,
  prazo text,
  revisoes_incluidas int not null default 2,   -- base do controle do contratado
  visitas_incluidas int not null default 0,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviada','aprovada','ajuste_pedido','recusada')),
  comentario_cliente text,
  motivo_recusa text,
  respondida_em timestamptz,
  criado_em timestamptz not null default now()
);

create table modelos_contrato (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null,
  corpo text not null                          -- com campos {{cliente.nome}}, {{proposta.valor_total}}...
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  proposta_id uuid not null references propostas(id),
  conteudo text not null,                      -- texto final já preenchido
  status text not null default 'aguardando_assinatura'
    check (status in ('aguardando_assinatura','assinado','cancelado')),
  assinatura_externa_id text,                  -- ZapSign / Clicksign
  assinado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  descricao text not null,                     -- Entrada, Parcela etapa X, Saldo...
  valor numeric not null,
  vencimento date,
  pago_em date
);

-- =========================================================
-- 02 · BRIEFING DETALHADO
-- =========================================================

create table briefing_perguntas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid references escritorios(id) on delete cascade, -- null = modelo padrão NorteArq
  tipo_briefing text not null check (tipo_briefing in ('arquitetura','interiores','reforma')),
  ambiente text,                               -- só interiores: sala, quarto, cozinha...
  texto text not null,
  tipo_resposta text not null
    check (tipo_resposta in ('texto','escolha','multipla','numero','sim_nao','foto')),
  opcoes jsonb,
  ativa boolean not null default true,
  ordem int not null default 0
);

create table estilos_imagens (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid references escritorios(id) on delete cascade, -- null = banco padrão
  estilo text not null,                        -- clean, industrial, contemporâneo...
  imagem_url text not null,
  ambiente text
);

create table briefings (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipos text[] not null,                       -- quais blocos o cliente responde
  ambientes text[] not null default '{}',
  respostas jsonb not null default '{}',       -- { pergunta_id: resposta }
  estilos_curtidos uuid[] not null default '{}',
  estilo_principal text,
  estilos_secundarios text[],
  status text not null default 'pendente' check (status in ('pendente','em_andamento','respondido','validado')),
  respondido_em timestamptz,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- 03 · PROJETO E APROVAÇÕES
-- =========================================================

create table projetos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  contrato_id uuid references contratos(id),
  nome text not null,
  revisoes_incluidas int not null default 2,
  visitas_incluidas int not null default 0,
  tem_obra boolean not null default false,     -- libera o módulo 04
  status text not null default 'ativo' check (status in ('ativo','entregue','encerrado')),
  criado_em timestamptz not null default now()
);

create table etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  nome text not null,                          -- Estudo preliminar, Anteprojeto, Executivo...
  ordem int not null,
  prazo date,
  status text not null default 'pendente'
    check (status in ('pendente','em_andamento','aguardando_aprovacao','revisao','aprovada'))
);

create table arquivos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  etapa_id uuid references etapas(id) on delete set null,
  nome text not null,
  versao int not null default 1,               -- Rev01, Rev02...
  caminho_storage text not null,               -- Supabase Storage
  tamanho_bytes bigint,
  enviado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- Cada clique de aprovar/pedir revisão fica registrado (vale como prova)
create table aprovacoes (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references etapas(id) on delete cascade,
  decisao text not null check (decisao in ('aprovada','revisao_pedida')),
  comentario text,
  decidido_por uuid references auth.users(id),
  decidido_em timestamptz not null default now()
);

create table aditivos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  descricao text not null,
  valor numeric,
  impacto_prazo text,
  status text not null default 'enviado' check (status in ('enviado','aprovado','recusado')),
  respondido_em timestamptz
);

-- =========================================================
-- 04 · OBRA
-- =========================================================

create table visitas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  data_hora timestamptz not null,
  motivo text not null,                        -- revestimento, materiais...
  observacoes text,
  fotos text[] not null default '{}',
  solicitada_pelo_cliente boolean not null default false,
  extra boolean not null default false,        -- além das contratadas
  criado_em timestamptz not null default now()
);

create table alteracoes_obra (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  descricao text not null,
  impacto_custo numeric,
  impacto_prazo text,
  status text not null default 'aguardando' check (status in ('aguardando','aprovada','recusada')),
  respondido_em timestamptz
);

create table pendencias_vistoria (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  descricao text not null,
  resolvida_em timestamptz
);

-- =========================================================
-- 05 · PÓS-ENTREGA
-- =========================================================

create table avaliacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  nota int not null check (nota between 0 and 10),
  comentario text,
  autoriza_depoimento boolean not null default false,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- SEGURANÇA (RLS)
-- Regra geral: membro só vê dados do próprio escritório;
-- cliente só vê os próprios projetos. Políticas detalhadas: TODO.
-- =========================================================

create or replace function meu_escritorio() returns uuid
language sql stable security definer set search_path = public as $$
  select escritorio_id from membros where id = auth.uid()
$$;

alter table escritorios enable row level security;
alter table membros enable row level security;
alter table servicos enable row level security;
alter table clientes enable row level security;
alter table links_cliente enable row level security;
alter table contatos enable row level security;
alter table propostas enable row level security;
alter table modelos_contrato enable row level security;
alter table contratos enable row level security;
alter table pagamentos enable row level security;
alter table briefing_perguntas enable row level security;
alter table estilos_imagens enable row level security;
alter table briefings enable row level security;
alter table projetos enable row level security;
alter table etapas enable row level security;
alter table arquivos enable row level security;
alter table aprovacoes enable row level security;
alter table aditivos enable row level security;
alter table visitas enable row level security;
alter table alteracoes_obra enable row level security;
alter table pendencias_vistoria enable row level security;
alter table avaliacoes enable row level security;

-- Exemplo de política (replicar para as tabelas com escritorio_id):
create policy "membro acessa clientes do escritório" on clientes
  for all using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());
