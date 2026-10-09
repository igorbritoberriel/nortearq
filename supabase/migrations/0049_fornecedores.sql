create table fornecedores (
 id uuid primary key default gen_random_uuid(),
 escritorio_id uuid not null references escritorios(id) on delete cascade,
 nome text not null check(char_length(trim(nome)) between 2 and 120),
 documento text check(documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'),
 contato text check(char_length(contato)<=120),
 telefone text check(telefone is null or telefone ~ '^[0-9]{10,13}$'),
 email text check(char_length(email)<=254),
 segmento text check(char_length(segmento)<=80),
 observacoes text check(char_length(observacoes)<=1000),
 arquivado_em timestamptz,
 criado_em timestamptz not null default now(),
 unique(id,escritorio_id)
);
create unique index fornecedores_documento_unico on fornecedores(escritorio_id,documento) where documento is not null;
create index fornecedores_escritorio_nome on fornecedores(escritorio_id,nome);
alter table fornecedores enable row level security;
revoke all on fornecedores from public,anon,authenticated;
grant select on fornecedores to authenticated;
grant insert(id,escritorio_id,nome,documento,contato,telefone,email,segmento,observacoes) on fornecedores to authenticated;
grant update(nome,documento,contato,telefone,email,segmento,observacoes,arquivado_em) on fornecedores to authenticated;
grant all on fornecedores to service_role;
create policy "fornecedores do próprio escritório" on fornecedores to authenticated
 using(escritorio_id=meu_escritorio_financeiro())
 with check(escritorio_id=meu_escritorio_financeiro() and situacao_escritorio(escritorio_id) not in ('leitura','suspenso'));

alter table financeiro_entradas add column fornecedor_id uuid;
alter table financeiro_despesas add column fornecedor_id uuid;
alter table financeiro_entradas add constraint entrada_fornecedor_escritorio foreign key(fornecedor_id,escritorio_id) references fornecedores(id,escritorio_id);
alter table financeiro_despesas add constraint despesa_fornecedor_escritorio foreign key(fornecedor_id,escritorio_id) references fornecedores(id,escritorio_id);
grant insert(fornecedor_id) on financeiro_entradas,financeiro_despesas to authenticated;
-- O nome no lançamento é um retrato do cadastro na data do registro.
-- Editar/arquivar um fornecedor não muda registros financeiros anteriores.
create function vincular_fornecedor_financeiro() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_nome text;
begin
 if tg_op='UPDATE' then
  if new.fornecedor_id is distinct from old.fornecedor_id then raise exception 'vinculo_fornecedor_imutavel'; end if;
  return new;
 end if;
 if new.fornecedor_id is not null then
  select nome into v_nome from fornecedores where id=new.fornecedor_id and escritorio_id=new.escritorio_id and arquivado_em is null for share;
  if not found then raise exception 'fornecedor_indisponivel'; end if;
  if tg_table_name='financeiro_entradas' then new.origem:=v_nome;
  else new.fornecedor:=v_nome; end if;
 end if;
 return new;
end $$;
revoke all on function vincular_fornecedor_financeiro() from public,anon,authenticated;
create trigger fornecedor_entrada before insert or update on financeiro_entradas for each row execute function vincular_fornecedor_financeiro();
create trigger fornecedor_despesa before insert or update on financeiro_despesas for each row execute function vincular_fornecedor_financeiro();
notify pgrst,'reload schema';
