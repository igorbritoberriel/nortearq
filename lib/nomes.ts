// Nomes sem repetição (etapas, modelos, serviços): o banco não aceita dois iguais no mesmo lugar,
// sem diferenciar maiúsculas (migração 0032). Aqui sugerimos o próximo livre: "Anteprojeto (2)".

const normalizar = (nome: string) => nome.trim().toLowerCase();

export function nomeLivre(base: string, existentes: string[]) {
  const usados = new Set(existentes.map(normalizar));
  const limpo = base.trim();
  if (!usados.has(normalizar(limpo))) return limpo;
  const raiz = limpo.replace(/\s*\(\d+\)$/, "");
  for (let n = 2; n < 1000; n++) {
    const candidato = `${raiz} (${n})`;
    if (!usados.has(normalizar(candidato))) return candidato;
  }
  return `${raiz} (${Date.now()})`;
}

// Erro de valor repetido do Postgres (unique_violation).
export const ehRepetido = (erro: { code?: string } | null | undefined) => erro?.code === "23505";

export const mensagemNomeRepetido = (o: string, nome: string, sugestao: string) =>
  `Já existe ${o} chamad${o.startsWith("uma") ? "a" : "o"} "${nome.trim()}". Use outro nome, por exemplo "${sugestao}".`;
