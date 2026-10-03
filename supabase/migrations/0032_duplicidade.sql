-- NorteArq — duplicidade (como HubSpot, Pipedrive e Slack). Rodar depois de 0031.
--
-- * Equipe: convidar quem já tem escritório é recusado na hora (uma conta = um escritório) e convite
--   que não pode ser aceito não ocupa vaga.
-- * Cliente: CPF/CNPJ repetido no mesmo escritório é bloqueado (identidade). E-mail/WhatsApp repetido
--   só gera aviso na tela (pode ser casal, empresa etc.). "Juntar clientes" une dois cadastros.
-- * Formulário público: a mesma pessoa reenviando em até 7 dias atualiza o pedido aberto.
-- * Converter pedido em cliente: se o cliente já existe (mesmo e-mail ou WhatsApp), liga ao existente.
-- * Nomes repetidos (sem diferenciar maiúsculas): etapas do mesmo projeto, modelos e serviços.

-- ---------- Equipe ----------

create or replace function email_ja_tem_escritorio(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros m join auth.users u on u.id = m.id where lower(u.email) = lower(trim(p_email))
  ) or exists (
    select 1 from clientes c join auth.users u on u.id = c.usuario_id where lower(u.email) = lower(trim(p_email))
  )
$$;
revoke all on function email_ja_tem_escritorio(text) from public;

create or replace function vagas_usadas(p_escritorio uuid) returns int
language sql stable security definer set search_path = public as $$
  select (select count(*) from membros where escritorio_id = p_escritorio)::int
       + (select count(*) from convites where escritorio_id = p_escritorio and aceito_em is null
            and cancelado_em is null and expira_em > now() and not email_ja_tem_escritorio(email))::int
$$;

create or replace function convidar_membro(p_email text, p_nome text, p_papel text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
begin
  if v_escritorio is null or meu_papel() <> 'dono' then
    raise exception 'somente_dono';
  end if;
  if not equipe_liberada(v_escritorio) then
    raise exception 'plano_sem_equipe';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'nome_obrigatorio';
  end if;
  if p_papel not in ('administrador','colaborador') then
    raise exception 'papel_invalido';
  end if;
  if exists (select 1 from membros where escritorio_id = v_escritorio and lower(email) = v_email) then
    raise exception 'ja_na_equipe';
  end if;
  -- Uma conta pertence a um escritório só: o convite nunca poderia ser aceito.
  if email_ja_tem_escritorio(v_email) then
    raise exception 'email_de_outro_escritorio';
  end if;

  -- Convite anterior para o mesmo e-mail é substituído (não ocupa duas vagas).
  update convites set cancelado_em = now()
  where escritorio_id = v_escritorio and lower(email) = v_email and aceito_em is null and cancelado_em is null;

  if vagas_usadas(v_escritorio) >= 5 then
    raise exception 'sem_vagas';
  end if;

  insert into convites (escritorio_id, email, nome, papel, criado_por)
  values (v_escritorio, v_email, left(trim(p_nome), 120), p_papel, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
revoke all on function convidar_membro(text, text, text) from public;
grant execute on function convidar_membro(text, text, text) to authenticated;

-- Para a tela da equipe: convites pendentes que não podem ser aceitos (a pessoa já tem escritório).
create or replace function convites_bloqueados() returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.id from convites c
  where c.escritorio_id = meu_escritorio() and c.aceito_em is null and c.cancelado_em is null
    and email_ja_tem_escritorio(c.email)
$$;
revoke all on function convites_bloqueados() from public;
grant execute on function convites_bloqueados() to authenticated;

-- ---------- Clientes ----------

-- CPF/CNPJ é identidade: não repete no mesmo escritório (cliente anonimizado não conta).
create unique index if not exists clientes_documento_unico
  on clientes (escritorio_id, documento) where documento is not null and anonimizado_em is null;

create index if not exists clientes_email_busca on clientes (escritorio_id, lower(email)) where email is not null;
create index if not exists clientes_telefone_busca on clientes (escritorio_id, telefone) where telefone is not null;

-- Possíveis duplicados de um cadastro (aviso "já existe um cliente com este e-mail").
create or replace function clientes_parecidos(p_email text, p_telefone text, p_documento text, p_ignorar uuid default null)
returns table (id uuid, nome text, motivo text)
language sql stable set search_path = public as $$
  select c.id, c.nome,
    case
      when p_documento is not null and c.documento = p_documento then 'CPF/CNPJ'
      when p_email is not null and lower(c.email) = lower(p_email) then 'e-mail'
      else 'WhatsApp'
    end
  from clientes c
  where c.escritorio_id = meu_escritorio() and c.anonimizado_em is null
    and (p_ignorar is null or c.id <> p_ignorar)
    and (
      (p_documento is not null and c.documento = p_documento)
      or (p_email is not null and lower(c.email) = lower(p_email))
      or (p_telefone is not null and c.telefone = p_telefone)
    )
  order by c.criado_em
  limit 5
$$;
grant execute on function clientes_parecidos(text, text, text, uuid) to authenticated;

-- Juntar dois cadastros do mesmo cliente: tudo do "origem" passa para o "destino" e o origem é apagado.
-- Só dono ou administrador. Campos vazios do destino são completados com os do origem.
create or replace function juntar_clientes(p_destino uuid, p_origem uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio_financeiro(); -- dono ou administrador
  d clientes%rowtype;
  o clientes%rowtype;
begin
  if v_escritorio is null then
    raise exception 'sem_permissao';
  end if;
  if p_destino = p_origem then
    raise exception 'mesmo_cliente';
  end if;
  select * into d from clientes where id = p_destino and escritorio_id = v_escritorio for update;
  select * into o from clientes where id = p_origem and escritorio_id = v_escritorio for update;
  if d.id is null or o.id is null then
    raise exception 'cliente_nao_encontrado';
  end if;
  if d.anonimizado_em is not null or o.anonimizado_em is not null then
    raise exception 'cliente_anonimizado';
  end if;
  if d.usuario_id is not null and o.usuario_id is not null then
    raise exception 'dois_acessos_portal'; -- cada um já criou login no portal: não dá para unir os dois
  end if;
  if d.documento is not null and o.documento is not null and d.documento <> o.documento then
    raise exception 'documentos_diferentes';
  end if;

  update links_cliente set cliente_id = d.id where cliente_id = o.id;
  update contatos set cliente_id = d.id where cliente_id = o.id;
  update propostas set cliente_id = d.id where cliente_id = o.id;
  update briefings set cliente_id = d.id where cliente_id = o.id;
  update projetos set cliente_id = d.id where cliente_id = o.id;
  update contratos set cliente_id = d.id where cliente_id = o.id;

  -- Libera o que é único no origem antes de passar para o destino.
  update clientes set usuario_id = null, documento = null where id = o.id;
  update clientes set
    telefone = coalesce(d.telefone, o.telefone),
    email = coalesce(d.email, o.email),
    documento = coalesce(d.documento, o.documento),
    endereco_imovel = coalesce(d.endereco_imovel, o.endereco_imovel),
    observacoes = case
      when o.observacoes is null then d.observacoes
      when d.observacoes is null then o.observacoes
      else d.observacoes || E'\n\n' || o.observacoes
    end,
    servicos = (select coalesce(array_agg(distinct s), '{}') from unnest(coalesce(d.servicos, '{}') || coalesce(o.servicos, '{}')) s),
    contato_id = coalesce(d.contato_id, o.contato_id),
    usuario_id = coalesce(d.usuario_id, o.usuario_id),
    arquivado_em = case when d.arquivado_em is not null and o.arquivado_em is null then null else d.arquivado_em end
  where id = d.id;

  delete from clientes where id = o.id;
end;
$$;
revoke all on function juntar_clientes(uuid, uuid) from public;
grant execute on function juntar_clientes(uuid, uuid) to authenticated;

-- Converter pedido em cliente: se já existe cliente com o mesmo e-mail ou WhatsApp, liga a ele.
drop function if exists converter_contato(uuid);
create or replace function converter_contato(p_contato_id uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  c contatos%rowtype;
  existente uuid;
  novo_id uuid;
begin
  select * into c from contatos where id = p_contato_id;
  if not found then
    raise exception 'contato_nao_encontrado';
  end if;
  if c.cliente_id is not null then
    return jsonb_build_object('id', c.cliente_id, 'existente', true);
  end if;

  select id into existente from clientes
  where escritorio_id = c.escritorio_id and anonimizado_em is null
    and ((c.email is not null and lower(email) = lower(c.email)) or telefone = c.whatsapp)
  order by arquivado_em nulls first, criado_em
  limit 1;

  if existente is not null then
    update clientes set contato_id = coalesce(contato_id, c.id), arquivado_em = null where id = existente;
    update contatos set status = 'convertido', cliente_id = existente, visto_em = coalesce(visto_em, now()) where id = c.id;
    return jsonb_build_object('id', existente, 'existente', true);
  end if;

  insert into clientes (escritorio_id, nome, telefone, email, endereco_imovel, servicos, contato_id)
  values (c.escritorio_id, c.nome, c.whatsapp, c.email, c.localizacao, c.servicos, c.id)
  returning id into novo_id;
  update contatos set status = 'convertido', cliente_id = novo_id, visto_em = coalesce(visto_em, now()) where id = c.id;
  return jsonb_build_object('id', novo_id, 'existente', false);
end;
$$;
revoke all on function converter_contato(uuid) from public;
grant execute on function converter_contato(uuid) to authenticated;

-- ---------- Formulário público: reenvio atualiza o pedido aberto ----------

alter table contatos add column if not exists envios int not null default 1;
alter table contatos add column if not exists reenviado_em timestamptz;

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

  -- Contra robôs e cliques repetidos: um pedido por WhatsApp a cada 10 minutos por escritório.
  if exists (
    select 1 from contatos
    where escritorio_id = esc.id and whatsapp = p_whatsapp and coalesce(reenviado_em, criado_em) > now() - interval '10 minutes'
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

-- ---------- Nomes repetidos ----------

create unique index if not exists etapas_nome_unico on etapas (projeto_id, lower(trim(nome)));
create unique index if not exists modelos_proposta_nome_unico on modelos_proposta (escritorio_id, lower(trim(nome)));
create unique index if not exists modelos_contrato_nome_unico on modelos_contrato (escritorio_id, lower(trim(nome)));
create unique index if not exists servicos_nome_unico on servicos (escritorio_id, lower(trim(nome)));
