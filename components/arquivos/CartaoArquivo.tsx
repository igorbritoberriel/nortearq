"use client";

import type { ReactNode } from "react";
import { formatoDe, type ArquivoVisivel } from "@/lib/arquivos";
import { IconeArquivo } from "./IconeArquivo";
import { formatarTamanho, rotuloVersao } from "@/lib/projetos";
import { useArquivos } from "./ProvedorArquivos";

// Cartão com miniatura: clicar abre o visualizador. "acoes" ficam no rodapé (só no sistema do arquiteto).
export function CartaoArquivo({
  arquivo,
  lista,
  detalhe,
  acoes,
  selo,
  apagado,
}: {
  arquivo: ArquivoVisivel;
  lista: ArquivoVisivel[]; // o que as setas do visualizador percorrem a partir deste cartão
  detalhe?: ReactNode;
  acoes?: ReactNode;
  selo?: ReactNode;
  apagado?: boolean; // arquivo interno (só o escritório vê)
}) {
  const { abrir } = useArquivos();
  const formato = formatoDe(arquivo.nome, arquivo.tipo);
  return (
    <li className={`cartao-arquivo ${apagado ? "cartao-arquivo-interno" : ""}`}>
      <button type="button" className="cartao-arquivo-abrir" onClick={() => abrir(arquivo.id, lista)} aria-label={`Abrir ${arquivo.nome}`}>
        <span className={`cartao-arquivo-capa cartao-arquivo-capa-${formato}`}>
          {arquivo.miniatura ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arquivo.miniatura} alt="" loading="lazy" draggable={false} />
          ) : (
            <IconeArquivo nome={arquivo.nome} tipo={arquivo.tipo} />
          )}
          {selo && <span className="cartao-arquivo-selo">{selo}</span>}
        </span>
        <span className="cartao-arquivo-nome" title={arquivo.nome}>
          {arquivo.nome}
        </span>
        <small className="muted cartao-arquivo-meta">
          {rotuloVersao(arquivo.versao)}
          {arquivo.tamanho ? ` · ${formatarTamanho(arquivo.tamanho)}` : ""}
          {detalhe}
        </small>
      </button>
      {acoes && <div className="cartao-arquivo-acoes">{acoes}</div>}
    </li>
  );
}
