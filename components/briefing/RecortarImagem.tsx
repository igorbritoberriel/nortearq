"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

// Enquadramento das imagens do quiz: tudo sai em 4:3, 1600×1200, JPG (o mesmo formato das imagens
// padrão do NorteArq). Arrastar move, o controle de zoom aproxima; as setas do teclado também movem.

export const PROPORCAO = 4 / 3;
const SAIDA = { largura: 1600, altura: 1200 };

type Posicao = { x: number; y: number; zoom: number }; // x/y: centro do recorte, de 0 a 1 da imagem

// Recorte automático pelo centro (para "enquadrar todas assim").
export async function recortarCentro(arquivo: File): Promise<Blob> {
  const img = await carregar(arquivo);
  return gerar(img, { x: 0.5, y: 0.5, zoom: 1 });
}

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem_invalida"));
    img.src = url;
  });
}

// Tamanho do recorte (em pixels da imagem) para a proporção 4:3 no zoom pedido.
function janela(img: HTMLImageElement, zoom: number) {
  const larguraMax = Math.min(img.naturalWidth, img.naturalHeight * PROPORCAO);
  const largura = larguraMax / zoom;
  return { largura, altura: largura / PROPORCAO };
}

// Mantém o recorte sempre dentro da imagem.
function limitar(img: HTMLImageElement, p: Posicao): Posicao {
  const { largura, altura } = janela(img, p.zoom);
  const meioX = largura / 2 / img.naturalWidth;
  const meioY = altura / 2 / img.naturalHeight;
  return {
    zoom: p.zoom,
    x: Math.min(1 - meioX, Math.max(meioX, p.x)),
    y: Math.min(1 - meioY, Math.max(meioY, p.y)),
  };
}

function gerar(img: HTMLImageElement, p: Posicao): Promise<Blob> {
  const { largura, altura } = janela(img, p.zoom);
  const canvas = document.createElement("canvas");
  canvas.width = SAIDA.largura;
  canvas.height = SAIDA.altura;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    p.x * img.naturalWidth - largura / 2,
    p.y * img.naturalHeight - altura / 2,
    largura,
    altura,
    0,
    0,
    SAIDA.largura,
    SAIDA.altura,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha_recorte"))), "image/jpeg", 0.86),
  );
}

export function RecortarImagem({
  arquivo,
  posicao,
  total,
  concluir,
  enquadrarTodas,
  pular,
}: {
  arquivo: File;
  posicao: number; // 1, 2, 3...
  total: number;
  concluir: (blob: Blob) => void;
  enquadrarTodas: () => void; // as que faltam saem pelo centro
  pular: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState(false);
  const [p, setP] = useState<Posicao>({ x: 0.5, y: 0.5, zoom: 1 });
  const [gerando, setGerando] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; inicio: Posicao } | null>(null);

  useEffect(() => {
    let vivo = true;
    setImg(null);
    setErro(false);
    setP({ x: 0.5, y: 0.5, zoom: 1 });
    carregar(arquivo).then(
      (i) => vivo && setImg(i),
      () => vivo && setErro(true),
    );
    return () => {
      vivo = false;
    };
  }, [arquivo]);

  if (erro) {
    return (
      <div className="recorte">
        <p className="campo-erro" role="alert">
          {arquivo.name}: não foi possível abrir esta imagem.
        </p>
        <button type="button" className="botao botao-secundario botao-pequeno" onClick={pular}>
          Pular
        </button>
      </div>
    );
  }

  const mover = (dx: number, dy: number) => {
    if (!img || !area.current) return;
    const { largura, altura } = janela(img, p.zoom);
    const caixa = area.current.getBoundingClientRect();
    // Arrastar a foto para a direita mostra o lado esquerdo dela.
    setP((atual) =>
      limitar(img, {
        ...atual,
        x: atual.x - (dx / caixa.width) * (largura / img.naturalWidth),
        y: atual.y - (dy / caixa.height) * (altura / img.naturalHeight),
      }),
    );
  };

  // Posição da foto dentro da área de 4:3 (em %), para o CSS.
  let estilo: React.CSSProperties = {};
  if (img) {
    const { largura, altura } = janela(img, p.zoom);
    const escalaX = img.naturalWidth / largura;
    const escalaY = img.naturalHeight / altura;
    estilo = {
      width: `${escalaX * 100}%`,
      height: `${escalaY * 100}%`,
      left: `${(-(p.x * img.naturalWidth - largura / 2) / largura) * 100}%`,
      top: `${(-(p.y * img.naturalHeight - altura / 2) / altura) * 100}%`,
    };
  }

  return (
    <div className="recorte">
      <p className="recorte-titulo">
        <strong>Enquadre a imagem</strong>
        <span className="muted">
          {" "}
          · {posicao} de {total} · arraste para escolher o que aparece
        </span>
      </p>
      <div
        ref={area}
        className="recorte-area"
        tabIndex={0}
        role="application"
        aria-label="Área de enquadramento. Use as setas para mover a imagem."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          arrasto.current = { x: e.clientX, y: e.clientY, inicio: p };
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          mover(e.clientX - a.x, e.clientY - a.y);
          arrasto.current = { ...a, x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          arrasto.current = null;
        }}
        onKeyDown={(e) => {
          const passo = 12;
          const setas: Record<string, [number, number]> = {
            ArrowLeft: [passo, 0],
            ArrowRight: [-passo, 0],
            ArrowUp: [0, passo],
            ArrowDown: [0, -passo],
          };
          if (setas[e.key]) {
            e.preventDefault();
            mover(...setas[e.key]);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img.src} alt="" draggable={false} style={estilo} />}
        <span className="recorte-grade" aria-hidden="true" />
      </div>

      <div className="recorte-zoom">
        <Minus size={16} aria-hidden="true" />
        <label className="sr-only" htmlFor="recorte-zoom">
          Aproximar
        </label>
        <input
          id="recorte-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={p.zoom}
          disabled={!img}
          onChange={(e) => img && setP((atual) => limitar(img, { ...atual, zoom: Number(e.target.value) }))}
        />
        <Plus size={16} aria-hidden="true" />
      </div>
      {img && img.naturalWidth < 1000 && (
        <p className="campo-ajuda texto-alerta">Esta imagem é pequena ({img.naturalWidth}px) e pode ficar sem nitidez.</p>
      )}

      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={pular} disabled={gerando}>
          Não enviar esta
        </button>
        {total - posicao > 0 && (
          <button type="button" className="botao botao-secundario botao-pequeno" onClick={enquadrarTodas} disabled={gerando}>
            Enquadrar as {total - posicao + 1} pelo centro
          </button>
        )}
        <button
          type="button"
          className="botao botao-primario botao-pequeno"
          disabled={!img || gerando}
          onClick={async () => {
            if (!img) return;
            setGerando(true);
            try {
              concluir(await gerar(img, p));
            } finally {
              setGerando(false);
            }
          }}
        >
          {gerando ? "Preparando..." : "Usar este enquadramento"}
        </button>
      </div>
    </div>
  );
}
