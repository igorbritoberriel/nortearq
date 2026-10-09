-- Entradas recebidas fora dos contratos: RT, aportes e outras origens.
create table financeiro_entradas (
 id uuid primary key default gen_random_uuid(),
 escritorio_id uuid not null references escritorios(id) on delete cascade,
 descricao text not null check(char_length(trim(descricao)) between 3 and 160),
 origem text check(char_length(origem) <= 120),
 categoria text not null check(categoria in ('rt','servico','aporte','emprestimo','reembolso','outros')),
 valor numeric(14,2) not null check(valor > 0 and valor <= 100000000),
 recebido_em date not null check(recebido_em <= (now() at time zone 'America/Sao_Paulo')::date),
 observacao text check(char_length(observacao) <= 1000),
 criado_por uuid default auth.uid() references auth.users(id),
 criado_em timestamptz not null default now(),
 cancelada_em timestamptz,
 motivo_cancelamento text,
 check((cancelada_em is null and motivo_cancelamento is null) or (cancelada_em is not null and char_length(trim(motivo_cancelamento)) between 5 and 300))
);
create index financeiro_entradas_escritorio_data on financeiro_entradas(escritorio_id,recebido_em) where cancelada_em is null;
alter table financeiro_entradas enable row level security;
revoke all on financeiro_entradas from public,anon,authenticated;
grant select on financeiro_entradas to authenticated;
grant insert(id,escritorio_id,descricao,origem,categoria,valor,recebido_em,observacao) on financeiro_entradas to authenticated;
grant update(cancelada_em,motivo_cancelamento) on financeiro_entradas to authenticated;
grant all on financeiro_entradas to service_role;
create policy "entradas do próprio escritório" on financeiro_entradas to authenticated
 using(escritorio_id=meu_escritorio_financeiro())
 with check(escritorio_id=meu_escritorio_financeiro() and situacao_escritorio(escritorio_id) not in ('leitura','suspenso'));

create table financeiro_entradas_eventos (
 id uuid primary key default gen_random_uuid(),
 entrada_id uuid not null references financeiro_entradas(id),
 escritorio_id uuid not null references escritorios(id) on delete cascade,
 membro_id uuid references auth.users(id),
 acao text not null check(acao in ('criada','cancelada')),
 antes jsonb,
 depois jsonb not null,
 criado_em timestamptz not null default now()
);
alter table financeiro_entradas_eventos enable row level security;
revoke all on financeiro_entradas_eventos from public,anon,authenticated;
grant select on financeiro_entradas_eventos to authenticated;
grant all on financeiro_entradas_eventos to service_role;
create policy "histórico de entradas do próprio escritório" on financeiro_entradas_eventos for select to authenticated using(escritorio_id=meu_escritorio_financeiro());
create function registrar_evento_entrada() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if old.cancelada_em is not null or (to_jsonb(new)-'cancelada_em'-'motivo_cancelamento') is distinct from (to_jsonb(old)-'cancelada_em'-'motivo_cancelamento') then
   raise exception 'entrada_imutavel';
  end if;
  if new.cancelada_em is not distinct from old.cancelada_em then return new; end if;
 end if;
 insert into financeiro_entradas_eventos(entrada_id,escritorio_id,membro_id,acao,antes,depois)
 values(new.id,new.escritorio_id,auth.uid(),case when tg_op='INSERT' then 'criada' else 'cancelada' end,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function registrar_evento_entrada() from public,anon,authenticated;
create trigger historico_entrada after insert or update on financeiro_entradas for each row execute function registrar_evento_entrada();
notify pgrst,'reload schema';
