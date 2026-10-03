"use client";

import { useEffect } from "react";

// Escuta erros não tratados das telas e manda para /api/erros (aviso automático de erros).
// Ignora ruído comum (extensões do navegador, ResizeObserver) e manda no máximo 10 por página aberta.

const IGNORAR = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /Failed to fetch dynamically imported module/i];

export function enviarErroDaTela(dados: { mensagem: string; pilha?: string; origemArquivo?: string }) {
  try {
    const corpo = JSON.stringify({
      mensagem: dados.mensagem.slice(0, 1000),
      pilha: dados.pilha?.slice(0, 4000),
      origemArquivo: dados.origemArquivo?.slice(0, 300),
      caminho: window.location.pathname,
    });
    const blob = new Blob([corpo], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/erros", blob)) {
      void fetch("/api/erros", { method: "POST", body: corpo, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // nunca atrapalhar a tela por causa do aviso
  }
}

export function CapturaErros() {
  useEffect(() => {
    const enviados = new Set<string>();
    const reportar = (mensagem: string, pilha?: string, arquivo?: string) => {
      if (!mensagem || enviados.size >= 10 || enviados.has(mensagem)) return;
      if (IGNORAR.some((r) => r.test(mensagem) || (arquivo && r.test(arquivo)))) return;
      enviados.add(mensagem);
      enviarErroDaTela({ mensagem, pilha, origemArquivo: arquivo });
    };
    const aoErro = (e: ErrorEvent) => reportar(e.message, e.error?.stack, e.filename);
    const aoRejeitar = (e: PromiseRejectionEvent) => {
      const motivo = e.reason;
      reportar(motivo instanceof Error ? motivo.message : String(motivo ?? ""), motivo instanceof Error ? motivo.stack : undefined);
    };
    window.addEventListener("error", aoErro);
    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => {
      window.removeEventListener("error", aoErro);
      window.removeEventListener("unhandledrejection", aoRejeitar);
    };
  }, []);
  return null;
}
