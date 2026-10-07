-- Executar somente dentro de BEGIN/ROLLBACK, após 0043. Usa registros fictícios novos.
do $$
declare
  escritorio uuid; cliente uuid := gen_random_uuid(); proposta uuid := gen_random_uuid(); contrato uuid := gen_random_uuid();
  tp text := encode(gen_random_bytes(24),'hex'); tc text := encode(gen_random_bytes(24),'hex');
  v jsonb; total numeric; texto text; dono uuid := gen_random_uuid();
begin
  select id into escritorio from escritorios where cobranca_ativa = true limit 1;
  if escritorio is null then raise exception 'Teste requer um escritório conectado'; end if;
  insert into clientes(id,escritorio_id,nome) values(cliente,escritorio,'Cliente Fictício Teste Rollback');
  insert into propostas(id,escritorio_id,cliente_id,grupo_id,titulo,status,enviada_em,validade_ate,valor_total,modo_pagamento,entrada_pct,parcelas_max,itens,parcelas,meios_pagamento)
    values(proposta,escritorio,cliente,proposta,'Proposta Fictícia Teste','enviada',now(),current_date+30,1000,'parcelado',30,24,'[{"servico":"Teste"}]','[]',array['pix','boleto','cartao']);
  insert into links_cliente(token,escritorio_id,cliente_id,destino,referencia_id,expira_em)
    values(tp,escritorio,cliente,'proposta',proposta,now()+interval '1 day');
  v := proposta_publica(tp);
  if jsonb_array_length(v->'meios_pagamento') <> 3 then raise exception 'Formas não publicadas'; end if;
  begin
    perform responder_proposta(tp,'aprovar',null,null,'teste',13,false,'cartao');
    raise exception 'Permitido cartão em 13x';
  exception when others then if sqlerrm <> 'cartao_maximo' then raise; end if; end;
  begin
    perform responder_proposta(tp,'aprovar',null,null,'teste',4,false,null);
    raise exception 'Permitida aprovação sem forma';
  exception when others then if sqlerrm <> 'meio_invalido' then raise; end if; end;
  perform responder_proposta(tp,'aprovar',null,null,'teste',4,false,'cartao');
  select meio_escolhido,parcelas into texto,v from propostas where id=proposta;
  if texto <> 'cartao' or jsonb_array_length(v) <> 5 then raise exception 'Escolha/entrada/parcelas incorretas'; end if;
  select sum((x->>'valor')::numeric) into total from jsonb_array_elements(v) x;
  if total <> 1000 or (v->0->>'valor')::numeric <> 300 then raise exception 'Valores alterados'; end if;

  insert into contratos(id,escritorio_id,cliente_id,proposta_id,conteudo,corpo,status,enviado_em)
    values(contrato,escritorio,cliente,proposta,'','Contrato teste {{proposta.parcelas}} {{proposta.forma_pagamento}}','aguardando_assinatura',now());
  insert into links_cliente(token,escritorio_id,cliente_id,destino,referencia_id,expira_em)
    values(tc,escritorio,cliente,'contrato',contrato,now()+interval '1 day');
  v := resumo_pagamento_cliente(tc);
  if v->>'meio' <> 'cartao' or v->>'status' <> 'aguardando_assinatura' then raise exception 'Resumo inválido'; end if;
  begin
    perform escolher_meio_contrato(tc,'pix');
    raise exception 'Permitida mudança após aprovação';
  exception when others then if sqlerrm <> 'meio_ja_escolhido' then raise; end if; end;
  -- Simula proposta aprovada antes desta migração, ainda sem escolher o meio.
  update propostas set meio_escolhido=null where id=proposta;
  begin
    perform assinar_contrato(tc,'Cliente Fictício Teste','52998224725','Rua de Teste, 123','teste','teste');
    raise exception 'Assinatura permitida sem escolher meio';
  exception when others then if sqlerrm <> 'meio_obrigatorio' then raise; end if; end;
  perform escolher_meio_contrato(tc,'cartao');
  if (select parcelas from propostas where id=proposta) <> v->'condicoes' then raise exception 'Escolha alterou parcelas antigas'; end if;
  perform assinar_contrato(tc,'Cliente Fictício Teste','52998224725','Rua de Teste, 123','teste','teste');
  select conteudo into texto from contratos where id=contrato;
  if position('Cartão de crédito' in texto)=0 then raise exception 'Método não congelado no texto'; end if;
  select sum(valor) into total from pagamentos where contrato_id=contrato;
  if total <> 1000 then raise exception 'Pagamentos diferentes do contrato'; end if;
  if not iniciar_preparo_cobranca(contrato,dono) or iniciar_preparo_cobranca(contrato,gen_random_uuid()) then raise exception 'Trava concorrente falhou'; end if;
  if has_function_privilege('anon','iniciar_preparo_cobranca(uuid,uuid)','execute')
     or has_function_privilege('anon','assinar_contrato_v0043(text,text,text,text,text,text)','execute')
     or has_table_privilege('anon','cobranca_solicitacoes','insert') then raise exception 'Permissão indevida'; end if;
  update links_cliente set expira_em=now()-interval '1 day' where token=tc;
  begin
    perform resumo_pagamento_cliente(tc);
    raise exception 'Link vencido aceito';
  exception when others then if sqlerrm <> 'link_invalido' then raise; end if; end;
end $$;
select 'OK: proposta, contrato, assinatura, parcelas, acesso e concorrência (rollback)' as resultado;
