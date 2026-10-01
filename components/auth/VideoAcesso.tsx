"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// Vídeo da lateral das telas de acesso: mudo, em loop, decorativo.
// Toca para todos e tem botão de pausar (WCAG 2.2.2). A capa aparece enquanto carrega.
export function VideoAcesso() {
  const video = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    // O React não grava o atributo "muted" no HTML; sem ele, o navegador bloqueia o autoplay.
    el.muted = true;
    el.defaultMuted = true;
    // O autoplay pode começar antes de o React ligar os eventos: lê o estado real.
    setTocando(!el.paused);
    void el.play().then(() => setTocando(true)).catch(() => setTocando(false));
  }, []);

  function alternar() {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }

  return (
    <>
      <video
        ref={video}
        className="acesso-foto acesso-video"
        poster="/login/nortearq-login-arquiteta-capa.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
      >
        <source src="/login/nortearq-login-arquiteta.mp4" type="video/mp4" />
      </video>
      <button type="button" className="acesso-video-botao" onClick={alternar} aria-label={tocando ? "Pausar vídeo" : "Tocar vídeo"}>
        {tocando ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
    </>
  );
}
