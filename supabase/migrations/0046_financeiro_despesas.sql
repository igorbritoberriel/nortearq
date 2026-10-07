-- Despesas próprias de cada escritório. Recebimentos usam os pagamentos existentes.
create table if not exists financeiro_despesas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  descricao text not null check(char_length(trim(descricao)) between 3 and 160),
  fornecedor text check(char_length(fornecedor) <= 120),
  categoria text not null check(categoria in ('fornecedor','servico','escritorio','software','deslocamento','imposto','outros')),
  valor numeric(14,2) not null check(valor > 0 and valor <= 100000000),
  vencimento date not null,
  pago_em date check(pago_em is null or pago_em <= (now() at time zone 'America/Sao_Paulo')::date),
  observacao text check(char_length(observacao) <= 1000),
  criado_por uuid default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now(),
  cancelada_em timestamptz,
  motivo_cancelamento text,
  check((cancelada_em is null and motivo_cancelamento is null) or (cancelada_em is not null and char_length(trim(motivo_cancelamento)) between 5 and 300))
);
create index if not exists financeiro_despesas_escritorio_data on financeiro_despesas(escritorio_id,vencimento) where cancelada_em is null;
alter table financeiro_despesas enable row level security;
revoke all on financeiro_despesas from public,anon,authenticated;
grant select on financeiro_despesas to authenticated;
grant insert(id,escritorio_id,descricao,fornecedor,categoria,valor,vencimento,pago_em,observacao) on financeiro_despesas to authenticated;
grant update(pago_em,cancelada_em,motivo_cancelamento) on financeiro_despesas to authenticated;
grant all on financeiro_despesas to service_role;
create policy "financeiro do próprio escritório" on financeiro_despesas to authenticated
  using(escritorio_id=meu_escritorio_financeiro()) with check(escritorio_id=meu_escritorio_financeiro() and situacao_escritorio(escritorio_id) not in ('leitura','suspenso'));

create table if not exists financeiro_despesas_eventos (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references financeiro_despesas(id),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  membro_id uuid references auth.users(id),
  acao text not null check(acao in ('criada','paga','cancelada')),
  antes jsonb,
  depois jsonb not null,
  criado_em timestamptz not null default now()
);
alter table financeiro_despesas_eventos enable row level security;
revoke all on financeiro_despesas_eventos from public,anon,authenticated;
grant select on financeiro_despesas_eventos to authenticated;
grant all on financeiro_despesas_eventos to service_role;
create policy "histórico financeiro do próprio escritório" on financeiro_despesas_eventos for select to authenticated using(escritorio_id=meu_escritorio_financeiro());

create or replace function registrar_evento_despesa() returns trigger
language plpgsql security definer set search_path=public as $$
declare acao_evento text;
begin
 if tg_op='UPDATE' then
   if old.cancelada_em is not null or new.escritorio_id<>old.escritorio_id or new.valor<>old.valor
      or new.descricao<>old.descricao or new.vencimento<>old.vencimento
      or new.categoria<>old.categoria or new.fornecedor is distinct from old.fornecedor
      or new.observacao is distinct from old.observacao or new.criado_por is distinct from old.criado_por
      or new.criado_em<>old.criado_em or new.id<>old.id then raise exception 'despesa_imutavel'; end if;
   if old.pago_em is not null and new.pago_em is distinct from old.pago_em then raise exception 'despesa_ja_paga'; end if;
   if new.cancelada_em is distinct from old.cancelada_em then acao_evento:='cancelada';
   elsif new.pago_em is distinct from old.pago_em then acao_evento:='paga';
   else return new; end if;
 else acao_evento:='criada'; end if;
 insert into financeiro_despesas_eventos(despesa_id,escritorio_id,membro_id,acao,antes,depois)
 values(new.id,new.escritorio_id,auth.uid(),acao_evento,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function registrar_evento_despesa() from public,anon,authenticated;
create trigger historico_despesa after insert or update on financeiro_despesas for each row execute function registrar_evento_despesa();
notify pgrst,'reload schema';
