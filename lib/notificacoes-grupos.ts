import type { Notificacao } from "./notificacoes";

// Sem dependências de servidor: usado pelo sininho no navegador.

// Notificações do mesmo item (mesmo link) que chegam em sequência viram um grupo: "Casa Silva · 3 novidades".
export type GrupoNotificacao = { chave: string; principal: Notificacao; ids: string[]; quantidade: number; lida: boolean };

export function agrupar(lista: Notificacao[]): GrupoNotificacao[] {
  const grupos: GrupoNotificacao[] = [];
  const porChave = new Map<string, GrupoNotificacao>();
  for (const n of lista) {
    // Só agrupa as não lidas do mesmo item; lidas ficam uma por linha (é histórico).
    const chave = !n.lida && n.link ? `${n.link}` : n.id;
    const existente = porChave.get(chave);
    if (existente) {
      existente.ids.push(n.id);
      existente.quantidade += 1;
      continue;
    }
    const grupo = { chave, principal: n, ids: [n.id], quantidade: 1, lida: n.lida };
    porChave.set(chave, grupo);
    grupos.push(grupo);
  }
  return grupos;
}
