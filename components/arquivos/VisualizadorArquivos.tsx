"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, LoaderCircle, Maximize, Minus, Plus, X } from "lucide-react";
import { CATEGORIAS, extensao, formatoDe, type ArquivoVisivel } from "@/lib/arquivos";
import { abrirPdf, type DocumentoPdf } from "@/lib/pdf";
import { formatarTamanho, rotuloVersao } from "@/lib/projetos";
import { IconeArquivo } from "./IconeArquivo";

// Visualizador em tela cheia dos arquivos do projeto (arquiteto, link do cliente e portal).
// Imagem: abre a prévia (2.400 px), com zoom pela roda do mouse, pinça, duplo clique e botões; arrastar move.
// PDF: página por página, redesenhado nítido a cada zoom. Outros formatos: ícone e botão Baixar.
// ← → passam os arquivos, Esc fecha; no celular, arrastar para o lado passa quando não há zoom.

const ZOOM_MAX = 8;
const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export type Baixar = (arquivoId: string) => Promise<{ url: string } | { erro: string }>;

export function VisualizadorArquivos({
  itens,
  todos,
  indice,
  mudar,
  fechar,
  baixar,
  aoExpirar,
}: {
  itens: ArquivoVisivel[]; // o que as setas percorrem
  todos: ArquivoVisivel[]; // inclui versões anteriores (para trocar a revisão)
  indice: number;
  mudar: (indice: number) => void;
  fechar: () => void;
  baixar: Baixar;
  aoExpirar?: () => void; // endereço temporário venceu: pede endereços novos
}) {
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const total = itens.length;
  const base = itens[indice];
  const [versaoId, setVersaoId] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const versoes = useMemo(
    () =>
      todos
        .filter((a) => a.etapa_id === base?.etapa_id && a.nome.toLowerCase() === base?.nome.toLowerCase())
        .sort((x, y) => y.versao - x.versao),
    [todos, base],
  );
  const arquivo = versoes.find((v) => v.id === versaoId) ?? base;
  const formato = arquivo ? formatoDe(arquivo.nome, arquivo.tipo) : "outro";

  const passar = useCallback(
    (direcao: -1 | 1) => {
      if (total < 2) return;
      setVersaoId(null);
      setErro(null);
      setEscala(1);
      mudar((indice + direcao + total) % total);
    },
    [indice, mudar, total],
  );

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
      if ((e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight" && escala === 1) passar(1);
      else if (e.key === "ArrowLeft" && escala === 1) passar(-1);
      else if (e.key === "Tab") {
        const focaveis = document.querySelectorAll<HTMLElement>(".vis-arquivos button, .vis-arquivos a, .vis-arquivos select");
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
  }, [fechar, passar, escala]);

  // Carrega a prévia das vizinhas antes, para a troca ser instantânea.
  useEffect(() => {
    for (const d of [-1, 1]) {
      const vizinha = itens[(indice + d + total) % total];
      if (vizinha && formatoDe(vizinha.nome, vizinha.tipo) === "imagem") {
        const src = vizinha.previa ?? vizinha.url;
        if (src) new Image().src = src;
      }
    }
  }, [indice, itens, total]);

  async function aoBaixar() {
    if (!arquivo) return;
    setErro(null);
    setBaixando(true);
    const r = await baixar(arquivo.id);
    setBaixando(false);
    if ("erro" in r) setErro(r.erro);
    else window.location.href = r.url;
  }

  if (!arquivo) return null;

  return (
    <div className="visualizador vis-arquivos" role="dialog" aria-modal="true" aria-label={`${arquivo.nome}, ${indice + 1} de ${total}`}>
      <div className="vis-topo">
        <div className="vis-titulo">
          <strong title={arquivo.nome}>{arquivo.nome}</strong>
          <small>
            {CATEGORIAS[arquivo.categoria]} · {arquivo.etapa} · {dataCurta.format(new Date(arquivo.criado_em))}
            {total > 1 && ` · ${indice + 1} de ${total}`}
          </small>
        </div>
        <div className="vis-acoes">
          {versoes.length > 1 ? (
            <select
              className="vis-versao"
              aria-label="Revisão"
              value={arquivo.id}
              onChange={(e) => {
                setVersaoId(e.target.value);
                setErro(null);
                setEscala(1);
              }}
            >
              {versoes.map((v, i) => (
                <option key={v.id} value={v.id}>
                  {rotuloVersao(v.versao)}
                  {i === 0 ? " (atual)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="vis-selo">{rotuloVersao(arquivo.versao)}</span>
          )}
          <button type="button" className="vis-botao" onClick={aoBaixar} disabled={baixando} title="Baixar o original">
            {baixando ? <LoaderCircle size={18} className="girando" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
            <span>Baixar</span>
          </button>
          {arquivo.url && formato !== "outro" && (
            <a className="vis-botao" href={arquivo.url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
              <ExternalLink size={18} aria-hidden="true" />
              <span>Nova aba</span>
            </a>
          )}
          <button ref={botaoFechar} type="button" className="vis-botao vis-fechar" onClick={fechar} aria-label="Fechar">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
      </div>
      {erro && (
        <p className="vis-erro" role="alert">
          {erro}
        </p>
      )}

      <div className="vis-palco">
        {formato === "imagem" && arquivo.url ? (
          <AreaZoom key={arquivo.id} escala={escala} setEscala={setEscala} passar={passar} fechar={fechar}>
            <ImagemArquivo arquivo={arquivo} aoExpirar={aoExpirar} />
          </AreaZoom>
        ) : formato === "pdf" && arquivo.url ? (
          <PdfArquivo key={arquivo.id} url={arquivo.url} escala={escala} setEscala={setEscala} passar={passar} fechar={fechar} aoExpirar={aoExpirar} />
        ) : (
          <div className="vis-sem-previa" onClick={(e) => e.target === e.currentTarget && fechar()}>
            <IconeArquivo nome={arquivo.nome} tipo={arquivo.tipo} grande />
            <p>
              <strong>{arquivo.nome}</strong>
              <small>
                {extensao(arquivo.nome).toUpperCase() || "Arquivo"} · {formatarTamanho(arquivo.tamanho)}
              </small>
            </p>
            <p className="muted">Este formato não abre no navegador. Baixe para abrir no programa do arquivo.</p>
            <button type="button" className="botao botao-primario" onClick={aoBaixar} disabled={baixando}>
              <Download size={18} aria-hidden="true" /> Baixar {rotuloVersao(arquivo.versao)}
            </button>
          </div>
        )}
      </div>

      {formato !== "outro" && (
        <div className="vis-zoom" role="group" aria-label="Zoom">
          <button type="button" className="vis-botao" onClick={() => setEscala((s) => Math.max(1, s / 1.5))} disabled={escala <= 1} aria-label="Diminuir zoom">
            <Minus size={18} aria-hidden="true" />
          </button>
          <span aria-live="polite">{Math.round(escala * 100)}%</span>
          <button type="button" className="vis-botao" onClick={() => setEscala((s) => Math.min(ZOOM_MAX, s * 1.5))} disabled={escala >= ZOOM_MAX} aria-label="Aumentar zoom">
            <Plus size={18} aria-hidden="true" />
          </button>
          <button type="button" className="vis-botao" onClick={() => setEscala(1)} disabled={escala === 1} aria-label="Ajustar à tela">
            <Maximize size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {total > 1 && escala === 1 && (
        <>
          <button type="button" className="visualizador-botao visualizador-anterior" onClick={() => passar(-1)} aria-label="Arquivo anterior">
            <ChevronLeft size={28} aria-hidden="true" />
          </button>
          <button type="button" className="visualizador-botao visualizador-proxima" onClick={() => passar(1)} aria-label="Próximo arquivo">
            <ChevronRight size={28} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

function ImagemArquivo({ arquivo, aoExpirar }: { arquivo: ArquivoVisivel; aoExpirar?: () => void }) {
  const [carregada, setCarregada] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const tentou = useRef(false);
  if (falhou) {
    return (
      <div className="vis-sem-previa">
        <p>Não foi possível abrir esta imagem aqui. Use o botão Baixar.</p>
      </div>
    );
  }
  return (
    <>
      {!carregada && arquivo.miniatura && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={arquivo.miniatura} alt="" className="vis-imagem vis-provisoria" draggable={false} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={arquivo.previa ?? arquivo.url ?? ""}
        alt={arquivo.nome}
        className={`vis-imagem ${carregada ? "" : "vis-carregando"}`}
        draggable={false}
        onLoad={() => setCarregada(true)}
        onError={() => {
          // 1ª falha: o endereço pode ter vencido, pede um novo. 2ª: avisa.
          if (!tentou.current && aoExpirar) {
            tentou.current = true;
            aoExpirar();
          } else setFalhou(true);
        }}
      />
      {!carregada && <LoaderCircle size={32} className="girando vis-girando" aria-label="Carregando" />}
    </>
  );
}

// Zoom e arrastar (mouse, toque e pinça). Sem zoom, arrastar para o lado passa o arquivo.
function AreaZoom({
  escala,
  setEscala,
  passar,
  fechar,
  children,
}: {
  escala: number;
  setEscala: (s: number | ((s: number) => number)) => void;
  passar: (d: -1 | 1) => void;
  fechar: () => void;
  children: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [desloc, setDesloc] = useState({ x: 0, y: 0 });
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ s: number; x: number; y: number; d: number; mx: number; my: number; px: number; py: number; moveu: boolean } | null>(null);
  const ultimoToque = useRef(0);
  const estado = useRef({ escala, desloc });
  estado.current = { escala, desloc };

  // Mantém a imagem dentro da área.
  const limitar = useCallback((s: number, x: number, y: number) => {
    const r = area.current?.getBoundingClientRect();
    if (!r || s <= 1) return { x: 0, y: 0 };
    const mx = (r.width * (s - 1)) / 2;
    const my = (r.height * (s - 1)) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, []);

  // Zoom mirando um ponto (cursor, dedos ou centro).
  const zoomEm = useCallback(
    (novo: number, cx?: number, cy?: number) => {
      const r = area.current?.getBoundingClientRect();
      const { escala: s, desloc: d } = estado.current;
      const alvo = Math.max(1, Math.min(ZOOM_MAX, novo));
      if (!r) return;
      const px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2);
      const py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2);
      const fator = alvo / s;
      const posicao = limitar(alvo, px - (px - d.x) * fator, py - (py - d.y) * fator);
      estado.current = { escala: alvo, desloc: posicao }; // vale já para o próximo movimento, antes de redesenhar
      setDesloc(posicao);
      setEscala(alvo);
    },
    [limitar, setEscala],
  );

  // Botões de zoom (que só mudam a escala): mantém o deslocamento dentro dos limites.
  useEffect(() => {
    setDesloc((d) => limitar(escala, d.x, d.y));
  }, [escala, limitar]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      zoomEm(estado.current.escala * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, [zoomEm]);

  function inicioGesto() {
    const pts = [...ponteiros.current.values()];
    const { escala: s, desloc: d } = estado.current;
    const [a, b] = pts;
    gesto.current = {
      s,
      x: d.x,
      y: d.y,
      d: b ? Math.hypot(b.x - a.x, b.y - a.y) : 0,
      mx: b ? (a.x + b.x) / 2 : a.x,
      my: b ? (a.y + b.y) / 2 : a.y,
      px: a.x,
      py: a.y,
      moveu: gesto.current?.moveu ?? false,
    };
  }

  return (
    <div
      ref={area}
      className={`vis-area ${escala > 1 ? "vis-com-zoom" : ""}`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        if (ponteiros.current.size === 0) gesto.current = null;
        ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        inicioGesto();
      }}
      onPointerMove={(e) => {
        if (!ponteiros.current.has(e.pointerId) || !gesto.current) return;
        ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesto.current;
        const pts = [...ponteiros.current.values()];
        if (pts.length >= 2) {
          const [a, b] = pts;
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          g.moveu = true;
          zoomEm((g.s * d) / (g.d || d), (a.x + b.x) / 2, (a.y + b.y) / 2);
        } else if (estado.current.escala > 1) {
          const dx = e.clientX - g.px;
          const dy = e.clientY - g.py;
          if (Math.abs(dx) + Math.abs(dy) > 3) g.moveu = true;
          const novo = limitar(estado.current.escala, g.x + dx, g.y + dy);
          estado.current = { ...estado.current, desloc: novo };
          setDesloc(novo);
        } else if (Math.abs(e.clientX - g.px) > 8) {
          g.moveu = true;
        }
      }}
      onPointerUp={(e) => {
        const g = gesto.current;
        const eraUnico = ponteiros.current.size === 1;
        ponteiros.current.delete(e.pointerId);
        if (ponteiros.current.size > 0) {
          inicioGesto();
          return;
        }
        if (!g || !eraUnico) return;
        const dx = e.clientX - g.px;
        const dy = e.clientY - g.py;
        // Arrastar para o lado sem zoom: passa o arquivo.
        if (g.s === 1 && estado.current.escala === 1 && Math.abs(dx) > 50 && Math.abs(dy) < 80) {
          passar(dx < 0 ? 1 : -1);
          return;
        }
        if (g.moveu) return;
        // Toque duplo (ou duplo clique): aproxima no ponto; de novo, volta.
        const agora = Date.now();
        if (agora - ultimoToque.current < 300) {
          ultimoToque.current = 0;
          if (estado.current.escala > 1) zoomEm(1);
          else zoomEm(2.5, e.clientX, e.clientY);
          return;
        }
        ultimoToque.current = agora;
        // Toque no fundo escuro sem zoom fecha (como no briefing).
        if (estado.current.escala === 1 && !(e.target as HTMLElement).closest("img, canvas")) {
          const alvo = e.currentTarget;
          setTimeout(() => {
            if (ultimoToque.current === agora && alvo.isConnected) fechar();
          }, 300);
        }
      }}
      onPointerCancel={(e) => {
        ponteiros.current.delete(e.pointerId);
        gesto.current = null;
      }}
    >
      <div className="vis-conteudo" style={{ transform: `translate(${desloc.x}px, ${desloc.y}px) scale(${escala})` }}>
        {children}
      </div>
    </div>
  );
}

// PDF: página por página. O canvas é redesenhado na resolução do zoom (fica nítido para ler cotas).
function PdfArquivo({
  url,
  escala,
  setEscala,
  passar,
  fechar,
  aoExpirar,
}: {
  url: string;
  escala: number;
  setEscala: (s: number | ((s: number) => number)) => void;
  passar: (d: -1 | 1) => void;
  fechar: () => void;
  aoExpirar?: () => void;
}) {
  const [doc, setDoc] = useState<DocumentoPdf | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [pagina, setPagina] = useState(1);
  const tentou = useRef(false);

  useEffect(() => {
    let ativo = true;
    let aberto: DocumentoPdf | null = null;
    abrirPdf(url)
      .then((d) => {
        aberto = d;
        if (ativo) setDoc(d);
        else void d.loadingTask.destroy();
      })
      .catch((erro) => {
        console.warn("[pdf]", erro);
        if (!ativo) return;
        if (!tentou.current && aoExpirar) {
          tentou.current = true;
          aoExpirar();
        } else setFalhou(true);
      });
    return () => {
      ativo = false;
      void aberto?.loadingTask.destroy();
    };
  }, [url, aoExpirar]);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (!doc) return;
      if (e.key === "PageDown") setPagina((p) => Math.min(doc.numPages, p + 1));
      if (e.key === "PageUp") setPagina((p) => Math.max(1, p - 1));
    };
    document.addEventListener("keydown", teclas);
    return () => document.removeEventListener("keydown", teclas);
  }, [doc]);

  if (falhou) {
    return (
      <div className="vis-sem-previa">
        <p>Não foi possível abrir este PDF aqui. Use o botão Baixar ou Nova aba.</p>
      </div>
    );
  }
  if (!doc) return <LoaderCircle size={32} className="girando vis-girando" aria-label="Carregando PDF" />;

  return (
    <>
      <AreaZoom key={pagina} escala={escala} setEscala={setEscala} passar={passar} fechar={fechar}>
        <PaginaPdf doc={doc} numero={pagina} escala={escala} />
      </AreaZoom>
      {doc.numPages > 1 && (
        <div className="vis-paginas" role="group" aria-label="Páginas">
          <button
            type="button"
            className="vis-botao"
            disabled={pagina <= 1}
            onClick={() => {
              setPagina(pagina - 1);
              setEscala(1);
            }}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span>
            Página {pagina} de {doc.numPages}
          </span>
          <button
            type="button"
            className="vis-botao"
            disabled={pagina >= doc.numPages}
            onClick={() => {
              setPagina(pagina + 1);
              setEscala(1);
            }}
            aria-label="Próxima página"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

// Limite de pixels do canvas (o Safari do iPhone recusa acima de ~16 milhões).
const PIXELS_MAX = 16_000_000;

function PaginaPdf({ doc, numero, escala }: { doc: DocumentoPdf; numero: number; escala: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [tamanho, setTamanho] = useState<{ w: number; h: number } | null>(null);
  const [desenhando, setDesenhando] = useState(true);

  // Tamanho "ajustado à tela" da página (o zoom do AreaZoom amplia a partir dele).
  useEffect(() => {
    let ativo = true;
    void doc.getPage(numero).then((p) => {
      if (!ativo) return;
      const v = p.getViewport({ scale: 1 });
      const r = caixa.current?.parentElement?.parentElement?.getBoundingClientRect();
      const larg = (r?.width ?? window.innerWidth) * 0.96;
      const alt = (r?.height ?? window.innerHeight) * 0.96;
      const ajuste = Math.min(larg / v.width, alt / v.height);
      setTamanho({ w: v.width * ajuste, h: v.height * ajuste });
    });
    return () => {
      ativo = false;
    };
  }, [doc, numero]);

  // Redesenha na resolução do zoom, um instante depois do gesto parar.
  useEffect(() => {
    if (!tamanho) return;
    let tarefa: { cancel: () => void } | null = null;
    const espera = setTimeout(async () => {
      const p = await doc.getPage(numero);
      const v1 = p.getViewport({ scale: 1 });
      const dpr = window.devicePixelRatio || 1;
      let fator = (tamanho.w / v1.width) * escala * dpr;
      const pixels = v1.width * v1.height * fator * fator;
      if (pixels > PIXELS_MAX) fator *= Math.sqrt(PIXELS_MAX / pixels);
      const viewport = p.getViewport({ scale: fator });
      const c = canvas.current;
      if (!c) return;
      const temp = document.createElement("canvas");
      temp.width = Math.ceil(viewport.width);
      temp.height = Math.ceil(viewport.height);
      const ctx = temp.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, temp.width, temp.height);
      const render = p.render({ canvasContext: ctx, canvas: temp, viewport });
      tarefa = render;
      try {
        await render.promise;
        // Troca de uma vez (sem piscar em branco durante o redesenho).
        c.width = temp.width;
        c.height = temp.height;
        c.getContext("2d")!.drawImage(temp, 0, 0);
        setDesenhando(false);
      } catch {
        /* cancelado por um zoom novo */
      }
    }, 150);
    return () => {
      clearTimeout(espera);
      tarefa?.cancel();
    };
  }, [doc, numero, escala, tamanho]);

  return (
    <div ref={caixa} className="vis-pdf-pagina" style={tamanho ? { width: tamanho.w, height: tamanho.h } : undefined}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%" }} />
      {desenhando && <LoaderCircle size={28} className="girando vis-girando" aria-label="Carregando página" />}
    </div>
  );
}
