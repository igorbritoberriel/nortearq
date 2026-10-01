-- NorteArq — lista de espera do site de vendas (pré-lançamento).
-- Não pertence a nenhum escritório: são arquitetos interessados no produto.
-- Meta do roteiro (especificação, seção 13): 50 inscritos antes de programar a V1.

create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  whatsapp text,
  cidade text,
  perfil text not null
    check (perfil in ('autonomo','escritorio_pequeno','escritorio_grande','estudante')),
  maior_dor text
    check (maior_dor in ('briefing','proposta_contrato','aprovacoes','revisoes_visitas','outro')),
  plano_interesse text
    check (plano_interesse in ('briefing','profissional','escritorio')),
  aceita_conversa boolean not null default false, -- topa entrevista de validação
  utm_source text,
  utm_medium text,
  utm_campaign text,
  aceite_privacidade_em timestamptz not null,     -- RG-8 / RG-11
  ip text,
  criado_em timestamptz not null default now()
);

create unique index lista_espera_email_unico on lista_espera (lower(email));

-- O site (chave anônima) só pode inserir. Ler e exportar: pelo painel do Supabase.
alter table lista_espera enable row level security;

create policy "site insere na lista de espera" on lista_espera
  for insert to anon, authenticated
  with check (true);
