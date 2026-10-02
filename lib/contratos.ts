// Contratos (módulo 01, RN-01.12 a RN-01.16) com aceite eletrônico próprio.

export type StatusContrato = "rascunho" | "aguardando_assinatura" | "assinado" | "cancelado";

export type Contrato = {
  id: string;
  proposta_id: string;
  cliente_id: string;
  corpo: string;
  conteudo: string;
  status: StatusContrato;
  enviado_em: string | null;
  assinado_em: string | null;
  aceite_nome: string | null;
  aceite_documento: string | null;
  aceite_endereco: string | null;
  aceite_ip: string | null;
  aceite_navegador: string | null;
  codigo_verificacao: string | null;
  cancelado_em: string | null;
  modelo_id: string | null;
  criado_em: string;
};

export type ContratoPublico = {
  status: StatusContrato;
  texto: string;
  nome: string;
  documento: string | null;
  endereco: string | null;
  assinado_em: string | null;
  aceite_nome: string | null;
  codigo_verificacao: string | null;
};

export type Pagamento = { id: string; descricao: string; valor: number; vencimento: string | null; pago_em: string | null };

export const STATUS_CONTRATO: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

export const COLUNAS_CONTRATO =
  "id, proposta_id, cliente_id, corpo, conteudo, status, enviado_em, assinado_em, aceite_nome, aceite_documento, aceite_endereco, aceite_ip, aceite_navegador, codigo_verificacao, cancelado_em, modelo_id, criado_em";

// Campos automáticos do modelo (RN-01.12): preenchidos pelo banco na hora do aceite.
export const CAMPOS_CONTRATO: { campo: string; descricao: string }[] = [
  { campo: "{{cliente.nome}}", descricao: "Nome completo do cliente" },
  { campo: "{{cliente.documento}}", descricao: "CPF ou CNPJ do cliente" },
  { campo: "{{cliente.endereco}}", descricao: "Endereço do imóvel" },
  { campo: "{{cliente.email}}", descricao: "E-mail do cliente" },
  { campo: "{{cliente.telefone}}", descricao: "WhatsApp do cliente" },
  { campo: "{{escritorio.nome}}", descricao: "Nome do escritório" },
  { campo: "{{escritorio.documento}}", descricao: "CPF ou CNPJ do escritório" },
  { campo: "{{escritorio.endereco}}", descricao: "Endereço do escritório" },
  { campo: "{{escritorio.responsavel}}", descricao: "Quem assina pelo escritório" },
  { campo: "{{escritorio.registro}}", descricao: "Registro no CAU ou CREA" },
  { campo: "{{proposta.escopo}}", descricao: "Serviços, escopo e entregáveis" },
  { campo: "{{proposta.nao_incluido}}", descricao: "O que não está incluído" },
  { campo: "{{proposta.prazo}}", descricao: "Prazo" },
  { campo: "{{proposta.valor_total}}", descricao: "Valor total" },
  { campo: "{{proposta.parcelas}}", descricao: "Lista de parcelas" },
  { campo: "{{proposta.forma_pagamento}}", descricao: "Observações de pagamento" },
  { campo: "{{proposta.revisoes}}", descricao: "Revisões incluídas" },
  { campo: "{{proposta.visitas}}", descricao: "Visitas incluídas" },
  { campo: "{{proposta.deslocamento}}", descricao: "Regra de deslocamento das visitas" },
  { campo: "{{proposta.data_aprovacao}}", descricao: "Data em que o cliente aprovou a proposta" },
  { campo: "{{data}}", descricao: "Data do aceite, por extenso" },
];

// Validação dos dígitos do CPF/CNPJ (o banco confere só o tamanho).
export function documentoValido(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((s, peso, i) => s + Number(base[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  if (d.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [11, ...p1];
    return digito(d, p1) === Number(d[9]) && digito(d, p2) === Number(d[10]);
  }
  if (d.length === 14) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, ...p1];
    return digito(d, p1) === Number(d[12]) && digito(d, p2) === Number(d[13]);
  }
  return false;
}

export function formatarDocumento(valor: string | null) {
  if (!valor) return null;
  const d = valor.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return valor;
}
