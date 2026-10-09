"use client";

import { lerNumero } from "@/lib/formatacao";
import { finalizarDinheiro, mascaraDinheiro, MASCARAS, type TipoMascara } from "@/lib/mascaras";

const TAMANHO: Record<TipoMascara, number> = { dinheiro: 24, documento: 18, telefone: 19, registro: 20 };

// Coloca a máscara no próprio campo e mantém o cursor no lugar certo, mesmo editando no meio.
function aplicar(el: HTMLInputElement, mascara: (v: string) => string, dinheiro = false) {
  const antes = el.value;
  const depois = mascara(antes);
  if (antes === depois) return;
  const posicao = el.selectionStart ?? antes.length;
  const caractere = dinheiro ? /[0-9,]/ : /[0-9A-Za-z]/;
  const significativos = [...antes.slice(0, posicao)].filter((c) => caractere.test(c)).length;
  el.value = depois;
  let i = 0;
  for (let vistos = 0; i < depois.length && vistos < significativos; i++) {
    if (caractere.test(depois[i])) vistos++;
  }
  if (document.activeElement === el) el.setSelectionRange(i, i);
}

// Campo de texto com máscara (CPF/CNPJ, WhatsApp ou registro CAU). Funciona com ou sem estado (value/defaultValue).
export function InputMascara({
  mascara,
  onChange,
  onPaste,
  onBlur,
  value,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "defaultValue"> & {
  mascara: TipoMascara;
  value?: string | number | null;
  defaultValue?: string | number | null;
}) {
  const formatar = MASCARAS[mascara];
  const valorInicial = (v: string | number | null) => {
    const texto = typeof v === "number" ? v.toLocaleString("pt-BR", { minimumFractionDigits: mascara === "dinheiro" ? 2 : 0, maximumFractionDigits: 2 }) : v ?? "";
    return formatar(texto);
  };
  return (
    <input
      maxLength={TAMANHO[mascara]}
      autoComplete="off"
      {...props}
      value={value === undefined ? undefined : valorInicial(value)}
      defaultValue={defaultValue === undefined ? undefined : valorInicial(defaultValue)}
      onBlur={(e) => {
        if (mascara === "dinheiro") {
          const antes = e.currentTarget.value;
          aplicar(e.currentTarget, finalizarDinheiro, true);
          if (antes !== e.currentTarget.value) onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onBlur?.(e);
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (e.defaultPrevented || mascara !== "dinheiro") return;
        const texto = e.clipboardData.getData("text");
        const n = lerNumero(texto);
        if (n === null || !Number.isFinite(n) || n < 0) { e.preventDefault(); return; }
        // Colagem decimal com ponto vira formato brasileiro antes da inserção.
        const el = e.currentTarget;
        e.preventDefault();
        el.setRangeText(n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), el.selectionStart ?? 0, el.selectionEnd ?? el.value.length, "end");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }}
      onChange={(e) => {
        const apagando = (e.nativeEvent as InputEvent | undefined)?.inputType?.startsWith("delete");
        aplicar(e.currentTarget, mascara === "dinheiro" && apagando ? (v) => mascaraDinheiro(v, false) : formatar, mascara === "dinheiro");
        onChange?.(e);
      }}
    />
  );
}
