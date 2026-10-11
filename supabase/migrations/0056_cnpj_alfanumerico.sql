-- CNPJ alfanumérico (Receita Federal, a partir de julho de 2026): os 12 primeiros caracteres podem ser
-- letras maiúsculas ou números; os 2 dígitos verificadores continuam numéricos. CPF segue com 11 números.
-- O documento passa a ser guardado só com letras maiúsculas e números (sem pontuação).
-- Os dígitos verificadores são conferidos no servidor da aplicação (lib/contratos.ts), como antes.

create or replace function normalizar_documento(p text) returns text
language sql immutable set search_path = public as $$
  select upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g'));
$$;

create or replace function documento_no_formato(p text) returns boolean
language sql immutable set search_path = public as $$
  select p ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$';
$$;

create or replace function formatar_documento(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when d ~ '^[0-9]{11}$' then substr(d, 1, 3) || '.' || substr(d, 4, 3) || '.' || substr(d, 7, 3) || '-' || substr(d, 10, 2)
    when length(d) = 14 then substr(d, 1, 2) || '.' || substr(d, 3, 3) || '.' || substr(d, 6, 3) || '/' || substr(d, 9, 4) || '-' || substr(d, 13, 2)
    else nullif(trim(p), '')
  end
  from (select normalizar_documento(p) as d) x;
$$;

alter table fornecedores drop constraint if exists fornecedores_documento_check;
alter table fornecedores add constraint fornecedores_documento_check check (documento is null or documento_no_formato(documento));

-- Mesma função de 0008 (renomeada em 0043), só com o documento aceitando o formato novo.
create or replace function assinar_contrato_v0043(p_token text, p_nome text, p_documento text, p_endereco text, p_ip text, p_navegador text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c contratos%rowtype := contrato_do_link(p_token);
  p propostas%rowtype;
  v_documento text := normalizar_documento(p_documento);
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
  if not documento_no_formato(v_documento) then
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
