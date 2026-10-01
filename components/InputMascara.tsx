"use client";

import { MASCARAS, type TipoMascara } from "@/lib/mascaras";

const TAMANHO: Record<TipoMascara, number> = { documento: 18, telefone: 19, registro: 20 };

// Coloca a máscara no próprio campo e mantém o cursor no lugar certo, mesmo editando no meio.
function aplicar(el: HTMLInputElement, mascara: (v: string) => string) {
  const antes = el.value;
  const depois = mascara(antes);
  if (antes === depois) return;
  const posicao = el.selectionStart ?? antes.length;
  const significativos = antes.slice(0, posicao).replace(/[^0-9A-Za-z]/g, "").length;
  el.value = depois;
  let i = 0;
  for (let vistos = 0; i < depois.length && vistos < significativos; i++) {
    if (/[0-9A-Za-z]/.test(depois[i])) vistos++;
  }
  if (document.activeElement === el) el.setSelectionRange(i, i);
}

// Campo de texto com máscara (CPF/CNPJ, WhatsApp ou registro CAU). Funciona com ou sem estado (value/defaultValue).
export function InputMascara({
  mascara,
  onChange,
  value,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "defaultValue"> & {
  mascara: TipoMascara;
  value?: string | null;
  defaultValue?: string | null;
}) {
  const formatar = MASCARAS[mascara];
  return (
    <input
      maxLength={TAMANHO[mascara]}
      autoComplete="off"
      {...props}
      value={value === undefined ? undefined : formatar(value ?? "")}
      defaultValue={defaultValue === undefined ? undefined : formatar(defaultValue ?? "")}
      onChange={(e) => {
        aplicar(e.currentTarget, formatar);
        onChange?.(e);
      }}
    />
  );
}
