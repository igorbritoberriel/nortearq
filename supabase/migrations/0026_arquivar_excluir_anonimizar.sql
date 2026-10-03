-- NorteArq — arquivar, excluir e anonimizar clientes; excluir pedidos de orçamento. Rodar depois de 0025.
--
-- Arquivar: some da lista, reversível (o padrão do dia a dia).
-- Excluir: apaga o cliente e tudo dele, só se NÃO houver contrato assinado nem pagamento registrado
--   (documentos com valor legal e fiscal ficam guardados). Dono e administrador.
-- Anonimizar (LGPD, RG-9): o titular pede para apagar os dados, mas há contrato → troca nome, documento
--   e contatos por "removido"; valores, datas e o contrato assinado ficam (obrigação legal). Só o dono.

alter table clientes add column if not exists arquivado_em timestamptz;
alter table clientes add column if not exists anonimizado_em timestamptz;

-- ---------- Excluir cliente ----------

create or replace function cliente_tem_registro_legal(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from contratos where cliente_id = p_cliente and status = 'assinado')
      or exists (select 1 from pagamentos pg join contratos c on c.id = pg.contrato_id
                 where c.cliente_id = p_cliente and (pg.pago_em is not null or pg.baixa_id is not null))
      or exists (select 1 from pagamentos_eventos ev join pagamentos pg on pg.id = ev.pagamento_id
                 join contratos c on c.id = pg.contrato_id where c.cliente_id = p_cliente)
$$;
revoke all on function cliente_tem_registro_legal(uuid) from public;
grant execute on function cliente_tem_registro_legal(uuid) to authenticated;

create or replace function excluir_cliente(p_cliente uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio_financeiro(); -- dono ou administrador
begin
  if v_escritorio is null then
    raise exception 'sem_permissao';
  end if;
  if not exists (select 1 from clientes where id = p_cliente and escritorio_id = v_escritorio) then
    raise exception 'cliente_nao_encontrado';
  end if;
  if cliente_tem_registro_legal(p_cliente) then
    raise exception 'tem_contrato_ou_pagamento';
  end if;

  -- O pedido de orçamento de origem volta a ser só um contato encerrado.
  update contatos set cliente_id = null, status = 'encerrado', motivo_encerramento = coalesce(motivo_encerramento, 'outro'),
    observacao_encerramento = coalesce(observacao_encerramento, 'Cliente excluído')
  where cliente_id = p_cliente;
  -- Projetos sem contrato assinado (raro) e o resto saem em cascata (propostas, briefings, links, contratos não assinados).
  delete from projetos where cliente_id = p_cliente;
  delete from clientes where id = p_cliente;
end;
$$;
revoke all on function excluir_cliente(uuid) from public;
grant execute on function excluir_cliente(uuid) to authenticated;

-- ---------- Anonimizar cliente (LGPD) ----------

create or replace function anonimizar_cliente(p_cliente uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c clientes%rowtype;
begin
  if meu_papel() <> 'dono' then
    raise exception 'somente_dono';
  end if;
  select * into c from clientes where id = p_cliente and escritorio_id = meu_escritorio() for update;
  if not found then
    raise exception 'cliente_nao_encontrado';
  end if;

  update clientes set
    nome = 'Cliente removido a pedido do titular',
    documento = null, telefone = null, email = null, endereco_imovel = null, observacoes = null,
    usuario_id = null, anonimizado_em = now(), arquivado_em = coalesce(arquivado_em, now())
  where id = c.id;

  update contatos set nome = 'Removido a pedido do titular', whatsapp = null, email = null,
    localizacao = null, mensagem = null, ip = null
  where cliente_id = c.id or id = c.contato_id;

  -- Respostas do briefing (dados pessoais e fotos) são apagadas; o arquivo das fotos sai pelo servidor.
  update briefings set respostas = '{}'::jsonb where cliente_id = c.id;
  -- Links pessoais deixam de valer.
  update links_cliente set expira_em = now() where cliente_id = c.id and expira_em > now();

  return c.usuario_id; -- login do portal, para o servidor apagar
end;
$$;
revoke all on function anonimizar_cliente(uuid) from public;
grant execute on function anonimizar_cliente(uuid) to authenticated;

-- ---------- Excluir pedido de orçamento (spam, teste) ----------

create or replace function excluir_contato(p_contato uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() is null then
    raise exception 'sem_permissao';
  end if;
  delete from contatos where id = p_contato and escritorio_id = meu_escritorio() and cliente_id is null;
  if not found then
    raise exception 'contato_virou_cliente'; -- quem já virou cliente se exclui pela ficha do cliente
  end if;
end;
$$;
revoke all on function excluir_contato(uuid) from public;
grant execute on function excluir_contato(uuid) to authenticated;
