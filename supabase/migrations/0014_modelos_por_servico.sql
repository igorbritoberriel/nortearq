-- NorteArq — vários modelos de contrato por escritório, um para cada tipo de projeto.
-- O modelo padrão vale quando nenhum outro combina com os serviços da proposta.
-- Rodar depois de 0013.

-- =========================================================
-- Modelos: serviços atendidos + qual é o padrão
-- =========================================================

alter table modelos_contrato
  add column if not exists servicos uuid[] not null default '{}',
  add column if not exists padrao boolean not null default false,
  add column if not exists criado_em timestamptz not null default now();

-- Até aqui havia um modelo por escritório: ele vira o padrão.
update modelos_contrato set padrao = true where not padrao;

drop index if exists modelos_contrato_um_por_escritorio;
create unique index if not exists modelos_contrato_um_padrao on modelos_contrato (escritorio_id) where padrao;

alter table contratos
  add column if not exists modelo_id uuid references modelos_contrato(id) on delete set null;

-- Permissões: criar e apagar modelos extras; o padrão não se apaga nem deixa de ser padrão.
create policy "membro cria modelo de contrato" on modelos_contrato
  for insert to authenticated with check (escritorio_id = meu_escritorio() and not padrao);
create policy "membro apaga modelo de contrato extra" on modelos_contrato
  for delete to authenticated using (escritorio_id = meu_escritorio() and not padrao);

grant insert (escritorio_id, nome, corpo, servicos) on modelos_contrato to authenticated;
grant update (nome, corpo, servicos, atualizado_em) on modelos_contrato to authenticated;
grant delete on modelos_contrato to authenticated;

create or replace function garantir_modelo_contrato() returns void
language sql security definer set search_path = public as $$
  insert into modelos_contrato (escritorio_id, nome, corpo, padrao)
  select meu_escritorio(), 'Modelo padrão', texto_contrato_padrao(), true
  where meu_escritorio() is not null
    and not exists (select 1 from modelos_contrato where escritorio_id = meu_escritorio() and padrao)
$$;

-- =========================================================
-- Texto pronto para Design de Interiores (ponto de partida; revisar com advogado)
-- =========================================================

create or replace function texto_contrato_interiores() returns text
language sql immutable as $$
  select $txt$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESIGN DE INTERIORES

CONTRATANTE: {{cliente.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente.documento}}, responsável pelo imóvel situado em {{cliente.endereco}}.

CONTRATADO(A): {{escritorio.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{escritorio.documento}}, com endereço em {{escritorio.endereco}}, neste ato representado(a) por {{escritorio.responsavel}}, {{escritorio.registro}}.

As partes acima identificadas têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a elaboração de projeto de interiores para os ambientes descritos abaixo, conforme a proposta aprovada pelo CONTRATANTE em {{proposta.data_aprovacao}}:

{{proposta.escopo}}

CLÁUSULA 2ª — DO QUE NÃO ESTÁ INCLUÍDO
{{proposta.nao_incluido}}
Também não fazem parte deste contrato, salvo se previstos na proposta: a execução da obra, a compra de móveis, objetos e materiais, os projetos complementares de engenharia (elétrica, hidráulica, estrutura, ar-condicionado) e as aprovações em condomínio ou prefeitura.

CLÁUSULA 3ª — DO PRAZO
{{proposta.prazo}}. O prazo fica suspenso enquanto o CONTRATADO aguardar aprovações, medidas, informações ou documentos do CONTRATANTE.

CLÁUSULA 4ª — DOS HONORÁRIOS E DA FORMA DE PAGAMENTO
Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de {{proposta.valor_total}}, da seguinte forma:
{{proposta.parcelas}}
{{proposta.forma_pagamento}}

CLÁUSULA 5ª — DAS REVISÕES, VISITAS E DESLOCAMENTO
Estão incluídas {{proposta.revisoes}} revisão(ões) no total do projeto e {{proposta.visitas}} visita(s) técnica(s) ao imóvel. Revisões ou visitas além desse limite, assim como alterações em etapas já aprovadas, serão objeto de aditivo, com valor e prazo combinados antes da execução.
{{proposta.deslocamento}}

CLÁUSULA 6ª — DAS APROVAÇÕES
Cada etapa do projeto (estudo de layout, projeto executivo de interiores, detalhamento de marcenaria e especificações) será apresentada ao CONTRATANTE pela plataforma, onde ele poderá aprovar ou pedir revisão. A aprovação registrada na plataforma, com data, hora e IP, vale como aceite da etapa.

CLÁUSULA 7ª — DAS MEDIDAS E DO LEVANTAMENTO
O projeto será desenvolvido a partir do levantamento do imóvel feito pelo CONTRATADO ou das plantas e medidas fornecidas pelo CONTRATANTE. Antes da produção de marcenaria, vidros, pedras e demais itens sob medida, as medidas devem ser conferidas no local pelo fornecedor responsável pela fabricação.

CLÁUSULA 8ª — DAS ESPECIFICAÇÕES E COMPRAS
Os móveis, revestimentos, luminárias, objetos e demais itens especificados no projeto são indicações técnicas e estéticas. Preços, prazos de entrega e disponibilidade são informados pelos fornecedores e podem mudar sem aviso. A compra é feita diretamente pelo CONTRATANTE, que contrata e paga cada fornecedor.
O CONTRATADO poderá sugerir itens equivalentes quando um produto especificado deixar de estar disponível.
O CONTRATADO não receberá comissão, reserva técnica ou qualquer vantagem de fornecedores sem informar o CONTRATANTE por escrito.

CLÁUSULA 9ª — DA EXECUÇÃO POR TERCEIROS
Marceneiros, instaladores, montadores e demais prestadores são contratados pelo CONTRATANTE e respondem pela qualidade, garantia e prazo dos seus serviços e produtos. As visitas do CONTRATADO servem para orientar a execução conforme o projeto e não o tornam responsável pela obra.

CLÁUSULA 10ª — DA RESCISÃO
Qualquer das partes poderá rescindir este contrato mediante aviso por escrito. Os serviços já executados serão pagos proporcionalmente.

CLÁUSULA 11ª — DOS DIREITOS AUTORAIS E DAS IMAGENS
O projeto é obra intelectual do CONTRATADO, protegida pela Lei nº 9.610/1998. O CONTRATANTE fica autorizado a utilizá-lo na execução do projeto no imóvel indicado neste contrato. A publicação de fotos do ambiente pronto em portfólio e redes sociais depende de autorização do CONTRATANTE e nunca identificará o endereço do imóvel.

CLÁUSULA 12ª — DO FORO
Fica eleito o foro da comarca onde se situa o imóvel objeto deste contrato.

E, por estarem de acordo, as partes aceitam este contrato eletronicamente, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001: o CONTRATADO ao enviá-lo e o CONTRATANTE ao aceitá-lo, ficando registrados a data, a hora, o IP e o código de verificação do aceite.

{{data}}$txt$
$$;

-- =========================================================
-- Escolha automática do modelo pela proposta
-- Ganha o modelo que atende mais serviços da proposta; empate ou nenhum → o padrão.
-- (Na proposta o serviço é guardado pelo nome; compara sem diferenciar maiúsculas.)
-- =========================================================

create or replace function escolher_modelo_contrato(p_proposta uuid) returns uuid
language sql stable security definer set search_path = public as $$
  with p as (
    select escritorio_id, itens from propostas where id = p_proposta and escritorio_id = meu_escritorio()
  ),
  nomes as (
    select distinct lower(trim(i->>'servico')) nome from p, jsonb_array_elements(p.itens) i
  ),
  pontos as (
    select m.id, m.padrao, m.criado_em,
      (select count(*) from servicos s join nomes n on n.nome = lower(trim(s.nome)) where s.id = any(m.servicos)) acertos
    from modelos_contrato m join p on p.escritorio_id = m.escritorio_id
  )
  select id from pontos
  order by (acertos > 0 and not padrao) desc, acertos desc, padrao desc, criado_em
  limit 1
$$;

revoke all on function escolher_modelo_contrato(uuid) from public;
grant execute on function escolher_modelo_contrato(uuid) to authenticated;

create or replace function gerar_contrato(p_proposta uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p propostas%rowtype;
  existente uuid;
  modelo uuid;
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
  modelo := escolher_modelo_contrato(p.id);
  insert into contratos (escritorio_id, proposta_id, cliente_id, corpo, modelo_id, status)
  values (p.escritorio_id, p.id, p.cliente_id, (select corpo from modelos_contrato where id = modelo), modelo, 'rascunho')
  returning id into novo_id;
  return novo_id;
end;
$$;

-- Trocar o modelo de um contrato ainda em rascunho (o texto dele é substituído).
create or replace function trocar_modelo_contrato(p_contrato uuid, p_modelo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  novo_corpo text;
begin
  select corpo into novo_corpo from modelos_contrato where id = p_modelo and escritorio_id = meu_escritorio();
  if novo_corpo is null then
    raise exception 'modelo_nao_encontrado';
  end if;
  update contratos set corpo = novo_corpo, modelo_id = p_modelo, atualizado_em = now()
  where id = p_contrato and escritorio_id = meu_escritorio() and status = 'rascunho';
  if not found then
    raise exception 'contrato_fechado';
  end if;
end;
$$;

revoke all on function trocar_modelo_contrato(uuid, uuid) from public;
grant execute on function trocar_modelo_contrato(uuid, uuid) to authenticated;

-- Contratos já gerados ficam ligados ao modelo padrão do escritório.
update contratos c set modelo_id = m.id
from modelos_contrato m
where c.modelo_id is null and m.escritorio_id = c.escritorio_id and m.padrao;
