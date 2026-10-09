-- Executar com scripts/migrar.mjs --testar: todos os dados fictícios são desfeitos.
insert into escritorios(id,nome,slug,plano,trial_ate) values
 ('00000000-0048-4000-8000-000000000001','Entradas Teste A','entradas-rollback-a-0048','trial',current_date+30),
 ('00000000-0048-4000-8000-000000000002','Entradas Teste B','entradas-rollback-b-0048','trial',current_date+30);
insert into auth.users(id,email) values
 ('00000000-0048-4000-8000-000000000011','entradas-a-0048@example.invalid'),
 ('00000000-0048-4000-8000-000000000012','entradas-colab-0048@example.invalid'),
 ('00000000-0048-4000-8000-000000000013','entradas-b-0048@example.invalid');
insert into membros(id,escritorio_id,nome,papel) values
 ('00000000-0048-4000-8000-000000000011','00000000-0048-4000-8000-000000000001','Dono A','dono'),
 ('00000000-0048-4000-8000-000000000012','00000000-0048-4000-8000-000000000001','Colaborador A','colaborador'),
 ('00000000-0048-4000-8000-000000000013','00000000-0048-4000-8000-000000000002','Dono B','dono');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0048-4000-8000-000000000011',true);
insert into financeiro_entradas(id,escritorio_id,descricao,origem,categoria,valor,recebido_em)
values('00000000-0048-4000-8000-000000000021','00000000-0048-4000-8000-000000000001','RT fictícia de teste','Loja fictícia','rt',790.15,(now() at time zone 'America/Sao_Paulo')::date);
do $$ begin
 if (select valor from financeiro_entradas where id='00000000-0048-4000-8000-000000000021')<>790.15 then raise exception 'valor_incorreto'; end if;
 begin
  insert into financeiro_entradas(escritorio_id,descricao,categoria,valor,recebido_em) values('00000000-0048-4000-8000-000000000002','Outro escritório','rt',1,current_date);
  raise exception 'permitida_escrita_outro_escritorio';
 exception when insufficient_privilege then null; end;
 begin
  insert into financeiro_entradas(escritorio_id,descricao,categoria,valor,recebido_em) values('00000000-0048-4000-8000-000000000001','Data futura','rt',1,current_date+2);
  raise exception 'data_futura_permitida';
 exception when check_violation then null; end;
 begin
  insert into financeiro_entradas(escritorio_id,descricao,categoria,valor,recebido_em) values('00000000-0048-4000-8000-000000000001','Valor negativo','rt',-1,current_date);
  raise exception 'valor_negativo_permitido';
 exception when check_violation then null; end;
 begin
  update financeiro_entradas set valor=999 where id='00000000-0048-4000-8000-000000000021';
  raise exception 'valor_editavel';
 exception when insufficient_privilege then null; end;
 update financeiro_entradas set cancelada_em=now(),motivo_cancelamento='Cancelamento de teste' where id='00000000-0048-4000-8000-000000000021';
 if (select count(*) from financeiro_entradas_eventos where entrada_id='00000000-0048-4000-8000-000000000021')<>2 then raise exception 'historico_incompleto'; end if;
 if exists(select 1 from financeiro_entradas where id='00000000-0048-4000-8000-000000000021' and cancelada_em is null) then raise exception 'cancelada_nos_totais'; end if;
 begin
  delete from financeiro_entradas where id='00000000-0048-4000-8000-000000000021';
  raise exception 'apagou_entrada';
 exception when insufficient_privilege then null; end;
 begin
  delete from financeiro_entradas_eventos where entrada_id='00000000-0048-4000-8000-000000000021';
  raise exception 'apagou_historico';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0048-4000-8000-000000000012',true);
do $$ begin
 if exists(select 1 from financeiro_entradas) or exists(select 1 from financeiro_entradas_eventos) then raise exception 'colaborador_ve_financeiro'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0048-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from financeiro_entradas) or exists(select 1 from financeiro_entradas_eventos) then raise exception 'outro_escritorio_ve_financeiro'; end if;
end $$;
reset role;
