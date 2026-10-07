import { somarMesesCalendario } from "./formatacao";

export const MEIOS_PAGAMENTO = { pix: "Pix", boleto: "Boleto", cartao: "Cartão de crédito" } as const;
export type MeioPagamento = keyof typeof MEIOS_PAGAMENTO;
export type ParcelaCobranca = {
  id: string; descricao: string; valor: number; vencimento: string | null;
  pago_em: string | null; asaas_cobranca_id?: string | null; asaas_link?: string | null;
  asaas_parcelamento_id?: string | null;
};
export type GrupoCobranca = { parcelas: ParcelaCobranca[]; parcelado: boolean; vencimento: string };

export function planejarCobrancas(
  parcelas: ParcelaCobranca[], meio: MeioPagamento, agruparSaldo: boolean, hoje: string,
): GrupoCobranca[] {
  if (!parcelas.length) throw new Error("Não há parcelas para cobrar.");
  if (parcelas.some((p) => !Number.isFinite(p.valor) || p.valor <= 0)) throw new Error("Confira os valores das parcelas.");
  const grupos: GrupoCobranca[] = [];
  const saldo = parcelas.filter((p) => !/^entrada\b/i.test(p.descricao));
  const primeiroSaldo = saldo[0]?.vencimento ?? hoje;
  const add = (lista: ParcelaCobranca[], parcelado: boolean, vencimento: string) => {
    if (lista.every((p) => p.pago_em)) return;
    if (parcelado && lista.some((p) => p.pago_em) && !lista.some((p) => p.asaas_parcelamento_id))
      throw new Error("O saldo já tem pagamentos. Fale com o escritório antes de mudar a cobrança.");
    if (meio === "cartao" && (lista.length > 12 || lista.some((p) => p.valor < 5)))
      throw new Error("No cartão, use até 12 parcelas de pelo menos R$ 5,00.");
    if (parcelado) {
      // O Asaas divide o total com os centavos na última parcela, igual ao contrato.
      const totalCentavos = lista.reduce((s, p) => s + Math.round(p.valor * 100), 0);
      const base = Math.floor(totalCentavos / lista.length);
      if (lista.some((p, i) => Math.round(p.valor * 100) !== (i === lista.length - 1 ? totalCentavos - base * i : base)))
        throw new Error("Estas parcelas têm valores diferentes. O parcelamento no cartão precisa seguir os valores aprovados.");
    }
    grupos.push({ parcelas: lista, parcelado, vencimento: vencimento < hoje ? hoje : vencimento });
  };
  for (const p of parcelas) {
    if (meio === "cartao" && agruparSaldo && saldo.length > 1 && saldo.includes(p)) continue;
    const indice = saldo.indexOf(p);
    add([p], false, p.vencimento ?? (indice >= 0 ? somarMesesCalendario(primeiroSaldo, indice) : hoje));
  }
  if (meio === "cartao" && agruparSaldo && saldo.length > 1) add(saldo, true, primeiroSaldo);
  return grupos;
}

export type ResumoPagamento = {
  contrato_id: string; status: string; meio: MeioPagamento | null; meios: MeioPagamento[]; cobranca_ativa: boolean;
  modo: string;
  condicoes: { descricao: string; valor: number }[];
  parcelas: { id: string; descricao: string; valor: number; vencimento: string | null; pago_em: string | null;
    link: string | null; status: string | null; parcelamento: string | null }[];
};
