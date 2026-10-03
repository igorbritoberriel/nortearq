"use client";

import { useEffect } from "react";
import { enviarErroDaTela } from "@/components/erros/CapturaErros";

// Último recurso: erro no layout raiz. Tem o próprio <html> e estilos simples (o CSS global não carrega aqui).
export default function ErroGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) enviarErroDaTela({ mensagem: error.message || "Erro no layout", pilha: error.stack });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f5f1", color: "#1d1d1b" }}>
        <title>Algo deu errado · NorteArq</title>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Algo deu errado</h1>
          <p style={{ color: "#5f5e5a" }}>Já fomos avisados automaticamente e vamos corrigir. Tente de novo em instantes.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ padding: "12px 20px", borderRadius: 10, border: 0, background: "#1f3a5f", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 12, color: "#8a8f98" }}>Código do erro: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
