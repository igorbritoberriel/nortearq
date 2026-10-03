-- NorteArq — desconto para pagamento à vista. Rodar depois de 0020.
-- O escritório define o percentual padrão; cada proposta pode mudar e o valor fica "congelado"
-- na proposta enviada (o cliente aprova exatamente o que viu). À vista = valor todo de uma vez,
-- na assinatura do contrato, sem entrada separada.

alter table escritorios
  add column if not exists desconto_avista_pct numeric not null default 0 check (desconto_avista_pct between 0 and 30);
grant update (desconto_avista_pct) on escritorios to authenticated;

alter table propostas
  add column if not exists desconto_avista_pct numeric check (desconto_avista_pct is null or desconto_avista_pct between 0 and 30),
  add column if not exists avista boolean not null default false; -- o cliente escolheu à vista ao aprovar
grant insert (desconto_avista_pct) on propostas to authenticated;
grant update (desconto_avista_pct) on propostas to authenticated;

-- Valor com desconto, em centavos exatos (a tela calcula igual: lib/propostas.ts, valorAvista).
create or replace function valor_avista(p_total numeric, p_pct numeric) returns numeric
language sql immutable as $$
  select round(coalesce(p_total, 0) * (100 - coalesce(p_pct, 0)) / 100, 2)
$$;

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
    'desconto_avista_pct', p.desconto_avista_pct,
    'avista', p.avista,
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


-- Nova assinatura (com a opção à vista): a antiga sai para não haver duas versões.
drop function if exists responder_proposta(text, text, text, text, text, int);

create or replace function responder_proposta(
  p_token text,
  p_acao text,
  p_comentario text,
  p_motivo text,
  p_ip text,
  p_parcelas int default null,
  p_avista boolean default false
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
  -- À vista com desconto: valor todo de uma vez, na assinatura (o desconto é o da proposta enviada).
  if p_acao = 'aprovar' and p_avista then
    if coalesce(p.desconto_avista_pct, 0) <= 0 then
      raise exception 'sem_desconto_avista';
    end if;
    update propostas set
      avista = true,
      parcelas_escolhidas = 1,
      parcelas = jsonb_build_array(jsonb_build_object(
        'descricao', 'À vista, na assinatura do contrato (' || trim(to_char(p.desconto_avista_pct, 'FM990D99')) || '% de desconto)',
        'valor', valor_avista(p.valor_total, p.desconto_avista_pct)))
    where id = p.id;
  elsif p_acao = 'aprovar' and p.modo_pagamento = 'parcelado' then
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


revoke all on function responder_proposta(text, text, text, text, text, int, boolean) from public;
grant execute on function responder_proposta(text, text, text, text, text, int, boolean) to anon, authenticated;

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
    modo_pagamento, entrada_pct, parcelas_max, desconto_avista_pct)
  select p.escritorio_id, p.cliente_id, p.grupo_id,
    (select max(versao) + 1 from propostas where grupo_id = p.grupo_id),
    p.titulo, p.escopo, p.itens, p.valor_total, p.parcelas, p.forma_pagamento, p.prazo,
    p.revisoes_incluidas, p.visitas_incluidas, p.nao_incluido, p.validade_dias,
    p.deslocamento_tipo, p.deslocamento_valor, p.deslocamento_cidade, p.deslocamento_obs,
    p.modo_pagamento, p.entrada_pct, p.parcelas_max, p.desconto_avista_pct
  returning id into novo_id;

  return novo_id;
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
    if coalesce(p.desconto_avista_pct, 0) not between 0 and 30 then
      raise exception 'desconto_invalido';
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


create or replace function renderizar_contrato(
  p_contrato uuid,
  p_nome text,
  p_documento text,
  p_endereco text,
  p_data date
) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  c contratos%rowtype;
  p propostas%rowtype;
  cli clientes%rowtype;
  e escritorios%rowtype;
  falta constant text := '[a preencher]';
  texto text;
  v_escopo text;
  v_parcelas text;
  meses constant text[] := array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
begin
  select * into c from contratos where id = p_contrato;
  select * into p from propostas where id = c.proposta_id;
  select * into cli from clientes where id = c.cliente_id;
  select * into e from escritorios where id = c.escritorio_id;

  select string_agg(
      '• ' || coalesce(nullif(i->>'servico', ''), 'Serviço')
      || coalesce(': ' || nullif(i->>'escopo', ''), '')
      || coalesce(E'\n  Entregáveis: ' || (
           select string_agg(x, '; ') from jsonb_array_elements_text(i->'entregaveis') x
         ), ''),
      E'\n')
  into v_escopo
  from jsonb_array_elements(p.itens) i;

  select string_agg('• ' || (x->>'descricao') || ': ' || formatar_reais((x->>'valor')::numeric), E'\n')
  into v_parcelas
  from jsonb_array_elements(p.parcelas) x;

  texto := c.corpo;
  texto := replace(texto, '{{cliente.nome}}', coalesce(nullif(trim(p_nome), ''), cli.nome));
  texto := replace(texto, '{{cliente.documento}}', coalesce(nullif(trim(p_documento), ''), cli.documento, falta));
  texto := replace(texto, '{{cliente.endereco}}', coalesce(nullif(trim(p_endereco), ''), cli.endereco_imovel, falta));
  texto := replace(texto, '{{cliente.email}}', coalesce(cli.email, falta));
  texto := replace(texto, '{{cliente.telefone}}', coalesce(cli.telefone, falta));
  texto := replace(texto, '{{escritorio.nome}}', e.nome);
  texto := replace(texto, '{{escritorio.documento}}', coalesce(e.documento, falta));
  texto := replace(texto, '{{escritorio.endereco}}', coalesce(e.endereco, falta));
  texto := replace(texto, '{{escritorio.responsavel}}', coalesce(e.responsavel, falta));
  texto := replace(texto, '{{escritorio.registro}}', coalesce(e.registro_profissional, falta));
  texto := replace(texto, '{{proposta.escopo}}', coalesce(v_escopo, falta));
  texto := replace(texto, '{{proposta.nao_incluido}}', coalesce(nullif(p.nao_incluido, ''), 'Nada além do descrito na cláusula 1ª.'));
  texto := replace(texto, '{{proposta.prazo}}', coalesce(nullif(p.prazo, ''), 'Conforme cronograma combinado entre as partes'));
  -- À vista com desconto: o valor do contrato já sai com o desconto, e o texto mostra os dois.
  texto := replace(texto, '{{proposta.valor_total}}', case
    when p.avista and coalesce(p.desconto_avista_pct, 0) > 0 then
      formatar_reais(p.valor_total) || ', com ' || trim(to_char(p.desconto_avista_pct, 'FM990D99')) || '% de desconto para pagamento à vista: '
      || formatar_reais(valor_avista(p.valor_total, p.desconto_avista_pct))
    else coalesce(formatar_reais(p.valor_total), falta) end);
  texto := replace(texto, '{{proposta.parcelas}}', coalesce(v_parcelas, '• À vista: ' || formatar_reais(p.valor_total)));
  texto := replace(texto, '{{proposta.forma_pagamento}}', coalesce(p.forma_pagamento, ''));
  texto := replace(texto, '{{proposta.revisoes}}', p.revisoes_incluidas::text);
  texto := replace(texto, '{{proposta.visitas}}', p.visitas_incluidas::text);
  texto := replace(texto, '{{proposta.deslocamento}}', texto_deslocamento(p));
  texto := replace(texto, '{{proposta.data_aprovacao}}', coalesce(to_char(p.respondida_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), falta));
  texto := replace(texto, '{{data}}',
    extract(day from p_data)::int || ' de ' || meses[extract(month from p_data)::int] || ' de ' || extract(year from p_data)::int);
  return texto;
end;
$$;

