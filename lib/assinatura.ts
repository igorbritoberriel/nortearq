import { PLANOS, type ModuloId, type Plano } from "@/lib/modulos";

// Assinatura do arquiteto (RG-1 a RG-6). A situação é calculada pelo banco: situacao_escritorio().

export type SituacaoEscritorio = "teste" | "ativo" | "tolerancia" | "leitura" | "suspenso";
export type Periodo = "mensal" | "anual";

export const NOME_SITUACAO: Record<SituacaoEscritorio, string> = {
  teste: "Teste grátis",
  ativo: "Assinatura em dia",
  tolerancia: "Pagamento em atraso",
  leitura: "Modo leitura",
  suspenso: "Conta suspensa",
};

// O anual sai por 10 meses (2 meses grátis).
export function precoDo(plano: Plano, periodo: Periodo) {
  return periodo === "anual" ? plano.preco * 10 : plano.preco;
}

export function planoPorId(id: string | null | undefined) {
  return PLANOS.find((p) => p.id === id) ?? null;
}

// Módulos liberados: no teste vale tudo do Profissional (RG-1); depois, os do plano pago.
export function modulosLiberados(plano: string): ModuloId[] {
  if (plano === "trial") return planoPorId("profissional")!.modulos;
  return planoPorId(plano)?.modulos ?? planoPorId("profissional")!.modulos;
}

export const podeCriar = (s: SituacaoEscritorio) => s === "teste" || s === "ativo" || s === "tolerancia";

// AAAA-MM-DD somando dias.
export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Fim do período pago a partir do vencimento: +1 mês ou +1 ano, menos 1 dia.
export function fimDoPeriodo(vencimento: string, periodo: Periodo) {
  const d = new Date(`${vencimento}T12:00:00Z`);
  if (periodo === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
