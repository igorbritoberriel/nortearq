// Arquivos do projeto: tipo (prancha, render...), formato de exibição e nome para baixar.
// Usado no servidor e no navegador (sem dependências).

export type Categoria = "prancha" | "render" | "documento" | "outro";

export const CATEGORIAS: Record<Categoria, string> = {
  prancha: "Prancha técnica",
  render: "Render 3D",
  documento: "Documento",
  outro: "Outro",
};

// Tipos de arquivo de etapa. Render 3D não entra: os renders ficam no espaço próprio do projeto (migração 0040).
export const CATEGORIAS_ETAPA: Exclude<Categoria, "render">[] = ["prancha", "documento", "outro"];

export function extensao(nome: string) {
  const ponto = nome.lastIndexOf(".");
  return ponto > 0 ? nome.slice(ponto + 1).toLowerCase() : "";
}

// Desenho técnico exportado em imagem (planta humanizada, layout, corte...) é prancha, não render.
const NOME_DE_PRANCHA = /planta|layout|corte|eleva[cç][aã]o|detalhamento|prancha|humanizad|implanta[cç][aã]o|pagina[cç][aã]o|forro/i;

// Sugestão ao enviar um arquivo na etapa (o arquiteto troca com um clique).
export function sugerirCategoria(nome: string): Categoria {
  const ext = extensao(nome);
  if (["pdf", "dwg", "dxf", "skp", "rvt", "ifc", "pln"].includes(ext)) return "prancha";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return NOME_DE_PRANCHA.test(nome) ? "prancha" : "outro";
  if (["doc", "docx", "xls", "xlsx", "odt", "ods", "txt", "csv"].includes(ext)) return "documento";
  return "outro";
}

// Como o visualizador mostra o arquivo (RN-03.13). HEIC e outros formatos só baixam.
export type Formato = "imagem" | "pdf" | "outro";

export function formatoDe(nome: string, tipo: string | null): Formato {
  const ext = extensao(nome);
  if (tipo === "application/pdf" || ext === "pdf") return "pdf";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(tipo ?? "") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return "imagem";
  }
  return "outro";
}

// "Planta baixa.pdf", versão 2 → "Planta baixa - Rev02.pdf"
export function nomeParaBaixar(nome: string, versao: number) {
  const ext = extensao(nome);
  const base = ext ? nome.slice(0, -(ext.length + 1)) : nome;
  return `${base} - Rev${String(versao).padStart(2, "0")}${ext ? `.${ext}` : ""}`;
}

// "12,4 GB" (espaço do plano)
export function formatarEspaco(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
  return `${Math.round(bytes / 1024 ** 2).toLocaleString("pt-BR")} MB`;
}

// Renders do projeto (migração 0040): espaço próprio, fora das etapas, até 12 imagens.
export const LIMITE_RENDERS = 12;
export const ETAPA_RENDERS = "renders"; // etapa_id "de mentira" dos renders no visualizador
export const ehImagemDeRender = (nome: string, tipo: string | null) =>
  ["image/jpeg", "image/png", "image/webp"].includes(tipo ?? "") || ["jpg", "jpeg", "png", "webp"].includes(extensao(nome));

// Endereços temporários (bucket privado) de vários caminhos de uma vez.
type Assinador = {
  createSignedUrls: (caminhos: string[], segundos: number) => Promise<{ data: { path: string | null; signedUrl: string | null }[] | null }>;
};

export async function assinarCaminhos(bucket: Assinador, caminhos: (string | null | undefined)[], segundos = 60 * 60) {
  const lista = [...new Set(caminhos.filter((c): c is string => !!c))];
  const urls: Record<string, string> = {};
  if (!lista.length) return urls;
  const { data } = await bucket.createSignedUrls(lista, segundos);
  for (const a of data ?? []) if (a.path && a.signedUrl) urls[a.path] = a.signedUrl;
  return urls;
}

// Arquivo como os componentes de lista e visualizador recebem (arquiteto e cliente).
export type ArquivoVisivel = {
  id: string;
  nome: string;
  versao: number;
  tipo: string | null;
  tamanho: number | null;
  criado_em: string;
  categoria: Categoria;
  etapa_id: string;
  etapa: string; // nome da etapa
  url: string | null; // original (abrir em nova aba)
  miniatura: string | null;
  previa: string | null;
  visivel?: boolean; // só no sistema do arquiteto (o cliente só recebe os visíveis)
  enviado?: boolean; // só no sistema do arquiteto: já foi para o cliente no último envio da etapa
};
