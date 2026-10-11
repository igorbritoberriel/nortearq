-- Escritório de teste (testes automáticos, contas de conferência): fica fora das contas do painel de
-- administrador do NorteArq. Só quem administra o NorteArq (chave secreta) muda essa marca.

alter table escritorios add column if not exists teste boolean not null default false;

create or replace function proteger_marca_teste() returns trigger
language plpgsql as $$
begin
  if new.teste is distinct from old.teste and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'sem_permissao';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_marca_teste on escritorios;
create trigger proteger_marca_teste before update on escritorios
  for each row execute function proteger_marca_teste();

-- Os escritórios usados no teste completo de 11/10/2026.
update escritorios set teste = true
where id in ('1bae58bb-6a7b-4933-8963-0872950faa59', '791066fe-1a57-4935-bbac-0a5d92ef5aa3');
