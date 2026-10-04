// Pix copia e cola (BR Code estático, padrão EMV do Banco Central) para o cliente pagar uma parcela.
// O dinheiro vai direto para a chave do escritório; o NorteArq não intermedeia nada.

export type TipoPix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
export type DadosPix = { tipo: TipoPix; chave: string; nome: string; cidade: string };

export const TIPOS_PIX: Record<TipoPix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Celular",
  aleatoria: "Chave aleatória",
};

// Sem acento e só os caracteres que o padrão aceita (bancos recusam o resto).
function limpar(texto: string, max: number) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

// Chave no formato que o Banco Central exige para cada tipo. null = chave inválida.
export function normalizarChave(tipo: TipoPix, chave: string): string | null {
  const c = chave.trim();
  const digitos = c.replace(/\D/g, "");
  if (tipo === "cpf") return digitos.length === 11 ? digitos : null;
  if (tipo === "cnpj") return digitos.length === 14 ? digitos : null;
  if (tipo === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && c.length <= 77 ? c.toLowerCase() : null;
  if (tipo === "telefone") {
    const n = digitos.replace(/^55(?=\d{10,11}$)/, "");
    return n.length === 10 || n.length === 11 ? `+55${n}` : null;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c) ? c.toLowerCase() : null;
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Código "copia e cola" com o valor da parcela já preenchido.
export function pixCopiaECola(dados: DadosPix, valor: number, descricao?: string) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", dados.chave) + (descricao ? campo("02", limpar(descricao, 40)) : "");
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(dados.nome, 25) || "RECEBEDOR") +
    campo("60", limpar(dados.cidade, 15) || "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}
