-- Massa fictícia desfeita pelo verificador. Não envia e-mails nem chama pagamentos.
insert into escritorios(id,nome,slug,plano,trial_ate) values
 ('00000000-0047-4000-8000-000000000001','Projetos Teste','projetos-rollback-0047','trial',current_date+30),
 ('00000000-0047-4000-8000-000000000002','Outro Escritório','projetos-outro-0047','trial',current_date+30);
insert into auth.users(id,email) values
 ('00000000-0047-4000-8000-000000000011','projetos-dono-0047@example.invalid'),
 ('00000000-0047-4000-8000-000000000012','projetos-colab-0047@example.invalid'),
 ('00000000-0047-4000-8000-000000000013','projetos-outro-0047@example.invalid');
insert into membros(id,escritorio_id,nome,papel) values
 ('00000000-0047-4000-8000-000000000011','00000000-0047-4000-8000-000000000001','Dono Teste','dono'),
 ('00000000-0047-4000-8000-000000000012','00000000-0047-4000-8000-000000000001','Colaborador Teste','colaborador'),
 ('00000000-0047-4000-8000-000000000013','00000000-0047-4000-8000-000000000002','Outro Dono','dono');
insert into clientes(id,escritorio_id,nome) values('00000000-0047-4000-8000-000000000021','00000000-0047-4000-8000-000000000001','Cliente fictício');
insert into projetos(id,escritorio_id,cliente_id,nome) values('00000000-0047-4000-8000-000000000031','00000000-0047-4000-8000-000000000001','00000000-0047-4000-8000-000000000021','Projeto fictício');
insert into etapas(id,projeto_id,nome,ordem) values('00000000-0047-4000-8000-000000000041','00000000-0047-4000-8000-000000000031','Etapa fictícia',1);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0047-4000-8000-000000000011',true);
do $$ begin
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','entregue',null);
  raise exception 'entrega_incompleta_permitida';
 exception when others then if sqlerrm<>'projeto_com_pendencias' then raise; end if; end;
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','');
  raise exception 'encerramento_sem_motivo';
 exception when others then if sqlerrm<>'motivo_obrigatorio' then raise; end if; end;
 perform definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date-1);
 perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','pausado','Cliente pediu uma pausa');
 begin
  perform definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date);
  raise exception 'prazo_pausado_editavel';
 exception when others then if sqlerrm<>'projeto_inativo' then raise; end if; end;
 begin
  update etapas set nome='Alteração proibida' where id='00000000-0047-4000-8000-000000000041';
  raise exception 'etapa_pausada_editavel';
 exception when others then if sqlerrm<>'projeto_inativo' then raise; end if; end;
 if pasta_de_projeto_ativo('00000000-0047-4000-8000-000000000031') then raise exception 'upload_pausado_permitido'; end if;
 perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo','Retomada combinada');
 perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','Cliente desistiu do projeto');
 perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo',null);
 if (select count(*) from projeto_eventos where projeto_id='00000000-0047-4000-8000-000000000031')<>5 then raise exception 'historico_incompleto'; end if;
 begin
  update projeto_eventos set motivo='Alterado'; raise exception 'historico_mutavel';
 exception when insufficient_privilege then null; end;
 begin
  update etapas set prazo=current_date; raise exception 'prazo_sem_historico';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0047-4000-8000-000000000012',true);
select definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date+2);
do $$ begin
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','Tentativa do colaborador');
  raise exception 'colaborador_encerra';
 exception when others then if sqlerrm<>'sem_permissao' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0047-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from projeto_eventos) then raise exception 'historico_vazou'; end if;
 begin
  perform definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date);
  raise exception 'prazo_outro_escritorio';
 exception when others then if sqlerrm<>'etapa_invalida' then raise; end if; end;
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','Outro escritório');
  raise exception 'encerrou_outro_escritorio';
 exception when others then if sqlerrm<>'projeto_invalido' then raise; end if; end;
end $$;
reset role;
insert into links_cliente(token,escritorio_id,cliente_id,destino,referencia_id)
values('projetos-token-rollback-0047-1234567890','00000000-0047-4000-8000-000000000001','00000000-0047-4000-8000-000000000021','projeto','00000000-0047-4000-8000-000000000031');
do $$ declare publico jsonb; begin
 publico:=projeto_publico('projetos-token-rollback-0047-1234567890');
 if publico->>'status'<>'ativo' or publico#>>'{etapas,0,prazo}' is null then raise exception 'projecao_publica_incompleta'; end if;
end $$;
-- A vaga fica reservada na pausa e é liberada pelo encerramento.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0047-4000-8000-000000000011',true);
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','Encerramento para teste do limite');
reset role;
insert into projetos(escritorio_id,cliente_id,nome)
select '00000000-0047-4000-8000-000000000001','00000000-0047-4000-8000-000000000021','Projeto limite '||n from generate_series(1,15) n;
do $$ begin
 if projetos_em_andamento('00000000-0047-4000-8000-000000000001')<>15 then raise exception 'contagem_limite_incorreta'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo',null);
  raise exception 'reabertura_acima_limite';
 exception when others then if sqlerrm<>'limite_projetos' then raise; end if; end;
end $$;
reset role;
delete from projetos where nome like 'Projeto limite %' and escritorio_id='00000000-0047-4000-8000-000000000001';
set local role authenticated;
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo',null);
reset role;
update etapas set status='aguardando_aprovacao',enviada_em=now() where id='00000000-0047-4000-8000-000000000041';
set local role authenticated;
select definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date+3);
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','pausado','Pausa para verificar a vaga');
set local role anon;
do $$ begin
 begin
  perform responder_etapa('projetos-token-rollback-0047-1234567890','00000000-0047-4000-8000-000000000041','aprovada',null,'127.0.0.1');
  raise exception 'cliente_aprova_projeto_pausado';
 exception when others then if sqlerrm<>'projeto_inativo' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if projetos_em_andamento('00000000-0047-4000-8000-000000000001')<>1 then raise exception 'pausa_nao_reserva_vaga'; end if;
 if projeto_publico('projetos-token-rollback-0047-1234567890')->>'status'<>'pausado' then raise exception 'pausa_publica_incorreta'; end if;
end $$;
set local role authenticated;
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo',null);
reset role;
update etapas set status='aprovada',aprovada_em=now() where id='00000000-0047-4000-8000-000000000041';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0047-4000-8000-000000000011',true);
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','entregue',null);
select mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','ativo',null);
do $$ begin
 begin
  perform definir_prazo_etapa('00000000-0047-4000-8000-000000000041',current_date);
  raise exception 'prazo_aprovada_editavel';
 exception when others then if sqlerrm<>'etapa_aprovada' then raise; end if; end;
end $$;
reset role;
update escritorios set trial_ate=current_date-1 where id='00000000-0047-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 begin
  perform mudar_situacao_projeto('00000000-0047-4000-8000-000000000031','encerrado','Plano em leitura');
  raise exception 'leitura_encerra';
 exception when others then if sqlerrm<>'modo_leitura' then raise; end if; end;
end $$;
reset role;
select 'Transições, prazos, histórico, isolamento e permissões verificados' as resultado;
