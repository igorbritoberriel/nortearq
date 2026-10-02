"use client";

import { createContext, Fragment, useContext, useEffect, useRef, useState } from "react";
import { salvarOrdemEtapas } from "@/app/app/(sistema)/projetos/acoes";
import type { StatusEtapa } from "@/lib/projetos";
import { IndicadorSalvamento, useSalvarEmFila } from "@/lib/salvar-em-fila";

// Etapas do projeto em ordem: subir/descer muda na hora e salva por trás.
// Etapas aguardando o cliente ou aprovadas ficam onde estão (o banco também garante).

type Item = { id: string; status: StatusEtapa; conteudo: React.ReactNode };

type Ordem = {
  podeSubir: (id: string) => boolean;
  podeDescer: (id: string) => boolean;
  mover: (id: string, direcao: -1 | 1) => void;
};

const OrdemEtapas = createContext<Ordem | null>(null);
export const useOrdemEtapas = () => useContext(OrdemEtapas);

const travada = (s: StatusEtapa) => s === "aguardando_aprovacao" || s === "aprovada";

export function ListaEtapas({ projetoId, itens }: { projetoId: string; itens: Item[] }) {
  const doServidor = itens.map((i) => i.id).join(",");
  const [ordem, setOrdem] = useState(() => itens.map((i) => i.id));
  const { agendar, status, ocupado } = useSalvarEmFila();
  const atual = useRef(ordem);
  atual.current = ordem;

  // Etapa nova, apagada ou enviada: os dados do servidor entram quando não há nada para salvar.
  useEffect(() => {
    if (!ocupado()) setOrdem(doServidor ? doServidor.split(",") : []);
  }, [doServidor, ocupado]);

  const porId = new Map(itens.map((i) => [i.id, i]));
  const livre = (id: string | undefined) => !!id && !!porId.get(id) && !travada(porId.get(id)!.status);
  const vizinha = (id: string, direcao: -1 | 1) => atual.current[atual.current.indexOf(id) + direcao];

  const contexto: Ordem = {
    podeSubir: (id) => livre(id) && livre(vizinha(id, -1)),
    podeDescer: (id) => livre(id) && livre(vizinha(id, 1)),
    mover: (id, direcao) => {
      const base = atual.current;
      const i = base.indexOf(id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= base.length || !livre(base[i]) || !livre(base[j])) return;
      const nova = [...base];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      atual.current = nova;
      setOrdem(nova);
      agendar("ordem-etapas", () => salvarOrdemEtapas(projetoId, nova));
    },
  };

  const visiveis = ordem.filter((id) => porId.has(id));
  // Itens que chegaram do servidor e ainda não estão na ordem local (ex.: etapa recém-criada).
  const novos = itens.filter((i) => !ordem.includes(i.id)).map((i) => i.id);

  return (
    <OrdemEtapas.Provider value={contexto}>
      {status !== "ocioso" && (
        <div className="salvamento-faixa">
          <span className="muted">A ordem das etapas é salva sozinha.</span>
          <IndicadorSalvamento status={status} />
        </div>
      )}
      {[...visiveis, ...novos].map((id) => (
        <Fragment key={id}>{porId.get(id)!.conteudo}</Fragment>
      ))}
    </OrdemEtapas.Provider>
  );
}
