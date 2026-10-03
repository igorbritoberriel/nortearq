"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatoDe } from "./arquivos";
import { abrirPdf } from "./pdf";

// Miniatura e prévia geradas no próprio navegador, sem custo de servidor:
//   miniatura → até 640 px, para as listas (carrega rápido);
//   prévia    → até 2.400 px, só para imagens grandes: é o que o visualizador abre no lugar do original.
// PDF ganha miniatura da primeira página. Formatos técnicos (DWG, SKP...) ficam com ícone.

const MINIATURA = 640;
const PREVIA = 2400;
const PREVIA_A_PARTIR_DE = 2.5 * 1024 * 1024; // imagens até 2,5 MB e 2.400 px abrem o original mesmo

export type Derivados = { miniatura: Blob; previa: Blob | null };

export async function gerarDerivados(arquivo: Blob, nome: string): Promise<Derivados | null> {
  const formato = formatoDe(nome, arquivo.type || null);
  try {
    if (formato === "imagem") return await deImagem(arquivo);
    if (formato === "pdf") return await dePdf(arquivo);
  } catch (erro) {
    console.warn("[miniatura]", nome, erro);
  }
  return null;
}

async function deImagem(arquivo: Blob): Promise<Derivados> {
  const bitmap = await createImageBitmap(arquivo);
  try {
    const maior = Math.max(bitmap.width, bitmap.height);
    const miniatura = await desenhar(bitmap, bitmap.width, bitmap.height, MINIATURA, 0.8);
    const previa = maior > PREVIA || arquivo.size > PREVIA_A_PARTIR_DE ? await desenhar(bitmap, bitmap.width, bitmap.height, PREVIA, 0.85) : null;
    return { miniatura, previa };
  } finally {
    bitmap.close();
  }
}

async function dePdf(arquivo: Blob): Promise<Derivados> {
  const pdf = await abrirPdf(await arquivo.arrayBuffer());
  try {
    const pagina = await pdf.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: MINIATURA / Math.max(base.width, base.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, canvas, viewport }).promise;
    return { miniatura: await paraJpg(canvas, 0.8), previa: null };
  } finally {
    void pdf.loadingTask.destroy();
  }
}

// Reduz mantendo a proporção. Fundo branco: PNG transparente vira JPG sem fundo preto.
function desenhar(fonte: CanvasImageSource, largura: number, altura: number, limite: number, qualidade: number) {
  const escala = Math.min(1, limite / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(largura * escala));
  canvas.height = Math.max(1, Math.round(altura * escala));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return paraJpg(canvas, qualidade);
}

function paraJpg(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas_vazio"))), "image/jpeg", qualidade),
  );
}

// Sobe miniatura e prévia ao lado do original (mesmo prefixo, mesmo bucket privado).
export async function enviarDerivados(storage: SupabaseClient["storage"], caminhoOriginal: string, derivados: Derivados) {
  const base = caminhoOriginal.replace(/\.[^./]+$/, "");
  const miniatura = `${base}.miniatura.jpg`;
  const previa = derivados.previa ? `${base}.previa.jpg` : null;
  const bucket = storage.from("projetos");
  const { error } = await bucket.upload(miniatura, derivados.miniatura, { contentType: "image/jpeg" });
  if (error) return null;
  if (previa && derivados.previa) {
    const { error: erroPrevia } = await bucket.upload(previa, derivados.previa, { contentType: "image/jpeg" });
    if (erroPrevia) return { miniatura, previa: null, bytes: derivados.miniatura.size };
  }
  return { miniatura, previa, bytes: derivados.miniatura.size + (previa ? derivados.previa!.size : 0) };
}
