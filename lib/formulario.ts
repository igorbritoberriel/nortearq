import type { z } from "zod";

// Peças comuns dos formulários com Server Actions (useActionState).

export type EstadoFormulario = {
  status: "inicial" | "sucesso" | "erro";
  mensagem?: string;
  erros?: Record<string, string>;
  valores?: Record<string, string>; // devolvidos para o formulário não perder o que foi digitado
};

export const SEM_SUPABASE: EstadoFormulario = {
  status: "erro",
  mensagem: "O banco ainda não está ligado: configure o Supabase no arquivo .env.local (veja o README).",
};

// Senhas e campos internos do React ($ACTION_...) nunca voltam para a tela.
export function valoresDe(formData: FormData) {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string" && !chave.startsWith("senha") && !chave.startsWith("$")) valores[chave] = valor;
  }
  return valores;
}

export function errosDe(issues: z.core.$ZodIssue[]) {
  const erros: Record<string, string> = {};
  for (const problema of issues) erros[String(problema.path[0])] ??= problema.message;
  return erros;
}

// Só aceita caminhos internos, para um link não virar porta para sites de golpe.
export function destinoSeguro(proximo: string | undefined | null, padrao: string) {
  return proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : padrao;
}
