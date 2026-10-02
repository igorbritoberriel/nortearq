// Projeto e aprovações (módulo 03): tipos, rótulos e regras de exibição.

export type StatusEtapa = "pendente" | "em_andamento" | "aguardando_aprovacao" | "revisao" | "aprovada";
export type DecisaoEtapa = "aprovada" | "revisao_pedida";

export type ArquivoProjeto = {
  id: string;
  nome: string;
  versao: number;
  caminho: string;
  tipo: string | null;
  tamanho: number | null;
  criado_em: string;
  visivel_cliente?: boolean;
};

export type EtapaPublica = {
  id: string;
  nome: string;
  ordem: number;
  status: StatusEtapa;
  prazo: string | null;
  enviada_em: string | null;
  aprovada_em: string | null;
  arquivos: ArquivoProjeto[];
  historico: { decisao: DecisaoEtapa; comentario: string | null; em: string }[];
};

export type ProjetoPublico = {
  id: string;
  nome: string;
  revisoes_incluidas: number;
  revisoes_usadas: number;
  etapas: EtapaPublica[];
  // Visão do cliente dos pagamentos do contrato (migração 0015).
  pagamentos?: {
    descricao: string;
    valor: number;
    vencimento: string | null;
    pago_em: string | null;
    recibo_codigo: string | null;
    recibo_numero: number | null;
  }[];
};

export const STATUS_ETAPA: Record<StatusEtapa, string> = {
  pendente: "Não iniciada",
  em_andamento: "Em andamento",
  aguardando_aprovacao: "Aguardando aprovação",
  revisao: "Em revisão",
  aprovada: "Aprovada",
};

// RN-03.13: o limite do plano grátis do Supabase é 50 MB por arquivo (a especificação prevê 200 MB).
export const TAMANHO_MAXIMO_ARQUIVO = 50 * 1024 * 1024;

// "Rev01", "Rev02"... (RN-03.11)
export function rotuloVersao(versao: number) {
  return `Rev${String(versao).padStart(2, "0")}`;
}

// PDF e imagens abrem no navegador; DWG, SKP e outros só baixam (RN-03.13).
export function abreNaTela(tipo: string | null) {
  return !!tipo && (tipo === "application/pdf" || tipo.startsWith("image/"));
}

export function formatarTamanho(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

// Só a versão mais recente de cada arquivo (as anteriores ficam no histórico).
export function versoesAtuais<T extends { nome: string; versao: number }>(arquivos: T[]) {
  const atual = new Map<string, T>();
  for (const a of arquivos) {
    const chave = a.nome.toLowerCase();
    const existente = atual.get(chave);
    if (!existente || a.versao > existente.versao) atual.set(chave, a);
  }
  return [...atual.values()].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}

// Nome seguro para o Storage: sem acentos, espaços ou barras.
export function nomeSeguro(nome: string) {
  const ponto = nome.lastIndexOf(".");
  const base = (ponto > 0 ? nome.slice(0, ponto) : nome)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const extensao = ponto > 0 ? nome.slice(ponto + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return `${base || "arquivo"}${extensao ? `.${extensao}` : ""}`;
}
