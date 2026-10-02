// Aditivos (RN-03.15, RN-03.16) e aprovações externas (RN-03.17). Migração 0017.

export type StatusAditivo = "enviado" | "aprovado" | "recusado" | "cancelado";

export type Aditivo = {
  id: string;
  numero: number;
  descricao: string;
  valor: number;
  prazo_dias: number;
  revisoes_extras: number;
  visitas_extras: number;
  parcelas: number;
  status: StatusAditivo;
  motivo_recusa: string | null;
  resposta_ip: string | null;
  aprovacao_id: string | null;
  criado_em: string;
  respondido_em: string | null;
};

export const COLUNAS_ADITIVO =
  "id, numero, descricao, valor, prazo_dias, revisoes_extras, visitas_extras, parcelas, status, motivo_recusa, resposta_ip, aprovacao_id, criado_em, respondido_em";

export const STATUS_ADITIVO: Record<StatusAditivo, string> = {
  enviado: "Aguardando o cliente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

export type SituacaoExterna = "em_preparo" | "em_analise" | "exigencia" | "aprovado" | "indeferido";

export const SITUACOES_EXTERNAS: Record<SituacaoExterna, string> = {
  em_preparo: "Em preparação",
  em_analise: "Em análise",
  exigencia: "Com exigência",
  aprovado: "Aprovado",
  indeferido: "Indeferido",
};

export type AprovacaoExterna = {
  id: string;
  orgao: string;
  protocolo: string | null;
  entrada_em: string | null;
  situacao: SituacaoExterna;
  observacao: string | null;
};

// "Revisão extra · +10 dias · 2 parcelas" — resumo do que o aditivo inclui.
export function resumoAditivo(a: Pick<Aditivo, "prazo_dias" | "revisoes_extras" | "visitas_extras" | "parcelas">) {
  return [
    a.prazo_dias > 0 ? `+${a.prazo_dias} ${a.prazo_dias === 1 ? "dia" : "dias"} no prazo` : "sem impacto no prazo",
    a.revisoes_extras > 0 && `+${a.revisoes_extras} ${a.revisoes_extras === 1 ? "revisão" : "revisões"}`,
    a.visitas_extras > 0 && `+${a.visitas_extras} ${a.visitas_extras === 1 ? "visita" : "visitas"}`,
    a.parcelas > 1 ? `em ${a.parcelas} parcelas` : "pagamento único",
  ]
    .filter(Boolean)
    .join(" · ");
}
