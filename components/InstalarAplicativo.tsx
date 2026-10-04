"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

// "Instalar aplicativo" no menu do arquiteto: Chrome/Edge/Android usam o pedido do navegador;
// no iPhone (Safari não tem esse pedido) mostra o passo a passo. Some quando já está instalado.

type PedidoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstalarAplicativo() {
  const [pedido, setPedido] = useState<PedidoInstalacao | null>(null);
  const [iphone, setIphone] = useState(false);
  const [instalado, setInstalado] = useState(true);
  const janela = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIphone(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => null);
    const aoOferecer = (e: Event) => {
      e.preventDefault();
      setPedido(e as PedidoInstalacao);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setPedido(null);
    };
    window.addEventListener("beforeinstallprompt", aoOferecer);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoOferecer);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (instalado || (!pedido && !iphone)) return null;

  return (
    <>
      <button
        type="button"
        className="instalar-botao"
        onClick={async () => {
          if (pedido) {
            await pedido.prompt();
            const { outcome } = await pedido.userChoice;
            if (outcome === "accepted") setPedido(null);
          } else {
            janela.current?.showModal();
          }
        }}
      >
        <Download size={16} aria-hidden="true" />
        Instalar aplicativo
      </button>
      <dialog ref={janela} className="relatar-janela" aria-labelledby="instalar-titulo">
        <div className="relatar-topo">
          <h2 id="instalar-titulo">Instalar no iPhone</h2>
          <button type="button" className="botao-icone" onClick={() => janela.current?.close()} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <ol className="instalar-passos">
          <li>
            Abra o NorteArq no <strong>Safari</strong>.
          </li>
          <li>
            Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima, na barra de baixo).
          </li>
          <li>
            Role e toque em <strong>Adicionar à Tela de Início</strong>, depois em <strong>Adicionar</strong>.
          </li>
        </ol>
        <p className="muted">O ícone do NorteArq aparece na tela do celular e abre em tela cheia, como um aplicativo.</p>
      </dialog>
    </>
  );
}
