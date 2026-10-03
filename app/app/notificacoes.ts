"use server";

import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { CAMPOS_NOTIFICACAO, type Notificacao } from "@/lib/notificacoes";
import { criarClienteServidor } from "@/lib/supabase/server";

// Notificações do arquiteto (sininho). O RLS garante que cada escritório só vê as suas, e a leitura é de cada pessoa.

async function cliente() {
  const supabase = await criarClienteServidor();
  if (supabase) await obterSessaoArquiteto();
  return supabase;
}

const ids = z.array(z.uuid()).min(1).max(200);

// Reserva para quando o aviso em tempo real cair: chamado ao voltar para a aba.
export async function buscarNotificacoesDesde(desde: string): Promise<Notificacao[]> {
  const supabase = await cliente();
  if (!supabase || Number.isNaN(Date.parse(desde))) return [];
  const { data } = await supabase
    .from("notificacoes")
    .select(CAMPOS_NOTIFICACAO)
    .gt("criada_em", desde)
    .order("criada_em", { ascending: false })
    .limit(20);
  return (data ?? []).map((n) => ({ ...n, lida: false })) as Notificacao[];
}

// Abriu o sininho: o número vermelho zera (as novidades continuam destacadas até serem lidas).
export async function marcarNotificacoesVistas() {
  const supabase = await cliente();
  if (supabase) await supabase.rpc("marcar_notificacoes_vistas");
}

export async function marcarNotificacoesLidas(lista: string[]) {
  const supabase = await cliente();
  if (!supabase || !ids.safeParse(lista).success) return;
  await supabase.rpc("marcar_notificacoes_lidas", { p_ids: lista });
}

export async function marcarTodasLidas() {
  const supabase = await cliente();
  if (supabase) await supabase.rpc("marcar_notificacoes_lidas", { p_ids: null });
}

// Entrou na página de um item (projeto, briefing, proposta...): as notificações dele ficam lidas.
export async function lerNotificacoesDoLink(caminho: string): Promise<string[]> {
  const supabase = await cliente();
  if (!supabase || !/^\/app(\/[\w-]+)*$/.test(caminho)) return [];
  const { data } = await supabase.rpc("ler_notificacoes_do_link", { p_link: caminho });
  return (data as string[] | null) ?? [];
}

// X numa notificação (ou grupo); sem ids = "Limpar lidas".
export async function dispensarNotificacoes(lista: string[] | null) {
  const supabase = await cliente();
  if (!supabase || (lista !== null && !ids.safeParse(lista).success)) return;
  await supabase.rpc("dispensar_notificacoes", { p_ids: lista });
}
