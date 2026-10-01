-- NorteArq — etapa 10: parcelamento automático escolhido pelo cliente.
-- Rodar depois de 0011.
-- O escritório define o padrão (entrada % e até quantas vezes aceita parcelar); cada proposta pode mudar.
-- O cliente escolhe o número de parcelas ao aprovar, e as parcelas são geradas para o contrato e os pagamentos.

alter table escritorios
  add column if not exists parcelamento_entrada_pct numeric not null default 30
    check (parcelamento_entrada_pct between 0 and 90),
  add column if not exists parcelamento_max int not null default 12
    check (parcelamento_max between 1 and 24);

grant update (parcelamento_entrada_pct, parcelamento_max) on escritorios to authenticated;

alter table propostas
  add column if not exists modo_pagamento text not null default 'manual'
    check (modo_pagamento in ('manual','parcelado')),
  add column if not exists entrada_pct numeric check (entrada_pct is null or entrada_pct between 0 and 90),
  add column if not exists parcelas_max int check (parcelas_max is null or parcelas_max between 1 and 24),
  add column if not exists parcelas_escolhidas int;  -- escolha do cliente ao aprovar

grant insert (modo_pagamento, entrada_pct, parcelas_max) on propostas to authenticated;
grant update (modo_pagamento, entrada_pct, parcelas_max) on propostas to authenticated;

-- Entrada de X% + saldo em N parcelas iguais; a última absorve os centavos do arredondamento.
-- A tela calcula igual (lib/propostas.ts, gerarParcelas).
create or replace function gerar_parcelas(p_total numeric, p_pct numeric, p_n int) returns jsonb
language plpgsql immutable as $$
declare
  entrada numeric := round(p_total * coalesce(p_pct, 0) / 100, 2);
  resto numeric := p_total - round(p_total * coalesce(p_pct, 0) / 100, 2);
  base numeric;
  lista jsonb := '[]';
begin
  if entrada > 0 then
    lista := lista || jsonb_build_array(jsonb_build_object('descricao', 'Entrada, na assinatura do contrato', 'valor', entrada));
  end if;
  if resto > 0 then
    if p_n = 1 then
      lista := lista || jsonb_build_array(jsonb_build_object(
        'descricao', case when entrada > 0 then 'Saldo, em parcela única' else 'Pagamento único, na assinatura do contrato' end,
        'valor', round(resto, 2)));
    else
      base := round(floor(resto * 100 / p_n) / 100, 2);
      for i in 1..p_n loop
        lista := lista || jsonb_build_array(jsonb_build_object(
          'descricao', 'Parcela ' || i || ' de ' || p_n || ' (mensal)',
          'valor', round(case when i = p_n then resto - base * (p_n - 1) else base end, 2)));
      end loop;
    end if;
  end if;
  return lista;
end;
$$;

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
    if p.modo_pagamento = 'parcelado'
       and (p.entrada_pct is null or p.entrada_pct < 0 or p.entrada_pct > 90 or p.parcelas_max is null or p.parcelas_max not between 1 and 24) then
      raise exception 'parcelamento_invalido';
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

create or replace function nova_versao_proposta(p_proposta uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p propostas%rowtype;
  existente uuid;
  novo_id uuid;
begin
  select * into p from propostas where id = p_proposta and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'proposta_nao_encontrada';
  end if;
  if p.status = 'aprovada' then
    raise exception 'proposta_aprovada'; -- depois de aprovada, mudança vira aditivo
  end if;

  select id into existente from propostas where grupo_id = p.grupo_id and status = 'rascunho' limit 1;
  if existente is not null then
    return existente;
  end if;

  insert into propostas (escritorio_id, cliente_id, grupo_id, versao, titulo, escopo, itens, valor_total, parcelas,
    forma_pagamento, prazo, revisoes_incluidas, visitas_incluidas, nao_incluido, validade_dias,
    deslocamento_tipo, deslocamento_valor, deslocamento_cidade, deslocamento_obs,
    modo_pagamento, entrada_pct, parcelas_max)
  select p.escritorio_id, p.cliente_id, p.grupo_id,
    (select max(versao) + 1 from propostas where grupo_id = p.grupo_id),
    p.titulo, p.escopo, p.itens, p.valor_total, p.parcelas, p.forma_pagamento, p.prazo,
    p.revisoes_incluidas, p.visitas_incluidas, p.nao_incluido, p.validade_dias,
    p.deslocamento_tipo, p.deslocamento_valor, p.deslocamento_cidade, p.deslocamento_obs,
    p.modo_pagamento, p.entrada_pct, p.parcelas_max
  returning id into novo_id;

  return novo_id;
end;
$$;

revoke all on function nova_versao_proposta(uuid) from public;
grant execute on function nova_versao_proposta(uuid) to authenticated;

create or replace function proposta_publica(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p propostas%rowtype := proposta_do_link(p_token);
begin
  update links_cliente set usado_em = coalesce(usado_em, now()) where token = p_token;
  return jsonb_build_object(
    'id', p.id,
    'versao', p.versao,
    'titulo', p.titulo,
    'escopo', p.escopo,
    'itens', p.itens,
    'valor_total', p.valor_total,
    'parcelas', p.parcelas,
    'forma_pagamento', p.forma_pagamento,
    'prazo', p.prazo,
    'revisoes_incluidas', p.revisoes_incluidas,
    'visitas_incluidas', p.visitas_incluidas,
    'nao_incluido', p.nao_incluido,
    'deslocamento_tipo', p.deslocamento_tipo,
    'deslocamento_valor', p.deslocamento_valor,
    'deslocamento_cidade', p.deslocamento_cidade,
    'deslocamento_obs', p.deslocamento_obs,
    'modo_pagamento', p.modo_pagamento,
    'entrada_pct', p.entrada_pct,
    'parcelas_max', p.parcelas_max,
    'parcelas_escolhidas', p.parcelas_escolhidas,
    'status', p.status,
    'enviada_em', p.enviada_em,
    'validade_dias', p.validade_dias,
    'validade_ate', p.validade_ate,
    'expirada', p.status = 'enviada' and p.validade_ate < (now() at time zone 'America/Sao_Paulo')::date,
    'respondida_em', p.respondida_em,
    'comentario_cliente', p.comentario_cliente
  );
end;
$$;

revoke all on function proposta_publica(text) from public;
grant execute on function proposta_publica(text) to anon, authenticated;

-- Nova assinatura (com a escolha de parcelas): a antiga sai para não haver duas versões.
drop function if exists responder_proposta(text, text, text, text, text);

create or replace function responder_proposta(
  p_token text,
  p_acao text,
  p_comentario text,
  p_motivo text,
  p_ip text,
  p_parcelas int default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p propostas%rowtype := proposta_do_link(p_token);
  comentario text := nullif(left(trim(coalesce(p_comentario, '')), 2000), '');
begin
  if p.status <> 'enviada' then
    raise exception 'proposta_respondida';
  end if;
  if p.validade_ate < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'proposta_expirada'; -- RN-01.8
  end if;
  if p_acao not in ('aprovar', 'ajuste', 'recusar') then
    raise exception 'acao_invalida';
  end if;
  if p_acao = 'ajuste' and comentario is null then
    raise exception 'comentario_obrigatorio';
  end if;
  if p_acao = 'recusar' and (p_motivo is null or p_motivo not in ('preco','prazo','escopo','outro_profissional','desistiu','outro')) then
    raise exception 'motivo_obrigatorio';
  end if;

  -- Parcelamento escolhido pelo cliente: as parcelas são geradas aqui, com centavos exatos.
  if p_acao = 'aprovar' and p.modo_pagamento = 'parcelado' then
    if p_parcelas is null or p_parcelas < 1 or p_parcelas > p.parcelas_max then
      raise exception 'parcelas_invalidas';
    end if;
    update propostas set parcelas = gerar_parcelas(p.valor_total, p.entrada_pct, p_parcelas), parcelas_escolhidas = p_parcelas
    where id = p.id;
  end if;

  update propostas set
    status = case p_acao when 'aprovar' then 'aprovada' when 'ajuste' then 'ajuste_pedido' else 'recusada' end,
    comentario_cliente = comentario,
    motivo_recusa = case when p_acao = 'recusar' then p_motivo end,
    respondida_em = now(),
    resposta_ip = left(p_ip, 64),
    atualizado_em = now()
  where id = p.id;

  if p_acao = 'aprovar' then
    perform avancar_etapa(p.cliente_id, 'contrato');
  end if;
  return p.id;
end;
$$;

revoke all on function responder_proposta(text, text, text, text, text, int) from public;
grant execute on function responder_proposta(text, text, text, text, text, int) to anon, authenticated;
