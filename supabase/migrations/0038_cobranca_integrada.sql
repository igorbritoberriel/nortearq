-- NorteArq — cobrança integrada pelo Asaas do arquiteto (nível 3). Rodar depois de 0037.
--
-- O arquiteto conecta a PRÓPRIA conta Asaas (chave sem permissão de saque). Cada parcela vira uma cobrança
-- na conta dele (Pix, boleto ou cartão, o cliente escolhe), com split de R$ 0,99 para a carteira do NorteArq.
-- Quando o cliente paga, o Asaas avisa e o sistema registra o pagamento sozinho, com recibo.
-- Conta principal no CPF não cria subcontas no Asaas: por isso o arquiteto abre a conta dele no site do Asaas.

-- Situação visível ao escritório (sem segredos).
alter table escritorios
  add column if not exists cobranca_ativa boolean not null default false,
  add column if not exists cobranca_aceite_em timestamptz,          -- aceite da taxa de R$ 0,99 por parcela paga
  add column if not exists cobranca_conta_nome text,                -- nome da conta Asaas conectada
  add column if not exists cobranca_ambiente text check (cobranca_ambiente in ('producao', 'teste'));

-- Segredos: só o servidor (chave do serviço) lê. Sem políticas de acesso = ninguém logado enxerga.
create table if not exists cobranca_credenciais (
  escritorio_id uuid primary key references escritorios(id) on delete cascade,
  chave_cifrada text not null,          -- chave de API do Asaas do arquiteto, criptografada pelo app (AES-256-GCM)
  carteira_id text not null,            -- walletId da conta do arquiteto
  webhook_id text,
  webhook_token_hash text not null,     -- sha256 da senha que o Asaas manda nos avisos
  criado_em timestamptz not null default now()
);
alter table cobranca_credenciais enable row level security;
revoke all on cobranca_credenciais from anon, authenticated;

-- Cobrança de cada parcela.
alter table pagamentos
  add column if not exists asaas_cobranca_id text unique,
  add column if not exists asaas_link text,              -- página de pagamento do Asaas (invoiceUrl)
  add column if not exists asaas_status text,
  add column if not exists asaas_forma text,             -- PIX, BOLETO, CREDIT_CARD...
  add column if not exists asaas_valor_liquido numeric(12,2),
  add column if not exists taxa_plataforma numeric(12,2),
  add column if not exists cobranca_gerada_em timestamptz;

-- Baixa automática (só o servidor chama, a partir do aviso do Asaas). Mesmas regras do registro manual.
create or replace function baixa_automatica(p_pagamento uuid, p_data date, p_forma text, p_observacao text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pg pagamentos%rowtype;
  v_numero int;
  v_evento uuid;
  v_data date := least(coalesce(p_data, hoje_brasilia()), hoje_brasilia());
begin
  select * into pg from pagamentos where id = p_pagamento for update;
  if not found or pg.pago_em is not null then
    return null; -- já registrado (o Asaas pode reenviar o aviso)
  end if;
  perform 1 from escritorios where id = pg.escritorio_id for update;
  select coalesce(max(recibo_numero), 0) + 1 into v_numero from pagamentos_eventos where escritorio_id = pg.escritorio_id;
  insert into pagamentos_eventos (escritorio_id, pagamento_id, tipo, pago_em, forma, observacao,
    recibo_numero, recibo_codigo, feito_por, feito_por_nome)
  values (pg.escritorio_id, pg.id, 'baixa', v_data,
    case when p_forma in ('pix','transferencia','boleto','cartao','dinheiro','outro') then p_forma else 'outro' end,
    nullif(left(trim(coalesce(p_observacao, '')), 300), ''),
    v_numero, encode(extensions.gen_random_bytes(18), 'hex'), null, 'Asaas (automático)')
  returning id into v_evento;
  update pagamentos set pago_em = v_data, baixa_id = v_evento where id = pg.id;
  return v_evento;
end;
$$;
revoke all on function baixa_automatica(uuid, date, text, text) from public, anon, authenticated;
grant execute on function baixa_automatica(uuid, date, text, text) to service_role;

-- Para a página do cliente: links de pagamento do Asaas das parcelas em aberto deste projeto.
create or replace function links_pagamento_projeto(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('descricao', pg.descricao, 'valor', pg.valor, 'link', pg.asaas_link)), '[]')
  from links_cliente l
  join projetos pr on pr.id = l.referencia_id
  join pagamentos pg on pg.contrato_id = pr.contrato_id
  where l.token = p_token and length(p_token) >= 32 and l.destino = 'projeto' and l.expira_em > now()
    and pg.pago_em is null and pg.asaas_link is not null
$$;
revoke all on function links_pagamento_projeto(text) from public;
grant execute on function links_pagamento_projeto(text) to anon, authenticated;
