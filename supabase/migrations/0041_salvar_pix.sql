-- NorteArq — salvar a chave Pix do escritório. Rodar depois de 0040.
--
-- A 0037 criou os campos pix_* mas não liberou a gravação: em Configurações, "Salvar Pix" dava erro.
-- A chave decide para onde vai o dinheiro das parcelas, então só o DONO grava (administrador e colaborador não),
-- por esta função; os campos continuam sem gravação direta.

create or replace function salvar_pix(p_tipo text, p_chave text, p_nome text, p_cidade text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_escrita();
  if coalesce(meu_papel(), '') <> 'dono' then
    raise exception 'so_dono';
  end if;

  if p_tipo is null then
    update escritorios set pix_tipo = null, pix_chave = null, pix_nome = null, pix_cidade = null where id = meu_escritorio();
    return;
  end if;

  if p_tipo not in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
    or coalesce(length(p_chave), 0) not between 1 and 77
    or coalesce(length(trim(p_nome)), 0) not between 2 and 25
    or coalesce(length(trim(p_cidade)), 0) not between 2 and 15 then
    raise exception 'pix_invalido';
  end if;

  update escritorios
  set pix_tipo = p_tipo, pix_chave = p_chave, pix_nome = trim(p_nome), pix_cidade = trim(p_cidade)
  where id = meu_escritorio();
end;
$$;
revoke all on function salvar_pix(text, text, text, text) from public;
grant execute on function salvar_pix(text, text, text, text) to authenticated;
