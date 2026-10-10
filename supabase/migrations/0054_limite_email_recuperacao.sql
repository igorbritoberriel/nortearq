-- O e-mail de "Esqueci a senha" passou a sair pelo próprio NorteArq (modelo em português).
-- Sem o limite do Supabase Auth, este registro impede usar o formulário para lotar a caixa de alguém:
-- no máximo 1 envio por minuto e 5 por hora para cada e-mail.

create table if not exists envios_recuperacao (
  email text primary key,
  ultimo_envio timestamptz not null default now(),
  janela_inicio timestamptz not null default now(),
  envios_na_janela int not null default 1
);

alter table envios_recuperacao enable row level security;
-- Sem políticas: só o servidor (chave secreta) usa esta tabela.

create or replace function registrar_envio_recuperacao(p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r envios_recuperacao;
begin
  select * into r from envios_recuperacao where email = lower(p_email) for update;
  if not found then
    insert into envios_recuperacao (email) values (lower(p_email));
    return true;
  end if;
  if r.ultimo_envio > now() - interval '1 minute' then
    return false;
  end if;
  if r.janela_inicio > now() - interval '1 hour' then
    if r.envios_na_janela >= 5 then
      return false;
    end if;
    update envios_recuperacao set ultimo_envio = now(), envios_na_janela = envios_na_janela + 1 where email = r.email;
  else
    update envios_recuperacao set ultimo_envio = now(), janela_inicio = now(), envios_na_janela = 1 where email = r.email;
  end if;
  return true;
end $$;

revoke all on function registrar_envio_recuperacao(text) from public, anon, authenticated;
