import type { SupabaseClient } from "@supabase/supabase-js";

// Pagamentos protegidos (migração 0015): baixa definitiva, estorno com motivo só pelo dono,
// histórico imutável e recibo com número e código público (/r/[codigo]).

export type FormaPagamento = "pix" | "transferencia" | "boleto" | "cartao" | "dinheiro" | "outro" | "nao_informada";

export const FORMAS_PAGAMENTO: Record<Exclude<FormaPagamento, "nao_informada">, string> = {
  pix: "Pix",
  transferencia: "Transferência",
  boleto: "Boleto",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export function rotuloForma(forma: FormaPagamento | null) {
  if (!forma || forma === "nao_informada") return "forma não informada";
  return FORMAS_PAGAMENTO[forma];
}

export type EventoPagamento = {
  id: string;
  pagamento_id: string;
  tipo: "baixa" | "estorno";
  pago_em: string | null;
  forma: FormaPagamento | null;
  observacao: string | null;
  motivo: string | null;
  recibo_numero: number | null;
  recibo_codigo: string | null;
  estornado_em: string | null;
  feito_por_nome: string | null;
  criado_em: string;
};

export type PagamentoComBaixa = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string | null;
  pago_em: string | null;
  baixa: EventoPagamento | null;
  // Cobrança integrada (0038)
  asaas_link?: string | null;
  asaas_status?: string | null;
  asaas_valor_liquido?: number | null;
  taxa_plataforma?: number | null;
};

// Parcelas do contrato em ordem (Entrada, 1, 2, 3...) com a baixa em vigor e o histórico completo.
export async function carregarPagamentos(supabase: SupabaseClient, contratoId: string) {
  const { data: linhas } = await supabase
    .from("pagamentos")
    .select("id, descricao, valor, vencimento, pago_em, baixa_id, ordem, asaas_link, asaas_status, asaas_valor_liquido, taxa_plataforma")
    .eq("contrato_id", contratoId)
    .order("ordem")
    .order("descricao");
  const pagamentos = linhas ?? [];
  const { data: eventosBrutos } = pagamentos.length
    ? await supabase
        .from("pagamentos_eventos")
        .select(
          "id, pagamento_id, tipo, pago_em, forma, observacao, motivo, recibo_numero, recibo_codigo, estornado_em, feito_por_nome, criado_em",
        )
        .in("pagamento_id", pagamentos.map((p) => p.id))
        .order("criado_em", { ascending: false })
    : { data: [] };
  const eventos = (eventosBrutos ?? []) as EventoPagamento[];
  const porId = new Map(eventos.map((e) => [e.id, e]));

  return {
    pagamentos: pagamentos.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      valor: Number(p.valor),
      vencimento: p.vencimento,
      pago_em: p.pago_em,
      baixa: p.baixa_id ? (porId.get(p.baixa_id) ?? null) : null,
    })) as PagamentoComBaixa[],
    eventos,
  };
}

export function linkDoRecibo(site: string, codigo: string) {
  return `${site}/r/${codigo}`;
}

// Valor por extenso, para o recibo: 1050.5 -> "mil e cinquenta reais e cinquenta centavos".
const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [];
  if (c) partes.push(CENTENAS[c]);
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto]);
  } else {
    partes.push(DEZENAS[Math.floor(resto / 10)] + (resto % 10 ? ` e ${UNIDADES[resto % 10]}` : ""));
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const grupos: [number, string, string][] = [
    [Math.floor(n / 1_000_000) % 1000, "milhão", "milhões"],
    [Math.floor(n / 1000) % 1000, "mil", "mil"],
    [n % 1000, "", ""],
  ];
  const partes = grupos
    .filter(([valor]) => valor > 0)
    .map(([valor, singular, plural]) => {
      if (singular === "mil") return valor === 1 ? "mil" : `${ate999(valor)} mil`;
      if (singular) return `${ate999(valor)} ${valor === 1 ? singular : plural}`;
      return ate999(valor);
    });
  // "mil e cinquenta", "mil e cem", mas "mil duzentos e trinta"
  const ultimo = n % 1000;
  if (partes.length > 1 && (ultimo < 100 || ultimo % 100 === 0)) {
    return `${partes.slice(0, -1).join(" ")} e ${partes[partes.length - 1]}`;
  }
  return partes.join(" ");
}

export function valorPorExtenso(valor: number) {
  const centavosTotais = Math.round(valor * 100);
  const inteiro = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const milhoesRedondos = inteiro >= 1_000_000 && inteiro % 1_000_000 === 0;
  const partes = [];
  if (inteiro) partes.push(`${inteiroPorExtenso(inteiro)}${milhoesRedondos ? " de" : ""} ${inteiro === 1 ? "real" : "reais"}`);
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ") || "zero reais";
}
