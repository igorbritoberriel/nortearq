-- NorteArq — editor de briefing: editar perguntas e limites. Rodar depois de 0026.
--
-- * Perguntas do escritório: editar texto, explicação, tipo e opções; apagar.
-- * Perguntas padrão (cópia do modelo NorteArq): editar só texto e explicação (o tipo e as opções
--   alimentam a montagem do briefing); desativar, nunca apagar (RN-02.11).
-- * Limites: 100 perguntas próprias por escritório, 40 por grupo (bloco + ambiente),
--   20 opções de até 80 caracteres, e sem pergunta repetida no mesmo grupo.
-- Briefings já enviados guardam a própria cópia das perguntas (RN-02.12): nada muda neles.

grant update (tipo_resposta) on briefing_perguntas to authenticated;

create or replace function proteger_pergunta_briefing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_proprias int;
  v_grupo int;
begin
  if tg_op = 'UPDATE' and old.padrao then
    if new.tipo_resposta is distinct from old.tipo_resposta or new.opcoes is distinct from old.opcoes then
      raise exception 'padrao_so_texto';
    end if;
  end if;

  if length(trim(coalesce(new.texto, ''))) < 3 or length(new.texto) > 300 then
    raise exception 'texto_invalido';
  end if;
  if new.opcoes is not null then
    if jsonb_typeof(new.opcoes) <> 'array' or jsonb_array_length(new.opcoes) > 20
       or exists (select 1 from jsonb_array_elements_text(new.opcoes) o where length(o) > 80 or length(trim(o)) = 0) then
      raise exception 'opcoes_invalidas';
    end if;
  end if;

  -- Pergunta repetida no mesmo grupo.
  if exists (
    select 1 from briefing_perguntas p
    where p.escritorio_id = new.escritorio_id and p.id <> new.id
      and p.tipo_briefing = new.tipo_briefing and p.ambiente is not distinct from new.ambiente
      and lower(trim(p.texto)) = lower(trim(new.texto))
  ) then
    raise exception 'pergunta_repetida';
  end if;

  if tg_op = 'INSERT' and new.escritorio_id is not null and not new.padrao then
    select count(*) into v_proprias from briefing_perguntas where escritorio_id = new.escritorio_id and not padrao;
    if v_proprias >= 100 then
      raise exception 'limite_perguntas';
    end if;
    select count(*) into v_grupo from briefing_perguntas
    where escritorio_id = new.escritorio_id and tipo_briefing = new.tipo_briefing and ambiente is not distinct from new.ambiente;
    if v_grupo >= 40 then
      raise exception 'limite_grupo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pergunta_briefing on briefing_perguntas;
create trigger proteger_pergunta_briefing before insert or update of texto, ajuda, tipo_resposta, opcoes on briefing_perguntas
  for each row execute function proteger_pergunta_briefing();

-- Texto original de uma pergunta padrão (para "voltar ao texto original").
create or replace function texto_original_pergunta(p_pergunta uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('texto', m.texto, 'ajuda', m.ajuda)
  from briefing_perguntas p
  join briefing_perguntas m on m.escritorio_id is null and m.chave = p.chave
  where p.id = p_pergunta and p.escritorio_id = meu_escritorio() and p.padrao
$$;
revoke all on function texto_original_pergunta(uuid) from public;
grant execute on function texto_original_pergunta(uuid) to authenticated;
