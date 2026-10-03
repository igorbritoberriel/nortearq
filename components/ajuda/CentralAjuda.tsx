"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TextoManual } from "@/components/TextoManual";

type Capitulo = { id: string; numero: number; titulo: string; texto: string };

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Central de ajuda: índice, busca por palavra e os capítulos do manual.
export function CentralAjuda({ capitulos }: { capitulos: Capitulo[] }) {
  const [busca, setBusca] = useState("");
  const termo = normalizar(busca.trim());
  const visiveis = useMemo(
    () => (termo ? capitulos.filter((c) => normalizar(`${c.titulo}\n${c.texto}`).includes(termo)) : capitulos),
    [capitulos, termo],
  );

  return (
    <div className="ajuda">
      <form className="filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="filtros-busca">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar na ajuda</span>
          <input
            type="search"
            placeholder="O que você quer saber? Ex.: contrato, revisão, link"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      </form>

      {!termo && (
        <nav className="cartao ajuda-indice" aria-label="Capítulos">
          <ol>
            {capitulos.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`}>{c.titulo}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {termo && (
        <p className="muted" aria-live="polite">
          {visiveis.length
            ? `${visiveis.length} ${visiveis.length === 1 ? "capítulo fala" : "capítulos falam"} de “${busca.trim()}”.`
            : `Nada encontrado para “${busca.trim()}”. Use “Relatar problema ou sugestão” no menu para perguntar.`}
        </p>
      )}

      {visiveis.map((c) => (
        <section key={c.id} id={c.id} className="cartao secao-config ajuda-capitulo">
          <h2>{c.titulo}</h2>
          <TextoManual texto={c.texto} />
        </section>
      ))}
    </div>
  );
}
