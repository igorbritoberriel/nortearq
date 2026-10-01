// Briefing detalhado (módulo 02): tipos, rótulos e regras usados pelo cliente e pelo arquiteto.

export type SecaoBriefing = "arquitetura" | "interiores" | "reforma" | "comum";
export type TipoResposta = "texto" | "escolha" | "multipla" | "numero" | "sim_nao" | "foto";
export type StatusBriefing = "pendente" | "em_andamento" | "respondido" | "validado";
export type Ambiente = "sala" | "quarto" | "cozinha" | "banheiro" | "varanda" | "home_office";
export type Estilo =
  | "contemporaneo"
  | "minimalista"
  | "industrial"
  | "classico"
  | "escandinavo"
  | "rustico"
  | "boho"
  | "japandi";

// Cópia da pergunta guardada no briefing (RN-02.12).
export type PerguntaBriefing = {
  id: string;
  secao: SecaoBriefing;
  ambiente: Ambiente | null;
  texto: string;
  ajuda: string | null;
  tipo: TipoResposta;
  opcoes: string[] | null;
};

// Pergunta do modelo do escritório (editor).
export type PerguntaModelo = {
  id: string;
  tipo_briefing: SecaoBriefing;
  ambiente: Ambiente | null;
  texto: string;
  ajuda: string | null;
  tipo_resposta: TipoResposta;
  opcoes: string[] | null;
  ativa: boolean;
  ordem: number;
  padrao: boolean;
};

export type ImagemEstilo = { id: string; estilo: Estilo; url: string };

// texto, número, escolha e sim/não: string. Múltipla escolha e fotos: lista.
export type Resposta = string | string[];
export type Respostas = Record<string, Resposta>;

export type BriefingPublico = {
  id: string;
  status: StatusBriefing;
  tipos: SecaoBriefing[];
  ambientes: Ambiente[];
  perguntas: PerguntaBriefing[];
  respostas: Respostas;
  estilos: ImagemEstilo[];
  curtidos: string[];
  rejeitados: string[];
};

export const SECOES: Record<SecaoBriefing, { titulo: string; descricao: string }> = {
  arquitetura: { titulo: "Sua casa", descricao: "Quem mora, quantos cômodos e o que não pode faltar." },
  interiores: { titulo: "Ambientes", descricao: "Escolha os ambientes do projeto e conte como quer cada um." },
  reforma: { titulo: "Reforma", descricao: "O que muda, como está hoje e o que é prioridade." },
  comum: { titulo: "Rotina e referências", descricao: "Como você vive, quanto quer investir e o que te inspira." },
};

// Ordem em que os blocos aparecem para o cliente.
export const ORDEM_SECOES: SecaoBriefing[] = ["arquitetura", "interiores", "reforma", "comum"];

export const AMBIENTES: Record<Ambiente, string> = {
  sala: "Sala",
  quarto: "Quarto",
  cozinha: "Cozinha",
  banheiro: "Banheiro",
  varanda: "Varanda",
  home_office: "Home office",
};

export const ESTILOS: Record<Estilo, string> = {
  contemporaneo: "Contemporâneo",
  minimalista: "Minimalista",
  industrial: "Industrial",
  classico: "Clássico",
  escandinavo: "Escandinavo",
  rustico: "Rústico",
  boho: "Boho",
  japandi: "Japandi",
};

export const TIPOS_RESPOSTA: Record<TipoResposta, string> = {
  texto: "Texto",
  escolha: "Escolha única",
  multipla: "Múltipla escolha",
  numero: "Número",
  sim_nao: "Sim ou não",
  foto: "Fotos",
};

export const STATUS_BRIEFING: Record<StatusBriefing, string> = {
  pendente: "Enviado, não aberto",
  em_andamento: "Respondendo",
  respondido: "Respondido",
  validado: "Validado",
};

// RN-02.5 e RN-02.6
export const MINIMO_IMAGENS_QUIZ = 12;
export const MAXIMO_FOTOS = 20;
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;
export const TIPOS_ARQUIVO_BRIEFING: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function respondida(valor: Resposta | undefined) {
  if (Array.isArray(valor)) return valor.length > 0;
  return typeof valor === "string" && valor.trim() !== "";
}

// Texto da resposta para o Perfil do Cliente (fotos são mostradas à parte).
export function formatarResposta(pergunta: Pick<PerguntaBriefing, "tipo">, valor: Resposta | undefined) {
  if (!respondida(valor)) return null;
  if (Array.isArray(valor)) return valor.join(", ");
  if (pergunta.tipo === "sim_nao") return valor === "sim" ? "Sim" : "Não";
  return valor as string;
}

export function ehPdf(caminho: string) {
  return caminho.endsWith(".pdf");
}
