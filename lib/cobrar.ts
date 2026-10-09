import { pixCopiaECola, type DadosPix } from "./pix";
import { dataCurta, reais } from "./propostas";

// Mensagem do "Cobrar no WhatsApp": a mesma no contrato e no Financeiro.
export function mensagemCobranca(p: {
  cliente: string;
  escritorio: string;
  descricao: string;
  valor: number;
  vencimento: string | null;
  link?: string | null;
  pix?: DadosPix | null;
  cobrancaAtiva?: boolean;
}) {
  const primeiroNome = p.cliente.split(" ")[0];
  return `Olá, ${primeiroNome}! Aqui é do ${p.escritorio}. Lembrete da parcela "${p.descricao}" de ${reais(p.valor)}${
    p.vencimento ? `, com vencimento em ${dataCurta(p.vencimento)}` : ""
  }.${
    p.link
      ? `\n\nAcesse o pagamento neste link: ${p.link}`
      : p.pix && !p.cobrancaAtiva
        ? `\n\nPix copia e cola:\n${pixCopiaECola(p.pix, p.valor, p.descricao)}`
        : ""
  }`;
}
