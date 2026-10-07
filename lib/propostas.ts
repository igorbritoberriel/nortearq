import { lerNumero, dataValida } from "./formatacao";
// Propostas (módulo 01, RN-01.6 a RN-01.11): tipos, rótulos e cálculos.

export type StatusProposta = "rascunho" | "enviada" | "aprovada" | "ajuste_pedido" | "recusada" | "substituida";
export type ModoPagamento = "manual" | "parcelado";
export type TipoDeslocamento = "incluido" | "fixo" | "km" | "reembolso";
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
  modo_pagamento: ModoPagamento;
  entrada_pct: number | null;
  parcelas_max: number | null;
  desconto_avista_pct?: number | null; // 0021: desconto para pagamento à vista
  avista?: boolean; // o cliente escolheu à vista
  modelo_origem?: string | null; // 0023: de qual modelo a proposta começou
  modelo_aplicado_em?: string | null;
  enviada_por?: string | null; // 0025
  parcelas_escolhidas: number | null;
  forma_pagamento: string | null;
  prazo: string | null;
  revisoes_incluidas: number;
  visitas_incluidas: number;
  nao_incluido: string | null;
  deslocamento_tipo: TipoDeslocamento;
  deslocamento_valor: number | null;
  deslocamento_cidade: string | null;
  deslocamento_obs: string | null;
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

// Visitas fora da cidade-sede: como o deslocamento é cobrado.
export const TIPOS_DESLOCAMENTO: Record<TipoDeslocamento, string> = {
  incluido: "Incluído nos honorários",
  fixo: "Taxa fixa por visita",
  km: "Valor por km rodado",
  reembolso: "Reembolso das despesas",
};

// Mesma regra da cláusula do contrato (função texto_deslocamento, migração 0011), em palavras para o cliente.
export function textoDeslocamento(
  p: Pick<ConteudoProposta, "deslocamento_tipo" | "deslocamento_valor" | "deslocamento_cidade" | "deslocamento_obs">,
) {
  const obs = p.deslocamento_obs?.trim() ? ` ${p.deslocamento_obs.trim()}` : "";
  if (p.deslocamento_tipo === "incluido") return `As despesas de deslocamento para as visitas estão incluídas nos honorários.${obs}`;
  const cidade = p.deslocamento_cidade?.trim();
  const inicio = cidade
    ? `Nas visitas dentro de ${cidade}, o deslocamento está incluído nos honorários. Nas visitas fora de ${cidade}, `
    : "Em cada visita, ";
  const valor = p.deslocamento_valor ? reais(p.deslocamento_valor) : "[a preencher]";
  const regra =
    p.deslocamento_tipo === "fixo"
      ? `será cobrada uma taxa de deslocamento de ${valor} por visita.`
      : p.deslocamento_tipo === "km"
        ? `será cobrado ${valor} por quilômetro rodado (ida e volta).`
        : "as despesas de deslocamento (combustível, pedágios, passagens, hospedagem e alimentação) serão reembolsadas mediante comprovante.";
  return `${inicio}${regra} O custo previsto de cada visita será informado antes da viagem.${obs}`;
}

export const MOTIVOS_RECUSA: Record<MotivoRecusa, string> = {
  preco: "Preço",
  prazo: "Prazo",
  escopo: "O escopo não era o que eu queria",
  outro_profissional: "Escolhi outro profissional",
  desistiu: "Desisti do projeto por enquanto",
  outro: "Outro motivo",
};

export const COLUNAS_PROPOSTA =
  "id, grupo_id, cliente_id, versao, titulo, escopo, itens, valor_total, parcelas, modo_pagamento, entrada_pct, parcelas_max, desconto_avista_pct, avista, modelo_origem, modelo_aplicado_em, enviada_por, parcelas_escolhidas, forma_pagamento, prazo, revisoes_incluidas, visitas_incluidas, nao_incluido, deslocamento_tipo, deslocamento_valor, deslocamento_cidade, deslocamento_obs, validade_dias, validade_ate, enviada_em, status, comentario_cliente, motivo_recusa, respondida_em, resposta_ip, criado_em, atualizado_em";

// RN-01.8: enviada e vencida aparece como expirada (o banco não muda o status sozinho).
export function statusVisivel(p: { status: StatusProposta; validade_ate: string | null }): StatusProposta | "expirada" {
  if (p.status !== "enviada" || !p.validade_ate) return p.status;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return p.validade_ate < hoje ? "expirada" : "enviada";
}

// Parcelamento escolhido pelo cliente: entrada de X% + saldo em N parcelas iguais.
// Mesmo cálculo do banco (função gerar_parcelas, migração 0012): a última absorve os centavos.
export function gerarParcelas(total: number, pct: number, n: number): Parcela[] {
  const centavos = Math.round(total * 100);
  const entrada = Math.round((centavos * pct) / 100);
  const resto = centavos - entrada;
  const lista: Parcela[] = [];
  if (entrada > 0) lista.push({ descricao: "Entrada, na assinatura do contrato", valor: entrada / 100 });
  if (resto > 0) {
    if (n === 1) {
      lista.push({ descricao: entrada > 0 ? "Saldo, em parcela única" : "Pagamento único, na assinatura do contrato", valor: resto / 100 });
    } else {
      const base = Math.floor(resto / n);
      for (let i = 1; i <= n; i++) {
        lista.push({ descricao: `Parcela ${i} de ${n} (mensal)`, valor: (i === n ? resto - base * (n - 1) : base) / 100 });
      }
    }
  }
  return lista;
}

// Opções que o cliente vê: 1x, 2x... até o máximo aceito pelo escritório.
export function opcoesParcelamento(total: number, pct: number, max: number) {
  const entrada = Math.round(total * pct) / 100;
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const saldo = Math.round((total - entrada) * 100) / 100;
    return { n, entrada, parcela: Math.floor((saldo * 100) / n) / 100 };
  });
}

export function somaParcelas(parcelas: Parcela[]) {
  return Math.round(parcelas.reduce((total, p) => total + (Number(p.valor) || 0), 0) * 100) / 100;
}

// "R$ 15.000,50" → 15000.5. Vazio ou inválido → null.
export function lerReais(texto: string): number | null {
  const n = lerNumero(texto);
  return n !== null && Number.isFinite(n) ? n : null;
}

// Valor à vista com desconto, em centavos exatos (o banco calcula igual: valor_avista).
export function valorAvista(total: number, pct: number) {
  return Math.round(total * (100 - pct)) / 100;
}

export function reais(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "2026-10-16" → "16/10/2026" (data sem fuso).
export function dataCurta(iso: string | null) {
  if (!iso || !dataValida(iso.slice(0, 10))) return "—";
  if (iso.includes("T")) {
    const instante = new Date(iso);
    return Number.isFinite(instante.getTime())
      ? instante.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "\u2014";
  }
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
