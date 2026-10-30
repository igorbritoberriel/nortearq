-- NorteArq — aprovação tácita da etapa (RN-03.7). Rodar depois de 0060.
-- Cada escritório escolhe em quantos dias sem resposta a etapa enviada vira aprovada (5 a 60; vazio = desligado).
-- Escritórios que já existiam ficam desligados (não muda projeto em andamento sem o arquiteto saber);
-- os novos começam com 7 dias. O cliente vê o prazo no link e nos lembretes por e-mail.

alter table escritorios add column if not exists aprovacao_tacita_dias int
  check (aprovacao_tacita_dias between 5 and 60);
alter table escritorios alter column aprovacao_tacita_dias set default 7;
grant update (aprovacao_tacita_dias) on escritorios to authenticated;

alter table aprovacoes add column if not exists tacita boolean not null default false;

-- Roda no cron diário (chave do servidor). Devolve as etapas aprovadas agora, para os avisos.
create or replace function aprovar_etapas_tacitas() returns setof uuid
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select e.id, e.projeto_id, es.aprovacao_tacita_dias as dias
    from etapas e
    join projetos p on p.id = e.projeto_id
    join escritorios es on es.id = p.escritorio_id
    where e.status = 'aguardando_aprovacao'
      and p.status = 'ativo'
      and es.aprovacao_tacita_dias is not null
      and e.enviada_em + make_interval(days => es.aprovacao_tacita_dias) <= now()
    for update of e skip locked
  loop
    insert into aprovacoes (etapa_id, decisao, comentario, conta_revisao, tacita)
    values (r.id, 'aprovada', format('Aprovada automaticamente: %s dias sem resposta do cliente.', r.dias), false, true);
    update etapas set status = 'aprovada', aprovada_em = now(), atualizado_em = now() where id = r.id;
    update projetos set atualizado_em = now() where id = r.projeto_id;
    return next r.id;
  end loop;
end;
$$;

revoke all on function aprovar_etapas_tacitas() from public, anon, authenticated;
grant execute on function aprovar_etapas_tacitas() to service_role;

-- Para o cliente: quando cada etapa esperando resposta vira aprovada sozinha ({etapa_id: data}).
create or replace function aprovacao_automatica(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(e.id, e.enviada_em + make_interval(days => es.aprovacao_tacita_dias)), '{}'::jsonb)
  from etapas e
  join projetos p on p.id = e.projeto_id
  join escritorios es on es.id = p.escritorio_id
  where p.id = (projeto_do_link(p_token)).id
    and e.status = 'aguardando_aprovacao'
    and es.aprovacao_tacita_dias is not null
$$;

revoke all on function aprovacao_automatica(text) from public;
grant execute on function aprovacao_automatica(text) to anon, authenticated;
