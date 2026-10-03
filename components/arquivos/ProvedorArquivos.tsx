"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ArquivoVisivel } from "@/lib/arquivos";
import { VisualizadorArquivos, type Baixar } from "./VisualizadorArquivos";

// Um visualizador por página: qualquer cartão (etapas, galeria de renders, capa) abre o mesmo.
// Guarda só os ids abertos; os dados vêm sempre da lista atual (endereços renovados após atualizar).

type Contexto = { abrir: (id: string, lista: ArquivoVisivel[]) => void };
const ArquivosContexto = createContext<Contexto>({ abrir: () => {} });

export function useArquivos() {
  return useContext(ArquivosContexto);
}

export function ProvedorArquivos({ todos, baixar, children }: { todos: ArquivoVisivel[]; baixar: Baixar; children: ReactNode }) {
  const router = useRouter();
  const [aberto, setAberto] = useState<{ ids: string[]; indice: number } | null>(null);
  const renovado = useRef(0);

  const abrir = useCallback((id: string, lista: ArquivoVisivel[]) => {
    const ids = lista.map((a) => a.id);
    setAberto({ ids, indice: Math.max(0, ids.indexOf(id)) });
  }, []);

  // Endereços temporários vencidos (página aberta há mais de 1 hora): busca endereços novos, no máximo a cada 30 s.
  const aoExpirar = useCallback(() => {
    if (Date.now() - renovado.current < 30_000) return;
    renovado.current = Date.now();
    router.refresh();
  }, [router]);

  const porId = useMemo(() => new Map(todos.map((a) => [a.id, a])), [todos]);
  const itens = aberto ? aberto.ids.map((id) => porId.get(id)).filter((a): a is ArquivoVisivel => !!a) : [];
  const contexto = useMemo(() => ({ abrir }), [abrir]);

  return (
    <ArquivosContexto.Provider value={contexto}>
      {children}
      {aberto && itens.length > 0 && (
        <VisualizadorArquivos
          itens={itens}
          todos={todos}
          indice={Math.min(aberto.indice, itens.length - 1)}
          mudar={(indice) => setAberto({ ...aberto, indice })}
          fechar={() => setAberto(null)}
          baixar={baixar}
          aoExpirar={aoExpirar}
        />
      )}
    </ArquivosContexto.Provider>
  );
}
