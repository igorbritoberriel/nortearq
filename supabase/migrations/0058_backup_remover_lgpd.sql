-- LGPD: arquivos de cliente anonimizado a pedido do titular saem também da cópia de segurança (Cloudflare R2),
-- 30 dias depois do pedido. A anonimização anota aqui os arquivos que tirou do Storage; o backup diário
-- (scripts/backup.mjs) apaga da cópia os que passaram de 30 dias e remove a anotação.
-- Exclusão comum NÃO entra aqui: a cópia guarda esses arquivos para dar para recuperar (ex.: cliente excluído por engano).

create table if not exists backup_remover (
  id bigint generated always as identity primary key,
  balde text not null,
  caminho text not null,
  motivo text not null default 'anonimizado',
  pedido_em timestamptz not null default now()
);

alter table backup_remover enable row level security;
-- Sem políticas e sem permissão para os papéis do site: só o servidor (chave secreta) lê e escreve.
revoke all on backup_remover from anon, authenticated;
