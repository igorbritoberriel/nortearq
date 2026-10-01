-- NorteArq — etapa 3: formulário público do escritório (/e/[escritorio]) e contatos (módulo 01).
-- Rodar depois de 0003.

-- =========================================================
-- Campos novos em contatos
-- =========================================================

alter table contatos
  add column if not exists mensagem text,
  add column if not exists inicio_desejado date,                         -- RN-01.2: comparado com a agenda
  add column if not exists prazo_apertado boolean not null default false, -- RN-01.2: só alerta
  add column if not exists observacao_encerramento text,
  add column if not exists visto_em timestamptz,                         -- "novo" = ainda não visto
  add column if not exists aceite_privacidade_em timestamptz,            -- RG-8 / RG-11
  add column if not exists ip text;

-- Status: o filtro decide entre compatível, fora do perfil e a avaliar (RN-01.2).
alter table contatos drop constraint if exists contatos_status_check;
alter table contatos add constraint contatos_status_check
  check (status in ('novo','compativel','fora_do_perfil','a_avaliar','convertido','encerrado'));

alter table contatos add constraint contatos_motivo_check
  check (motivo_encerramento is null or motivo_encerramento in ('orcamento','prazo','escopo','sem_retorno','outro'));

create index if not exists contatos_escritorio_data on contatos (escritorio_id, criado_em desc);

-- =========================================================
-- Arquiteto: vê e atualiza os contatos do próprio escritório (RN-00.1)
-- =========================================================

create policy "membro vê contatos do escritório" on contatos
  for select to authenticated using (escritorio_id = meu_escritorio());

create policy "membro atualiza contatos do escritório" on contatos
  for update to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- O arquiteto não altera o que o cliente respondeu, só o andamento.
revoke update on contatos from authenticated;
grant update (status, compativel, motivo_encerramento, observacao_encerramento, visto_em, cliente_id)
  on contatos to authenticated;

-- =========================================================
-- Página pública: só os dados de marca, nunca plano, preço ou agenda
-- =========================================================

create or replace function escritorio_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', e.nome,
    'slug', e.slug,
    'logo_url', e.logo_url,
    'cor_primaria', e.cor_primaria,
    'whatsapp', e.whatsapp,
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome) order by s.ordem)
      from servicos s where s.escritorio_id = e.id and s.ativo
    ), '[]'::jsonb)
  )
  from escritorios e
  where e.slug = lower(p_slug) and e.onboarding_concluido_em is not null
$$;

revoke all on function escritorio_publico(text) from public;
grant execute on function escritorio_publico(text) to anon, authenticated;

-- =========================================================
-- Envio do formulário + filtro de compatibilidade (RN-01.1 a RN-01.3)
-- O filtro roda aqui, no banco: quem preenche o formulário não consegue escolher o próprio status.
-- =========================================================

create or replace function enviar_contato(
  p_slug text,
  p_nome text,
  p_whatsapp text,
  p_email text,
  p_servicos uuid[],
  p_area_m2 numeric,
  p_localizacao text,
  p_orcamento numeric,
  p_prazo_desejado text,
  p_inicio_desejado date,
  p_mensagem text,
  p_ip text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  esc escritorios%rowtype;
  servicos_validos uuid[];
  novo_status text;
  novo_id uuid;
begin
  select * into esc from escritorios where slug = lower(p_slug) and onboarding_concluido_em is not null;
  if not found then
    raise exception 'escritorio_nao_encontrado';
  end if;

  if coalesce(length(trim(p_nome)), 0) < 2 or coalesce(length(p_whatsapp), 0) < 10 then
    raise exception 'dados_invalidos';
  end if;

  -- Contra robôs e cliques repetidos: um pedido por WhatsApp a cada 10 minutos por escritório.
  if exists (
    select 1 from contatos
    where escritorio_id = esc.id and whatsapp = p_whatsapp and criado_em > now() - interval '10 minutes'
  ) then
    raise exception 'pedido_repetido';
  end if;

  -- Só serviços ativos do próprio escritório.
  select coalesce(array_agg(id), '{}') into servicos_validos
  from servicos where escritorio_id = esc.id and ativo and id = any(coalesce(p_servicos, '{}'));

  novo_status := case
    when p_orcamento is null or esc.faixa_preco_min is null then 'a_avaliar'
    when p_orcamento >= esc.faixa_preco_min then 'compativel'
    else 'fora_do_perfil'
  end;

  insert into contatos (
    escritorio_id, nome, whatsapp, email, servicos, area_m2, localizacao, orcamento_disponivel,
    prazo_desejado, inicio_desejado, mensagem, status, compativel, prazo_apertado,
    aceite_privacidade_em, ip
  ) values (
    esc.id, left(trim(p_nome), 120), p_whatsapp, nullif(lower(trim(p_email)), ''), servicos_validos,
    p_area_m2, nullif(left(trim(p_localizacao), 120), ''), p_orcamento,
    nullif(left(p_prazo_desejado, 60), ''), p_inicio_desejado, nullif(left(trim(p_mensagem), 2000), ''),
    novo_status,
    case novo_status when 'compativel' then true when 'fora_do_perfil' then false end,
    p_inicio_desejado is not null and esc.proxima_data_livre is not null and p_inicio_desejado < esc.proxima_data_livre,
    now(), left(p_ip, 64)
  )
  returning id into novo_id;

  return novo_id;
end;
$$;

revoke all on function enviar_contato(text, text, text, text, uuid[], numeric, text, numeric, text, date, text, text) from public;
grant execute on function enviar_contato(text, text, text, text, uuid[], numeric, text, numeric, text, date, text, text)
  to anon, authenticated;
