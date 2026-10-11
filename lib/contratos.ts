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
  enviado_por?: string | null;
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
  "id, proposta_id, cliente_id, corpo, conteudo, status, enviado_em, enviado_por, assinado_em, aceite_nome, aceite_documento, aceite_endereco, aceite_ip, aceite_navegador, codigo_verificacao, cancelado_em, modelo_id, criado_em";

// Campos automáticos do modelo (RN-01.12): preenchidos pelo banco na hora do aceite.
// No banco o texto guarda {{campo}}; na tela a arquiteta vê e digita [Etiqueta] em português.
export type GrupoCampo = "cliente" | "escritorio" | "proposta";
export const GRUPOS_CAMPO: Record<GrupoCampo, string> = {
  cliente: "Do cliente",
  escritorio: "Do seu escritório",
  proposta: "Da proposta",
};

export const CAMPOS_CONTRATO: { campo: string; etiqueta: string; grupo: GrupoCampo; outros?: string[] }[] = [
  { campo: "{{cliente.nome}}", etiqueta: "Nome do cliente", grupo: "cliente" },
  { campo: "{{cliente.documento}}", etiqueta: "CPF ou CNPJ do cliente", grupo: "cliente", outros: ["CPF do cliente", "CNPJ do cliente"] },
  { campo: "{{cliente.endereco}}", etiqueta: "Endereço do imóvel", grupo: "cliente" },
  { campo: "{{cliente.email}}", etiqueta: "E-mail do cliente", grupo: "cliente" },
  { campo: "{{cliente.telefone}}", etiqueta: "WhatsApp do cliente", grupo: "cliente" },
  { campo: "{{escritorio.nome}}", etiqueta: "Nome do escritório", grupo: "escritorio" },
  { campo: "{{escritorio.documento}}", etiqueta: "CPF ou CNPJ do escritório", grupo: "escritorio", outros: ["CNPJ do escritório", "CPF do escritório"] },
  { campo: "{{escritorio.endereco}}", etiqueta: "Endereço do escritório", grupo: "escritorio" },
  { campo: "{{escritorio.responsavel}}", etiqueta: "Quem assina", grupo: "escritorio" },
  { campo: "{{escritorio.registro}}", etiqueta: "Registro no CAU", grupo: "escritorio", outros: ["Registro no CAU ou CREA", "Registro no CREA", "CAU"] },
  { campo: "{{proposta.escopo}}", etiqueta: "O que foi contratado", grupo: "proposta", outros: ["Escopo"] },
  { campo: "{{proposta.nao_incluido}}", etiqueta: "O que não está incluído", grupo: "proposta" },
  { campo: "{{proposta.prazo}}", etiqueta: "Prazo", grupo: "proposta" },
  { campo: "{{proposta.valor_total}}", etiqueta: "Valor total", grupo: "proposta" },
  { campo: "{{proposta.parcelas}}", etiqueta: "Parcelas", grupo: "proposta" },
  { campo: "{{proposta.forma_pagamento}}", etiqueta: "Observações de pagamento", grupo: "proposta" },
  { campo: "{{proposta.revisoes}}", etiqueta: "Revisões incluídas", grupo: "proposta" },
  { campo: "{{proposta.visitas}}", etiqueta: "Visitas incluídas", grupo: "proposta" },
  { campo: "{{proposta.deslocamento}}", etiqueta: "Regra de deslocamento", grupo: "proposta" },
  { campo: "{{proposta.data_aprovacao}}", etiqueta: "Data da aprovação da proposta", grupo: "proposta" },
  { campo: "{{data}}", etiqueta: "Data do aceite", grupo: "proposta" },
];

const chaveEtiqueta = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const PELA_ETIQUETA = new Map(
  CAMPOS_CONTRATO.flatMap((c) => [c.etiqueta, ...(c.outros ?? [])].map((e) => [chaveEtiqueta(e), c.campo] as const)),
);
// "[a preencher]" é a marca de lacuna que trava o envio do contrato: não é etiqueta, mas também não é erro.
const NAO_E_ETIQUETA = new Set([chaveEtiqueta("a preencher")]);

// {{cliente.nome}} → [Nome do cliente], para mostrar na tela.
export function paraEtiquetas(corpo: string) {
  return CAMPOS_CONTRATO.reduce((t, c) => t.split(c.campo).join(`[${c.etiqueta}]`), corpo);
}

// [Nome do cliente] → {{cliente.nome}}, para guardar. Aceita maiúsculas, acentos e espaços diferentes.
export function paraCampos(texto: string) {
  return texto.replace(/\[([^\[\]\n]{1,60})\]/g, (inteiro, dentro: string) => PELA_ETIQUETA.get(chaveEtiqueta(dentro)) ?? inteiro);
}

// Prévia do modelo "como o cliente vai ler": dados do escritório reais, cliente e proposta de exemplo.
// Cada trecho automático vem marcado para a tela destacar; o que falta preencher vem como "falta".
export type TrechoPrevia = { texto: string; automatico?: boolean; falta?: boolean };
export function previaDoModelo(
  corpo: string,
  e: { nome: string; documento: string | null; endereco: string | null; responsavel: string | null; registro_profissional: string | null },
): TrechoPrevia[] {
  const hoje = new Date();
  const dataCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(hoje);
  const dataLonga = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(hoje);
  const exemplos: Record<string, string | null> = {
    "{{cliente.nome}}": "Mariana Souza",
    "{{cliente.documento}}": "529.982.247-25",
    "{{cliente.endereco}}": "Av. Atlântica, 2000, apto 501, Rio de Janeiro/RJ",
    "{{cliente.email}}": "mariana@exemplo.com",
    "{{cliente.telefone}}": "(21) 98888-7777",
    "{{escritorio.nome}}": e.nome,
    "{{escritorio.documento}}": formatarDocumento(e.documento),
    "{{escritorio.endereco}}": e.endereco,
    "{{escritorio.responsavel}}": e.responsavel,
    "{{escritorio.registro}}": e.registro_profissional,
    "{{proposta.escopo}}": "• Interiores: Projeto de interiores da sala, cozinha e dois quartos.\n  Entregáveis: Planta de layout; Projeto 3D; Detalhamento de marcenaria",
    "{{proposta.nao_incluido}}": "Nada além do descrito na cláusula 1ª.",
    "{{proposta.prazo}}": "60 dias úteis após a validação do briefing",
    "{{proposta.valor_total}}": "R$ 18.000,00",
    "{{proposta.parcelas}}": "• Entrada, na assinatura do contrato: R$ 5.400,00\n• Parcela 1 de 3 (mensal): R$ 4.200,00\n• Parcela 2 de 3 (mensal): R$ 4.200,00\n• Parcela 3 de 3 (mensal): R$ 4.200,00",
    "{{proposta.forma_pagamento}}": "",
    "{{proposta.revisoes}}": "2",
    "{{proposta.visitas}}": "2",
    "{{proposta.deslocamento}}": "As despesas de deslocamento para as visitas estão incluídas nos honorários.",
    "{{proposta.data_aprovacao}}": dataCurta,
    "{{data}}": dataLonga,
  };
  return corpo.split(/(\{\{[a-z_.]+\}\})/g).flatMap((parte): TrechoPrevia[] => {
    if (!(parte in exemplos)) return parte ? [{ texto: parte }] : [];
    const valor = exemplos[parte];
    if (valor === "") return [];
    return valor ? [{ texto: valor, automatico: true }] : [{ texto: "falta preencher", automatico: true, falta: true }];
  });
}

// Textos entre colchetes que não são etiqueta conhecida (ex.: [Nome do clinte]), para avisar antes de salvar.
export function etiquetasDesconhecidas(texto: string) {
  const achadas = [...texto.matchAll(/\[([^\[\]\n]{1,60})\]/g)]
    .map((m) => m[1])
    .filter((d) => /[a-zà-ú]/i.test(d) && !PELA_ETIQUETA.has(chaveEtiqueta(d)) && !NAO_E_ETIQUETA.has(chaveEtiqueta(d)));
  return [...new Set(achadas)];
}

// CPF: 11 números. CNPJ: 14 caracteres; desde julho de 2026 os 12 primeiros podem ter letras (CNPJ
// alfanumérico) e os 2 últimos, os dígitos verificadores, continuam números. Guardado sem pontuação.
export const normalizarDocumento = (valor: string) => valor.toUpperCase().replace(/[^0-9A-Z]/g, "");

// Validação dos dígitos do CPF/CNPJ (o banco confere só o formato). No CNPJ, cada caractere vale o
// código dele menos 48 (0–9 continuam 0–9; A = 17, B = 18…), regra da Receita para o alfanumérico.
export function documentoValido(valor: string) {
  if (!/^[0-9A-Za-z.\/\-\s]+$/.test(valor)) return false;
  const d = normalizarDocumento(valor);
  if (/^(.)\1+$/.test(d)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((s, peso, i) => s + (base.charCodeAt(i) - 48) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  if (/^\d{11}$/.test(d)) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [11, ...p1];
    return digito(d, p1) === Number(d[9]) && digito(d, p2) === Number(d[10]);
  }
  if (/^[0-9A-Z]{12}\d{2}$/.test(d)) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, ...p1];
    return digito(d, p1) === Number(d[12]) && digito(d, p2) === Number(d[13]);
  }
  return false;
}

export function formatarDocumento(valor: string | null) {
  if (!valor) return null;
  const d = normalizarDocumento(valor);
  if (/^\d{11}$/.test(d)) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(.{2})(.{3})(.{3})(.{4})(.{2})/, "$1.$2.$3/$4-$5");
  return valor;
}
