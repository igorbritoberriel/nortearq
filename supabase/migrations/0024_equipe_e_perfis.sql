-- NorteArq — equipe do escritório e perfis de acesso. Rodar depois de 0023.
--
-- Perfis:
--   dono          → tudo, inclusive plano e assinatura (um por escritório)
--   administrador → tudo, menos plano e assinatura
--   colaborador   → clientes, briefings, projetos e arquivos; SEM valores e SEM financeiro
-- Equipe: plano Escritório (e durante o teste, para experimentar), até 5 pessoas contando o dono.
-- Convite por e-mail com validade de 7 dias.

-- =========================================================
-- Perfis e dados dos membros
-- =========================================================

alter table membros drop constraint if exists membros_papel_check;
update membros set papel = 'administrador' where papel = 'equipe';
alter table membros add constraint membros_papel_check check (papel in ('dono','administrador','colaborador'));

alter table membros
  add column if not exists email text,
  add column if not exists ultimo_acesso timestamptz;

update membros m set email = u.email from auth.users u where u.id = m.id and m.email is null;

create or replace function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from membros where id = auth.uid()
$$;
revoke all on function meu_papel() from public;
grant execute on function meu_papel() to authenticated;

-- Escritório do membro, só se ele pode ver o financeiro (dono e administrador).
create or replace function meu_escritorio_financeiro() returns uuid
language sql stable security definer set search_path = public as $$
  select escritorio_id from membros where id = auth.uid() and papel in ('dono','administrador')
$$;
revoke all on function meu_escritorio_financeiro() from public;
grant execute on function meu_escritorio_financeiro() to authenticated;

-- Último acesso (no máximo uma gravação por hora).
create or replace function registrar_acesso() returns void
language sql security definer set search_path = public as $$
  update membros set ultimo_acesso = now()
  where id = auth.uid() and (ultimo_acesso is null or ultimo_acesso < now() - interval '1 hour')
$$;
revoke all on function registrar_acesso() from public;
grant execute on function registrar_acesso() to authenticated;

-- =========================================================
-- Colaborador sem financeiro, travado no banco
-- 1) Políticas restritivas nas tabelas de valores (somam-se às que já existem).
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array['propostas','contratos','pagamentos','pagamentos_eventos','aditivos',
    'modelos_proposta','modelos_contrato','assinatura_eventos']
  loop
    execute format('drop policy if exists "colaborador não vê financeiro" on %I', t);
    execute format(
      'create policy "colaborador não vê financeiro" on %I as restrictive for all to authenticated
         using (coalesce(meu_papel(), '''') <> ''colaborador'') with check (coalesce(meu_papel(), '''') <> ''colaborador'')', t);
  end loop;
end $$;

-- Notificações com valores (proposta, contrato, aditivo, assinatura) também não aparecem para ele.
drop policy if exists "colaborador só vê notificações sem valores" on notificacoes;
create policy "colaborador só vê notificações sem valores" on notificacoes as restrictive for select to authenticated
  using (coalesce(meu_papel(), '') <> 'colaborador' or tipo in ('contato','briefing','etapa'));

-- Links de proposta e contrato (mostram valores) idem.
drop policy if exists "colaborador não vê links de proposta e contrato" on links_cliente;
create policy "colaborador não vê links de proposta e contrato" on links_cliente as restrictive for select to authenticated
  using (coalesce(meu_papel(), '') <> 'colaborador' or destino not in ('proposta','contrato'));

-- Configurações do escritório (marca, faixa de preço, parcelamento): só dono e administrador alteram.
drop policy if exists "colaborador não altera o escritório" on escritorios;
create policy "colaborador não altera o escritório" on escritorios as restrictive for update to authenticated
  using (coalesce(meu_papel(), '') <> 'colaborador');

-- 2) Funções do financeiro passam a exigir dono ou administrador: troca, no corpo delas,
--    meu_escritorio() por meu_escritorio_financeiro(). (Ao recriar alguma dessas funções numa
--    migração futura, use meu_escritorio_financeiro().)
do $$
declare
  f text;
  def text;
begin
  foreach f in array array['cancelar_aditivo','cancelar_contrato','criar_aditivo','enviar_contrato','enviar_proposta',
    'escolher_modelo_contrato','estornar_pagamento','garantir_modelo_contrato','gerar_contrato','nova_versao_proposta',
    'previa_contrato','registrar_pagamento','trocar_modelo_contrato']
  loop
    for def in
      select pg_get_functiondef(p.oid) from pg_proc p where p.proname = f and p.pronamespace = 'public'::regnamespace
    loop
      execute replace(def, 'meu_escritorio()', 'meu_escritorio_financeiro()');
    end loop;
  end loop;
end $$;

-- =========================================================
-- Convites
-- =========================================================

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  email text not null,
  nome text not null,
  papel text not null check (papel in ('administrador','colaborador')),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  aceito_em timestamptz,
  cancelado_em timestamptz
);

create index if not exists convites_escritorio on convites (escritorio_id, criado_em desc);

alter table convites enable row level security;
create policy "dono vê os convites" on convites
  for select to authenticated using (escritorio_id = meu_escritorio() and meu_papel() = 'dono');
revoke insert, update, delete on convites from authenticated, anon;

-- Equipe liberada no plano Escritório e durante o teste (para experimentar).
create or replace function equipe_liberada(p_escritorio uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select e.plano = 'escritorio' or situacao_escritorio(e.id) = 'teste' from escritorios e where e.id = p_escritorio
$$;

create or replace function vagas_usadas(p_escritorio uuid) returns int
language sql stable security definer set search_path = public as $$
  select (select count(*) from membros where escritorio_id = p_escritorio)::int
       + (select count(*) from convites where escritorio_id = p_escritorio and aceito_em is null
            and cancelado_em is null and expira_em > now())::int
$$;

create or replace function convidar_membro(p_email text, p_nome text, p_papel text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
begin
  if v_escritorio is null or meu_papel() <> 'dono' then
    raise exception 'somente_dono';
  end if;
  if not equipe_liberada(v_escritorio) then
    raise exception 'plano_sem_equipe';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'nome_obrigatorio';
  end if;
  if p_papel not in ('administrador','colaborador') then
    raise exception 'papel_invalido';
  end if;
  if exists (select 1 from membros where escritorio_id = v_escritorio and lower(email) = v_email) then
    raise exception 'ja_na_equipe';
  end if;

  -- Convite anterior para o mesmo e-mail é substituído (não ocupa duas vagas).
  update convites set cancelado_em = now()
  where escritorio_id = v_escritorio and lower(email) = v_email and aceito_em is null and cancelado_em is null;

  if vagas_usadas(v_escritorio) >= 5 then
    raise exception 'sem_vagas';
  end if;

  insert into convites (escritorio_id, email, nome, papel, criado_por)
  values (v_escritorio, v_email, left(trim(p_nome), 120), p_papel, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
revoke all on function convidar_membro(text, text, text) from public;
grant execute on function convidar_membro(text, text, text) to authenticated;

create or replace function cancelar_convite(p_convite uuid) returns void
language sql security definer set search_path = public as $$
  update convites set cancelado_em = now()
  where id = p_convite and escritorio_id = meu_escritorio() and meu_papel() = 'dono' and aceito_em is null
$$;
revoke all on function cancelar_convite(uuid) from public;
grant execute on function cancelar_convite(uuid) to authenticated;

-- Página do convite (/convite/[token]): para quem recebeu o link.
create or replace function convite_publico(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', c.email, 'nome', c.nome, 'papel', c.papel, 'escritorio', e.nome,
    'valido', c.aceito_em is null and c.cancelado_em is null and c.expira_em > now(),
    'aceito', c.aceito_em is not null
  )
  from convites c join escritorios e on e.id = c.escritorio_id
  where c.token = p_token and length(p_token) >= 32
$$;
revoke all on function convite_publico(text) from public;
grant execute on function convite_publico(text) to anon, authenticated;

-- Aceitar: o usuário logado entra no escritório com o perfil do convite.
create or replace function aceitar_convite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c convites%rowtype;
  v_email text;
begin
  select * into c from convites where token = p_token and length(p_token) >= 32 for update;
  if not found or c.aceito_em is not null or c.cancelado_em is not null or c.expira_em <= now() then
    raise exception 'convite_invalido';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from lower(c.email) then
    raise exception 'email_diferente';
  end if;
  if exists (select 1 from membros where id = auth.uid()) then
    raise exception 'ja_tem_escritorio';
  end if;
  if exists (select 1 from clientes where usuario_id = auth.uid()) then
    raise exception 'conta_de_cliente';
  end if;

  insert into membros (id, escritorio_id, nome, papel, email)
  values (auth.uid(), c.escritorio_id, c.nome, c.papel, v_email);
  update convites set aceito_em = now() where id = c.id;
  return c.escritorio_id;
end;
$$;
revoke all on function aceitar_convite(text) from public;
grant execute on function aceitar_convite(text) to authenticated;

-- ---------- Gerenciar a equipe (só o dono) ----------

create or replace function mudar_papel_membro(p_membro uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() <> 'dono' then
    raise exception 'somente_dono';
  end if;
  if p_papel not in ('administrador','colaborador') then
    raise exception 'papel_invalido';
  end if;
  update membros set papel = p_papel
  where id = p_membro and escritorio_id = meu_escritorio() and papel <> 'dono';
end;
$$;
revoke all on function mudar_papel_membro(uuid, text) from public;
grant execute on function mudar_papel_membro(uuid, text) to authenticated;

-- Remover: a pessoa perde o acesso na hora; o que ela fez continua registrado.
create or replace function remover_membro(p_membro uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() <> 'dono' then
    raise exception 'somente_dono';
  end if;
  delete from membros where id = p_membro and escritorio_id = meu_escritorio() and papel <> 'dono';
end;
$$;
revoke all on function remover_membro(uuid) from public;
grant execute on function remover_membro(uuid) to authenticated;

-- RG-5: plano sem equipe → só o dono acessa (ninguém é apagado; volta ao reativar o Escritório).
create or replace function acesso_liberado() returns boolean
language sql stable security definer set search_path = public as $$
  select m.papel = 'dono' or equipe_liberada(m.escritorio_id) from membros m where m.id = auth.uid()
$$;
revoke all on function acesso_liberado() from public;
grant execute on function acesso_liberado() to authenticated;
