"use client";

import { useState } from "react";
import { Heart, Undo2, X } from "lucide-react";
import type { ImagemEstilo } from "@/lib/briefing";

// Quiz visual de estilo (RN-02.5): uma imagem por vez, "gosto" ou "não gosto".
// O nome do estilo não aparece, para não influenciar a escolha.
export function QuizEstilo({
  imagens,
  curtidos,
  rejeitados,
  aoResponder,
}: {
  imagens: ImagemEstilo[];
  curtidos: string[];
  rejeitados: string[];
  aoResponder: (id: string, gostou: boolean) => void;
}) {
  const respondida = (id: string) => curtidos.includes(id) || rejeitados.includes(id);
  const primeiraPendente = imagens.findIndex((i) => !respondida(i.id));
  const [indice, setIndice] = useState(primeiraPendente === -1 ? imagens.length : primeiraPendente);
  const total = imagens.length;
  const feitas = imagens.filter((i) => respondida(i.id)).length;

  function responder(gostou: boolean) {
    aoResponder(imagens[indice].id, gostou);
    const proxima = imagens.findIndex((img, i) => i > indice && !respondida(img.id));
    setIndice(proxima === -1 ? total : proxima);
  }

  if (indice >= total) {
    return (
      <div className="quiz-fim">
        <p>
          <strong>Pronto!</strong> Você avaliou {feitas} de {total} imagens. Toque numa imagem para mudar de ideia.
        </p>
        <ul className="quiz-grade">
          {imagens.map((img, i) => {
            const gostou = curtidos.includes(img.id);
            return (
              <li key={img.id}>
                <button
                  type="button"
                  className={`quiz-mini ${gostou ? "gostou" : rejeitados.includes(img.id) ? "nao-gostou" : ""}`}
                  onClick={() => aoResponder(img.id, !gostou)}
                  aria-pressed={gostou}
                  aria-label={`Imagem ${i + 1}: ${gostou ? "gosto" : "não gosto"}. Tocar para trocar.`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" />
                  <span aria-hidden="true">{gostou ? <Heart size={16} /> : <X size={16} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const atual = imagens[indice];
  return (
    <div className="quiz">
      <p className="quiz-contador" aria-live="polite">
        Imagem {indice + 1} de {total}
      </p>
      <div className="quiz-imagem">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={atual.id} src={atual.url} alt={`Ambiente de referência ${indice + 1}`} />
      </div>
      {/* Pré-carrega a próxima para não piscar. */}
      {imagens[indice + 1] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagens[indice + 1].url} alt="" hidden />
      )}
      <div className="quiz-botoes">
        <button type="button" className="botao botao-secundario quiz-nao" onClick={() => responder(false)}>
          <X size={20} aria-hidden="true" />
          Não gosto
        </button>
        <button type="button" className="botao botao-marca quiz-sim" onClick={() => responder(true)}>
          <Heart size={20} aria-hidden="true" />
          Gosto
        </button>
      </div>
      {indice > 0 && (
        <button type="button" className="botao-link quiz-voltar" onClick={() => setIndice(indice - 1)}>
          <Undo2 size={14} aria-hidden="true" /> Voltar à imagem anterior
        </button>
      )}
    </div>
  );
}
