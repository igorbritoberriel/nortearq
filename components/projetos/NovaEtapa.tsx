"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { adicionarEtapa } from "@/app/app/(sistema)/projetos/acoes";

// RN-03.1: o arquiteto adiciona etapas além das padrão.
export function NovaEtapa({ projetoId }: { projetoId: string }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <form
      className="nova-etapa"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await adicionarEtapa(projetoId, nome);
          if ("erro" in r) setErro(r.erro);
          else setNome("");
        });
      }}
    >
      <label htmlFor="nova-etapa" className="sr-only">
        Nome da nova etapa
      </label>
      <input id="nova-etapa" placeholder="Nova etapa, ex.: Projeto luminotécnico" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
      <button type="submit" className="botao botao-secundario" disabled={pendente || nome.trim().length < 2}>
        <Plus size={16} aria-hidden="true" /> Adicionar etapa
      </button>
      {erro && <p className="campo-erro">{erro}</p>}
    </form>
  );
}
