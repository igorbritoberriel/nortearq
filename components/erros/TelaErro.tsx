"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { enviarErroDaTela } from "./CapturaErros";

// Tela de erro em português no lugar da tela padrão do Next. O erro já foi avisado automaticamente:
// erros do servidor chegam com "digest" (o servidor registrou); os da própria tela são enviados daqui.
export function TelaErro({
  error,
  retry,
  inicio = "/",
  extra,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  inicio?: string;
  extra?: ReactNode;
}) {
  useEffect(() => {
    if (!error.digest) enviarErroDaTela({ mensagem: error.message || "Erro na tela", pilha: error.stack });
  }, [error]);

  return (
    <div className="tela-erro" role="alert">
      <TriangleAlert size={40} aria-hidden="true" />
      <h1>Algo deu errado nesta tela</h1>
      <p className="muted">
        Já fomos avisados automaticamente e vamos corrigir. Nada do que você salvou antes foi perdido.
      </p>
      <div className="tela-erro-acoes">
        <button type="button" className="botao botao-primario" onClick={() => retry()}>
          <RotateCw size={18} aria-hidden="true" /> Tentar de novo
        </button>
        <Link className="botao botao-secundario" href={inicio}>
          Voltar ao início
        </Link>
      </div>
      {extra}
      {error.digest && <p className="tela-erro-codigo">Código do erro: {error.digest}</p>}
    </div>
  );
}
