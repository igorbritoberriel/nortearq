// Máscaras dos campos de documento e telefone: a pontuação entra sozinha enquanto a pessoa digita.
// Só visual: o servidor continua guardando só os números (CPF, CNPJ e WhatsApp).
// Nenhuma máscara acrescenta pontuação no fim, para o "apagar" funcionar normalmente.

const soDigitos = (v: string) => v.replace(/\D/g, "");

// CPF 000.000.000-00 ou CNPJ 00.000.000/0000-00, decidido pela quantidade de números.
export function mascaraDocumento(valor: string) {
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

// (11) 91234-5678, (11) 3456-7890 ou +55 (11) 91234-5678.
export function mascaraTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 13);
  if (d.length > 11) return `+${d.slice(0, d.length - 11)} ${mascaraTelefone(d.slice(-11))}`;
  if (d.length <= 2) return d ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;
  if (numero.length <= 8) return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
  return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
}

// CAU: A123456-7 (letra + números, o último é o dígito). Outros registros (CREA) ficam como digitados.
export function mascaraRegistro(valor: string) {
  const v = valor.trimStart();
  const cau = /^([A-Za-z])[\s.-]*([\d\s.-]*)$/.exec(v);
  if (!cau) return valor;
  const d = soDigitos(cau[2]).slice(0, 8);
  const letra = cau[1].toUpperCase();
  return d.length >= 2 ? `${letra}${d.slice(0, -1)}-${d.slice(-1)}` : `${letra}${d}`;
}

export const MASCARAS = {
  documento: mascaraDocumento,
  telefone: mascaraTelefone,
  registro: mascaraRegistro,
} as const;

export type TipoMascara = keyof typeof MASCARAS;
