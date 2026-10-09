"use client";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./valores.css";

// Esconde valores financeiros da tela por padrão (pedido do usuário), lembrando a escolha
// no aparelho via localStorage. Vários cartões na mesma página ou em páginas diferentes
// compartilham a mesma chave, então o botão em qualquer um deles afeta todos.
const CHAVE = "nortearq_ocultar_valores";
const EVENTO = "nortearq-ocultar-valores";

function lido(): boolean {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function useOcultarValores() {
  const [oculto, setOculto] = useState(true);
  useEffect(() => {
    setOculto(lido());
    const ouvir = () => setOculto(lido());
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
  const alternar = useCallback(() => {
    const novo = !lido();
    try {
      localStorage.setItem(CHAVE, novo ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [oculto, alternar] as const;
}

export function BotaoOcultarValores({ className = "" }: { className?: string }) {
  const [oculto, alternar] = useOcultarValores();
  return (
    <button
      type="button"
      className={`botao-olho ${className}`}
      onClick={alternar}
      aria-pressed={oculto}
      aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
    >
      {oculto ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
}

export function Valor({ oculto, children }: { oculto: boolean; children: React.ReactNode }) {
  return oculto ? (
    <span className="valor-oculto" aria-label="Valor oculto">
      ••••••
    </span>
  ) : (
    <>{children}</>
  );
}
