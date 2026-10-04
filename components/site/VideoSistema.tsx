"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// Vídeo do sistema em uso, na vitrine da landing: mudo, em loop, decorativo.
// Tem botão de pausar (WCAG 2.2.2). Com "reduzir movimento" ligado, fica parado na capa.
export function VideoSistema() {
  const video = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    // O React não grava o atributo "muted" no HTML; sem ele, o navegador bloqueia o autoplay.
    el.muted = true;
    el.defaultMuted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.pause();
      setTocando(false);
      return;
    }
    void el.play().then(() => setTocando(true)).catch(() => setTocando(false));
  }, []);

  function alternar() {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div className="ln-video">
      <video
        ref={video}
        poster="/landing/sistema-capa.webp"
        muted
        loop
        playsInline
        preload="metadata"
        width={1280}
        height={800}
        aria-label="O NorteArq em uso: painel do escritório, Perfil do Cliente e acompanhamento do projeto"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
      >
        <source src="/landing/sistema.mp4" type="video/mp4" />
      </video>
      <button type="button" className="ln-video-botao" onClick={alternar} aria-label={tocando ? "Pausar vídeo" : "Tocar vídeo"}>
        {tocando ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}
