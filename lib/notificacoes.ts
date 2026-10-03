import { criarClienteServidor } from "@/lib/supabase/server";

// Notificações do arquiteto: o que o cliente fez (pedido, briefing, proposta, contrato, etapa).
// Leitura por pessoa (migração 0031): visto (zera o número), lido (sai de "Não lidas"), dispensado (sai da lista).

export type TipoNotificacao = "contato" | "briefing" | "proposta" | "contrato" | "etapa" | "aditivo" | "assinatura";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string | null;
  link: string | null;
  criada_em: string;
  lida: boolean;
};

export const CAMPOS_NOTIFICACAO = "id, tipo, titulo, texto, link, criada_em";

export type Contadores = { naoLidas: number; naoVistas: number };

// Lista (não lidas de qualquer data + lidas dos últimos 30 dias) e contadores, carregados pelo layout do sistema.
export async function carregarNotificacoes(): Promise<{ lista: Notificacao[] } & Contadores> {
  const supabase = await criarClienteServidor();
  if (!supabase) return { lista: [], naoLidas: 0, naoVistas: 0 };
  const [{ data, error }, { data: contadores }] = await Promise.all([
    supabase.rpc("minhas_notificacoes", { p_aba: "todas", p_limite: 60 }),
    supabase.rpc("contadores_notificacoes"),
  ]);
  if (error) console.error("[notificacoes]", error.message);
  const c = (contadores ?? {}) as { nao_lidas?: number; nao_vistas?: number };
  return { lista: (data ?? []) as Notificacao[], naoLidas: c.nao_lidas ?? 0, naoVistas: c.nao_vistas ?? 0 };
}

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
