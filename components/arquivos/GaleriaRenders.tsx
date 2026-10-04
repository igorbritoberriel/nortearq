"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Images, Star, X } from "lucide-react";
import { LIMITE_DESTAQUE, type ArquivoVisivel } from "@/lib/arquivos";
import { useArquivos } from "./ProvedorArquivos";

type Resultado = { ok: true } | { erro: string };

// Capa do projeto: o render em destaque escolhido (ou o primeiro destaque). Sem capa, não mostra nada.
export function CapaProjeto({ capa, lista }: { capa: ArquivoVisivel | null; lista: ArquivoVisivel[] }) {
  const { abrir } = useArquivos();
  const imagem = capa?.previa ?? capa?.url ?? capa?.miniatura;
  if (!capa || !imagem) return null;
  return (
    <button type="button" className="capa-projeto" onClick={() => abrir(capa.id, lista)} aria-label={`Ampliar a capa: ${capa.nome}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem} alt="" />
    </button>
  );
}

// Mural "Renders do projeto": só os renders que o arquiteto destacou (até 12), numa linha com setas.
// Clicar abre no visualizador. No sistema do arquiteto: estrela = capa, X = tirar do destaque.
export function GaleriaRenders({
  renders,
  capaId,
  escolhidaId,
  definirCapa,
  tirarDestaque,
  dica,
}: {
  renders: ArquivoVisivel[];
  capaId: string | null;
  escolhidaId?: string | null;
  definirCapa?: (arquivoId: string | null) => Promise<Resultado>;
  tirarDestaque?: (arquivoId: string) => Promise<Resultado>;
  dica?: boolean; // arquiteto com renders no projeto, mas nenhum em destaque
}) {
  const { abrir } = useArquivos();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolhida, escolher] = useOptimistic(escolhidaId ?? null, (_: string | null, novo: string | null) => novo);
  const [tirados, tirar] = useOptimistic<string[], string>([], (lista, id) => [...lista, id]);
  const trilho = useRef<HTMLUListElement>(null);
  const [setas, setSetas] = useState({ voltar: false, avancar: false });

  const lista = renders.filter((r) => !tirados.includes(r.id));

  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setSetas({ voltar: el.scrollLeft > 4, avancar: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir, lista.length]);

  function passar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.9, behavior: "smooth" });
  }

  if (lista.length === 0) {
    if (!dica) return null;
    return (
      <section className="cartao galeria-renders" aria-labelledby="renders-titulo">
        <h2 id="renders-titulo">
          <Images size={20} aria-hidden="true" /> Renders do projeto
        </h2>
        <p className="campo-ajuda">
          Escolha até {LIMITE_DESTAQUE} renders para mostrar aqui e no topo da página do cliente: toque em <strong>Destacar</strong>{" "}
          no arquivo, dentro da etapa. O primeiro vira a capa do projeto.
        </p>
      </section>
    );
  }

  const capaAtual = definirCapa ? (escolhida && lista.some((r) => r.id === escolhida) ? escolhida : capaId) : capaId;

  return (
    <section className="cartao galeria-renders" aria-labelledby="renders-titulo">
      <h2 id="renders-titulo">
        <Images size={20} aria-hidden="true" /> Renders do projeto
        <small className="muted">
          {" "}
          · {lista.length}
          {definirCapa ? ` de ${LIMITE_DESTAQUE}` : ""}
        </small>
      </h2>
      {definirCapa && (
        <p className="campo-ajuda">
          Os renders que você destacou nas etapas. A estrela escolhe a capa (só render visível ao cliente); o X tira do destaque.
        </p>
      )}
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <div className="renders-carrossel">
        <ul className="renders" ref={trilho} onScroll={medir}>
          {lista.map((r) => {
            const ehCapa = r.id === capaAtual;
            return (
              <li key={r.id} className="render">
                <button type="button" className="render-abrir" onClick={() => abrir(r.id, lista)} aria-label={`Ampliar ${r.nome}`}>
                  {r.miniatura || r.previa || r.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.miniatura ?? r.previa ?? r.url ?? ""} alt="" loading="lazy" draggable={false} />
                  ) : null}
                  <span className="render-legenda">
                    <strong>{r.nome.replace(/\.[^.]+$/, "")}</strong>
                    <small>{r.etapa}</small>
                  </span>
                  {ehCapa && <span className="render-capa">Capa</span>}
                  {r.visivel === false && <span className="render-interno">Interno</span>}
                </button>
                {definirCapa && (
                  <span className="render-botoes">
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
                    {tirarDestaque && (
                      <button
                        type="button"
                        className="render-estrela"
                        disabled={pendente}
                        aria-label={`Tirar ${r.nome} do destaque`}
                        title="Tirar do destaque (o arquivo continua na etapa)"
                        onClick={() => {
                          setErro(null);
                          iniciar(async () => {
                            tirar(r.id);
                            const res = await tirarDestaque(r.id);
                            if ("erro" in res) setErro(res.erro);
                          });
                        }}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {setas.voltar && (
          <button type="button" className="renders-seta renders-seta-voltar" onClick={() => passar(-1)} aria-label="Renders anteriores">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        {setas.avancar && (
          <button type="button" className="renders-seta renders-seta-avancar" onClick={() => passar(1)} aria-label="Próximos renders">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
