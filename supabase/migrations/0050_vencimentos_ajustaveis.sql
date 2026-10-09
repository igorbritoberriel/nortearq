-- NorteArq — dia fixo de vencimento na proposta e alteração de vencimento com histórico. Rodar depois de 0049.

-- ---------- 1. Dia fixo das parcelas do saldo ----------
-- Vazio: mês a mês no dia da assinatura (como antes). Preenchido: todo dia N, a partir do mês seguinte.
alter table propostas add column dia_vencimento smallint check (dia_vencimento between 1 and 28);
grant insert (dia_vencimento), update (dia_vencimento) on propostas to authenticated;

create or replace function vencimento_automatico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  m text[];
  tem_entrada boolean;
  dia int;
  base date;
begin
  if new.vencimento is not null then
    return new;
  end if;
  select pr.dia_vencimento into dia from contratos c join propostas pr on pr.id = c.proposta_id where c.id = new.contrato_id;
  if new.descricao ~* '^(entrada|pagamento único|valor total)' then
    new.vencimento := hoje;
  elsif new.descricao ~* '^aditivo' then
    m := regexp_match(new.descricao, 'parcela (\d+) de (\d+)');
    new.vencimento := (hoje + make_interval(months => coalesce(m[1]::int, 1) - 1))::date;
  elsif dia is not null and new.descricao ~* '^(saldo, em parcela única|parcela \d+ de \d+)' then
    base := (date_trunc('month', hoje) + interval '1 month')::date + (dia - 1);
    m := regexp_match(new.descricao, '^Parcela (\d+) de (\d+)', 'i');
    new.vencimento := (base + make_interval(months => coalesce(m[1]::int, 1) - 1))::date;
  elsif new.descricao ~* '^saldo, em parcela única' then
    new.vencimento := (hoje + interval '1 month')::date;
  else
    m := regexp_match(new.descricao, '^Parcela (\d+) de (\d+)');
    if m is not null then
      select exists (select 1 from pagamentos where contrato_id = new.contrato_id and descricao ~* '^entrada') into tem_entrada;
      new.vencimento := (hoje + make_interval(months => m[1]::int - case when tem_entrada then 0 else 1 end))::date;
    end if;
  end if;
  return new;
end;
$$;

-- Nova versão da proposta leva o dia escolhido.
alter function nova_versao_proposta(uuid) rename to nova_versao_proposta_v0050;
create function nova_versao_proposta(p_proposta uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  novo := nova_versao_proposta_v0050(p_proposta);
  update propostas set dia_vencimento = (select dia_vencimento from propostas where id = p_proposta)
    where id = novo and status = 'rascunho';
  return novo;
end $$;
revoke all on function nova_versao_proposta(uuid) from public;
grant execute on function nova_versao_proposta(uuid) to authenticated;
revoke all on function nova_versao_proposta_v0050(uuid) from public, anon, authenticated;

-- O cliente vê o dia na proposta.
alter function proposta_publica(text) rename to proposta_publica_v0050;
create function proposta_publica(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p propostas%rowtype;
begin
  p := proposta_do_link(p_token);
  return proposta_publica_v0050(p_token) || jsonb_build_object('dia_vencimento', p.dia_vencimento);
end $$;
revoke all on function proposta_publica(text) from public;
grant execute on function proposta_publica(text) to anon, authenticated;
revoke all on function proposta_publica_v0050(text) from public, anon, authenticated;

-- E no contrato, junto da condição de pagamento.
alter function renderizar_contrato(uuid,text,text,text,date) rename to renderizar_contrato_v0050;
create function renderizar_contrato(p_contrato uuid, p_nome text, p_documento text, p_endereco text, p_data date)
returns text language plpgsql stable security definer set search_path = public as $$
declare texto text; p propostas%rowtype;
begin
  texto := renderizar_contrato_v0050(p_contrato,p_nome,p_documento,p_endereco,p_data);
  select pr.* into p from propostas pr join contratos c on c.proposta_id = pr.id where c.id = p_contrato;
  if p.dia_vencimento is not null and p.modo_pagamento = 'parcelado' and not coalesce(p.avista, false) then
    texto := texto || E'\nAs parcelas do saldo vencem todo dia ' || p.dia_vencimento || ' de cada mês, a partir do mês seguinte à assinatura.';
  end if;
  return texto;
end $$;
revoke all on function renderizar_contrato(uuid,text,text,text,date) from public, anon, authenticated;
revoke all on function renderizar_contrato_v0050(uuid,text,text,text,date) from public, anon, authenticated;

-- ---------- 2. Alterar vencimento de parcela não paga ----------
create table pagamentos_vencimentos (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  antes date not null,
  depois date not null,
  motivo text check (char_length(motivo) <= 200),
  membro_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index pagamentos_vencimentos_pagamento on pagamentos_vencimentos(pagamento_id, criado_em desc);
alter table pagamentos_vencimentos enable row level security;
revoke all on pagamentos_vencimentos from public, anon, authenticated;
grant select on pagamentos_vencimentos to authenticated;
grant all on pagamentos_vencimentos to service_role;
create policy "histórico de vencimentos do escritório" on pagamentos_vencimentos for select to authenticated
  using (escritorio_id = meu_escritorio_financeiro());

-- A data definida só muda pela função abaixo (que registra o histórico).
create or replace function proteger_pagamento() returns trigger
language plpgsql as $$
begin
  if new.valor is distinct from old.valor
     or new.descricao is distinct from old.descricao
     or (new.vencimento is distinct from old.vencimento and old.vencimento is not null
         and coalesce(current_setting('nortearq.vencimento', true), '') <> 'on')
     or new.contrato_id is distinct from old.contrato_id
     or new.escritorio_id is distinct from old.escritorio_id then
    raise exception 'pagamento_imutavel';
  end if;
  if old.pago_em is not null and new.pago_em is distinct from old.pago_em
     and coalesce(current_setting('nortearq.estorno', true), '') <> 'on' then
    raise exception 'pagamento_ja_baixado';
  end if;
  return new;
end;
$$;

-- Devolve as parcelas alteradas (com a cobrança do Asaas, quando houver) para o servidor atualizar o Asaas.
create function alterar_vencimento(p_pagamento uuid, p_data date, p_motivo text default null, p_proximas boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pg pagamentos%rowtype;
  r pagamentos%rowtype;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  delta int;
  nova date;
  alteradas jsonb := '[]';
begin
  select * into pg from pagamentos where id = p_pagamento and escritorio_id = meu_escritorio_financeiro() for update;
  if not found then raise exception 'pagamento_nao_encontrado'; end if;
  if situacao_escritorio(pg.escritorio_id) in ('leitura', 'suspenso') then raise exception 'escritorio_somente_leitura'; end if;
  if pg.pago_em is not null then raise exception 'pagamento_ja_baixado'; end if;
  if pg.asaas_parcelamento_id is not null then raise exception 'parcelamento_cartao'; end if;
  if pg.vencimento is null then raise exception 'sem_vencimento'; end if;
  if p_data is null or p_data < hoje or p_data > hoje + 730 then raise exception 'data_invalida'; end if;
  if p_data = pg.vencimento then raise exception 'mesma_data'; end if;
  if char_length(coalesce(p_motivo, '')) > 200 then raise exception 'motivo_longo'; end if;
  delta := p_data - pg.vencimento;
  perform set_config('nortearq.vencimento', 'on', true);
  for r in
    select * from pagamentos
    where contrato_id = pg.contrato_id and pago_em is null and asaas_parcelamento_id is null and vencimento is not null
      and (id = pg.id or (p_proximas and ordem > pg.ordem))
    order by ordem
    for update
  loop
    nova := case when r.id = pg.id then p_data else r.vencimento + delta end;
    if nova < hoje then continue; end if;
    update pagamentos set vencimento = nova, lembrete_antes_em = null, lembrete_dia_em = null, lembrete_atraso_em = null
      where id = r.id;
    insert into pagamentos_vencimentos (pagamento_id, escritorio_id, antes, depois, motivo)
      values (r.id, r.escritorio_id, r.vencimento, nova, nullif(trim(p_motivo), ''));
    alteradas := alteradas || jsonb_build_object('id', r.id, 'antes', r.vencimento, 'depois', nova, 'asaas', r.asaas_cobranca_id);
  end loop;
  perform set_config('nortearq.vencimento', '', true);
  return alteradas;
end $$;
revoke all on function alterar_vencimento(uuid, date, text, boolean) from public, anon;
grant execute on function alterar_vencimento(uuid, date, text, boolean) to authenticated;

notify pgrst, 'reload schema';
