-- Registros fictícios, sempre dentro de BEGIN/ROLLBACK. Não chama o Asaas.
insert into escritorios(id,nome,slug,plano,trial_ate) values
 ('00000000-0046-4000-8000-000000000001','Financeiro Teste A','financeiro-rollback-a-0046','trial',current_date+30),
 ('00000000-0046-4000-8000-000000000002','Financeiro Teste B','financeiro-rollback-b-0046','trial',current_date+30);
insert into auth.users(id,email) values
 ('00000000-0046-4000-8000-000000000011','financeiro-a-0046@example.invalid'),
 ('00000000-0046-4000-8000-000000000012','financeiro-colab-0046@example.invalid'),
 ('00000000-0046-4000-8000-000000000013','financeiro-b-0046@example.invalid'),
 ('00000000-0046-4000-8000-000000000014','financeiro-admin-0046@example.invalid');
insert into membros(id,escritorio_id,nome,papel) values
 ('00000000-0046-4000-8000-000000000011','00000000-0046-4000-8000-000000000001','Dono Teste A','dono'),
 ('00000000-0046-4000-8000-000000000012','00000000-0046-4000-8000-000000000001','Colaborador Teste','colaborador'),
 ('00000000-0046-4000-8000-000000000013','00000000-0046-4000-8000-000000000002','Dono Teste B','dono'),
 ('00000000-0046-4000-8000-000000000014','00000000-0046-4000-8000-000000000001','Administrador Teste','administrador');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0046-4000-8000-000000000011',true);
insert into financeiro_despesas(id,escritorio_id,descricao,categoria,valor,vencimento)
values('00000000-0046-4000-8000-000000000021','00000000-0046-4000-8000-000000000001','Despesa fictícia','software',123.45,current_date);
do $$ begin
 if (select count(*) from financeiro_despesas where id='00000000-0046-4000-8000-000000000021')<>1 then raise exception 'dono_sem_acesso'; end if;
 begin
  insert into financeiro_despesas(escritorio_id,descricao,categoria,valor,vencimento) values('00000000-0046-4000-8000-000000000002','Outro escritório','outros',1,current_date);
  raise exception 'permitida_escrita_outro_escritorio';
 exception when insufficient_privilege then null; end;
 begin
  update financeiro_despesas set valor=999 where id='00000000-0046-4000-8000-000000000021';
  raise exception 'valor_editavel';
 exception when insufficient_privilege then null; end;
 begin
  update financeiro_despesas set pago_em=current_date+1 where id='00000000-0046-4000-8000-000000000021';
  raise exception 'data_futura_permitida';
 exception when check_violation then null; end;
 update financeiro_despesas set pago_em=current_date where id='00000000-0046-4000-8000-000000000021';
 begin
  update financeiro_despesas set pago_em=null where id='00000000-0046-4000-8000-000000000021';
  raise exception 'pagamento_apagado';
 exception when others then if sqlerrm<>'despesa_ja_paga' then raise; end if; end;
 update financeiro_despesas set cancelada_em=now(),motivo_cancelamento='Cancelamento fictício de teste' where id='00000000-0046-4000-8000-000000000021';
 if (select count(*) from financeiro_despesas_eventos where despesa_id='00000000-0046-4000-8000-000000000021')<>3 then raise exception 'historico_incompleto'; end if;
 begin
  delete from financeiro_despesas where id='00000000-0046-4000-8000-000000000021';
  raise exception 'apagou_despesa';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0046-4000-8000-000000000014',true);
insert into financeiro_despesas(id,escritorio_id,descricao,categoria,valor,vencimento)
values('00000000-0046-4000-8000-000000000022','00000000-0046-4000-8000-000000000001','Despesa do administrador','software',10,current_date);
do $$ begin
 if (select count(*) from financeiro_despesas)<>2 then raise exception 'administrador_sem_acesso'; end if;
 update financeiro_despesas set pago_em=(now() at time zone 'America/Sao_Paulo')::date where id='00000000-0046-4000-8000-000000000022';
 begin
  update financeiro_despesas_eventos set acao='cancelada' where despesa_id='00000000-0046-4000-8000-000000000022';
  raise exception 'historico_editavel';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0046-4000-8000-000000000012',true);
do $$ begin
 if exists(select 1 from financeiro_despesas) or exists(select 1 from financeiro_despesas_eventos) then raise exception 'colaborador_ve_financeiro'; end if;
 begin
  insert into financeiro_despesas(escritorio_id,descricao,categoria,valor,vencimento) values('00000000-0046-4000-8000-000000000001','Colaborador Teste','outros',1,current_date);
  raise exception 'colaborador_escreve';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0046-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from financeiro_despesas where escritorio_id='00000000-0046-4000-8000-000000000001') or exists(select 1 from financeiro_despesas_eventos where escritorio_id='00000000-0046-4000-8000-000000000001') then raise exception 'vazamento_outro_escritorio'; end if;
end $$;
reset role;
insert into financeiro_despesas(id,escritorio_id,descricao,categoria,valor,vencimento)
values('00000000-0046-4000-8000-000000000023','00000000-0046-4000-8000-000000000002','Despesa antes do modo leitura','software',10,current_date);
update escritorios set trial_ate=current_date-1 where id='00000000-0046-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0046-4000-8000-000000000013',true);
do $$ begin
 if (select count(*) from financeiro_despesas)<>1 then raise exception 'modo_leitura_nao_consulta'; end if;
 begin
  update financeiro_despesas set pago_em=(now() at time zone 'America/Sao_Paulo')::date where id='00000000-0046-4000-8000-000000000023';
  raise exception 'modo_leitura_atualiza';
 exception when insufficient_privilege then null; end;
 begin
  insert into financeiro_despesas(escritorio_id,descricao,categoria,valor,vencimento) values('00000000-0046-4000-8000-000000000002','Modo leitura Teste','outros',1,current_date);
  raise exception 'modo_leitura_escreve';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'OK: despesas, histórico, imutabilidade, data futura, RLS por escritório, colaborador e modo leitura (rollback)' as resultado;
