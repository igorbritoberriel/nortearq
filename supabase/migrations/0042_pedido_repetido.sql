-- NorteArq — pedido de orçamento repetido. Rodar depois de 0041.
--
-- O formulário descartava em silêncio (e mostrava "enviado") um segundo pedido do mesmo WhatsApp em até 10 minutos,
-- mesmo quando o primeiro já tinha sido encerrado (ex.: cliente excluído). Agora a trava vale só para pedido aberto.

create or replace function enviar_contato(
  p_slug text, p_nome text, p_whatsapp text, p_email text, p_servicos uuid[], p_area_m2 numeric,
  p_localizacao text, p_orcamento numeric, p_prazo_desejado text, p_inicio_desejado date,
  p_mensagem text, p_ip text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  esc escritorios%rowtype;
  servicos_validos uuid[];
  novo_status text;
  novo_id uuid;
  aberto uuid;
  v_email text := nullif(lower(trim(p_email)), '');
begin
  select * into esc from escritorios where slug = lower(p_slug) and onboarding_concluido_em is not null;
  if not found then
    raise exception 'escritorio_nao_encontrado';
  end if;

  if coalesce(length(trim(p_nome)), 0) < 2 or coalesce(length(p_whatsapp), 0) < 10 then
    raise exception 'dados_invalidos';
  end if;

  -- Contra robôs e clique duplo: um pedido por WhatsApp a cada 10 minutos por escritório, enquanto ele está aberto.
  -- Pedido já encerrado ou que virou cliente não trava: o novo envio vira pedido novo (antes era descartado em silêncio).
  if exists (
    select 1 from contatos
    where escritorio_id = esc.id and whatsapp = p_whatsapp and status not in ('convertido', 'encerrado')
      and coalesce(reenviado_em, criado_em) > now() - interval '10 minutes'
  ) then
    raise exception 'pedido_repetido';
  end if;

  select coalesce(array_agg(id), '{}') into servicos_validos
  from servicos where escritorio_id = esc.id and ativo and id = any(coalesce(p_servicos, '{}'));

  novo_status := case
    when p_orcamento is null or esc.faixa_preco_min is null then 'a_avaliar'
    when p_orcamento >= esc.faixa_preco_min then 'compativel'
    else 'fora_do_perfil'
  end;

  -- Mesma pessoa (WhatsApp ou e-mail) com pedido ainda aberto dos últimos 7 dias: atualiza esse pedido.
  select id into aberto from contatos
  where escritorio_id = esc.id and cliente_id is null
    and status not in ('convertido', 'encerrado')
    and criado_em > now() - interval '7 days'
    and (whatsapp = p_whatsapp or (v_email is not null and lower(email) = v_email))
  order by criado_em desc
  limit 1;

  if aberto is not null then
    update contatos set
      nome = left(trim(p_nome), 120), whatsapp = p_whatsapp, email = coalesce(v_email, email),
      servicos = servicos_validos, area_m2 = p_area_m2, localizacao = nullif(left(trim(p_localizacao), 120), ''),
      orcamento_disponivel = p_orcamento, prazo_desejado = nullif(left(p_prazo_desejado, 60), ''),
      inicio_desejado = p_inicio_desejado,
      mensagem = nullif(left(trim(p_mensagem), 2000), ''),
      status = novo_status,
      compativel = case novo_status when 'compativel' then true when 'fora_do_perfil' then false end,
      prazo_apertado = p_inicio_desejado is not null and esc.proxima_data_livre is not null and p_inicio_desejado < esc.proxima_data_livre,
      acima_da_faixa = p_orcamento is not null and esc.faixa_preco_max is not null and p_orcamento > esc.faixa_preco_max,
      aceite_privacidade_em = now(), ip = left(p_ip, 64),
      envios = envios + 1, reenviado_em = now(), visto_em = null
    where id = aberto;
    return aberto;
  end if;

  insert into contatos (
    escritorio_id, nome, whatsapp, email, servicos, area_m2, localizacao, orcamento_disponivel,
    prazo_desejado, inicio_desejado, mensagem, status, compativel, prazo_apertado, acima_da_faixa,
    aceite_privacidade_em, ip
  ) values (
    esc.id, left(trim(p_nome), 120), p_whatsapp, v_email, servicos_validos,
    p_area_m2, nullif(left(trim(p_localizacao), 120), ''), p_orcamento,
    nullif(left(p_prazo_desejado, 60), ''), p_inicio_desejado, nullif(left(trim(p_mensagem), 2000), ''),
    novo_status,
    case novo_status when 'compativel' then true when 'fora_do_perfil' then false end,
    p_inicio_desejado is not null and esc.proxima_data_livre is not null and p_inicio_desejado < esc.proxima_data_livre,
    p_orcamento is not null and esc.faixa_preco_max is not null and p_orcamento > esc.faixa_preco_max,
    now(), left(p_ip, 64)
  )
  returning id into novo_id;
  return novo_id;
end;
$$;
