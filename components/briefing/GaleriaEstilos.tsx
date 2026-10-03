"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, ThumbsDown, X } from "lucide-react";

// Imagens do quiz no Perfil do Cliente: mural agrupado por estilo (na ordem do resultado),
// clique abre em tela cheia (setas, teclado, arrastar no celular) e, recolhidas, as que ele não gostou.

export type ImagemGaleria = { id: string; url: string; estilo: string };
export type GrupoGaleria = { estilo: string; pct: number | null; imagens: ImagemGaleria[] };

export function GaleriaEstilos({ grupos, rejeitadas }: { grupos: GrupoGaleria[]; rejeitadas: ImagemGaleria[] }) {
  const curtidas = grupos.flatMap((g) => g.imagens);
  const [aberta, setAberta] = useState<{ lista: ImagemGaleria[]; indice: number } | null>(null);

  return (
    <>
      {curtidas.length > 0 && (
        <>
          <h3 className="perfil-sub">
            <Heart size={16} aria-hidden="true" /> Imagens que o cliente gostou ({curtidas.length})
          </h3>
          {grupos.map((g) => (
            <div key={g.estilo} className="galeria-grupo">
              <p className="galeria-titulo">
                <strong>{g.estilo}</strong>
                <span className="muted">
                  {g.pct !== null ? ` · ${g.pct}% · ` : " · "}
                  {g.imagens.length} {g.imagens.length === 1 ? "imagem" : "imagens"}
                </span>
              </p>
              <ul className="galeria">
                {g.imagens.map((img) => (
                  <li key={img.id}>
                    <button
                      type="button"
                      className="galeria-item"
                      onClick={() => setAberta({ lista: curtidas, indice: curtidas.indexOf(img) })}
                      aria-label={`Ampliar imagem de estilo ${img.estilo}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {rejeitadas.length > 0 && (
        <details className="galeria-rejeitadas nao-imprimir">
          <summary>
            <ThumbsDown size={16} aria-hidden="true" /> Imagens que o cliente não gostou ({rejeitadas.length})
          </summary>
          <p className="campo-ajuda">Saber o que ele rejeitou ajuda tanto quanto o que ele curtiu.</p>
          <ul className="galeria galeria-pequena">
            {rejeitadas.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  className="galeria-item"
                  onClick={() => setAberta({ lista: rejeitadas, indice: i })}
                  aria-label={`Ampliar imagem rejeitada de estilo ${img.estilo}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" />
                  <span className="galeria-selo">{img.estilo}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {aberta && (
        <Visualizador
          lista={aberta.lista}
          indice={aberta.indice}
          mudar={(indice) => setAberta({ ...aberta, indice })}
          fechar={() => setAberta(null)}
        />
      )}
    </>
  );
}

// Tela cheia ("lightbox"): Esc fecha, ← → passam, arrastar no celular, clique fora fecha.
export function Visualizador({
  lista,
  indice,
  mudar,
  fechar,
}: {
  lista: ImagemGaleria[];
  indice: number;
  mudar: (indice: number) => void;
  fechar: () => void;
}) {
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const toque = useRef<number | null>(null);
  const total = lista.length;
  const img = lista[indice];

  const passar = useCallback((direcao: -1 | 1) => mudar((indice + direcao + total) % total), [indice, mudar, total]);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    botaoFechar.current?.focus();
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = rolagem;
      anterior?.focus();
    };
  }, []);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") passar(1);
      else if (e.key === "ArrowLeft") passar(-1);
      else if (e.key === "Tab") {
        // Mantém o foco dentro do visualizador.
        const focaveis = document.querySelectorAll<HTMLElement>(".visualizador button");
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", teclas);
    return () => document.removeEventListener("keydown", teclas);
  }, [fechar, passar]);

  // Carrega as vizinhas antes, para a troca ser instantânea.
  useEffect(() => {
    for (const d of [-1, 1]) {
      const vizinha = lista[(indice + d + total) % total];
      if (vizinha) new Image().src = vizinha.url;
    }
  }, [indice, lista, total]);

  return (
    <div
      className="visualizador"
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ${indice + 1} de ${total}: ${img.estilo}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
      onPointerDown={(e) => {
        toque.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (toque.current === null) return;
        const dx = e.clientX - toque.current;
        toque.current = null;
        if (Math.abs(dx) > 50) passar(dx < 0 ? 1 : -1);
      }}
    >
      <div className="visualizador-topo">
        <span>
          <strong>{img.estilo}</strong> · {indice + 1} de {total}
        </span>
        <button ref={botaoFechar} type="button" className="visualizador-botao" onClick={fechar} aria-label="Fechar">
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={`Referência de estilo ${img.estilo}`} className="visualizador-imagem" draggable={false} />
      {total > 1 && (
        <>
          <button
            type="button"
            className="visualizador-botao visualizador-anterior"
            onClick={() => passar(-1)}
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={28} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="visualizador-botao visualizador-proxima"
            onClick={() => passar(1)}
            aria-label="Próxima imagem"
          >
            <ChevronRight size={28} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
