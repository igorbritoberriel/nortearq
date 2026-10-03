"use client";

// PDF.js (o leitor de PDF do Firefox), carregado só quando alguém abre ou envia um PDF.
// Versão "legacy": funciona também em celulares e navegadores mais antigos.

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let carregando: Promise<PdfJs> | null = null;

export function carregarPdfJs(): Promise<PdfJs> {
  carregando ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return carregando;
}

export type DocumentoPdf = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

export async function abrirPdf(origem: string | ArrayBuffer): Promise<DocumentoPdf> {
  const pdfjs = await carregarPdfJs();
  return pdfjs.getDocument(typeof origem === "string" ? { url: origem } : { data: new Uint8Array(origem) }).promise;
}
