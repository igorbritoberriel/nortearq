"use client";

import { useEffect } from "react";

// Tabelas e abas largas rolam para o lado no celular. Quando há conteúdo escondido, a borda daquele lado
// fica esmaecida (CSS em [data-rola-*]), para a pessoa saber que dá para arrastar.
const SELETOR = ".tabela-rolagem-app, .tabela-rolagem, .fin-tabela-rolagem, .fin-abas";

function atualizar(el: HTMLElement) {
  const resto = el.scrollWidth - el.clientWidth - el.scrollLeft;
  el.dataset.rolaDireita = resto > 4 ? "1" : "";
  el.dataset.rolaEsquerda = el.scrollLeft > 4 ? "1" : "";
}

export function IndicadorRolagem() {
  useEffect(() => {
    const vistos = new WeakSet<HTMLElement>();
    const aoRolar = (e: Event) => atualizar(e.currentTarget as HTMLElement);
    const varrer = () =>
      document.querySelectorAll<HTMLElement>(SELETOR).forEach((el) => {
        if (!vistos.has(el)) {
          vistos.add(el);
          el.addEventListener("scroll", aoRolar, { passive: true });
        }
        atualizar(el);
      });
    varrer();
    let agendado = 0;
    const reagendar = () => {
      cancelAnimationFrame(agendado);
      agendado = requestAnimationFrame(varrer);
    };
    const observador = new MutationObserver(reagendar);
    observador.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", reagendar);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", reagendar);
      cancelAnimationFrame(agendado);
    };
  }, []);
  return null;
}
