-- NorteArq — etapa 9: deslocamento para visitas fora da cidade (proposta e contrato).
-- Rodar depois de 0010.
-- O cliente fica ciente do custo antes de fechar (proposta) e ele vira cláusula do contrato.

alter table propostas
  add column if not exists deslocamento_tipo text not null default 'incluido'
    check (deslocamento_tipo in ('incluido','fixo','km','reembolso')),
  add column if not exists deslocamento_valor numeric check (deslocamento_valor is null or deslocamento_valor > 0),
  add column if not exists deslocamento_cidade text,  -- cidade-sede: dentro dela, o deslocamento é incluído
  add column if not exists deslocamento_obs text;     -- pedágio, hospedagem, distância mínima...

grant insert (deslocamento_tipo, deslocamento_valor, deslocamento_cidade, deslocamento_obs) on propostas to authenticated;
grant update (deslocamento_tipo, deslocamento_valor, deslocamento_cidade, deslocamento_obs) on propostas to authenticated;

-- Frase do deslocamento, usada no contrato (a tela da proposta monta a mesma frase em lib/propostas.ts).
create or replace function texto_deslocamento(p propostas) returns text
language sql stable set search_path = public as $$
  select case p.deslocamento_tipo
    when 'incluido' then 'As despesas de deslocamento para as visitas estão incluídas nos honorários.'
    else
      case when nullif(trim(p.deslocamento_cidade), '') is not null
        then 'Nas visitas dentro de ' || trim(p.deslocamento_cidade) || ', o deslocamento está incluído nos honorários. Nas visitas fora de ' || trim(p.deslocamento_cidade) || ', '
        else 'Em cada visita, '
      end
      || case p.deslocamento_tipo
        when 'fixo' then 'será cobrada uma taxa de deslocamento de ' || coalesce(formatar_reais(p.deslocamento_valor), '[a preencher]') || ' por visita.'
        when 'km' then 'será cobrado ' || coalesce(formatar_reais(p.deslocamento_valor), '[a preencher]') || ' por quilômetro rodado (ida e volta).'
        else 'as despesas de deslocamento (combustível, pedágios, passagens, hospedagem e alimentação) serão reembolsadas pelo CONTRATANTE mediante comprovante.'
      end
      || ' O custo previsto de cada visita será informado ao CONTRATANTE antes da viagem.'
  end
  || coalesce(' ' || nullif(trim(p.deslocamento_obs), ''), '')
$$;

-- Modelos e rascunhos que ainda estão com o texto padrão antigo ganham a cláusula nova.
create temp table modelos_antigos on commit drop as
  select id from modelos_contrato where corpo = texto_contrato_padrao();
create temp table rascunhos_antigos on commit drop as
  select id from contratos where status = 'rascunho' and corpo = texto_contrato_padrao();

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

CLÁUSULA 5ª — DAS REVISÕES, VISITAS E DESLOCAMENTO
Estão incluídas {{proposta.revisoes}} revisão(ões) no total do projeto e {{proposta.visitas}} visita(s) à obra. Revisões ou visitas além desse limite, assim como alterações em etapas já aprovadas, serão objeto de aditivo, com valor e prazo combinados antes da execução.
{{proposta.deslocamento}}

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

update modelos_contrato set corpo = texto_contrato_padrao(), atualizado_em = now()
where id in (select id from modelos_antigos);
update contratos set corpo = texto_contrato_padrao(), atualizado_em = now()
where id in (select id from rascunhos_antigos);

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
  texto := replace(texto, '{{proposta.deslocamento}}', texto_deslocamento(p));
  texto := replace(texto, '{{proposta.data_aprovacao}}', coalesce(to_char(p.respondida_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), falta));
  texto := replace(texto, '{{data}}',
    extract(day from p_data)::int || ' de ' || meses[extract(month from p_data)::int] || ' de ' || extract(year from p_data)::int);
  return texto;
end;
$$;

revoke all on function renderizar_contrato(uuid, text, text, text, date) from public;

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
    deslocamento_tipo, deslocamento_valor, deslocamento_cidade, deslocamento_obs)
  select p.escritorio_id, p.cliente_id, p.grupo_id,
    (select max(versao) + 1 from propostas where grupo_id = p.grupo_id),
    p.titulo, p.escopo, p.itens, p.valor_total, p.parcelas, p.forma_pagamento, p.prazo,
    p.revisoes_incluidas, p.visitas_incluidas, p.nao_incluido, p.validade_dias,
    p.deslocamento_tipo, p.deslocamento_valor, p.deslocamento_cidade, p.deslocamento_obs
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
