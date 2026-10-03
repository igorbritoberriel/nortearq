-- NorteArq — registro de quem enviou a proposta e a etapa (com equipe, evita o "não fui eu").
-- Contrato (enviado_por), arquivo (enviado_por), aditivo (criado_por) e pagamento (feito_por) já registram.
-- Rodar depois de 0024.

alter table propostas add column if not exists enviada_por uuid references auth.users(id);
alter table etapas add column if not exists enviada_por uuid references auth.users(id);

create or replace function marcar_quem_enviou() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'propostas' and new.status = 'enviada' and old.status is distinct from 'enviada' then
    new.enviada_por := coalesce(auth.uid(), new.enviada_por);
  elsif tg_table_name = 'etapas' and new.status = 'aguardando_aprovacao' and old.status is distinct from 'aguardando_aprovacao' then
    new.enviada_por := coalesce(auth.uid(), new.enviada_por);
  end if;
  return new;
end;
$$;

drop trigger if exists marcar_quem_enviou on propostas;
create trigger marcar_quem_enviou before update on propostas for each row execute function marcar_quem_enviou();
drop trigger if exists marcar_quem_enviou on etapas;
create trigger marcar_quem_enviou before update on etapas for each row execute function marcar_quem_enviou();
