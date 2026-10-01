-- NorteArq — ajuste: o link de uma proposta mostra a versão mais recente DAQUELA proposta (RN-01.7),
-- e não a última proposta qualquer do cliente; e enviar uma proposta só desativa os links dela.
-- Rodar depois de 0008.

create or replace function proposta_do_link(p_token text) returns propostas
language plpgsql security definer set search_path = public as $$
declare
  l links_cliente%rowtype;
  p propostas%rowtype;
begin
  select * into l from links_cliente
  where token = p_token and length(p_token) >= 32 and destino = 'proposta' and expira_em > now();
  if not found then
    raise exception 'link_invalido';
  end if;

  select * into p from propostas
  where cliente_id = l.cliente_id
    and status <> 'rascunho'
    and (l.referencia_id is null or grupo_id = (select grupo_id from propostas where id = l.referencia_id))
  order by versao desc, enviada_em desc nulls last
  limit 1;
  if not found then
    raise exception 'proposta_nao_encontrada';
  end if;
  return p;
end;
$$;

revoke all on function proposta_do_link(text) from public;

create or replace function enviar_proposta(p_proposta uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  p propostas%rowtype;
  novo_token text;
begin
  select * into p from propostas where id = p_proposta and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'proposta_nao_encontrada';
  end if;

  if p.status = 'rascunho' then
    if coalesce(p.valor_total, 0) <= 0 or jsonb_array_length(p.itens) = 0 then
      raise exception 'proposta_incompleta';
    end if;

    update propostas set status = 'substituida', atualizado_em = now()
    where grupo_id = p.grupo_id and id <> p.id and status in ('enviada', 'ajuste_pedido');

    update propostas set
      status = 'enviada',
      enviada_em = now(),
      validade_ate = (now() at time zone 'America/Sao_Paulo')::date + p.validade_dias,
      atualizado_em = now()
    where id = p.id;

    perform avancar_etapa(p.cliente_id, 'proposta');
  elsif p.status <> 'enviada' then
    -- Já respondida: não há o que reenviar.
    raise exception 'proposta_respondida';
  end if;

  -- Só os links desta proposta (de qualquer versão); outras propostas do cliente continuam valendo.
  update links_cliente set expira_em = now()
  where cliente_id = p.cliente_id and destino = 'proposta' and expira_em > now()
    and referencia_id in (select id from propostas where grupo_id = p.grupo_id);
  insert into links_cliente (escritorio_id, cliente_id, destino, referencia_id)
  values (p.escritorio_id, p.cliente_id, 'proposta', p.id)
  returning token into novo_token;

  return novo_token;
end;
$$;

revoke all on function enviar_proposta(uuid) from public;
grant execute on function enviar_proposta(uuid) to authenticated;
