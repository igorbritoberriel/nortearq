"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Motor de animação do site de vendas (padrões da skill video-to-website, adaptados ao Next.js):
// rolagem suave (Lenis), entradas variadas por seção (data-animacao), cena que se desenha com a rolagem,
// revelação em círculo, fundo escuro nos números, contadores e letreiro gigante.
// Com "reduzir movimento" ligado no sistema, nada disso roda e a página aparece completa e estática.

gsap.registerPlugin(ScrollTrigger);

const VELOCIDADE_CENA = 2; // 1.8–2.2: a cena termina por volta de 50% da rolagem da experiência

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
        const persiste = secao.dataset.persiste === "true";
        gsap.from(itens, {
          ...entrada,
          scrollTrigger: {
            trigger: secao,
            start: "top 82%",
            end: "bottom 18%",
            toggleActions: persiste ? "play none none none" : "play reverse play reverse",
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
          scrollTrigger: { trigger: el, start: "top 80%", toggleActions: "play none none reverse" },
        });
      });

      configurarExperiencia();
      configurarHero();
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

function configurarHero() {
  const hero = document.querySelector<HTMLElement>(".hero");
  if (!hero) return;
  gsap.to(".hero .seta-norte", {
    rotation: 160,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero-conteudo", {
    opacity: 0,
    y: -60,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "40% top", end: "bottom top", scrub: true },
  });
}

function configurarExperiencia() {
  const experiencia = document.querySelector<HTMLElement>(".experiencia");
  if (!experiencia) return;
  const palco = experiencia.querySelector<HTMLElement>(".palco");
  const cena = experiencia.querySelector<HTMLElement>(".cena");
  const escuro = experiencia.querySelector<HTMLElement>(".palco-escuro");
  if (!palco || !cena) return;

  // Revelação em círculo: a cena se abre enquanto o hero sai.
  gsap.fromTo(
    palco,
    { clipPath: "circle(8% at 50% 50%)" },
    {
      clipPath: "circle(75% at 50% 50%)",
      ease: "none",
      scrollTrigger: { trigger: experiencia, start: "top bottom", end: "top top", scrub: true },
    },
  );

  // A planta se desenha: paredes → portas e janelas → móveis → cotas → cores → rótulos.
  const desenho = gsap.timeline({ paused: true });
  desenho
    .fromTo(".pb-paredes .pb-parede", { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.04, duration: 0.3, ease: "none" })
    .fromTo(".pb-portas .pb-parede", { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.1, ease: "none" })
    .from(".pb-janela", { opacity: 0, duration: 0.06 }, "<")
    .from(".pb-movel", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%", stagger: 0.02, duration: 0.12 })
    .from(".pb-cotas", { opacity: 0, duration: 0.06 })
    .from(".pb-ambiente", { opacity: 0, stagger: 0.03, duration: 0.1 })
    .from(".pb-rotulo", { opacity: 0, y: 8, stagger: 0.02, duration: 0.06 });

  // Começa ainda durante a revelação em círculo, para o círculo nunca abrir sobre um fundo vazio.
  ScrollTrigger.create({
    trigger: experiencia,
    start: "top 85%",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => desenho.progress(Math.min(self.progress * VELOCIDADE_CENA, 1)),
  });

  // Letreiro gigante atravessando a tela.
  gsap.to(".letreiro-texto", {
    xPercent: -30,
    ease: "none",
    scrollTrigger: { trigger: experiencia, start: "top bottom", end: "bottom top", scrub: true },
  });

  // A cena se afasta para o lado oposto ao texto da seção ativa.
  const largo = window.matchMedia("(min-width: 900px)");
  gsap.utils.toArray<HTMLElement>(".experiencia [data-lado]").forEach((secao) => {
    const lado = secao.dataset.lado;
    const destino = () => {
      if (!largo.matches) return { x: 0, scale: 1, opacity: lado === "centro" ? 0.25 : 0.35 };
      if (lado === "esquerda") return { x: "22vw", scale: 1, opacity: 1 };
      if (lado === "direita") return { x: "-22vw", scale: 1, opacity: 1 };
      return { x: 0, scale: 0.9, opacity: 0.35 };
    };
    const ir = () => gsap.to(cena, { ...destino(), duration: 1.1, ease: "power3.inOut", overwrite: "auto" });
    ScrollTrigger.create({ trigger: secao, start: "top 60%", end: "bottom 40%", onEnter: ir, onEnterBack: ir });
  });

  // Fundo escuro (0,9) só durante os números.
  const numeros = experiencia.querySelector<HTMLElement>(".secao-numeros");
  if (escuro && numeros) {
    ScrollTrigger.create({
      trigger: numeros,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        const opacidade = p < 0.25 ? p / 0.25 : p > 0.75 ? (1 - p) / 0.25 : 1;
        escuro.style.opacity = String(0.9 * opacidade);
      },
    });
  }
}
