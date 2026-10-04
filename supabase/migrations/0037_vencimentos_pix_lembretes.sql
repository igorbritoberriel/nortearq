-- NorteArq — vencimentos, Pix do escritório e lembretes de parcela. Rodar depois de 0036.
--
-- 1. Chave Pix do escritório (para o cliente pagar cada parcela com Pix copia e cola / QR Code).
-- 2. Vencimento automático das parcelas criadas daqui para frente (na assinatura do contrato e ao aprovar aditivo):
--    entrada / pagamento único → no dia; "Parcela k de n" → mês a mês; saldo em parcela única → 1 mês depois;
--    parcelas manuais (por etapa etc.) ficam sem data e o arquiteto define uma vez.
--    Parcelas que já existiam não ganham data sozinhas (para não disparar lembrete inesperado a cliente real).
-- 3. Controle dos lembretes por e-mail ao cliente (3 dias antes, no dia, 3 dias depois) e notificação de atraso.
-- 4. Contrato padrão (novos modelos): cláusula de multa de 2% e juros de 1% ao mês por atraso.

-- ---------- 1. Pix do escritório ----------
alter table escritorios
  add column if not exists pix_tipo text check (pix_tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  add column if not exists pix_chave text check (pix_chave is null or length(pix_chave) between 5 and 77),
  add column if not exists pix_nome text check (pix_nome is null or length(pix_nome) between 2 and 25),
  add column if not exists pix_cidade text check (pix_cidade is null or length(pix_cidade) between 2 and 15);

-- Para a página do cliente: só o necessário para montar o Pix, pelo link do projeto (anônimo) ou pelo portal.
create or replace function pix_do_projeto(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('tipo', e.pix_tipo, 'chave', e.pix_chave, 'nome', e.pix_nome, 'cidade', e.pix_cidade)
  from links_cliente l
  join escritorios e on e.id = l.escritorio_id
  where l.token = p_token and length(p_token) >= 32 and l.destino = 'projeto' and l.expira_em > now()
    and e.pix_chave is not null
$$;
revoke all on function pix_do_projeto(text) from public;
grant execute on function pix_do_projeto(text) to anon, authenticated;

-- ---------- 2. Vencimentos ----------
alter table pagamentos
  add column if not exists lembrete_antes_em timestamptz,
  add column if not exists lembrete_dia_em timestamptz,
  add column if not exists lembrete_atraso_em timestamptz;

create or replace function vencimento_automatico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  m text[];
  tem_entrada boolean;
begin
  if new.vencimento is not null then
    return new;
  end if;
  if new.descricao ~* '^(entrada|pagamento único|valor total)' then
    new.vencimento := hoje;
  elsif new.descricao ~* '^saldo, em parcela única' then
    new.vencimento := (hoje + interval '1 month')::date;
  elsif new.descricao ~* '^aditivo' then
    m := regexp_match(new.descricao, 'parcela (\d+) de (\d+)');
    new.vencimento := (hoje + make_interval(months => coalesce(m[1]::int, 1) - 1))::date;
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

drop trigger if exists vencimento_automatico on pagamentos;
create trigger vencimento_automatico before insert on pagamentos
  for each row execute function vencimento_automatico();

-- Vencimento pode ser definido uma vez (quando está vazio); depois não muda (mudança é aditivo).
create or replace function proteger_pagamento() returns trigger
language plpgsql as $$
begin
  if new.valor is distinct from old.valor
     or new.descricao is distinct from old.descricao
     or (new.vencimento is distinct from old.vencimento and old.vencimento is not null)
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

create or replace function definir_vencimento(p_pagamento uuid, p_data date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_data is null or p_data < (now() at time zone 'America/Sao_Paulo')::date - 365 then
    raise exception 'data_invalida';
  end if;
  update pagamentos set vencimento = p_data
  where id = p_pagamento and escritorio_id = meu_escritorio_financeiro() and vencimento is null and pago_em is null;
  if not found then
    raise exception 'vencimento_ja_definido';
  end if;
end;
$$;
revoke all on function definir_vencimento(uuid, date) from public;
grant execute on function definir_vencimento(uuid, date) to authenticated;

-- ---------- 3. Notificação de parcela atrasada ----------
alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('contato', 'briefing', 'proposta', 'contrato', 'etapa', 'aditivo', 'assinatura', 'pagamento'));

-- ---------- 4. Cláusula de atraso no contrato padrão (vale para modelos novos) ----------
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'texto_contrato_padrao_base') then
    alter function texto_contrato_padrao() rename to texto_contrato_padrao_base;
  end if;
  if not exists (select 1 from pg_proc where proname = 'texto_contrato_interiores_base') then
    alter function texto_contrato_interiores() rename to texto_contrato_interiores_base;
  end if;
end $$;

create or replace function clausula_atraso() returns text
language sql immutable as $$
  select 'Em caso de atraso no pagamento de qualquer parcela, incidirão multa de 2% (dois por cento) sobre o valor em atraso e juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso.'
$$;

create or replace function texto_contrato_padrao() returns text
language sql immutable as $$
  select replace(texto_contrato_padrao_base(), '{{proposta.forma_pagamento}}', '{{proposta.forma_pagamento}}' || E'\n' || clausula_atraso())
$$;

create or replace function texto_contrato_interiores() returns text
language sql immutable as $$
  select replace(texto_contrato_interiores_base(), '{{proposta.forma_pagamento}}', '{{proposta.forma_pagamento}}' || E'\n' || clausula_atraso())
$$;
