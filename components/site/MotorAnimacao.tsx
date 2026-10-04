"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Motor de animação do site de vendas (padrões da skill video-to-website, adaptados ao Next.js):
// rolagem suave (Lenis), entradas variadas por seção (data-animacao), contadores e a barra de revisões.
// Os celulares flutuando e as telas que se revezam são só CSS (globals.css, "Landing").
// Com "reduzir movimento" ligado no sistema, nada disso roda e a página aparece completa e estática.

gsap.registerPlugin(ScrollTrigger);

const ENTRADAS: Record<string, gsap.TweenVars> = {
  "fade-up": { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" },
  "slide-left": { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" },
  "slide-right": { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" },
  "scale-up": { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1, ease: "power2.out" },
  "rotate-in": { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" },
  "stagger-up": { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" },
  "clip-reveal": { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" },
};

export function MotorAnimacao() {
  const caminho = usePathname();

  useEffect(() => {
    const topo = document.querySelector(".site-topo");
    const marcarTopo = () => topo?.classList.toggle("rolado", window.scrollY > 40);
    marcarTopo();
    window.addEventListener("scroll", marcarTopo, { passive: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.removeEventListener("scroll", marcarTopo);
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: { offset: -72 },
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tique = (tempo: number) => lenis.raf(tempo * 1000);
    gsap.ticker.add(tique);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // Entradas por seção: rótulo → título → texto → botão, nunca tudo de uma vez.
      gsap.utils.toArray<HTMLElement>("[data-animacao]").forEach((secao) => {
        const itens = secao.querySelectorAll(".a-item");
        const entrada = ENTRADAS[secao.dataset.animacao ?? ""];
        if (!itens.length || !entrada) return;
        gsap.from(itens, {
          ...entrada,
          scrollTrigger: {
            trigger: secao,
            start: "top 82%",
            toggleActions: "play none none none", // entra uma vez e fica
          },
        });
      });

      // Contadores: todo número sobe a partir de zero.
      gsap.utils.toArray<HTMLElement>(".numero[data-valor]").forEach((el) => {
        const alvo = { v: 0 };
        const final = Number(el.dataset.valor);
        el.textContent = "0";
        gsap.to(alvo, {
          v: final,
          duration: 2,
          ease: "power1.out",
          onUpdate: () => (el.textContent = Math.round(alvo.v).toString()),
          scrollTrigger: { trigger: el, start: "top 80%", toggleActions: "play none none none" },
        });
      });

      // Barra de revisões usadas (cartão "Controle do contratado") enche quando aparece.
      gsap.utils.toArray<HTMLElement>(".ln-barra span").forEach((barra) => {
        gsap.from(barra, {
          scaleX: 0,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: barra, start: "top 85%", toggleActions: "play none none none" },
        });
      });
    });

    // Fontes e imagens mudam alturas: recalcula as posições depois da primeira pintura.
    const recalcular = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(recalcular);

    return () => {
      ctx.revert();
      gsap.ticker.remove(tique);
      lenis.destroy();
      window.removeEventListener("scroll", marcarTopo);
    };
  }, [caminho]);

  return null;
}
