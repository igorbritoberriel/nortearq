"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Images, Star, X } from "lucide-react";
import { LIMITE_DESTAQUE, chaveArquivo, type ArquivoVisivel } from "@/lib/arquivos";
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

const miniaturaDe = (r: ArquivoVisivel) => r.miniatura ?? r.previa ?? r.url ?? null;
const semExtensao = (nome: string) => nome.replace(/\.[^.]+$/, "");

// Mural "Renders do projeto": só os renders em destaque (até 12), numa linha com setas; clicar abre a imagem.
// No sistema do arquiteto (com alternarDestaque): "Escolher renders" abre a lista das imagens Render 3D do
// projeto para marcar e desmarcar; a estrela escolhe a capa e o X tira do destaque.
export function GaleriaRenders({
  renders,
  capaId,
  escolhidaId,
  definirCapa,
  candidatos = [],
  alternarDestaque,
}: {
  renders: ArquivoVisivel[];
  capaId: string | null;
  escolhidaId?: string | null;
  definirCapa?: (arquivoId: string | null) => Promise<Resultado>;
  candidatos?: ArquivoVisivel[]; // todas as imagens Render 3D do projeto (versão mais recente de cada)
  alternarDestaque?: (arquivoId: string, destacar: boolean) => Promise<Resultado>;
}) {
  const { abrir } = useArquivos();
  const arquiteto = !!alternarDestaque;
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhida, escolher] = useOptimistic(escolhidaId ?? null, (_: string | null, novo: string | null) => novo);
  // Destaques na hora (voltam sozinhos se o servidor recusar): chaves etapa + nome, na ordem.
  const [chaves, mudarChaves] = useOptimistic(renders.map(chaveArquivo), (atual: string[], m: { chave: string; destacar: boolean }) =>
    m.destacar ? [...atual.filter((c) => c !== m.chave), m.chave] : atual.filter((c) => c !== m.chave),
  );
  const trilho = useRef<HTMLUListElement>(null);
  const [setas, setSetas] = useState({ voltar: false, avancar: false });

  const porChave = new Map([...candidatos, ...renders].map((r) => [chaveArquivo(r), r]));
  const lista = chaves.map((c) => porChave.get(c)).filter((r): r is ArquivoVisivel => !!r);
  const cheio = lista.length >= LIMITE_DESTAQUE;

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

  function alternar(r: ArquivoVisivel, destacar: boolean) {
    if (!alternarDestaque) return;
    setErro(null);
    iniciar(async () => {
      mudarChaves({ chave: chaveArquivo(r), destacar });
      const res = await alternarDestaque(r.id, destacar);
      if ("erro" in res) setErro(res.erro);
    });
  }

  // Cliente sem destaque: a seção não aparece.
  if (!arquiteto && lista.length === 0) return null;

  const capaAtual = definirCapa ? (escolhida && lista.some((r) => r.id === escolhida) ? escolhida : capaId) : capaId;

  return (
    <section className="cartao galeria-renders" aria-labelledby="renders-titulo">
      <div className="galeria-renders-topo">
        <h2 id="renders-titulo">
          <Images size={20} aria-hidden="true" /> Renders do projeto
          <small className="muted">
            {" "}
            · {lista.length}
            {arquiteto ? ` de ${LIMITE_DESTAQUE}` : ""}
          </small>
        </h2>
        {arquiteto && candidatos.length > 0 && (
          <button
            type="button"
            className={`botao ${escolhendo ? "botao-primario" : "botao-secundario"} botao-pequeno`}
            aria-expanded={escolhendo}
            onClick={() => setEscolhendo((v) => !v)}
          >
            {escolhendo ? <Check size={16} aria-hidden="true" /> : <Images size={16} aria-hidden="true" />}
            {escolhendo ? "Pronto" : "Escolher renders"}
          </button>
        )}
      </div>

      {arquiteto && candidatos.length === 0 && (
        <p className="campo-ajuda">
          Envie os renders em imagem (JPG, PNG ou WEBP) dentro da etapa, com o tipo <strong>Render 3D</strong>. Depois, toque em{" "}
          <strong>Escolher renders</strong> aqui para decidir quais aparecem para você e no topo da página do cliente (até{" "}
          {LIMITE_DESTAQUE}).
        </p>
      )}
      {arquiteto && candidatos.length > 0 && lista.length === 0 && !escolhendo && (
        <p className="campo-ajuda">
          Nenhum render escolhido ainda. Toque em <strong>Escolher renders</strong> para marcar até {LIMITE_DESTAQUE}; o primeiro vira a capa do
          projeto.
        </p>
      )}
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {/* Seletor: todas as imagens Render 3D do projeto; tocar marca ou desmarca. */}
      {arquiteto && escolhendo && (
        <div className="renders-escolher">
          <p className="campo-ajuda">
            Toque para marcar ou desmarcar. {cheio ? `Já são ${LIMITE_DESTAQUE}: desmarque um para escolher outro.` : `Até ${LIMITE_DESTAQUE} renders.`}
          </p>
          <ul>
            {candidatos.map((r) => {
              const marcado = chaves.includes(chaveArquivo(r));
              const imagem = miniaturaDe(r);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`render-opcao ${marcado ? "marcado" : ""}`}
                    aria-pressed={marcado}
                    disabled={pendente || (!marcado && cheio)}
                    onClick={() => alternar(r, !marcado)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {imagem && <img src={imagem} alt="" loading="lazy" draggable={false} />}
                    <span className="render-opcao-marca" aria-hidden="true">
                      {marcado && <Check size={16} />}
                    </span>
                    <span className="render-opcao-nome">
                      {semExtensao(r.nome)}
                      <small>
                        {r.etapa}
                        {r.visivel === false ? " · interno" : ""}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {lista.length > 0 && (
        <div className="renders-carrossel">
          <ul className="renders" ref={trilho} onScroll={medir}>
            {lista.map((r) => {
              const ehCapa = r.id === capaAtual;
              const imagem = miniaturaDe(r);
              return (
                <li key={r.id} className="render">
                  <button type="button" className="render-abrir" onClick={() => abrir(r.id, lista)} aria-label={`Ampliar ${r.nome}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {imagem && <img src={imagem} alt="" loading="lazy" draggable={false} />}
                    <span className="render-legenda">
                      <strong>{semExtensao(r.nome)}</strong>
                      <small>{r.etapa}</small>
                    </span>
                    {ehCapa && <span className="render-capa">Capa</span>}
                    {r.visivel === false && <span className="render-interno">Interno</span>}
                  </button>
                  {arquiteto && (
                    <span className="render-botoes">
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
                      <button
                        type="button"
                        className="render-estrela"
                        disabled={pendente}
                        aria-label={`Tirar ${r.nome} do destaque`}
                        title="Tirar do mural (o arquivo continua na etapa)"
                        onClick={() => alternar(r, false)}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
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
      )}
    </section>
  );
}
