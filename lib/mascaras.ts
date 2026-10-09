// Máscaras dos campos de documento e telefone: a pontuação entra sozinha enquanto a pessoa digita.
// Só visual: o servidor continua guardando só os números (CPF, CNPJ e WhatsApp).
// Nenhuma máscara acrescenta pontuação no fim, para o "apagar" funcionar normalmente.

const soDigitos = (v: string) => v.replace(/\D/g, "");

// CPF 000.000.000-00 ou CNPJ 00.000.000/0000-00, decidido pela quantidade de números.
export function mascaraDocumento(valor: string) {
  const d = soDigitos(valor).slice(0, 14);
  const grupos = d.length <= 11 ? [3, 3, 3, 2] : [2, 3, 3, 4, 2];
  const separadores = d.length <= 11 ? [".", ".", "-"] : [".", ".", "/", "-"];
  let resultado = "", inicio = 0;
  for (let i = 0; i < grupos.length && inicio < d.length; i++) {
    if (i) resultado += separadores[i - 1];
    resultado += d.slice(inicio, inicio + grupos[i]);
    inicio += grupos[i];
  }
  return resultado;
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

// A vírgula separa os centavos; digitar 1500 significa 1.500 reais.
export function mascaraDinheiro(valor: string, pontoDecimal = true): string {
  let v = valor.replace(/^R\$\s*/, "").replace(/[^\d.,]/g, "");
  // Preserva pontos de milhares; aceita também ponto decimal sem multiplicar o valor.
  if (pontoDecimal && !v.includes(",") && !/^\d{1,3}(?:\.\d{3})+$/.test(v)) {
    v = v.replace(/^(\d+|\d{1,3}(?:\.\d{3})+)\.(\d{0,2})$/, "$1,$2");
  }
  const [inteiro, ...decimal] = v.split(",");
  const d = inteiro.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!d && !decimal.length) return "";
  const parte = (d || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parte + (decimal.length ? "," + decimal.join("").replace(/\D/g, "").slice(0, 2) : "");
}

// Ao finalizar a edição, todos os campos monetários exibem os dois centavos.
export function finalizarDinheiro(valor: string): string {
  const v = mascaraDinheiro(valor);
  if (!v) return "";
  const [inteiro, centavos = ""] = v.split(",");
  return `${inteiro},${centavos.padEnd(2, "0")}`;
}

export const MASCARAS = {
  dinheiro: mascaraDinheiro,
  documento: mascaraDocumento,
  telefone: mascaraTelefone,
  registro: mascaraRegistro,
} as const;

export type TipoMascara = keyof typeof MASCARAS;
