"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Images, Star, Trash2 } from "lucide-react";
import { espacoDoPlano, excluirArquivo, registrarRender } from "@/app/app/(sistema)/projetos/acoes";
import { LIMITE_RENDERS, ehImagemDeRender, formatarEspaco, type ArquivoVisivel } from "@/lib/arquivos";
import { enviarDerivados, gerarDerivados } from "@/lib/miniaturas";
import { TAMANHO_MAXIMO_ARQUIVO, nomeSeguro } from "@/lib/projetos";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { useArquivos } from "./ProvedorArquivos";

type Resultado = { ok: true } | { erro: string };

// Capa do projeto: o render escolhido na estrela (ou o primeiro adicionado). Sem render, não mostra nada.
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

const semExtensao = (nome: string) => nome.replace(/\.[^.]+$/, "");

// Renders do projeto (migração 0040): espaço próprio, fora das etapas e sem aprovação. Até 12 imagens numa linha
// com setas; clicar abre no visualizador (com Baixar). No sistema do arquiteto (com projetoId): Adicionar renders,
// estrela = capa, lixeira = excluir.
export function GaleriaRenders({
  renders,
  capaId,
  escolhidaId,
  definirCapa,
  projetoId,
}: {
  renders: ArquivoVisivel[];
  capaId: string | null;
  escolhidaId?: string | null;
  definirCapa?: (arquivoId: string | null) => Promise<Resultado>;
  projetoId?: string;
}) {
  const { abrir } = useArquivos();
  const arquiteto = !!projetoId;
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [escolhida, escolher] = useOptimistic(escolhidaId ?? null, (_: string | null, novo: string | null) => novo);
  const [excluidos, excluir] = useOptimistic<string[], string>([], (lista, id) => [...lista, id]);
  const trilho = useRef<HTMLUListElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const [setas, setSetas] = useState({ voltar: false, avancar: false });

  const lista = renders.filter((r) => !excluidos.includes(r.id));
  const restante = LIMITE_RENDERS - lista.length;

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

  // Para cada imagem: confere o espaço do plano, gera miniatura e prévia no navegador, sobe e registra.
  async function adicionar(arquivos: FileList | null) {
    const supabase = criarClienteNavegador();
    if (!projetoId || !arquivos?.length || !supabase) return;
    setErro(null);
    let todos = Array.from(arquivos);
    const recusados = todos.filter((a) => !ehImagemDeRender(a.name, a.type));
    todos = todos.filter((a) => ehImagemDeRender(a.name, a.type));
    const avisos: string[] = [];
    if (recusados.length) avisos.push(`${recusados.map((a) => a.name).join(", ")}: render precisa ser imagem JPG, PNG ou WEBP.`);
    if (todos.length > restante) {
      avisos.push(`O limite é de ${LIMITE_RENDERS} renders: ${todos.length - restante} ${todos.length - restante === 1 ? "imagem ficou" : "imagens ficaram"} de fora.`);
      todos = todos.slice(0, Math.max(restante, 0));
    }
    const espaco = await espacoDoPlano();
    let usado = espaco?.usado ?? 0;
    for (const [i, arquivo] of todos.entries()) {
      if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
        avisos.push(`${arquivo.name}: acima de 50 MB.`);
        continue;
      }
      if (espaco && usado + arquivo.size > espaco.limite) {
        avisos.push(`O espaço do seu plano acabou (${formatarEspaco(usado)} de ${formatarEspaco(espaco.limite)}).`);
        break;
      }
      const passo = `${i + 1} de ${todos.length}: ${arquivo.name}`;
      setProgresso(`Preparando ${passo}`);
      const derivados = await gerarDerivados(arquivo, arquivo.name);
      setProgresso(`Enviando ${passo}`);
      const caminho = `${projetoId}/renders/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
      const { error } = await supabase.storage.from("projetos").upload(caminho, arquivo, { contentType: arquivo.type || "image/jpeg" });
      if (error) {
        avisos.push(`${arquivo.name}: não foi possível enviar (${error.message}).`);
        continue;
      }
      const extras = derivados ? await enviarDerivados(supabase.storage, caminho, derivados) : null;
      const r = await registrarRender(projetoId, {
        nome: arquivo.name,
        caminho,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        miniatura: extras?.miniatura ?? null,
        previa: extras?.previa ?? null,
        derivadosBytes: extras?.bytes ?? 0,
      });
      if ("erro" in r) {
        avisos.push(`${arquivo.name}: ${r.erro}`);
        if (r.erro.includes("12 renders") || r.erro.includes("espaço")) break;
      } else {
        usado += arquivo.size + (extras?.bytes ?? 0);
      }
    }
    setProgresso(null);
    if (avisos.length) setErro(avisos.join(" "));
    if (seletor.current) seletor.current.value = "";
  }

  if (!arquiteto && lista.length === 0) return null;

  const capaAtual = escolhida && lista.some((r) => r.id === escolhida) ? escolhida : (capaId ?? lista[0]?.id ?? null);

  return (
    <section className="cartao galeria-renders" aria-labelledby="renders-titulo">
      <div className="galeria-renders-topo">
        <h2 id="renders-titulo">
          <Images size={20} aria-hidden="true" /> Renders do projeto
          <small className="muted">
            {" "}
            · {lista.length}
            {arquiteto ? ` de ${LIMITE_RENDERS}` : ""}
          </small>
        </h2>
        {arquiteto && (
          <label className={`botao botao-secundario botao-pequeno ${restante <= 0 || progresso ? "desabilitado" : ""}`}>
            <ImagePlus size={16} aria-hidden="true" />
            {progresso ? "Enviando..." : "Adicionar renders"}
            <input
              ref={seletor}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              disabled={restante <= 0 || !!progresso}
              onChange={(e) => adicionar(e.target.files)}
            />
          </label>
        )}
      </div>

      {arquiteto && lista.length === 0 && !progresso && (
        <p className="campo-ajuda">
          Adicione até {LIMITE_RENDERS} imagens (JPG, PNG ou WEBP). O cliente já vê e pode baixar, sem precisar aprovar. O primeiro render
          vira a capa do projeto.
        </p>
      )}
      {arquiteto && lista.length > 0 && (
        <p className="campo-ajuda">
          O cliente vê e pode baixar. A estrela escolhe a capa do projeto; a lixeira exclui.
          {restante <= 0 ? ` Limite de ${LIMITE_RENDERS} atingido: exclua um para adicionar outro.` : ""}
        </p>
      )}
      {progresso && <p className="campo-ajuda" role="status">{progresso}</p>}
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {lista.length > 0 && (
        <div className="renders-carrossel">
          <ul className="renders" ref={trilho} onScroll={medir}>
            {lista.map((r) => {
              const ehCapa = r.id === capaAtual;
              const imagem = r.miniatura ?? r.previa ?? r.url;
              return (
                <li key={r.id} className="render">
                  <button type="button" className="render-abrir" onClick={() => abrir(r.id, lista)} aria-label={`Ampliar ${r.nome}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {imagem && <img src={imagem} alt="" loading="lazy" draggable={false} />}
                    <span className="render-legenda">
                      <strong>{semExtensao(r.nome)}</strong>
                    </span>
                    {ehCapa && <span className="render-capa">Capa</span>}
                  </button>
                  {arquiteto && (
                    <span className="render-botoes">
                      {definirCapa && (
                        <button
                          type="button"
                          className={`render-estrela ${escolhida === r.id ? "ativa" : ""}`}
                          disabled={pendente}
                          aria-pressed={escolhida === r.id}
                          aria-label={escolhida === r.id ? `Tirar ${r.nome} da capa` : `Usar ${r.nome} como capa`}
                          title={escolhida === r.id ? "Capa escolhida (toque para tirar)" : "Usar como capa"}
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
                        aria-label={`Excluir ${r.nome}`}
                        title="Excluir render"
                        onClick={() => {
                          if (!confirm(`Excluir o render "${semExtensao(r.nome)}"? O cliente deixa de ver.`)) return;
                          setErro(null);
                          iniciar(async () => {
                            excluir(r.id);
                            const res = await excluirArquivo(projetoId!, r.id);
                            if ("erro" in res) setErro(res.erro);
                          });
                        }}
                      >
                        <Trash2 size={17} aria-hidden="true" />
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
