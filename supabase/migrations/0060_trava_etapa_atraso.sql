-- NorteArq — trava de etapa com parcela em atraso (RN-01.17). Rodar depois de 0059.
-- Ligada, o escritório só envia etapa nova para aprovação se o contrato do projeto não tiver parcela vencida
-- sem pagamento; a arquiteta pode liberar na hora ("Enviar mesmo assim"). Desligada por padrão.

alter table escritorios add column if not exists travar_etapa_atraso boolean not null default false;
grant update (travar_etapa_atraso) on escritorios to authenticated;
