-- NorteArq — aviso automático de erros e "relatar problema ou sugestão". Rodar depois de 0033.
--
-- * erros_sistema: erros do servidor (instrumentation.ts) e das telas (navegador). O mesmo erro na mesma
--   página em até 24 h não cria linha nova: soma em "ocorrencias" (não enche o banco num erro em loop).
-- * relatos: o que os usuários mandam pelo botão "Relatar problema ou sugestão", com a página onde estavam.
-- Só o servidor grava e lê (chave secreta); o usuário não acessa essas tabelas direto.

create table if not exists erros_sistema (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('servidor', 'navegador')),
  mensagem text not null,
  digest text,
  caminho text,
  detalhe jsonb not null default '{}',
  usuario_id uuid references auth.users(id) on delete set null,
  escritorio_id uuid references escritorios(id) on delete set null,
  ocorrencias int not null default 1,
  criado_em timestamptz not null default now(),
  ultima_em timestamptz not null default now(),
  resolvido_em timestamptz
);
create index if not exists erros_recentes on erros_sistema (ultima_em desc);
create index if not exists erros_agrupar on erros_sistema (origem, caminho, md5(mensagem), ultima_em desc);

alter table erros_sistema enable row level security;
revoke all on erros_sistema from anon, authenticated;

create or replace function registrar_erro(
  p_origem text, p_mensagem text, p_digest text, p_caminho text, p_detalhe jsonb, p_usuario uuid, p_escritorio uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_msg text := left(coalesce(nullif(trim(p_mensagem), ''), 'Erro sem mensagem'), 1000);
  v_caminho text := left(p_caminho, 300);
begin
  update erros_sistema set ocorrencias = ocorrencias + 1, ultima_em = now(), resolvido_em = null,
    usuario_id = coalesce(p_usuario, usuario_id), escritorio_id = coalesce(p_escritorio, escritorio_id)
  where id = (
    select id from erros_sistema
    where origem = p_origem and md5(mensagem) = md5(v_msg) and caminho is not distinct from v_caminho
      and ultima_em > now() - interval '24 hours'
    order by ultima_em desc limit 1
  )
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'novo', false);
  end if;

  -- Proteção contra enxurrada: no máximo 500 erros novos por dia.
  if (select count(*) from erros_sistema where criado_em > now() - interval '24 hours') >= 500 then
    return jsonb_build_object('id', null, 'novo', false);
  end if;

  insert into erros_sistema (origem, mensagem, digest, caminho, detalhe, usuario_id, escritorio_id)
  values (p_origem, v_msg, left(p_digest, 100), v_caminho, coalesce(p_detalhe, '{}'), p_usuario, p_escritorio)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'novo', true); -- novo: o servidor avisa o Igor por e-mail
end;
$$;
revoke all on function registrar_erro(text, text, text, text, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function registrar_erro(text, text, text, text, jsonb, uuid, uuid) to service_role;

create table if not exists relatos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('problema', 'sugestao', 'duvida')),
  texto text not null check (length(texto) between 3 and 2000),
  caminho text,
  navegador text,
  usuario_id uuid references auth.users(id) on delete set null,
  escritorio_id uuid references escritorios(id) on delete set null,
  situacao text not null default 'novo' check (situacao in ('novo', 'visto', 'resolvido')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists relatos_recentes on relatos (situacao, criado_em desc);

alter table relatos enable row level security;
revoke all on relatos from anon, authenticated;
