-- NorteArq — etapa 2: cadastro do arquiteto, configuração inicial e segurança do módulo 00.
-- Rodar depois de 0001 e 0002.

-- =========================================================
-- Campos novos
-- =========================================================

alter table escritorios
  add column if not exists proxima_data_livre date,                           -- RN-01.2 (prazo apertado)
  add column if not exists briefing_antes_proposta boolean not null default false, -- RN-02.2
  add column if not exists onboarding_concluido_em timestamptz;              -- RN-00.3

alter table escritorios
  add constraint escritorios_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60);

alter table servicos
  add column if not exists ativo boolean not null default true; -- RN-00.4: desativar sem apagar

-- =========================================================
-- Cadastro: cria escritório, dono e serviços padrão
-- Dispara quando o arquiteto se cadastra (metadado tipo = 'arquiteto').
-- O cliente final (portal) também vira usuário, mas sem esse metadado, e não ganha escritório.
-- =========================================================

create or replace function gerar_slug(texto text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(texto, ''),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function criar_escritorio_do_cadastro() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dados jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nome_escritorio text := nullif(trim(dados->>'escritorio'), '');
  base text;
  slug_final text;
  tentativa int := 1;
  novo_id uuid;
begin
  if dados->>'tipo' is distinct from 'arquiteto' then
    return new;
  end if;

  nome_escritorio := coalesce(nome_escritorio, 'Meu escritório');
  base := left(gerar_slug(nome_escritorio), 50);
  if length(base) < 3 then base := 'escritorio'; end if;
  slug_final := base;
  while exists (select 1 from escritorios where slug = slug_final) loop
    tentativa := tentativa + 1;
    slug_final := base || '-' || tentativa;
  end loop;

  insert into escritorios (nome, slug, whatsapp)
  values (nome_escritorio, slug_final, nullif(dados->>'whatsapp', ''))
  returning id into novo_id;

  insert into membros (id, escritorio_id, nome, papel)
  values (new.id, novo_id, coalesce(nullif(trim(dados->>'nome'), ''), 'Arquiteto'), 'dono');

  -- RN-00.4: serviços padrão. Legalização não tem briefing.
  insert into servicos (escritorio_id, nome, tem_briefing, ordem) values
    (novo_id, 'Arquitetura', true, 1),
    (novo_id, 'Interiores', true, 2),
    (novo_id, 'Reforma', true, 3),
    (novo_id, 'Legalização', false, 4);

  return new;
end;
$$;

drop trigger if exists ao_cadastrar_usuario on auth.users;
create trigger ao_cadastrar_usuario
  after insert on auth.users
  for each row execute function criar_escritorio_do_cadastro();

-- =========================================================
-- Segurança (RN-00.1): cada membro só enxerga o próprio escritório
-- =========================================================

create policy "membro vê o próprio escritório" on escritorios
  for select to authenticated using (id = meu_escritorio());

-- Plano, teste e assinatura não são alterados pelo arquiteto (só pelo sistema de cobrança).
create policy "membro edita o próprio escritório" on escritorios
  for update to authenticated using (id = meu_escritorio()) with check (id = meu_escritorio());

revoke update on escritorios from authenticated;
grant update (nome, slug, logo_url, cor_primaria, whatsapp, faixa_preco_min, faixa_preco_max,
  proxima_data_livre, briefing_antes_proposta, onboarding_concluido_em) on escritorios to authenticated;

create policy "membro vê a equipe do escritório" on membros
  for select to authenticated using (escritorio_id = meu_escritorio());

create policy "membro edita o próprio perfil" on membros
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on membros from authenticated;
grant update (nome) on membros to authenticated;

create policy "membro gerencia serviços do escritório" on servicos
  for all to authenticated
  using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

-- RN-00.4: serviço não se apaga, se desativa (preserva o histórico de propostas e briefings).
revoke delete on servicos from authenticated;

alter table escritorios
  add constraint escritorios_cor_formato check (cor_primaria is null or cor_primaria ~ '^#[0-9a-fA-F]{6}$');

-- =========================================================
-- Logo do escritório (Supabase Storage)
-- Pasta = id do escritório. Leitura pública (a logo aparece para o cliente final).
-- SVG fica de fora: pode carregar script.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "membro envia a logo do escritório" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marcas' and (storage.foldername(name))[1] = meu_escritorio()::text);

create policy "membro apaga a logo do escritório" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] = meu_escritorio()::text);

-- Apagar exige enxergar o arquivo (a leitura pública da URL não conta para a API).
create policy "membro vê os arquivos de marca do escritório" on storage.objects
  for select to authenticated
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] = meu_escritorio()::text);
