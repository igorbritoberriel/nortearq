-- NorteArq — modelos de proposta por serviço. Rodar depois de 0022.
-- O arquiteto salva uma proposta boa como modelo e a próxima já começa preenchida pelos serviços do
-- cliente. Valor: em branco, fixo ou por m² (calculado com a área do pedido de orçamento).
-- Mudar um modelo nunca altera propostas já criadas: a proposta guarda uma cópia.

create table if not exists modelos_proposta (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 80),
  servicos uuid[] not null default '{}',
  titulo text,
  escopo text,                                  -- mensagem de abertura
  itens jsonb not null default '[]' check (jsonb_typeof(itens) = 'array'),
  nao_incluido text,
  prazo text,
  forma_pagamento text,
  revisoes_incluidas int not null default 2,
  visitas_incluidas int not null default 0,
  deslocamento_tipo text,
  deslocamento_valor numeric,
  deslocamento_cidade text,
  deslocamento_obs text,
  modo_pagamento text,
  entrada_pct numeric,
  parcelas_max int,
  desconto_avista_pct numeric,
  validade_dias int,
  preco_tipo text not null default 'vazio' check (preco_tipo in ('vazio','fixo','m2')),
  preco_valor numeric check (preco_valor is null or (preco_valor > 0 and preco_valor < 100000000)),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists modelos_proposta_escritorio on modelos_proposta (escritorio_id, criado_em);

alter table modelos_proposta enable row level security;
create policy "membro gerencia modelos de proposta" on modelos_proposta
  for all to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- Modo leitura (0020): sem criar modelos novos.
drop trigger if exists exigir_assinatura on modelos_proposta;
create trigger exigir_assinatura before insert on modelos_proposta
  for each row execute function exigir_assinatura_em_dia();

-- De qual modelo a proposta começou (só para mostrar; a proposta é uma cópia independente).
alter table propostas
  add column if not exists modelo_origem text,
  add column if not exists modelo_aplicado_em timestamptz;
grant insert (modelo_origem, modelo_aplicado_em) on propostas to authenticated;
grant update (modelo_origem, modelo_aplicado_em) on propostas to authenticated;
