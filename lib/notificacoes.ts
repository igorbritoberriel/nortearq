import { criarClienteServidor } from "@/lib/supabase/server";

// Notificações do arquiteto: o que o cliente fez (pedido, briefing, proposta, contrato, etapa).

export type TipoNotificacao = "contato" | "briefing" | "proposta" | "contrato" | "etapa";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string | null;
  link: string | null;
  criada_em: string;
  lida_em: string | null;
};

export const CAMPOS_NOTIFICACAO = "id, tipo, titulo, texto, link, criada_em, lida_em";

// Últimas notificações e quantas ainda não foram lidas (carregadas pelo layout do sistema).
export async function carregarNotificacoes(): Promise<{ lista: Notificacao[]; naoLidas: number }> {
  const supabase = await criarClienteServidor();
  if (!supabase) return { lista: [], naoLidas: 0 };
  const [{ data }, { count }] = await Promise.all([
    supabase.from("notificacoes").select(CAMPOS_NOTIFICACAO).order("criada_em", { ascending: false }).limit(20),
    supabase.from("notificacoes").select("id", { count: "exact", head: true }).is("lida_em", null),
  ]);
  return { lista: (data ?? []) as Notificacao[], naoLidas: count ?? 0 };
}
