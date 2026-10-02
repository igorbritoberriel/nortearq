-- NorteArq — portal do cliente (/portal, com login). Rodar depois de 0018.
--
-- O cliente cria o acesso a partir de um link seguro que já recebeu (o link prova quem ele é),
-- então a conta nasce com o e-mail confirmado. Tudo aqui passa por funções que conferem
-- clientes.usuario_id = auth.uid(): cada cliente só enxerga o que é dele (RN-00.2).
-- V1: um portal por escritório (decisão 10) — um login liga a um cliente só.

create unique index if not exists clientes_usuario_unico on clientes (usuario_id) where usuario_id is not null;

-- ---------- Criar acesso: quem é o cliente deste link? ----------

create or replace function cliente_do_link_portal(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente_id', c.id,
    'nome', c.nome,
    'email', c.email,
    'tem_acesso', c.usuario_id is not null,
    'tem_projeto', exists (select 1 from projetos p where p.cliente_id = c.id)
  )
  from links_cliente l
  join clientes c on c.id = l.cliente_id
  where l.token = p_token and length(p_token) >= 32 and l.expira_em > now()
$$;

revoke all on function cliente_do_link_portal(text) from public;
grant execute on function cliente_do_link_portal(text) to anon, authenticated;

-- ---------- Tela inicial do portal ----------

create or replace function meu_portal() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente', jsonb_build_object('nome', c.nome, 'email', c.email),
    'escritorio', jsonb_build_object(
      'nome', e.nome, 'logo_url', e.logo_url, 'cor_primaria', e.cor_primaria, 'whatsapp', e.whatsapp
    ),
    'projetos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'status', p.status,
        'etapas_total', (select count(*) from etapas et where et.projeto_id = p.id),
        'etapas_aprovadas', (select count(*) from etapas et where et.projeto_id = p.id and et.status = 'aprovada'),
        'etapas_aguardando', (select count(*) from etapas et where et.projeto_id = p.id and et.status = 'aguardando_aprovacao'),
        'aditivos_pendentes', (select count(*) from aditivos a where a.projeto_id = p.id and a.status = 'enviado'),
        'parcelas_pendentes', (select count(*) from pagamentos pg where pg.contrato_id = p.contrato_id and pg.pago_em is null),
        'valor_pendente', (select coalesce(sum(pg.valor), 0) from pagamentos pg where pg.contrato_id = p.contrato_id and pg.pago_em is null)
      ) order by p.criado_em desc)
      from projetos p where p.cliente_id = c.id
    ), '[]')
  )
  from clientes c
  join escritorios e on e.id = c.escritorio_id
  where c.usuario_id = auth.uid()
$$;

revoke all on function meu_portal() from public;
grant execute on function meu_portal() to authenticated;

-- ---------- Projeto no portal ----------
-- Reaproveita as telas e ações do link do projeto: devolve um código de link válido do próprio
-- projeto (cria um se não houver), sem desativar o link que o cliente já tem no WhatsApp.

create or replace function token_do_portal(p_projeto uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  pr projetos%rowtype;
  v_token text;
begin
  select p.* into pr from projetos p join clientes c on c.id = p.cliente_id
  where p.id = p_projeto and c.usuario_id = auth.uid();
  if not found then
    raise exception 'projeto_nao_encontrado';
  end if;

  select token into v_token from links_cliente
  where referencia_id = pr.id and destino = 'projeto' and expira_em > now() + interval '1 day'
  order by criado_em desc limit 1;

  if v_token is null then
    insert into links_cliente (escritorio_id, cliente_id, destino, referencia_id, expira_em)
    values (pr.escritorio_id, pr.cliente_id, 'projeto', pr.id, now() + interval '90 days')
    returning token into v_token;
  end if;
  return v_token;
end;
$$;

revoke all on function token_do_portal(uuid) from public;
grant execute on function token_do_portal(uuid) to authenticated;

-- ---------- Documentos: contrato assinado e proposta aprovada ----------

create or replace function documentos_do_portal(p_projeto uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'contrato', case when ct.id is null then null else jsonb_build_object(
      'status', ct.status, 'conteudo', ct.conteudo, 'assinado_em', ct.assinado_em,
      'aceite_nome', ct.aceite_nome, 'codigo_verificacao', ct.codigo_verificacao
    ) end,
    'proposta', case when pp.id is null then null else jsonb_build_object(
      'versao', pp.versao, 'titulo', pp.titulo, 'escopo', pp.escopo, 'itens', pp.itens,
      'valor_total', pp.valor_total, 'parcelas', pp.parcelas, 'forma_pagamento', pp.forma_pagamento,
      'prazo', pp.prazo, 'revisoes_incluidas', pp.revisoes_incluidas, 'visitas_incluidas', pp.visitas_incluidas,
      'nao_incluido', pp.nao_incluido, 'deslocamento_tipo', pp.deslocamento_tipo,
      'deslocamento_valor', pp.deslocamento_valor, 'deslocamento_cidade', pp.deslocamento_cidade,
      'deslocamento_obs', pp.deslocamento_obs, 'modo_pagamento', pp.modo_pagamento, 'entrada_pct', pp.entrada_pct,
      'parcelas_max', pp.parcelas_max, 'parcelas_escolhidas', pp.parcelas_escolhidas,
      'validade_dias', pp.validade_dias, 'validade_ate', pp.validade_ate, 'enviada_em', pp.enviada_em,
      'respondida_em', pp.respondida_em
    ) end
  )
  from projetos p
  join clientes c on c.id = p.cliente_id
  left join contratos ct on ct.id = p.contrato_id
  left join propostas pp on pp.id = ct.proposta_id
  where p.id = p_projeto and c.usuario_id = auth.uid()
$$;

revoke all on function documentos_do_portal(uuid) from public;
grant execute on function documentos_do_portal(uuid) to authenticated;
