// Entrada brasileira e valores decimais colados de outros sistemas.
// Retorna NaN para texto inválido, evitando confundir erro com campo vazio.
export function lerNumero(texto: string): number | null {
  const v = texto.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (!v) return texto.trim() ? NaN : null;
  let normalizado = v;
  if (v.includes(",")) {
    if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{0,2}$/.test(v)) return NaN;
    normalizado = v.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(v)) {
    normalizado = v.replace(/\./g, "");
  } else if (!/^-?\d+(?:\.\d{1,2})?$/.test(v)) return NaN;
  const n = Number(normalizado);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : NaN;
}

// Datas de calendário: sem conversão de fuso e sem aceitar 31/02.
export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (ano < 1 || mes < 1 || mes > 12 || dia < 1) return false;
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  return dia <= [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

export function somarMesesCalendario(iso: string, meses: number): string {
  if (!dataValida(iso) || !Number.isInteger(meses)) throw new Error("Data inválida.");
  const [ano, mes, dia] = iso.split("-").map(Number);
  const destino = new Date(0);
  destino.setUTCFullYear(ano, mes - 1 + meses, 1);
  const ultimo = new Date(destino);
  ultimo.setUTCMonth(ultimo.getUTCMonth() + 1, 0);
  destino.setUTCDate(Math.min(dia, ultimo.getUTCDate()));
  return destino.toISOString().slice(0, 10);
}
