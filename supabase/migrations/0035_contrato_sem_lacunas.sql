-- NorteArq — contrato não sai com "[a preencher]". Rodar depois de 0034.
--
-- Revisão de UX (A1): o contrato podia ser enviado com lacunas nos dados do escritório ou do cliente.
-- pendencias_contrato() lista o que falta, só dos campos que o texto deste contrato usa.
-- CPF/CNPJ e endereço do cliente não contam: ele mesmo completa na hora de assinar (RN-01.13).
-- enviar_contrato() recusa o primeiro envio enquanto houver pendência (reenviar o link continua livre,
-- porque o texto já está travado).

create or replace function pendencias_contrato(p_contrato uuid) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  c contratos%rowtype;
  cli clientes%rowtype;
  e escritorios%rowtype;
  p propostas%rowtype;
  faltas text[] := '{}';
begin
  select * into c from contratos where id = p_contrato and escritorio_id = meu_escritorio_financeiro();
  if not found then
    raise exception 'contrato_nao_encontrado';
  end if;
  select * into cli from clientes where id = c.cliente_id;
  select * into e from escritorios where id = c.escritorio_id;
  select * into p from propostas where id = c.proposta_id;

  if position('{{escritorio.documento}}' in c.corpo) > 0 and nullif(trim(e.documento), '') is null then
    faltas := array_append(faltas, 'CPF ou CNPJ do escritório');
  end if;
  if position('{{escritorio.endereco}}' in c.corpo) > 0 and nullif(trim(e.endereco), '') is null then
    faltas := array_append(faltas, 'endereço do escritório');
  end if;
  if position('{{escritorio.responsavel}}' in c.corpo) > 0 and nullif(trim(e.responsavel), '') is null then
    faltas := array_append(faltas, 'responsável pelo escritório');
  end if;
  if position('{{escritorio.registro}}' in c.corpo) > 0 and nullif(trim(e.registro_profissional), '') is null then
    faltas := array_append(faltas, 'registro no CAU ou CREA');
  end if;
  if position('{{cliente.email}}' in c.corpo) > 0 and nullif(trim(cli.email), '') is null then
    faltas := array_append(faltas, 'e-mail do cliente');
  end if;
  if position('{{cliente.telefone}}' in c.corpo) > 0 and nullif(trim(cli.telefone), '') is null then
    faltas := array_append(faltas, 'WhatsApp do cliente');
  end if;
  if position('{{proposta.deslocamento}}' in c.corpo) > 0
     and p.deslocamento_tipo in ('fixo', 'km') and p.deslocamento_valor is null then
    faltas := array_append(faltas, 'valor do deslocamento na proposta');
  end if;
  -- Lacuna digitada à mão no texto.
  if position('[a preencher]' in c.corpo) > 0 then
    faltas := array_append(faltas, 'trecho "[a preencher]" no texto do contrato');
  end if;
  return faltas;
end;
$$;

revoke all on function pendencias_contrato(uuid) from public;
grant execute on function pendencias_contrato(uuid) to authenticated;

create or replace function enviar_contrato(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  c contratos%rowtype;
  novo_token text;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = meu_escritorio_financeiro();
  if not found then
    raise exception 'contrato_nao_encontrado';
  end if;
  if c.status not in ('rascunho', 'aguardando_assinatura') then
    raise exception 'contrato_fechado';
  end if;

  if c.status = 'rascunho' then
    if cardinality(pendencias_contrato(c.id)) > 0 then
      raise exception 'contrato_incompleto';
    end if;
    update contratos set status = 'aguardando_assinatura', enviado_em = now(), enviado_por = auth.uid(), atualizado_em = now()
    where id = c.id;
  end if;

  update links_cliente set expira_em = now()
  where cliente_id = c.cliente_id and destino = 'contrato' and expira_em > now();
  insert into links_cliente (escritorio_id, cliente_id, destino, referencia_id)
  values (c.escritorio_id, c.cliente_id, 'contrato', c.id)
  returning token into novo_token;
  return novo_token;
end;
$$;

revoke all on function enviar_contrato(uuid) from public;
grant execute on function enviar_contrato(uuid) to authenticated;
