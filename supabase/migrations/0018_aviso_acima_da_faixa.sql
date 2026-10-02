-- NorteArq — faixa de preço: mínimo e máximo opcionais; o máximo vira o aviso "acima da sua faixa".
-- Só aviso: não muda a classificação (RN-01.3, nada é bloqueado). Rodar depois de 0017.

alter table contatos add column if not exists acima_da_faixa boolean not null default false;

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
    prazo_desejado, inicio_desejado, mensagem, status, compativel, prazo_apertado, acima_da_faixa,
    aceite_privacidade_em, ip
  ) values (
    esc.id, left(trim(p_nome), 120), p_whatsapp, nullif(lower(trim(p_email)), ''), servicos_validos,
    p_area_m2, nullif(left(trim(p_localizacao), 120), ''), p_orcamento,
    nullif(left(p_prazo_desejado, 60), ''), p_inicio_desejado, nullif(left(trim(p_mensagem), 2000), ''),
    novo_status,
    case novo_status when 'compativel' then true when 'fora_do_perfil' then false end,
    p_inicio_desejado is not null and esc.proxima_data_livre is not null and p_inicio_desejado < esc.proxima_data_livre,
    p_orcamento is not null and esc.faixa_preco_max is not null and p_orcamento > esc.faixa_preco_max,
    now(), left(p_ip, 64)
  )
  returning id into novo_id;

  return novo_id;
end;
$$;

