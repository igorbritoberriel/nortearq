"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, LoaderCircle } from "lucide-react";

// Padrão "muda na hora, salva por trás" (como nos sites profissionais):
// a tela atualiza o estado local na hora e agenda o salvamento aqui.
// - Cliques seguidos na mesma coisa (mesma chave) viram um salvamento só, com o último valor.
// - Os salvamentos rodam um lote por vez, nunca em paralelo com o anterior.
// - Erro: tenta de novo uma vez; se falhar, avisa (status "erro").
// - Fechar a aba com algo pendente pede confirmação ao navegador.

export type StatusSalvamento = "ocioso" | "salvando" | "salvo" | "erro";
type Tarefa = () => Promise<boolean>;

export function useSalvarEmFila(atraso = 450) {
  const fila = useRef(new Map<string, Tarefa>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rodando = useRef(false);
  const [status, setStatus] = useState<StatusSalvamento>("ocioso");

  const descarregar = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true;
    let tudoCerto = true;
    while (fila.current.size) {
      const lote = [...fila.current.values()];
      fila.current.clear();
      setStatus("salvando");
      const executar = (t: Tarefa) => t().catch(() => false);
      const resultados = await Promise.all(
        lote.map(async (t) => {
          if (await executar(t)) return true;
          await new Promise((r) => setTimeout(r, 800));
          return executar(t);
        }),
      );
      if (resultados.some((ok) => !ok)) tudoCerto = false;
    }
    rodando.current = false;
    setStatus(tudoCerto ? "salvo" : "erro");
  }, []);

  const agendar = useCallback(
    (chave: string, tarefa: Tarefa) => {
      fila.current.set(chave, tarefa);
      setStatus("salvando");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void descarregar(), atraso);
    },
    [atraso, descarregar],
  );

  // Há algo ainda não gravado? (para não sobrescrever a tela com dados antigos do servidor)
  const ocupado = useCallback(() => fila.current.size > 0 || rodando.current, []);

  useEffect(() => {
    const aoSair = (e: BeforeUnloadEvent) => {
      if (fila.current.size > 0 || rodando.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aoSair);
    return () => {
      window.removeEventListener("beforeunload", aoSair);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { agendar, status, ocupado };
}

// Aviso discreto do salvamento automático.
export function IndicadorSalvamento({ status }: { status: StatusSalvamento }) {
  return (
    <span className={`salvamento salvamento-${status}`} role="status" aria-live="polite">
      {status === "salvando" && (
        <>
          <LoaderCircle size={14} aria-hidden="true" className="girando" /> Salvando…
        </>
      )}
      {status === "salvo" && (
        <>
          <Check size={14} aria-hidden="true" /> Salvo
        </>
      )}
      {status === "erro" && (
        <>
          <CloudOff size={14} aria-hidden="true" /> Não foi possível salvar. Recarregue a página.
        </>
      )}
    </span>
  );
}
