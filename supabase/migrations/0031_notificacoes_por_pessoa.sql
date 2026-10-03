-- NorteArq — notificações como nas ferramentas grandes (GitHub, Linear, Slack). Rodar depois de 0030.
--
-- Três estados, por pessoa (cada membro da equipe tem os seus):
--   visto      → abriu o sininho: o número vermelho zera (membros.notificacoes_vistas_em)
--   lido       → abriu a notificação ou a página daquele item (projeto, briefing...): sai de "Não lidas"
--   dispensado → clicou no X ou em "Limpar lidas": sai da lista
-- Lidas somem da lista sozinhas depois de 30 dias; todas são apagadas do banco depois de 90 dias (cron).
-- As funções de leitura rodam com as permissões de quem chama: o RLS das notificações continua valendo
-- (cada escritório só vê as suas; colaborador não vê as que têm valores).

create table if not exists notificacoes_leitura (
  notificacao_id uuid not null references notificacoes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  lida_em timestamptz,
  dispensada_em timestamptz,
  primary key (notificacao_id, usuario_id)
);
create index if not exists notificacoes_leitura_usuario on notificacoes_leitura (usuario_id);

alter table notificacoes_leitura enable row level security;
create policy "cada um vê a própria leitura" on notificacoes_leitura
  for select to authenticated using (usuario_id = auth.uid());
create policy "cada um marca a própria leitura" on notificacoes_leitura
  for insert to authenticated
  with check (usuario_id = auth.uid() and exists (select 1 from notificacoes n where n.id = notificacao_id));
create policy "cada um muda a própria leitura" on notificacoes_leitura
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
revoke all on notificacoes_leitura from anon;
grant select, insert, update on notificacoes_leitura to authenticated;

alter table membros add column if not exists notificacoes_vistas_em timestamptz;

-- O que já estava lido continua lido, para cada membro do escritório.
insert into notificacoes_leitura (notificacao_id, usuario_id, lida_em)
select n.id, m.id, n.lida_em
from notificacoes n join membros m on m.escritorio_id = n.escritorio_id
where n.lida_em is not null
on conflict do nothing;

-- A leitura deixa de ser do escritório inteiro.
drop policy if exists "membro marca notificações como lidas" on notificacoes;
revoke update on notificacoes from authenticated;
alter table notificacoes drop column if exists lida_em;

-- ---------- Lista e contadores ----------

-- 'nao_lidas' ou 'todas' (não lidas de qualquer data + lidas dos últimos 30 dias). Dispensadas nunca aparecem.
create or replace function minhas_notificacoes(p_aba text default 'todas', p_limite int default 60)
returns table (id uuid, tipo text, titulo text, texto text, link text, criada_em timestamptz, lida boolean)
language sql stable set search_path = public as $$
  select n.id, n.tipo, n.titulo, n.texto, n.link, n.criada_em, l.lida_em is not null
  from notificacoes n
  left join notificacoes_leitura l on l.notificacao_id = n.id and l.usuario_id = auth.uid()
  where l.dispensada_em is null
    and (l.lida_em is null or (p_aba <> 'nao_lidas' and l.lida_em > now() - interval '30 days'))
  order by n.criada_em desc
  limit least(greatest(p_limite, 1), 200)
$$;
grant execute on function minhas_notificacoes(text, int) to authenticated;

-- nao_vistas: o número vermelho do sininho. nao_lidas: o que ainda está na aba "Não lidas".
create or replace function contadores_notificacoes() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'nao_lidas', count(*),
    'nao_vistas', count(*) filter (
      where n.criada_em > coalesce((select notificacoes_vistas_em from membros where id = auth.uid()), '-infinity')
    )
  )
  from notificacoes n
  left join notificacoes_leitura l on l.notificacao_id = n.id and l.usuario_id = auth.uid()
  where l.dispensada_em is null and l.lida_em is null
$$;
grant execute on function contadores_notificacoes() to authenticated;

-- ---------- Ações ----------

create or replace function marcar_notificacoes_vistas() returns void
language sql security definer set search_path = public as $$
  update membros set notificacoes_vistas_em = now() where id = auth.uid()
$$;
revoke all on function marcar_notificacoes_vistas() from public;
grant execute on function marcar_notificacoes_vistas() to authenticated;

-- p_ids null = todas as visíveis ainda não lidas.
create or replace function marcar_notificacoes_lidas(p_ids uuid[] default null) returns void
language sql set search_path = public as $$
  insert into notificacoes_leitura (notificacao_id, usuario_id, lida_em)
  select n.id, auth.uid(), now() from notificacoes n
  where p_ids is null or n.id = any(p_ids)
  on conflict (notificacao_id, usuario_id) do update set lida_em = coalesce(notificacoes_leitura.lida_em, now())
$$;
grant execute on function marcar_notificacoes_lidas(uuid[]) to authenticated;

-- Abriu a página daquele item (ex.: /app/projetos/123): as notificações dele ficam lidas.
create or replace function ler_notificacoes_do_link(p_link text) returns uuid[]
language plpgsql set search_path = public as $$
declare
  ids uuid[];
begin
  select array_agg(n.id) into ids
  from notificacoes n
  left join notificacoes_leitura l on l.notificacao_id = n.id and l.usuario_id = auth.uid()
  where n.link = p_link and l.lida_em is null;
  if ids is not null then
    perform marcar_notificacoes_lidas(ids);
  end if;
  return coalesce(ids, '{}');
end;
$$;
grant execute on function ler_notificacoes_do_link(text) to authenticated;

-- X na notificação (ou no grupo) e "Limpar lidas" (p_ids null = todas as lidas).
create or replace function dispensar_notificacoes(p_ids uuid[] default null) returns void
language sql set search_path = public as $$
  insert into notificacoes_leitura (notificacao_id, usuario_id, lida_em, dispensada_em)
  select n.id, auth.uid(), now(), now() from notificacoes n
  where (p_ids is not null and n.id = any(p_ids))
     or (p_ids is null and exists (
       select 1 from notificacoes_leitura l
       where l.notificacao_id = n.id and l.usuario_id = auth.uid() and l.lida_em is not null
     ))
  on conflict (notificacao_id, usuario_id) do update
    set lida_em = coalesce(notificacoes_leitura.lida_em, now()), dispensada_em = now()
$$;
grant execute on function dispensar_notificacoes(uuid[]) to authenticated;

-- ---------- Limpeza (cron diário, chave secreta) ----------

create or replace function limpar_notificacoes_antigas() returns int
language sql security definer set search_path = public as $$
  with apagadas as (delete from notificacoes where criada_em < now() - interval '90 days' returning 1)
  select count(*)::int from apagadas
$$;
revoke all on function limpar_notificacoes_antigas() from public, anon, authenticated;
grant execute on function limpar_notificacoes_antigas() to service_role;
