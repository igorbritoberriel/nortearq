-- NorteArq — cobrança da assinatura do arquiteto (Asaas) e regras RG-1 a RG-6. Rodar depois de 0019.
--
-- Situação do escritório (calculada pelas datas, nunca guardada):
--   teste      → dentro dos 14 dias grátis (RG-1)
--   ativo      → período pago em dia
--   tolerancia → até 7 dias depois do vencimento sem pagar (RG-3): funciona normal, com aviso
--   leitura    → vê tudo, não cria nada (RG-2: 30 dias depois do teste; RG-3: depois da tolerância)
--   suspenso   → passou do modo leitura: só a tela de assinatura
-- O cliente final nunca é afetado (RG-4): as regras só valem para ações do arquiteto.

alter table escritorios
  add column if not exists plano_escolhido text check (plano_escolhido in ('briefing','profissional','escritorio')),
  add column if not exists periodo text check (periodo in ('mensal','anual')),
  add column if not exists pago_ate date,                -- fim do período já pago
  add column if not exists assinatura_cancelada_em timestamptz,
  add column if not exists asaas_cliente_id text,
  add column if not exists asaas_assinatura_id text unique;

create or replace function situacao_escritorio(p_escritorio uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when e.plano = 'trial' or e.pago_ate is null then
      case
        when hoje_brasilia() <= coalesce(e.trial_ate, hoje_brasilia()) then 'teste'
        when hoje_brasilia() <= e.trial_ate + 30 then 'leitura'
        else 'suspenso'
      end
    when hoje_brasilia() <= e.pago_ate then 'ativo'
    when e.assinatura_cancelada_em is null and hoje_brasilia() <= e.pago_ate + 7 then 'tolerancia'
    when hoje_brasilia() <= e.pago_ate + (case when e.assinatura_cancelada_em is null then 37 else 30 end) then 'leitura'
    else 'suspenso'
  end
  from escritorios e where e.id = p_escritorio
$$;

revoke all on function situacao_escritorio(uuid) from public;
grant execute on function situacao_escritorio(uuid) to authenticated;

-- Trava no banco: no modo leitura ou suspenso, o arquiteto não cria nada (RG-2, RG-3).
-- Só vale para membros de escritório: o cliente (link/portal) e o servidor seguem normais (RG-4).
create or replace function exigir_assinatura_em_dia() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
begin
  if v_escritorio is not null and situacao_escritorio(v_escritorio) in ('leitura', 'suspenso') then
    raise exception 'assinatura_pendente';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['clientes','propostas','contratos','briefings','projetos','etapas','aditivos',
    'aprovacoes_externas','arquivos','briefing_perguntas','modelos_contrato','estilos_imagens','pagamentos_eventos']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists exigir_assinatura on %I', t);
      execute format('create trigger exigir_assinatura before insert on %I for each row execute function exigir_assinatura_em_dia()', t);
    end if;
  end loop;
end $$;

-- Histórico de pagamentos da assinatura (avisos do Asaas). O id do evento evita processar duas vezes.
create table if not exists assinatura_eventos (
  id text primary key,                       -- id do evento no Asaas
  escritorio_id uuid references escritorios(id) on delete cascade,
  tipo text not null,                        -- PAYMENT_CONFIRMED, PAYMENT_OVERDUE...
  pagamento_id text,
  valor numeric,
  vencimento date,
  link_fatura text,
  criado_em timestamptz not null default now()
);

create index if not exists assinatura_eventos_escritorio on assinatura_eventos (escritorio_id, criado_em desc);

alter table assinatura_eventos enable row level security;
create policy "membro vê os pagamentos da assinatura" on assinatura_eventos
  for select to authenticated using (escritorio_id = meu_escritorio());
revoke insert, update, delete on assinatura_eventos from authenticated, anon;

-- Notificação nova: avisos sobre a assinatura.
alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('contato','briefing','proposta','contrato','etapa','aditivo','assinatura'));

-- Os campos de cobrança só mudam pelo servidor (chave secreta), nunca pelo arquiteto direto.
revoke update (plano_escolhido, periodo, pago_ate, assinatura_cancelada_em, asaas_cliente_id, asaas_assinatura_id)
  on escritorios from authenticated;
