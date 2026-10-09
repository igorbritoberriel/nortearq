-- Dados fictícios: executar somente em transação desfeita (ROLLBACK), depois da 0050.
insert into escritorios(id,nome,slug,plano,trial_ate) values
 ('00000000-0050-4000-8000-000000000001','Vencimentos A','vencimentos-rollback-a-0050','trial',current_date+30),
 ('00000000-0050-4000-8000-000000000002','Vencimentos B','vencimentos-rollback-b-0050','trial',current_date+30);
insert into auth.users(id,email) values
 ('00000000-0050-4000-8000-000000000011','venc-dono@example.invalid'),
 ('00000000-0050-4000-8000-000000000012','venc-colab@example.invalid'),
 ('00000000-0050-4000-8000-000000000013','venc-b@example.invalid');
insert into membros(id,escritorio_id,nome,papel) values
 ('00000000-0050-4000-8000-000000000011','00000000-0050-4000-8000-000000000001','Dono','dono'),
 ('00000000-0050-4000-8000-000000000012','00000000-0050-4000-8000-000000000001','Colaborador','colaborador'),
 ('00000000-0050-4000-8000-000000000013','00000000-0050-4000-8000-000000000002','Dono B','dono');
insert into clientes(id,escritorio_id,nome) values ('00000000-0050-4000-8000-000000000021','00000000-0050-4000-8000-000000000001','Cliente');
insert into propostas(id,escritorio_id,cliente_id,status,valor_total,modo_pagamento,dia_vencimento) values
 ('00000000-0050-4000-8000-000000000031','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000021','aprovada',3000,'parcelado',10),
 ('00000000-0050-4000-8000-000000000032','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000021','aprovada',3000,'parcelado',null);
insert into contratos(id,escritorio_id,proposta_id,cliente_id,status) values
 ('00000000-0050-4000-8000-000000000041','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000031','00000000-0050-4000-8000-000000000021','assinado'),
 ('00000000-0050-4000-8000-000000000042','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000032','00000000-0050-4000-8000-000000000021','assinado');
insert into pagamentos(id,escritorio_id,contrato_id,descricao,valor,ordem) values
 ('00000000-0050-4000-8000-000000000051','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000041','Entrada, na assinatura do contrato',900,1),
 ('00000000-0050-4000-8000-000000000052','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000041','Parcela 1 de 3',700,2),
 ('00000000-0050-4000-8000-000000000053','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000041','Parcela 2 de 3',700,3),
 ('00000000-0050-4000-8000-000000000054','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000041','Parcela 3 de 3',700,4),
 ('00000000-0050-4000-8000-000000000055','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000042','Entrada, na assinatura do contrato',900,1),
 ('00000000-0050-4000-8000-000000000056','00000000-0050-4000-8000-000000000001','00000000-0050-4000-8000-000000000042','Parcela 1 de 3',700,2);
do $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; base date := (date_trunc('month', hoje) + interval '1 month')::date + 9;
begin
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000051')<>hoje then raise exception 'entrada_fora_do_dia'; end if;
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000052')<>base then raise exception 'parcela1_sem_dia_fixo'; end if;
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000054')<>(base + interval '2 months')::date then raise exception 'parcela3_sem_dia_fixo'; end if;
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000056')<>(hoje + interval '1 month')::date then raise exception 'sem_dia_mudou_regra_antiga'; end if;
end $$;
-- Parcela paga não muda.
update pagamentos set pago_em=(now() at time zone 'America/Sao_Paulo')::date where id='00000000-0050-4000-8000-000000000051';

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0050-4000-8000-000000000011',true);
do $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; v2 date; v3 date; r jsonb;
begin
 select vencimento into v2 from pagamentos where id='00000000-0050-4000-8000-000000000053';
 select vencimento into v3 from pagamentos where id='00000000-0050-4000-8000-000000000054';
 -- Mover a parcela 1 em +10 dias, levando as próximas.
 r := alterar_vencimento('00000000-0050-4000-8000-000000000052', (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000052') + 10, 'Cliente recebe dia 20', true);
 if jsonb_array_length(r)<>3 then raise exception 'deveria_alterar_3_parcelas %', r; end if;
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000053')<>v2+10 then raise exception 'proxima_nao_moveu'; end if;
 if (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000054')<>v3+10 then raise exception 'ultima_nao_moveu'; end if;
 if (select count(*) from pagamentos_vencimentos where pagamento_id='00000000-0050-4000-8000-000000000052' and motivo='Cliente recebe dia 20')<>1 then raise exception 'sem_historico'; end if;
 -- Só esta, sem as próximas.
 r := alterar_vencimento('00000000-0050-4000-8000-000000000053', hoje + 40, null, false);
 if jsonb_array_length(r)<>1 or (select vencimento from pagamentos where id='00000000-0050-4000-8000-000000000054')<>v3+10 then raise exception 'mexeu_em_outra'; end if;
 begin perform alterar_vencimento('00000000-0050-4000-8000-000000000051', hoje + 5); raise exception 'alterou_paga';
 exception when others then if sqlerrm<>'pagamento_ja_baixado' then raise; end if; end;
 begin perform alterar_vencimento('00000000-0050-4000-8000-000000000052', hoje - 1); raise exception 'aceitou_passado';
 exception when others then if sqlerrm<>'data_invalida' then raise; end if; end;
 begin update pagamentos set vencimento=hoje+90 where id='00000000-0050-4000-8000-000000000052'; raise exception 'mudou_direto';
 exception when others then if sqlerrm not in ('pagamento_imutavel') and sqlstate<>'42501' then raise; end if; end;
end $$;
-- Colaborador não altera.
select set_config('request.jwt.claim.sub','00000000-0050-4000-8000-000000000012',true);
do $$ begin
 begin perform alterar_vencimento('00000000-0050-4000-8000-000000000054', (now() at time zone 'America/Sao_Paulo')::date + 60); raise exception 'colaborador_alterou';
 exception when others then if sqlerrm<>'pagamento_nao_encontrado' then raise; end if; end;
end $$;
-- Outro escritório não vê nem altera.
select set_config('request.jwt.claim.sub','00000000-0050-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from pagamentos_vencimentos where pagamento_id='00000000-0050-4000-8000-000000000052') then raise exception 'vazou_historico'; end if;
 begin perform alterar_vencimento('00000000-0050-4000-8000-000000000054', (now() at time zone 'America/Sao_Paulo')::date + 60); raise exception 'outro_escritorio_alterou';
 exception when others then if sqlerrm<>'pagamento_nao_encontrado' then raise; end if; end;
end $$;
reset role;
