"use client";

import { FileDown } from "lucide-react";

// RN-02.8: o Perfil do Cliente vira PDF pela impressão do navegador ("Salvar como PDF").
export function BotaoImprimir() {
  return (
    <button type="button" className="botao botao-primario" onClick={() => window.print()}>
      <FileDown size={18} aria-hidden="true" />
      Baixar PDF
    </button>
  );
}
