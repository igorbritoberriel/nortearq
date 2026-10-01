-- NorteArq — etapa 4: clientes, conversão de contato (RN-01.5) e links sem login (RG-7).
-- Rodar depois de 0004.

-- =========================================================
-- Campos novos em clientes
-- =========================================================

alter table clientes
  add column if not exists servicos uuid[] not null default '{}',
  add column if not exists observacoes text,
  add column if not exists contato_id uuid references contatos(id) on delete set null;

create index if not exists clientes_escritorio_data on clientes (escritorio_id, criado_em desc);

-- Links: criado_em para o histórico da ficha.
alter table links_cliente
  add column if not exists criado_em timestamptz not null default now();

create index if not exists links_cliente_cliente on links_cliente (cliente_id, destino, criado_em desc);

-- =========================================================
-- Segurança (RN-00.1)
-- clientes já tem a política "membro acessa clientes do escritório" (0001).
-- =========================================================

create policy "membro gerencia links do escritório" on links_cliente
  for all to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- Link nunca é apagado (histórico); só expira.
revoke delete on links_cliente from authenticated;
revoke update on links_cliente from authenticated;
grant update (expira_em) on links_cliente to authenticated;

-- =========================================================
-- Converter contato em cliente sem redigitar (RN-01.5)
-- security invoker: roda com as permissões do arquiteto, então o RLS continua valendo.
-- =========================================================

create or replace function converter_contato(p_contato_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  c contatos%rowtype;
  novo_id uuid;
begin
  select * into c from contatos where id = p_contato_id;
  if not found then
    raise exception 'contato_nao_encontrado';
  end if;
  if c.cliente_id is not null then
    return c.cliente_id;
  end if;

  insert into clientes (escritorio_id, nome, telefone, email, endereco_imovel, servicos, contato_id)
  values (c.escritorio_id, c.nome, c.whatsapp, c.email, c.localizacao, c.servicos, c.id)
  returning id into novo_id;

  update contatos set status = 'convertido', cliente_id = novo_id, visto_em = coalesce(visto_em, now())
  where id = c.id;

  return novo_id;
end;
$$;

revoke all on function converter_contato(uuid) from public;
grant execute on function converter_contato(uuid) to authenticated;

-- =========================================================
-- Link novo invalida o anterior do mesmo tipo (RN-02.4)
-- =========================================================

create or replace function criar_link_cliente(p_cliente_id uuid, p_destino text) returns text
language plpgsql security invoker set search_path = public as $$
declare
  esc uuid;
  novo_token text;
begin
  select escritorio_id into esc from clientes where id = p_cliente_id;
  if esc is null then
    raise exception 'cliente_nao_encontrado';
  end if;

  update links_cliente set expira_em = now()
  where cliente_id = p_cliente_id and destino = p_destino and expira_em > now();

  insert into links_cliente (escritorio_id, cliente_id, destino)
  values (esc, p_cliente_id, p_destino)
  returning token into novo_token;

  return novo_token;
end;
$$;

revoke all on function criar_link_cliente(uuid, text) from public;
grant execute on function criar_link_cliente(uuid, text) to authenticated;

-- =========================================================
-- Página do link (/c/[token]): valida o código e devolve só o necessário para a tela.
-- Nunca devolve dados de outros clientes nem do escritório além da marca (RG-7).
-- =========================================================

create or replace function link_cliente_publico(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'destino', l.destino,
    'valido', l.expira_em > now(),
    'expira_em', l.expira_em,
    'cliente_nome', split_part(c.nome, ' ', 1),
    'escritorio', jsonb_build_object(
      'nome', e.nome,
      'logo_url', e.logo_url,
      'cor_primaria', e.cor_primaria,
      'whatsapp', e.whatsapp
    )
  )
  from links_cliente l
  join clientes c on c.id = l.cliente_id
  join escritorios e on e.id = l.escritorio_id
  where l.token = p_token and length(p_token) >= 32
$$;

revoke all on function link_cliente_publico(text) from public;
grant execute on function link_cliente_publico(text) to anon, authenticated;
