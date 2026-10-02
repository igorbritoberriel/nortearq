// Contatos (pedidos de orçamento, módulo 01): rótulos e opções usados no formulário público e no painel.

export type StatusContato = "novo" | "compativel" | "fora_do_perfil" | "a_avaliar" | "convertido" | "encerrado";
export type MotivoEncerramento = "orcamento" | "prazo" | "escopo" | "sem_retorno" | "outro";

export type Contato = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  servicos: string[];
  area_m2: number | null;
  localizacao: string | null;
  orcamento_disponivel: number | null;
  prazo_desejado: string | null;
  inicio_desejado: string | null;
  mensagem: string | null;
  status: StatusContato;
  compativel: boolean | null;
  prazo_apertado: boolean;
  acima_da_faixa: boolean;
  motivo_encerramento: MotivoEncerramento | null;
  observacao_encerramento: string | null;
  visto_em: string | null;
  cliente_id: string | null;
  criado_em: string;
};

export const STATUS_CONTATO: Record<StatusContato, string> = {
  novo: "Novo",
  compativel: "Compatível",
  fora_do_perfil: "Fora do perfil",
  a_avaliar: "A avaliar",
  convertido: "Virou cliente",
  encerrado: "Encerrado",
};

// RN-01.4: encerrar exige motivo.
export const MOTIVOS_ENCERRAMENTO: Record<MotivoEncerramento, string> = {
  orcamento: "Orçamento",
  prazo: "Prazo",
  escopo: "Escopo (não é o meu tipo de projeto)",
  sem_retorno: "Cliente não respondeu",
  outro: "Outro",
};

// Pergunta "quando quer começar?". `meses` é o início mais cedo possível de cada resposta,
// comparado com a próxima data livre do escritório (alerta "prazo apertado", RN-01.2).
export const PRAZOS = [
  { valor: "agora", rotulo: "O quanto antes", meses: 0 },
  { valor: "1-3", rotulo: "Daqui a 1 a 3 meses", meses: 1 },
  { valor: "3-6", rotulo: "Daqui a 3 a 6 meses", meses: 3 },
  { valor: "6+", rotulo: "Daqui a mais de 6 meses", meses: 6 },
  { valor: "nao-sei", rotulo: "Ainda não sei", meses: null },
] as const;

// Classificação feita pelo filtro, para reabrir um contato encerrado.
export function statusDoFiltro(compativel: boolean | null): StatusContato {
  if (compativel === true) return "compativel";
  if (compativel === false) return "fora_do_perfil";
  return "a_avaliar";
}

export function formatarReais(valor: number | null) {
  if (valor === null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// "(22) 99813-4150"
export function formatarWhatsapp(numero: string | null) {
  if (!numero) return null;
  const n = numero.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return numero;
}

// Link wa.me com DDI do Brasil.
export function linkWhatsapp(numero: string, texto?: string) {
  const n = numero.replace(/\D/g, "");
  const comDdi = n.length <= 11 ? `55${n}` : n;
  return `https://wa.me/${comDdi}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
