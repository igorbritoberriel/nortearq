-- Quando cada entregável já termina com ";" (texto colado de outro documento), o contrato
-- somava outro "; " entre os itens e duplicava a pontuação. Agora tira a pontuação do fim
-- de cada item antes de juntar.
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
           select string_agg(regexp_replace(trim(x), '[;,.]+$', ''), '; ') from jsonb_array_elements_text(i->'entregaveis') x
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
      formatar_reais(p.valor_total) || ', com ' || formatar_pct(p.desconto_avista_pct) || '% de desconto para pagamento à vista: '
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
