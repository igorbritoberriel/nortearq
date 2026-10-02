-- NorteArq — notificações dentro do app para o arquiteto (sininho + aviso na tela).
-- Criadas pelo servidor (chave secreta) nos mesmos momentos dos avisos por e-mail (lib/avisos.ts).
-- Rodar depois de 0012.

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  tipo text not null check (tipo in ('contato','briefing','proposta','contrato','etapa')),
  titulo text not null,
  texto text,
  link text,                                   -- caminho interno, ex.: /app/contatos
  criada_em timestamptz not null default now(),
  lida_em timestamptz
);

create index if not exists notificacoes_escritorio_data on notificacoes (escritorio_id, criada_em desc);

alter table notificacoes enable row level security;

-- RN-00.1: cada escritório só vê as próprias.
create policy "membro vê notificações do escritório" on notificacoes
  for select to authenticated using (escritorio_id = meu_escritorio());

create policy "membro marca notificações como lidas" on notificacoes
  for update to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- O app só cria pela chave secreta; o arquiteto só marca como lida.
revoke insert, update, delete on notificacoes from authenticated, anon;
grant update (lida_em) on notificacoes to authenticated;

-- Aviso na hora (Supabase Realtime). O Realtime respeita o RLS acima.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table notificacoes;
  end if;
end $$;
