-- NorteArq — lembretes de etapa esperando aprovação (RN-03.6): e-mail ao cliente depois de 3 e de 7 dias.
-- Rodar depois de 0029.
--
-- Cada coluna guarda o "enviada_em" para o qual o lembrete já saiu. Assim:
-- * o cron diário nunca manda o mesmo lembrete duas vezes (mesmo rodando de novo no mesmo dia);
-- * se o arquiteto reenviar a etapa (novo enviada_em), a contagem de 3 e 7 dias recomeça.

alter table etapas
  add column if not exists lembrete_3_para timestamptz,
  add column if not exists lembrete_7_para timestamptz;

create index if not exists etapas_aguardando on etapas (enviada_em) where status = 'aguardando_aprovacao';
