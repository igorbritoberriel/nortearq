-- NorteArq — permissões do Colaborador fechadas no banco (matriz em lib/permissoes.ts). Rodar depois de 0032.
--
-- O Colaborador cuida de clientes, briefings, projetos e arquivos. Não vê valores nem configura o escritório:
-- * pedidos de orçamento (mostram o investimento do cliente): não vê;
-- * notificações: só de briefing e de etapa;
-- * editor de briefing (perguntas e imagens do quiz) e serviços: vê (o briefing usa), mas não altera.

-- Pedidos de orçamento.
drop policy if exists "colaborador não vê pedidos de orçamento" on contatos;
create policy "colaborador não vê pedidos de orçamento" on contatos as restrictive for all to authenticated
  using (coalesce(meu_papel(), '') <> 'colaborador') with check (coalesce(meu_papel(), '') <> 'colaborador');

-- Notificações: sem as de pedido de orçamento (e, como antes, sem as que têm valores).
drop policy if exists "colaborador só vê notificações sem valores" on notificacoes;
create policy "colaborador só vê notificações sem valores" on notificacoes as restrictive for select to authenticated
  using (coalesce(meu_papel(), '') <> 'colaborador' or tipo in ('briefing','etapa'));

-- Configuração do escritório: lê, mas não altera.
do $$
declare
  t text;
begin
  foreach t in array array['briefing_perguntas','estilos_imagens','estilos_ocultos','servicos']
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop policy if exists "colaborador não cria configuração" on %I', t);
    execute format('drop policy if exists "colaborador não altera configuração" on %I', t);
    execute format('drop policy if exists "colaborador não apaga configuração" on %I', t);
    execute format(
      'create policy "colaborador não cria configuração" on %I as restrictive for insert to authenticated
         with check (coalesce(meu_papel(), '''') <> ''colaborador'')', t);
    execute format(
      'create policy "colaborador não altera configuração" on %I as restrictive for update to authenticated
         using (coalesce(meu_papel(), '''') <> ''colaborador'')', t);
    execute format(
      'create policy "colaborador não apaga configuração" on %I as restrictive for delete to authenticated
         using (coalesce(meu_papel(), '''') <> ''colaborador'')', t);
  end loop;
end $$;

-- Única função elevada que altera a configuração do quiz: agora também exige dono ou administrador.
create or replace function restaurar_estilo_padrao(p_estilo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(meu_papel(), '') = 'colaborador' then
    raise exception 'sem_permissao';
  end if;
  delete from estilos_ocultos o
  using estilos_imagens i
  where o.imagem_id = i.id and o.escritorio_id = meu_escritorio() and i.estilo = p_estilo;
end;
$$;
revoke all on function restaurar_estilo_padrao(text) from public;
grant execute on function restaurar_estilo_padrao(text) to authenticated;
