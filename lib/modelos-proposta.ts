import type { ItemProposta } from "@/lib/propostas";

// Modelos de proposta (migração 0023): o que se repete entre propostas, por serviço.

export type TipoPreco = "vazio" | "fixo" | "m2";

export const TIPOS_PRECO: Record<TipoPreco, string> = {
  vazio: "Em branco (digito em cada proposta)",
  fixo: "Valor fixo",
  m2: "Valor por m²",
};

// Campos copiados entre proposta e modelo (nos dois sentidos).
export const CAMPOS_CONTEUDO = [
  "titulo",
  "escopo",
  "itens",
  "nao_incluido",
  "prazo",
  "forma_pagamento",
  "revisoes_incluidas",
  "visitas_incluidas",
  "deslocamento_tipo",
  "deslocamento_valor",
  "deslocamento_cidade",
  "deslocamento_obs",
  "modo_pagamento",
  "entrada_pct",
  "parcelas_max",
  "desconto_avista_pct",
  "validade_dias",
] as const;

export type ModeloProposta = {
  id: string;
  nome: string;
  servicos: string[];
  titulo: string | null;
  escopo: string | null;
  itens: ItemProposta[];
  nao_incluido: string | null;
  prazo: string | null;
  forma_pagamento: string | null;
  revisoes_incluidas: number;
  visitas_incluidas: number;
  deslocamento_tipo: string | null;
  deslocamento_valor: number | null;
  deslocamento_cidade: string | null;
  deslocamento_obs: string | null;
  modo_pagamento: string | null;
  entrada_pct: number | null;
  parcelas_max: number | null;
  desconto_avista_pct: number | null;
  validade_dias: number | null;
  preco_tipo: TipoPreco;
  preco_valor: number | null;
  criado_em: string;
};

export const COLUNAS_MODELO = `id, nome, servicos, ${CAMPOS_CONTEUDO.join(", ")}, preco_tipo, preco_valor, criado_em`;

// Valor que o modelo sugere: fixo, ou por m² com a área do pedido de orçamento.
export function valorDoModelo(m: Pick<ModeloProposta, "preco_tipo" | "preco_valor">, areaM2: number | null) {
  if (!m.preco_valor) return null;
  if (m.preco_tipo === "fixo") return Number(m.preco_valor);
  if (m.preco_tipo === "m2" && areaM2) return Math.round(Number(m.preco_valor) * areaM2 * 100) / 100;
  return null;
}

// Proposta nova a partir de um ou mais modelos (ex.: Arquitetura + Interiores numa proposta só).
export function combinarModelos(modelos: ModeloProposta[], areaM2: number | null) {
  const base = modelos[0];
  const nomesItens = new Set<string>();
  const itens: ItemProposta[] = [];
  for (const m of modelos) {
    for (const item of m.itens ?? []) {
      const chave = item.servico.trim().toLowerCase();
      if (nomesItens.has(chave)) continue;
      nomesItens.add(chave);
      itens.push(item);
    }
  }
  const textos = (campo: "nao_incluido" | "escopo") =>
    [...new Set(modelos.map((m) => m[campo]?.trim()).filter((t): t is string => !!t))].join("\n\n") || null;
  const valores = modelos.map((m) => valorDoModelo(m, areaM2)).filter((v): v is number => v !== null);
  const semArea = modelos.some((m) => m.preco_tipo === "m2" && m.preco_valor && !areaM2);

  return {
    conteudo: {
      titulo: modelos.length > 1 ? "Proposta de projeto" : (base.titulo ?? "Proposta de projeto"),
      escopo: textos("escopo"),
      itens: itens.length ? itens : null,
      nao_incluido: textos("nao_incluido"),
      prazo: base.prazo,
      forma_pagamento: base.forma_pagamento,
      revisoes_incluidas: Math.max(...modelos.map((m) => m.revisoes_incluidas ?? 0)),
      visitas_incluidas: Math.max(...modelos.map((m) => m.visitas_incluidas ?? 0)),
      deslocamento_tipo: base.deslocamento_tipo,
      deslocamento_valor: base.deslocamento_valor,
      deslocamento_cidade: base.deslocamento_cidade,
      deslocamento_obs: base.deslocamento_obs,
      modo_pagamento: base.modo_pagamento,
      entrada_pct: base.entrada_pct,
      parcelas_max: base.parcelas_max,
      desconto_avista_pct: base.desconto_avista_pct,
      validade_dias: base.validade_dias,
      valor_total: valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) * 100) / 100 : null,
    },
    origem: modelos.map((m) => m.nome).join(" + ") + (semArea ? " (sem área no pedido: valor por m² não calculado)" : ""),
  };
}

// Tira campos vazios (null) para não apagar padrões da tabela na hora de gravar.
export function semNulos<T extends Record<string, unknown>>(objeto: T) {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}
