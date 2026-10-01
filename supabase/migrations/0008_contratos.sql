-- NorteArq — etapa 7: contrato com aceite eletrônico próprio (módulo 01, RN-01.12 a RN-01.16).
-- Rodar depois de 0007.
-- Assinatura: aceite eletrônico simples (MP 2.200-2/2001, art. 10, § 2º), com nome, CPF/CNPJ, data,
-- hora, IP, navegador e código de verificação (SHA-256 do texto aceito). Dá para trocar por
-- ZapSign/Clicksign depois (coluna assinatura_externa_id).

-- =========================================================
-- Dados do escritório que aparecem no contrato (o CONTRATADO)
-- =========================================================

alter table escritorios
  add column if not exists documento text,             -- CPF ou CNPJ
  add column if not exists endereco text,
  add column if not exists responsavel text,           -- quem assina pelo escritório
  add column if not exists registro_profissional text; -- CAU / CREA

grant update (documento, endereco, responsavel, registro_profissional) on escritorios to authenticated;

-- =========================================================
-- Modelo de contrato (um por escritório na V1)
-- =========================================================

alter table modelos_contrato
  add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists modelos_contrato_um_por_escritorio on modelos_contrato (escritorio_id);

create or replace function texto_contrato_padrao() returns text
language sql immutable as $$
  select $txt$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ARQUITETURA E DESIGN DE INTERIORES

CONTRATANTE: {{cliente.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente.documento}}, responsável pelo imóvel situado em {{cliente.endereco}}.

CONTRATADO(A): {{escritorio.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{escritorio.documento}}, com endereço em {{escritorio.endereco}}, neste ato representado(a) por {{escritorio.responsavel}}, {{escritorio.registro}}.

As partes acima identificadas têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a prestação dos serviços abaixo, conforme a proposta aprovada pelo CONTRATANTE em {{proposta.data_aprovacao}}:

{{proposta.escopo}}

CLÁUSULA 2ª — DO QUE NÃO ESTÁ INCLUÍDO
{{proposta.nao_incluido}}

CLÁUSULA 3ª — DO PRAZO
{{proposta.prazo}}. O prazo fica suspenso enquanto o CONTRATADO aguardar aprovações, informações ou documentos do CONTRATANTE.

CLÁUSULA 4ª — DOS HONORÁRIOS E DA FORMA DE PAGAMENTO
Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de {{proposta.valor_total}}, da seguinte forma:
{{proposta.parcelas}}
{{proposta.forma_pagamento}}

CLÁUSULA 5ª — DAS REVISÕES E VISITAS
Estão incluídas {{proposta.revisoes}} revisão(ões) no total do projeto e {{proposta.visitas}} visita(s) à obra. Revisões ou visitas além desse limite, assim como alterações em etapas já aprovadas, serão objeto de aditivo, com valor e prazo combinados antes da execução.

CLÁUSULA 6ª — DAS APROVAÇÕES
Cada etapa do projeto será apresentada ao CONTRATANTE pela plataforma, onde ele poderá aprovar ou pedir revisão. A aprovação registrada na plataforma, com data, hora e IP, vale como aceite da etapa.

CLÁUSULA 7ª — DA RESCISÃO
Qualquer das partes poderá rescindir este contrato mediante aviso por escrito. Os serviços já executados serão pagos proporcionalmente.

CLÁUSULA 8ª — DOS DIREITOS AUTORAIS
O projeto é obra intelectual do CONTRATADO, protegida pela Lei nº 9.610/1998. O CONTRATANTE fica autorizado a utilizá-lo na execução da obra no imóvel indicado neste contrato.

CLÁUSULA 9ª — DO FORO
Fica eleito o foro da comarca onde se situa o imóvel objeto deste contrato.

E, por estarem de acordo, as partes aceitam este contrato eletronicamente, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001: o CONTRATADO ao enviá-lo e o CONTRATANTE ao aceitá-lo, ficando registrados a data, a hora, o IP e o código de verificação do aceite.

{{data}}$txt$
$$;

create or replace function garantir_modelo_contrato() returns void
language sql security definer set search_path = public as $$
  insert into modelos_contrato (escritorio_id, nome, corpo)
  select meu_escritorio(), 'Modelo padrão', texto_contrato_padrao()
  where meu_escritorio() is not null
  on conflict (escritorio_id) do nothing
$$;

revoke all on function garantir_modelo_contrato() from public;
grant execute on function garantir_modelo_contrato() to authenticated;

create policy "membro vê o modelo de contrato" on modelos_contrato
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro edita o modelo de contrato" on modelos_contrato
  for update to authenticated using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

revoke insert, update, delete on modelos_contrato from authenticated;
grant update (corpo, atualizado_em) on modelos_contrato to authenticated;

-- =========================================================
-- Contratos
-- =========================================================

alter table contratos
  add column if not exists cliente_id uuid references clientes(id) on delete cascade,
  add column if not exists corpo text,                  -- modelo copiado, com os {{campos}}
  add column if not exists enviado_em timestamptz,
  add column if not exists enviado_por uuid references auth.users(id),
  add column if not exists aceite_nome text,
  add column if not exists aceite_documento text,
  add column if not exists aceite_endereco text,
  add column if not exists aceite_ip text,
  add column if not exists aceite_navegador text,
  add column if not exists codigo_verificacao text,     -- SHA-256 do texto aceito
  add column if not exists cancelado_em timestamptz,
  add column if not exists atualizado_em timestamptz not null default now();

alter table contratos alter column conteudo set default '';

alter table contratos drop constraint if exists contratos_status_check;
alter table contratos add constraint contratos_status_check
  check (status in ('rascunho','aguardando_assinatura','assinado','cancelado'));
alter table contratos alter column status set default 'rascunho';

create index if not exists contratos_escritorio_data on contratos (escritorio_id, atualizado_em desc);
create index if not exists contratos_proposta on contratos (proposta_id);

create policy "membro vê contratos do escritório" on contratos
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro edita contrato em rascunho" on contratos
  for update to authenticated
  using (escritorio_id = meu_escritorio() and status = 'rascunho')
  with check (escritorio_id = meu_escritorio() and status = 'rascunho');

revoke insert, update, delete on contratos from authenticated;
grant update (corpo, atualizado_em) on contratos to authenticated;

-- Pagamentos: na V1 é só controle (RN-01.16). O arquiteto marca pago ou pendente.
create policy "membro vê pagamentos" on pagamentos
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro marca pagamentos" on pagamentos
  for update to authenticated using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());
revoke insert, update, delete on pagamentos from authenticated;
grant update (pago_em) on pagamentos to authenticated;

-- Projetos e etapas criados na assinatura: o arquiteto já enxerga (as telas vêm no módulo 03).
create policy "membro vê projetos" on projetos
  for select to authenticated using (escritorio_id = meu_escritorio());
create policy "membro vê etapas" on etapas
  for select to authenticated
  using (exists (select 1 from projetos p where p.id = projeto_id and p.escritorio_id = meu_escritorio()));

-- =========================================================
-- Preenchimento dos {{campos}} (RN-01.12). Uso interno.
-- =========================================================

create or replace function formatar_reais(v numeric) returns text
language sql immutable as $$
  select case when v is null then null
    else 'R$ ' || translate(to_char(v, 'FM999,999,999,990.00'), ',.', '.,') end
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
  texto := replace(texto, '{{proposta.valor_total}}', coalesce(formatar_reais(p.valor_total), falta));
  texto := replace(texto, '{{proposta.parcelas}}', coalesce(v_parcelas, '• À vista: ' || formatar_reais(p.valor_total)));
  texto := replace(texto, '{{proposta.forma_pagamento}}', coalesce(p.forma_pagamento, ''));
  texto := replace(texto, '{{proposta.revisoes}}', p.revisoes_incluidas::text);
  texto := replace(texto, '{{proposta.visitas}}', p.visitas_incluidas::text);
  texto := replace(texto, '{{proposta.data_aprovacao}}', coalesce(to_char(p.respondida_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), falta));
  texto := replace(texto, '{{data}}',
    extract(day from p_data)::int || ' de ' || meses[extract(month from p_data)::int] || ' de ' || extract(year from p_data)::int);
  return texto;
end;
$$;

revoke all on function renderizar_contrato(uuid, text, text, text, date) from public;

create or replace function hoje_brasilia() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- =========================================================
-- Arquiteto
-- =========================================================

-- Gera o contrato da proposta aprovada (RN-01.12). Se já existe um ativo, devolve ele.
create or replace function gerar_contrato(p_proposta uuid) returns uuid
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
  if p.status <> 'aprovada' then
    raise exception 'proposta_nao_aprovada';
  end if;

  select id into existente from contratos where proposta_id = p.id and status <> 'cancelado' limit 1;
  if existente is not null then
    return existente;
  end if;

  perform garantir_modelo_contrato();
  insert into contratos (escritorio_id, proposta_id, cliente_id, corpo, status)
  values (p.escritorio_id, p.id, p.cliente_id,
    (select corpo from modelos_contrato where escritorio_id = p.escritorio_id), 'rascunho')
  returning id into novo_id;
  return novo_id;
end;
$$;

revoke all on function gerar_contrato(uuid) from public;
grant execute on function gerar_contrato(uuid) to authenticated;

-- Texto do contrato com os dados atuais (pré-visualização do arquiteto).
create or replace function previa_contrato(p_contrato uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  c contratos%rowtype;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'contrato_nao_encontrado';
  end if;
  if c.status = 'assinado' then
    return c.conteudo;
  end if;
  return renderizar_contrato(c.id, null, null, null, hoje_brasilia());
end;
$$;

revoke all on function previa_contrato(uuid) from public;
grant execute on function previa_contrato(uuid) to authenticated;

-- Envia para o cliente: o escritório aceita ao enviar. Gera o link (o anterior deixa de valer).
create or replace function enviar_contrato(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  c contratos%rowtype;
  novo_token text;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = meu_escritorio();
  if not found then
    raise exception 'contrato_nao_encontrado';
  end if;
  if c.status not in ('rascunho', 'aguardando_assinatura') then
    raise exception 'contrato_fechado';
  end if;

  if c.status = 'rascunho' then
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

create or replace function cancelar_contrato(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update contratos set status = 'cancelado', cancelado_em = now(), atualizado_em = now()
  where id = p_contrato and escritorio_id = meu_escritorio() and status in ('rascunho', 'aguardando_assinatura');
  if not found then
    raise exception 'contrato_fechado'; -- assinado não se cancela por aqui
  end if;
  update links_cliente set expira_em = now()
  where referencia_id = p_contrato and destino = 'contrato' and expira_em > now();
end;
$$;

revoke all on function cancelar_contrato(uuid) from public;
grant execute on function cancelar_contrato(uuid) to authenticated;

-- =========================================================
-- Cliente (/c/[token]/contrato)
-- =========================================================

create or replace function contrato_do_link(p_token text) returns contratos
language plpgsql security definer set search_path = public as $$
declare
  l links_cliente%rowtype;
  c contratos%rowtype;
begin
  select * into l from links_cliente
  where token = p_token and length(p_token) >= 32 and destino = 'contrato' and expira_em > now();
  if not found then
    raise exception 'link_invalido';
  end if;
  select * into c from contratos where id = l.referencia_id and status <> 'rascunho';
  if not found then
    raise exception 'contrato_nao_encontrado';
  end if;
  return c;
end;
$$;

revoke all on function contrato_do_link(text) from public;

create or replace function contrato_publico(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c contratos%rowtype := contrato_do_link(p_token);
  cli clientes%rowtype;
begin
  select * into cli from clientes where id = c.cliente_id;
  update links_cliente set usado_em = coalesce(usado_em, now()) where token = p_token;
  return jsonb_build_object(
    'status', c.status,
    'texto', case when c.status = 'assinado' then c.conteudo
                  else renderizar_contrato(c.id, null, null, null, hoje_brasilia()) end,
    'nome', cli.nome,
    'documento', cli.documento,
    'endereco', cli.endereco_imovel,
    'assinado_em', c.assinado_em,
    'aceite_nome', c.aceite_nome,
    'codigo_verificacao', c.codigo_verificacao
  );
end;
$$;

revoke all on function contrato_publico(text) from public;
grant execute on function contrato_publico(text) to anon, authenticated;

-- Aceite do cliente. Fecha o texto, cria o projeto e os pagamentos (RN-01.15, RN-01.16).
create or replace function assinar_contrato(
  p_token text,
  p_nome text,
  p_documento text,
  p_endereco text,
  p_ip text,
  p_navegador text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c contratos%rowtype := contrato_do_link(p_token);
  p propostas%rowtype;
  v_documento text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_nome text := left(trim(coalesce(p_nome, '')), 160);
  v_endereco text := left(trim(coalesce(p_endereco, '')), 200);
  v_texto text;
  v_projeto uuid;
begin
  if c.status <> 'aguardando_assinatura' then
    raise exception 'contrato_fechado';
  end if;
  if length(v_nome) < 5 or position(' ' in v_nome) = 0 then
    raise exception 'nome_invalido';
  end if;
  if length(v_documento) not in (11, 14) then
    raise exception 'documento_invalido';
  end if;
  if length(v_endereco) < 8 then
    raise exception 'endereco_invalido';
  end if;

  -- O cliente confirma os próprios dados (RN-01.13).
  update clientes set documento = v_documento, endereco_imovel = v_endereco where id = c.cliente_id;

  v_texto := renderizar_contrato(c.id, v_nome, v_documento, v_endereco, hoje_brasilia());

  update contratos set
    status = 'assinado',
    conteudo = v_texto,
    assinado_em = now(),
    aceite_nome = v_nome,
    aceite_documento = v_documento,
    aceite_endereco = v_endereco,
    aceite_ip = left(p_ip, 64),
    aceite_navegador = left(p_navegador, 300),
    codigo_verificacao = encode(sha256(convert_to(v_texto, 'UTF8')), 'hex'),
    atualizado_em = now()
  where id = c.id;

  -- RN-01.15: projeto com as etapas padrão e o controle de revisões e visitas da proposta.
  select * into p from propostas where id = c.proposta_id;
  insert into projetos (escritorio_id, cliente_id, contrato_id, nome, revisoes_incluidas, visitas_incluidas, tem_obra)
  values (c.escritorio_id, c.cliente_id, c.id, p.titulo, p.revisoes_incluidas, p.visitas_incluidas, p.visitas_incluidas > 0)
  returning id into v_projeto;

  insert into etapas (projeto_id, nome, ordem)
  select v_projeto, padrao.nome, padrao.ordem from (values
    ('Estudo preliminar', 1), ('Anteprojeto', 2), ('Aprovações externas', 3), ('Projeto executivo', 4), ('Entrega', 5)
  ) as padrao(nome, ordem);

  -- RN-01.16: parcelas viram pagamentos para o arquiteto marcar.
  insert into pagamentos (escritorio_id, contrato_id, descricao, valor)
  select c.escritorio_id, c.id, x->>'descricao', (x->>'valor')::numeric
  from jsonb_array_elements(p.parcelas) x;
  if not found then
    insert into pagamentos (escritorio_id, contrato_id, descricao, valor)
    values (c.escritorio_id, c.id, 'Valor total', p.valor_total);
  end if;

  perform avancar_etapa(c.cliente_id, 'projeto');
  return c.id;
end;
$$;

revoke all on function assinar_contrato(text, text, text, text, text, text) from public;
grant execute on function assinar_contrato(text, text, text, text, text, text) to anon, authenticated;
