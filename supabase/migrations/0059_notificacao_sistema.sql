-- NorteArq — aviso do sistema (NorteArq avisando o escritório, não o cliente). Rodar depois de 0058.
-- Usa a mesma tabela de notificações (sininho); só amplia os tipos aceitos.

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('contato', 'briefing', 'proposta', 'contrato', 'etapa', 'aditivo', 'assinatura', 'pagamento', 'sistema'));
