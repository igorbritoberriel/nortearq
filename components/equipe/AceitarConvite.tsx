"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { aceitarConvite, criarContaEAceitar } from "@/app/convite/[token]/acoes";
import type { EstadoFormulario } from "@/lib/formulario";

const inicial: EstadoFormulario = { status: "inicial" };

// Já conectado com o e-mail do convite: um clique para entrar na equipe.
export function AceitarConvite({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button
        type="button"
        className="botao botao-primario botao-bloco"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await aceitarConvite(token);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Entrando..." : "Aceitar e entrar"}
      </button>
    </>
  );
}

// Primeira vez: cria a senha e já entra.
export function CriarContaConvite({ token, nome }: { token: string; nome: string }) {
  const acao = useMemo(() => criarContaEAceitar.bind(null, token), [token]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id="convite-nome" rotulo="Seu nome" erro={erro.nome}>
        <input id="convite-nome" name="nome" autoComplete="name" defaultValue={estado.valores?.nome ?? nome} />
      </Campo>
      <Campo id="convite-senha" rotulo="Crie uma senha" ajuda="Pelo menos 8 caracteres." erro={erro.senha}>
        <input id="convite-senha" name="senha" type="password" autoComplete="new-password" minLength={8} />
      </Campo>
      <Campo id="convite-senha2" rotulo="Repita a senha" erro={erro.senha_confirmacao}>
        <input id="convite-senha2" name="senha_confirmacao" type="password" autoComplete="new-password" minLength={8} />
      </Campo>
      <button type="submit" className="botao botao-primario botao-bloco" disabled={enviando}>
        {enviando ? "Criando acesso..." : "Criar acesso e entrar"}
      </button>
    </form>
  );
}
