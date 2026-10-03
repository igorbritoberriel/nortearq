"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Images, Star } from "lucide-react";
import type { ArquivoVisivel } from "@/lib/arquivos";
import { useArquivos } from "./ProvedorArquivos";

// Capa do projeto: o render escolhido (ou o mais recente). Sem render, uma capa neutra com as iniciais.
export function CapaProjeto({ nome, capa, lista }: { nome: string; capa: ArquivoVisivel | null; lista: ArquivoVisivel[] }) {
  const { abrir } = useArquivos();
  const imagem = capa?.previa ?? capa?.url ?? capa?.miniatura;
  if (!capa || !imagem) {
    const iniciais = nome
      .split(/\s+/)
      .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    return (
      <div className="capa-projeto capa-projeto-vazia" aria-hidden="true">
        <span>{iniciais || "P"}</span>
      </div>
    );
  }
  return (
    <button type="button" className="capa-projeto" onClick={() => abrir(capa.id, lista)} aria-label={`Ampliar a capa: ${capa.nome}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem} alt="" />
    </button>
  );
}

// Todos os renders do projeto (versão atual de cada um), de todas as etapas, num mural grande.
// No sistema do arquiteto, a estrela escolhe a capa (só render visível ao cliente).
export function GaleriaRenders({
  renders,
  capaId,
  escolhidaId,
  definirCapa,
}: {
  renders: ArquivoVisivel[];
  capaId: string | null;
  escolhidaId?: string | null;
  definirCapa?: (arquivoId: string | null) => Promise<{ ok: true } | { erro: string }>;
}) {
  const { abrir } = useArquivos();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolhida, escolher] = useOptimistic(escolhidaId ?? null, (_: string | null, novo: string | null) => novo);

  if (renders.length === 0) return null;
  const capaAtual = definirCapa ? (escolhida && renders.some((r) => r.id === escolhida) ? escolhida : capaId) : capaId;

  return (
    <section className="cartao galeria-renders" aria-labelledby="renders-titulo">
      <h2 id="renders-titulo">
        <Images size={20} aria-hidden="true" /> Renders do projeto
        <small className="muted"> · {renders.length}</small>
      </h2>
      {definirCapa && <p className="campo-ajuda">Toque na estrela para escolher a capa do projeto. Só renders visíveis ao cliente podem ser capa.</p>}
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <ul className="renders">
        {renders.map((r) => {
          const ehCapa = r.id === capaAtual;
          return (
            <li key={r.id} className="render">
              <button type="button" className="render-abrir" onClick={() => abrir(r.id, renders)} aria-label={`Ampliar ${r.nome}`}>
                {r.miniatura || r.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.miniatura ?? r.url ?? ""} alt="" loading="lazy" draggable={false} />
                ) : null}
                <span className="render-legenda">
                  <strong>{r.nome.replace(/\.[^.]+$/, "")}</strong>
                  <small>{r.etapa}</small>
                </span>
                {ehCapa && <span className="render-capa">Capa</span>}
                {r.visivel === false && <span className="render-interno">Interno</span>}
              </button>
              {definirCapa && (
                <button
                  type="button"
                  className={`render-estrela ${escolhida === r.id ? "ativa" : ""}`}
                  disabled={pendente || (r.visivel === false && escolhida !== r.id)}
                  aria-pressed={escolhida === r.id}
                  aria-label={escolhida === r.id ? `Tirar ${r.nome} da capa` : `Usar ${r.nome} como capa`}
                  title={
                    escolhida === r.id
                      ? "Capa escolhida (toque para tirar)"
                      : r.visivel === false
                        ? "Interno: deixe visível ao cliente para usar como capa"
                        : "Usar como capa"
                  }
                  onClick={() => {
                    const novo = escolhida === r.id ? null : r.id;
                    setErro(null);
                    iniciar(async () => {
                      escolher(novo);
                      const res = await definirCapa(novo);
                      if ("erro" in res) setErro(res.erro);
                    });
                  }}
                >
                  <Star size={18} aria-hidden="true" fill={escolhida === r.id ? "currentColor" : "none"} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
