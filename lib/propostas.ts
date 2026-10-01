// Propostas (módulo 01, RN-01.6 a RN-01.11): tipos, rótulos e cálculos.

export type StatusProposta = "rascunho" | "enviada" | "aprovada" | "ajuste_pedido" | "recusada" | "substituida";
export type MotivoRecusa = "preco" | "prazo" | "escopo" | "outro_profissional" | "desistiu" | "outro";

export type ItemProposta = { servico: string; escopo: string; entregaveis: string[] };
export type Parcela = { descricao: string; valor: number };

// Conteúdo que o cliente vê.
export type ConteudoProposta = {
  versao: number;
  titulo: string;
  escopo: string | null;
  itens: ItemProposta[];
  valor_total: number | null;
  parcelas: Parcela[];
  forma_pagamento: string | null;
  prazo: string | null;
  revisoes_incluidas: number;
  visitas_incluidas: number;
  nao_incluido: string | null;
  validade_dias: number;
  validade_ate: string | null;
  enviada_em: string | null;
};

export type Proposta = ConteudoProposta & {
  id: string;
  grupo_id: string;
  cliente_id: string;
  status: StatusProposta;
  comentario_cliente: string | null;
  motivo_recusa: MotivoRecusa | null;
  respondida_em: string | null;
  resposta_ip: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type PropostaPublica = ConteudoProposta & {
  id: string;
  status: StatusProposta;
  expirada: boolean;
  respondida_em: string | null;
  comentario_cliente: string | null;
};

export const STATUS_PROPOSTA: Record<StatusProposta | "expirada", string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  ajuste_pedido: "Ajuste pedido",
  recusada: "Recusada",
  substituida: "Substituída",
  expirada: "Expirada",
};

export const MOTIVOS_RECUSA: Record<MotivoRecusa, string> = {
  preco: "Preço",
  prazo: "Prazo",
  escopo: "O escopo não era o que eu queria",
  outro_profissional: "Escolhi outro profissional",
  desistiu: "Desisti do projeto por enquanto",
  outro: "Outro motivo",
};

export const COLUNAS_PROPOSTA =
  "id, grupo_id, cliente_id, versao, titulo, escopo, itens, valor_total, parcelas, forma_pagamento, prazo, revisoes_incluidas, visitas_incluidas, nao_incluido, validade_dias, validade_ate, enviada_em, status, comentario_cliente, motivo_recusa, respondida_em, resposta_ip, criado_em, atualizado_em";

// RN-01.8: enviada e vencida aparece como expirada (o banco não muda o status sozinho).
export function statusVisivel(p: { status: StatusProposta; validade_ate: string | null }): StatusProposta | "expirada" {
  if (p.status !== "enviada" || !p.validade_ate) return p.status;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return p.validade_ate < hoje ? "expirada" : "enviada";
}

export function somaParcelas(parcelas: Parcela[]) {
  return Math.round(parcelas.reduce((total, p) => total + (Number(p.valor) || 0), 0) * 100) / 100;
}

// "R$ 15.000,50" → 15000.5. Vazio ou inválido → null.
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/g, "");
  if (!limpo) return null;
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/\.(?=\d{3}(\D|$))/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function reais(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "2026-10-16" → "16/10/2026" (data sem fuso).
export function dataCurta(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
