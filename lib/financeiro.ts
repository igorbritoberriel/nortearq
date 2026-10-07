import { dataValida, somarMesesCalendario } from "./formatacao";

export const CATEGORIAS_DESPESA = { fornecedor: "Fornecedor", servico: "Serviço contratado", escritorio: "Escritório", software: "Software e assinatura", deslocamento: "Deslocamento", imposto: "Imposto e taxa", outros: "Outros" } as const;
export type CategoriaDespesa = keyof typeof CATEGORIAS_DESPESA;
export type Recebivel = { id: string; contratoId: string; cliente: string; projeto: string; descricao: string; valor: number; vencimento: string | null; pagoEm: string | null; forma: string | null; asaas: boolean; checkout: boolean };
export type Despesa = { id: string; descricao: string; fornecedor: string | null; categoria: CategoriaDespesa; valor: number; vencimento: string; pago_em: string | null; observacao: string | null };
export type SaldoAsaas = { ativo: boolean; teste: boolean; saldo: number | null; aLiberar: number | null; taxas: number | null; erro: boolean; atualizadoEm: string | null };
export type DadosFinanceiro = { mes: string; hoje: string; recebiveis: Recebivel[]; despesas: Despesa[]; asaas: SaldoAsaas; podeEditar: boolean; somenteLeitura: boolean };
export type SituacaoRecebivel = "pago" | "atraso" | "pendente";
export const centavos = (n: number) => Math.round(n * 100);
export const somaValores = (valores: number[]) => valores.reduce((s, n) => s + centavos(n), 0) / 100;
export function mesValido(mes: string | undefined, hoje: string) {
  return mes && /^\d{4}-\d{2}$/.test(mes) && dataValida(`${mes}-01`) && Number(mes.slice(0, 4)) >= 2000 && Number(mes.slice(0, 4)) <= 2100 ? mes : hoje.slice(0, 7);
}
export function intervaloMes(mes: string) {
  const inicio = `${mes}-01`;
  const seguinte = somarMesesCalendario(inicio, 1);
  return { inicio, fim: new Date(new Date(`${seguinte}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10) };
}
export function situacaoRecebivel(p: Recebivel, hoje: string): SituacaoRecebivel {
  return p.pagoEm ? "pago" : p.vencimento && p.vencimento < hoje ? "atraso" : "pendente";
}
// Pendências continuam visíveis até o pagamento, mesmo se venceram em outro mês.
export function despesasDoPeriodo(despesas: Despesa[], mes: string) {
  return despesas.filter(d => !d.pago_em || d.pago_em.startsWith(mes));
}
export function resumoFinanceiro(recebiveis: Recebivel[], despesas: Despesa[], mes: string, hoje: string) {
  const pendentes = recebiveis.filter(p => !p.pagoEm);
  const atrasadas = pendentes.filter(p => situacaoRecebivel(p, hoje) === "atraso");
  return { recebido: somaValores(recebiveis.filter(p => p.pagoEm?.startsWith(mes)).map(p => p.valor)), aReceber: somaValores(pendentes.map(p => p.valor)), emAtraso: somaValores(atrasadas.map(p => p.valor)), parcelasAtrasadas: atrasadas.length, despesas: somaValores(despesas.filter(d => d.pago_em?.startsWith(mes)).map(d => d.valor)) };
}
export function serieFinanceiro(recebiveis: Recebivel[], despesas: Despesa[], mes: string) {
  return Array.from({ length: 5 }, (_, i) => {
    const periodo = somarMesesCalendario(`${mes}-01`, i - 4).slice(0, 7);
    return { mes: periodo, entradas: somaValores(recebiveis.filter(p => p.pagoEm?.startsWith(periodo)).map(p => p.valor)), saidas: somaValores(despesas.filter(d => d.pago_em?.startsWith(periodo)).map(d => d.valor)) };
  });
}
