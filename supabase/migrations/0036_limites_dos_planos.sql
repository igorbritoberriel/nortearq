-- NorteArq — limites dos planos no banco. Rodar depois de 0035.
--
-- Plano Briefing: 15 briefings novos por mês (horário de Brasília).
-- Plano Profissional (e o teste grátis, que vale como Profissional): 15 projetos em andamento.
--   "Em andamento" = projeto ativo com pelo menos uma etapa ainda não aprovada (nada no sistema marca o
--   projeto como entregue; quando todas as etapas são aprovadas, a vaga volta sozinha).
--   A trava fica em gerar um contrato novo: a assinatura do cliente nunca é bloqueada.
-- Plano Escritório: sem esses limites. RG-5: quem passa do limite não perde nada, só não cria novos.

create or replace function plano_efetivo(p_escritorio uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when e.plano = 'trial' then 'profissional' else coalesce(e.plano, 'profissional') end
  from escritorios e where e.id = p_escritorio
$$;
revoke all on function plano_efetivo(uuid) from public;

create or replace function projetos_em_andamento(p_escritorio uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from projetos p
  where p.escritorio_id = p_escritorio and p.status = 'ativo'
    and (not exists (select 1 from etapas e where e.projeto_id = p.id)
         or exists (select 1 from etapas e where e.projeto_id = p.id and e.status <> 'aprovada'))
$$;
revoke all on function projetos_em_andamento(uuid) from public;

create or replace function briefings_no_mes(p_escritorio uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from briefings b
  where b.escritorio_id = p_escritorio
    and b.criado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
$$;
revoke all on function briefings_no_mes(uuid) from public;

-- Para a tela: uso e limite do plano (null = sem limite).
create or replace function uso_do_plano() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_escritorio uuid := meu_escritorio();
  v_plano text;
begin
  if v_escritorio is null then
    return null;
  end if;
  v_plano := plano_efetivo(v_escritorio);
  return jsonb_build_object(
    'plano', v_plano,
    'projetos', projetos_em_andamento(v_escritorio),
    'limite_projetos', case when v_plano = 'profissional' then 15 end,
    'briefings_mes', briefings_no_mes(v_escritorio),
    'limite_briefings', case when v_plano = 'briefing' then 15 end
  );
end;
$$;
revoke all on function uso_do_plano() from public;
grant execute on function uso_do_plano() to authenticated;

-- Trava: briefing novo.
create or replace function travar_limite_briefings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if plano_efetivo(new.escritorio_id) = 'briefing' and briefings_no_mes(new.escritorio_id) >= 15 then
    raise exception 'limite_briefings';
  end if;
  return new;
end;
$$;
drop trigger if exists limite_briefings on briefings;
create trigger limite_briefings before insert on briefings
  for each row execute function travar_limite_briefings();

-- Trava: contrato novo (que vira projeto ao ser assinado).
create or replace function travar_limite_projetos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if plano_efetivo(new.escritorio_id) = 'profissional' and projetos_em_andamento(new.escritorio_id) >= 15 then
    raise exception 'limite_projetos';
  end if;
  return new;
end;
$$;
drop trigger if exists limite_projetos on contratos;
create trigger limite_projetos before insert on contratos
  for each row execute function travar_limite_projetos();
