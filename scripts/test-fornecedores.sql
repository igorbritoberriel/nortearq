-- Dados fictícios: executar somente com --testar (ROLLBACK).
insert into escritorios(id,nome,slug,plano,trial_ate) values
 ('00000000-0049-4000-8000-000000000001','Fornecedores A','fornecedores-rollback-a-0049','trial',current_date+30),
 ('00000000-0049-4000-8000-000000000002','Fornecedores B','fornecedores-rollback-b-0049','trial',current_date+30);
insert into auth.users(id,email) values
 ('00000000-0049-4000-8000-000000000011','fornecedores-a@example.invalid'),
 ('00000000-0049-4000-8000-000000000012','fornecedores-b@example.invalid'),
 ('00000000-0049-4000-8000-000000000013','fornecedores-colab@example.invalid');
insert into membros(id,escritorio_id,nome,papel) values
 ('00000000-0049-4000-8000-000000000011','00000000-0049-4000-8000-000000000001','Dono A','dono'),
 ('00000000-0049-4000-8000-000000000012','00000000-0049-4000-8000-000000000002','Dono B','dono'),
 ('00000000-0049-4000-8000-000000000013','00000000-0049-4000-8000-000000000001','Colaborador','colaborador');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0049-4000-8000-000000000011',true);
insert into fornecedores(id,escritorio_id,nome,segmento,documento) values
 ('00000000-0049-4000-8000-000000000021','00000000-0049-4000-8000-000000000001','Loja fictícia','Iluminação','11222333000181');
insert into financeiro_entradas(id,escritorio_id,descricao,origem,fornecedor_id,categoria,valor,recebido_em) values
 ('00000000-0049-4000-8000-000000000031','00000000-0049-4000-8000-000000000001','RT fictícia','Nome adulterado','00000000-0049-4000-8000-000000000021','rt',7900,(now() at time zone 'America/Sao_Paulo')::date);
insert into financeiro_despesas(id,escritorio_id,descricao,fornecedor,fornecedor_id,categoria,valor,vencimento) values
 ('00000000-0049-4000-8000-000000000032','00000000-0049-4000-8000-000000000001','Material fictício','Nome adulterado','00000000-0049-4000-8000-000000000021','fornecedor',10,current_date);
do $$ begin
 if (select origem from financeiro_entradas where id='00000000-0049-4000-8000-000000000031')<>'Loja fictícia' then raise exception 'nome_entrada_incorreto'; end if;
 if (select fornecedor from financeiro_despesas where id='00000000-0049-4000-8000-000000000032')<>'Loja fictícia' then raise exception 'nome_despesa_incorreto'; end if;
 begin
  insert into fornecedores(escritorio_id,nome,documento)values('00000000-0049-4000-8000-000000000001','Duplicado','11222333000181');
  raise exception 'documento_duplicado';
 exception when unique_violation then null; end;
 begin
  insert into fornecedores(escritorio_id,nome) values('00000000-0049-4000-8000-000000000002','Outro escritório');
  raise exception 'escrita_outro_escritorio';
 exception when insufficient_privilege then null; end;
 update fornecedores set nome='Loja editada',arquivado_em=now() where id='00000000-0049-4000-8000-000000000021';
 if (select origem from financeiro_entradas where id='00000000-0049-4000-8000-000000000031')<>'Loja fictícia' then raise exception 'alterou_historico'; end if;
 begin
  insert into financeiro_entradas(escritorio_id,descricao,fornecedor_id,categoria,valor,recebido_em)values('00000000-0049-4000-8000-000000000001','Fornecedor arquivado','00000000-0049-4000-8000-000000000021','rt',1,current_date);
  raise exception 'aceitou_arquivado';
 exception when others then if sqlerrm<>'fornecedor_indisponivel' then raise; end if; end;
 update fornecedores set arquivado_em=null where id='00000000-0049-4000-8000-000000000021';
 update financeiro_despesas set pago_em=(now() at time zone 'America/Sao_Paulo')::date where id='00000000-0049-4000-8000-000000000032';
 update financeiro_entradas set cancelada_em=now(),motivo_cancelamento='Cancelamento fictício' where id='00000000-0049-4000-8000-000000000031';
end $$;
select set_config('request.jwt.claim.sub','00000000-0049-4000-8000-000000000012',true);
do $$ begin
 if exists(select 1 from fornecedores where id='00000000-0049-4000-8000-000000000021') then raise exception 'vazamento_cadastro'; end if;
 begin
  insert into financeiro_entradas(escritorio_id,descricao,fornecedor_id,categoria,valor,recebido_em)values('00000000-0049-4000-8000-000000000002','Vínculo de outro escritório','00000000-0049-4000-8000-000000000021','rt',1,current_date);
  raise exception 'aceitou_vinculo_outro_escritorio';
 exception when others then if sqlerrm<>'fornecedor_indisponivel' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0049-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from fornecedores) then raise exception 'colaborador_ve_fornecedores'; end if;
 begin
  insert into fornecedores(escritorio_id,nome)values('00000000-0049-4000-8000-000000000001','Colaborador');
  raise exception 'colaborador_escreveu';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Rodar após 0050: a exclusão não pode apagar fornecedores vinculados.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0049-4000-8000-000000000011',true);
do $$ begin
 begin
  delete from fornecedores where id='00000000-0049-4000-8000-000000000021';
  raise exception 'excluiu_fornecedor_vinculado';
 exception when foreign_key_violation then null; end;
 insert into fornecedores(id,escritorio_id,nome)values('00000000-0049-4000-8000-000000000022','00000000-0049-4000-8000-000000000001','Sem vínculos');
 delete from fornecedores where id='00000000-0049-4000-8000-000000000022';
 if exists(select 1 from fornecedores where id='00000000-0049-4000-8000-000000000022') then raise exception 'nao_excluiu_sem_vinculos'; end if;
end $$;
reset role;