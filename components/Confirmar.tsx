"use client";

import { useState, useTransition } from "react";
import { Aviso } from "@/components/Campo";

// Confirmação simples (sem senha) para ações que perdem trabalho, como apagar um rascunho.
// Ações sem volta sobre registros (excluir cliente, estornar...) usam ConfirmarComSenha.
export function Confirmar({
  rotulo,
  aviso,
  confirmar,
  acao,
  icone,
  classe = "botao botao-fantasma botao-pequeno botao-texto-perigo",
}: {
  rotulo: string; // texto do botão que abre
  aviso: React.ReactNode; // o que vai acontecer
  confirmar: string; // texto do botão final
  acao: () => Promise<{ erro: string } | { ok: true } | void>;
  icone?: React.ReactNode;
  classe?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fechar = () => {
    setAberto(false);
    setErro(null);
  };

  if (!aberto) {
    return (
      <button type="button" className={classe} onClick={() => setAberto(true)}>
        {icone}
        {rotulo}
      </button>
    );
  }

  return (
    <div className="pagamento-form pagamento-form-estorno confirmar-senha" role="alertdialog">
      <div>{aviso}</div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar} autoFocus>
          Cancelar
        </button>
        <button
          type="button"
          className="botao botao-primario botao-pequeno botao-perigo"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              setErro(null);
              const r = await acao();
              if (r && "erro" in r) setErro(r.erro);
              else fechar();
            })
          }
        >
          {pendente ? "Confirmando..." : confirmar}
        </button>
      </div>
    </div>
  );
}
