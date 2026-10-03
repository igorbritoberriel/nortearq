// Clientes (módulo 00) e links sem login enviados por WhatsApp (RG-7).

export type EtapaCliente = "contato" | "briefing" | "proposta" | "contrato" | "projeto" | "obra" | "entregue" | "encerrado";
export type DestinoLink = "briefing" | "proposta" | "contrato" | "projeto";

export type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco_imovel: string | null;
  servicos: string[];
  observacoes: string | null;
  etapa: EtapaCliente;
  contato_id: string | null;
  usuario_id: string | null;
  arquivado_em?: string | null; // 0026
  anonimizado_em?: string | null;
  criado_em: string;
};

export type LinkCliente = {
  token: string;
  destino: DestinoLink;
  criado_em: string;
  expira_em: string;
  usado_em: string | null;
};

export const ETAPAS_CLIENTE: Record<EtapaCliente, string> = {
  contato: "Primeiro contato",
  briefing: "Briefing",
  proposta: "Proposta",
  contrato: "Contrato",
  projeto: "Projeto",
  obra: "Obra",
  entregue: "Entregue",
  encerrado: "Encerrado",
};

export const DESTINOS_LINK: Record<DestinoLink, { rotulo: string; mensagem: (cliente: string, escritorio: string, link: string) => string }> = {
  briefing: {
    rotulo: "Briefing",
    mensagem: (cliente, escritorio, link) =>
      `Olá, ${cliente}! Aqui é do ${escritorio}. Para eu entender bem o seu projeto, responda o briefing por este link: ${link}\n\nLeva uns 15 minutos e dá para parar e continuar depois.`,
  },
  proposta: {
    rotulo: "Proposta",
    mensagem: (cliente, escritorio, link) =>
      `Olá, ${cliente}! Aqui é do ${escritorio}. Sua proposta está pronta: ${link}\n\nPor lá você pode aprovar ou pedir ajustes.`,
  },
  contrato: {
    rotulo: "Contrato",
    mensagem: (cliente, escritorio, link) =>
      `Olá, ${cliente}! Aqui é do ${escritorio}. Seu contrato está pronto para assinatura: ${link}`,
  },
  projeto: {
    rotulo: "Projeto",
    mensagem: (cliente, escritorio, link) =>
      `Olá, ${cliente}! Aqui é do ${escritorio}. Tem uma etapa do seu projeto esperando a sua aprovação: ${link}\n\nPor lá você vê os arquivos e aprova ou pede revisão.`,
  },
};

export function linkDoCliente(site: string, token: string, destino: DestinoLink) {
  return `${site}/c/${token}/${destino}`;
}
