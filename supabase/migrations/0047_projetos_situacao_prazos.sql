-- Situação reversível do projeto e prazos planejados, com histórico por escritório.
alter table projetos drop constraint projetos_status_check;
alter table projetos add constraint projetos_status_check check(status in ('ativo','pausado','entregue','encerrado'));

create table projeto_eventos (
 id uuid primary key default gen_random_uuid(),
 escritorio_id uuid not null references escritorios(id) on delete cascade,
 projeto_id uuid not null references projetos(id) on delete cascade,
 membro_id uuid references auth.users(id) on delete set null,
 membro_nome text,
 tipo text not null check(tipo in ('situacao','prazo')),
 etapa_nome text,
 antes text,
 depois text,
 motivo text,
 criado_em timestamptz not null default now()
);
create index projeto_eventos_projeto on projeto_eventos(projeto_id,criado_em desc);
alter table projeto_eventos enable row level security;
revoke all on projeto_eventos from public,anon,authenticated;
grant select on projeto_eventos to authenticated;
grant all on projeto_eventos to service_role;
create policy "histórico de projetos do escritório" on projeto_eventos for select to authenticated using(escritorio_id=meu_escritorio());

-- Pausar reserva a vaga. Entregar ou encerrar libera a vaga dos projetos incompletos.
create or replace function projetos_em_andamento(p_escritorio uuid) returns int
language sql stable security definer set search_path=public as $$
 select count(*)::int from projetos p where p.escritorio_id=p_escritorio
 and (p.status='pausado' or (p.status='ativo' and (
 not exists(select 1 from etapas e where e.projeto_id=p.id)
 or exists(select 1 from etapas e where e.projeto_id=p.id and e.status<>'aprovada'))))
$$;
revoke all on function projetos_em_andamento(uuid) from public,anon,authenticated;

create function mudar_situacao_projeto(p_projeto uuid,p_situacao text,p_motivo text default null) returns void
language plpgsql security definer set search_path=public as $$
declare pr projetos%rowtype; v_escritorio uuid:=meu_escritorio(); v_motivo text:=nullif(trim(p_motivo),'');
begin
 if v_escritorio is null or coalesce(meu_papel(),'') not in ('dono','administrador') then raise exception 'sem_permissao'; end if;
 if situacao_escritorio(v_escritorio) in ('leitura','suspenso') then raise exception 'modo_leitura'; end if;
 -- A mesma trava serializa reaberturas concorrentes no escritório.
 perform 1 from escritorios where id=v_escritorio for update;
 select * into pr from projetos where id=p_projeto and escritorio_id=v_escritorio for update;
 if not found then raise exception 'projeto_invalido'; end if;
 if p_situacao not in ('ativo','pausado','entregue','encerrado') or p_situacao is null then raise exception 'situacao_invalida'; end if;
 if pr.status=p_situacao then raise exception 'situacao_ja_registrada'; end if;
 if (p_situacao in ('pausado','entregue') and pr.status<>'ativo')
 or (p_situacao='encerrado' and pr.status not in ('ativo','pausado')) then raise exception 'transicao_invalida'; end if;
 if p_situacao in ('pausado','encerrado') and (v_motivo is null or char_length(v_motivo)<5) then raise exception 'motivo_obrigatorio'; end if;
 if char_length(v_motivo)>500 then raise exception 'motivo_longo'; end if;
 if p_situacao='entregue' and (not exists(select 1 from etapas where projeto_id=pr.id)
 or exists(select 1 from etapas where projeto_id=pr.id and status<>'aprovada')
 or exists(select 1 from aditivos where projeto_id=pr.id and status='enviado')) then raise exception 'projeto_com_pendencias'; end if;
 if p_situacao='ativo' and pr.status in ('entregue','encerrado')
 and plano_efetivo(v_escritorio)='profissional' and projetos_em_andamento(v_escritorio)>=15
 and (not exists(select 1 from etapas where projeto_id=pr.id)
 or exists(select 1 from etapas where projeto_id=pr.id and status<>'aprovada')) then raise exception 'limite_projetos'; end if;
 if p_situacao='pausado' and plano_efetivo(v_escritorio)='profissional' and projetos_em_andamento(v_escritorio)>=15
 and exists(select 1 from etapas where projeto_id=pr.id)
 and not exists(select 1 from etapas where projeto_id=pr.id and status<>'aprovada') then raise exception 'limite_projetos'; end if;
 update projetos set status=p_situacao,atualizado_em=now() where id=pr.id;
 insert into projeto_eventos(escritorio_id,projeto_id,membro_id,membro_nome,tipo,antes,depois,motivo)
 values(v_escritorio,pr.id,auth.uid(),(select nome from membros where id=auth.uid()),'situacao',pr.status,p_situacao,v_motivo);
end $$;
revoke all on function mudar_situacao_projeto(uuid,text,text) from public,anon,authenticated;
grant execute on function mudar_situacao_projeto(uuid,text,text) to authenticated;

-- O prazo planejado é alterado pela função para que nunca perca o histórico.
revoke update(prazo) on etapas from authenticated;
create function definir_prazo_etapa(p_etapa uuid,p_prazo date) returns void
language plpgsql security definer set search_path=public as $$
declare e etapas%rowtype; pr projetos%rowtype; v_escritorio uuid:=meu_escritorio();
begin
 if v_escritorio is null then raise exception 'sem_permissao'; end if;
 if situacao_escritorio(v_escritorio) in ('leitura','suspenso') then raise exception 'modo_leitura'; end if;
 if p_prazo is not null and (p_prazo<'2000-01-01'::date or p_prazo>'2100-12-31'::date) then raise exception 'prazo_invalido'; end if;
 select p.* into pr from projetos p join etapas et on et.projeto_id=p.id where et.id=p_etapa and p.escritorio_id=v_escritorio for update of p;
 if not found then raise exception 'etapa_invalida'; end if;
 select * into e from etapas where id=p_etapa for update;
 if pr.status<>'ativo' then raise exception 'projeto_inativo'; end if;
 if e.status='aprovada' then raise exception 'etapa_aprovada'; end if;
 if e.prazo is not distinct from p_prazo then return; end if;
 update etapas set prazo=p_prazo,atualizado_em=now() where id=e.id;
 update projetos set atualizado_em=now() where id=pr.id;
 insert into projeto_eventos(escritorio_id,projeto_id,membro_id,membro_nome,tipo,etapa_nome,antes,depois)
 values(v_escritorio,pr.id,auth.uid(),(select nome from membros where id=auth.uid()),'prazo',e.nome,e.prazo::text,p_prazo::text);
end $$;
revoke all on function definir_prazo_etapa(uuid,date) from public,anon,authenticated;
grant execute on function definir_prazo_etapa(uuid,date) to authenticated;

-- Trava também requisições antigas e respostas do cliente em projetos inativos.
create function proteger_trabalho_projeto() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_projeto uuid; v_status text;
begin
 v_projeto:=case when tg_op='DELETE' then old.projeto_id else new.projeto_id end;
 select status into v_status from projetos where id=v_projeto for share;
 if v_status is not null and v_status<>'ativo' then raise exception 'projeto_inativo'; end if;
 if tg_op='UPDATE' and new.projeto_id is distinct from old.projeto_id then raise exception 'projeto_imutavel'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function proteger_trabalho_projeto() from public,anon,authenticated;
create trigger projeto_ativo_etapas before insert or update or delete on etapas for each row execute function proteger_trabalho_projeto();
create trigger projeto_ativo_arquivos before insert or update or delete on arquivos for each row execute function proteger_trabalho_projeto();
create trigger projeto_ativo_aditivos before insert or update or delete on aditivos for each row execute function proteger_trabalho_projeto();
create trigger projeto_ativo_externas before insert or update or delete on aprovacoes_externas for each row execute function proteger_trabalho_projeto();

create function proteger_aprovacao_projeto() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_status text;
begin
 select p.status into v_status from projetos p join etapas e on e.projeto_id=p.id
 where e.id=case when tg_op='DELETE' then old.etapa_id else new.etapa_id end for share of p;
 if v_status is not null and v_status<>'ativo' then raise exception 'projeto_inativo'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function proteger_aprovacao_projeto() from public,anon,authenticated;
create trigger projeto_ativo_aprovacoes before insert or update or delete on aprovacoes for each row execute function proteger_aprovacao_projeto();

create function proteger_dados_projeto() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if old.status<>'ativo' and new.status=old.status then raise exception 'projeto_inativo'; end if;
 return new;
end $$;
revoke all on function proteger_dados_projeto() from public,anon,authenticated;
create trigger projeto_ativo_dados before update on projetos for each row execute function proteger_dados_projeto();

-- Amplia a projeção pública atual sem mudar suas regras de arquivos ou pagamentos.
do $$ declare definicao text; begin
 select pg_get_functiondef('projeto_publico(text)'::regprocedure) into definicao;
 if position('''nome'', pr.nome,' in definicao)=0 then raise exception 'projecao_publica_incompativel'; end if;
 execute replace(definicao,'''nome'', pr.nome,','''nome'', pr.nome, ''status'', pr.status,');
end $$;
-- A leitura dos arquivos continua; uploads e exclusões seguem a situação do projeto.
create function pasta_de_projeto_ativo(p_pasta text) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from projetos where id::text=p_pasta and escritorio_id=meu_escritorio() and status='ativo')
$$;
revoke all on function pasta_de_projeto_ativo(text) from public,anon,authenticated;
grant execute on function pasta_de_projeto_ativo(text) to authenticated;
create policy "projeto ativo para upload" on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'projetos' or pasta_de_projeto_ativo((storage.foldername(name))[1]));
create policy "projeto ativo para alterar arquivo" on storage.objects as restrictive for update to authenticated
using(bucket_id<>'projetos' or pasta_de_projeto_ativo((storage.foldername(name))[1]))
with check(bucket_id<>'projetos' or pasta_de_projeto_ativo((storage.foldername(name))[1]));
create policy "projeto ativo para apagar arquivo" on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'projetos' or pasta_de_projeto_ativo((storage.foldername(name))[1]));
notify pgrst,'reload schema';
