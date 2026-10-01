-- NorteArq — etapa 6: propostas (módulo 01, RN-01.6 a RN-01.11).
-- Rodar depois de 0006.

-- =========================================================
-- Campos novos
-- =========================================================

alter table propostas
  add column if not exists grupo_id uuid,                     -- versões da mesma proposta (RN-01.7)
  add column if not exists versao int not null default 1,
  add column if not exists titulo text not null default 'Proposta de projeto',
  add column if not exists itens jsonb not null default '[]',  -- [{ servico, escopo, entregaveis[] }] (RN-01.6)
  add column if not exists parcelas jsonb not null default '[]', -- [{ descricao, valor }]
  add column if not exists validade_dias int not null default 15, -- RN-01.8
  add column if not exists validade_ate date,
  add column if not exists enviada_em timestamptz,
  add column if not exists resposta_ip text,                  -- RN-01.10
  add column if not exists atualizado_em timestamptz not null default now();

update propostas set grupo_id = id where grupo_id is null;

create or replace function proposta_grupo_padrao() returns trigger
language plpgsql as $$
begin
  new.grupo_id := coalesce(new.grupo_id, new.id);
  return new;
end;
$$;

drop trigger if exists proposta_grupo on propostas;
create trigger proposta_grupo before insert on propostas
  for each row execute function proposta_grupo_padrao();

alter table propostas drop constraint if exists propostas_status_check;
alter table propostas add constraint propostas_status_check
  check (status in ('rascunho','enviada','aprovada','ajuste_pedido','recusada','substituida'));

alter table propostas add constraint propostas_motivo_recusa_check
  check (motivo_recusa is null or motivo_recusa in ('preco','prazo','escopo','outro_profissional','desistiu','outro'));

alter table propostas add constraint propostas_validade_check check (validade_dias between 1 and 90);
alter table propostas add constraint propostas_itens_formato check (jsonb_typeof(itens) = 'array');
alter table propostas add constraint propostas_parcelas_formato check (jsonb_typeof(parcelas) = 'array');
alter table propostas add constraint propostas_contadores_check
  check (revisoes_incluidas between 0 and 50 and visitas_incluidas between 0 and 200);

create index if not exists propostas_escritorio_data on propostas (escritorio_id, atualizado_em desc);
create index if not exists propostas_cliente on propostas (cliente_id, enviada_em desc);
create unique index if not exists propostas_grupo_versao on propostas (grupo_id, versao);

-- =========================================================
-- Etapa do cliente só avança (RN-00.5)
-- =========================================================

create or replace function avancar_etapa(p_cliente uuid, p_etapa text) returns void
language sql security definer set search_path = public as $$
  update clientes set etapa = p_etapa
  where id = p_cliente
    and array_position(array['contato','briefing','proposta','contrato','projeto','obra','entregue','encerrado'], etapa)
      < array_position(array['contato','briefing','proposta','contrato','projeto','obra','entregue','encerrado'], p_etapa)
$$;

revoke all on function avancar_etapa(uuid, text) from public;

-- =========================================================
-- Segurança: o arquiteto edita só o rascunho (RN-01.7)
-- =========================================================

create policy "membro vê propostas do escritório" on propostas
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro cria propostas" on propostas
  for insert to authenticated with check (escritorio_id = meu_escritorio() and status = 'rascunho');
create policy "membro edita rascunho" on propostas
  for update to authenticated
  using (escritorio_id = meu_escritorio() and status = 'rascunho')
  with check (escritorio_id = meu_escritorio() and status = 'rascunho');
create policy "membro apaga rascunho" on propostas
  for delete to authenticated using (escritorio_id = meu_escritorio() and status = 'rascunho');

-- Status, versão e resposta do cliente só mudam pelas funções abaixo.
revoke insert, update on propostas from authenticated;
grant insert (escritorio_id, cliente_id, titulo, escopo, itens, valor_total, parcelas, forma_pagamento, prazo,
  revisoes_incluidas, visitas_incluidas, nao_incluido, validade_dias) on propostas to authenticated;
grant update (titulo, escopo, itens, valor_total, parcelas, forma_pagamento, prazo,
  revisoes_incluidas, visitas_incluidas, nao_incluido, validade_dias, atualizado_em) on propostas to authenticated;

-- =========================================================
-- Enviar: fecha a versão, desativa as anteriores e gera o link (RN-01.7, RN-01.8)
-- =========================================================

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

  -- Link novo; o anterior de proposta deixa de valer (RN-02.4 vale para todos os links).
  update links_cliente set expira_em = now()
  where cliente_id = p.cliente_id and destino = 'proposta' and expira_em > now();
  insert into links_cliente (escritorio_id, cliente_id, destino, referencia_id)
  values (p.escritorio_id, p.cliente_id, 'proposta', p.id)
  returning token into novo_token;

  return novo_token;
end;
$$;

revoke all on function enviar_proposta(uuid) from public;
grant execute on function enviar_proposta(uuid) to authenticated;

-- Nova versão a partir de uma proposta enviada ou respondida. Se já há rascunho no grupo, devolve ele.
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
    forma_pagamento, prazo, revisoes_incluidas, visitas_incluidas, nao_incluido, validade_dias)
  select p.escritorio_id, p.cliente_id, p.grupo_id,
    (select max(versao) + 1 from propostas where grupo_id = p.grupo_id),
    p.titulo, p.escopo, p.itens, p.valor_total, p.parcelas, p.forma_pagamento, p.prazo,
    p.revisoes_incluidas, p.visitas_incluidas, p.nao_incluido, p.validade_dias
  returning id into novo_id;

  return novo_id;
end;
$$;

revoke all on function nova_versao_proposta(uuid) from public;
grant execute on function nova_versao_proposta(uuid) to authenticated;

-- =========================================================
-- Lado do cliente (/c/[token]/proposta)
-- =========================================================

-- Proposta mais recente enviada ao cliente do link: o link antigo mostra a versão nova (RN-01.7).
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
  where cliente_id = l.cliente_id and status <> 'rascunho'
  order by enviada_em desc nulls last
  limit 1;
  if not found then
    raise exception 'proposta_nao_encontrada';
  end if;
  return p;
end;
$$;

revoke all on function proposta_do_link(text) from public;

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

-- Aprovar, pedir ajuste ou recusar (RN-01.9), com data, hora e IP (RN-01.10, RG-11).
create or replace function responder_proposta(
  p_token text,
  p_acao text,
  p_comentario text,
  p_motivo text,
  p_ip text
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

revoke all on function responder_proposta(text, text, text, text, text) from public;
grant execute on function responder_proposta(text, text, text, text, text) to anon, authenticated;
