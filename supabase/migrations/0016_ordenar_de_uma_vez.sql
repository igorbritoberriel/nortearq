-- NorteArq — reordenar listas numa única chamada (a tela move na hora e salva por trás).
-- security invoker: roda com as permissões do arquiteto, então o RLS continua valendo.
-- Rodar depois de 0015.

-- Perguntas do editor de briefing: recebe os ids do grupo na ordem nova.
create or replace function ordenar_perguntas(p_ids uuid[]) returns void
language sql security invoker set search_path = public as $$
  update briefing_perguntas b set ordem = x.n * 10
  from unnest(p_ids) with ordinality as x(id, n)
  where b.id = x.id and b.escritorio_id = meu_escritorio()
$$;

revoke all on function ordenar_perguntas(uuid[]) from public;
grant execute on function ordenar_perguntas(uuid[]) to authenticated;

-- Etapas do projeto: recebe todas as etapas na ordem nova.
-- Etapas aguardando o cliente ou aprovadas não mudam de posição.
create or replace function ordenar_etapas(p_projeto uuid, p_ids uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from etapas where projeto_id = p_projeto) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from unnest(p_ids) x(id) where not exists (select 1 from etapas e where e.id = x.id and e.projeto_id = p_projeto)) then
    raise exception 'lista_desatualizada';
  end if;

  if exists (
    select 1
    from (select id, status, row_number() over (order by ordem, id) atual from etapas where projeto_id = p_projeto) e
    join unnest(p_ids) with ordinality as x(id, n) on x.id = e.id
    where e.status in ('aguardando_aprovacao', 'aprovada') and e.atual <> x.n
  ) then
    raise exception 'etapa_travada';
  end if;

  update etapas e set ordem = x.n, atualizado_em = now()
  from unnest(p_ids) with ordinality as x(id, n)
  where e.id = x.id and e.projeto_id = p_projeto and e.ordem is distinct from x.n;
end;
$$;

revoke all on function ordenar_etapas(uuid, uuid[]) from public;
grant execute on function ordenar_etapas(uuid, uuid[]) to authenticated;
