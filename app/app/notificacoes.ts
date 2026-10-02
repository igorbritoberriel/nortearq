"use server";

import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { CAMPOS_NOTIFICACAO, type Notificacao } from "@/lib/notificacoes";
import { criarClienteServidor } from "@/lib/supabase/server";

// Notificações do arquiteto (sininho). O RLS garante que cada escritório só vê e marca as suas.

async function cliente() {
  const supabase = await criarClienteServidor();
  if (supabase) await obterSessaoArquiteto();
  return supabase;
}

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
  return (data ?? []) as Notificacao[];
}

export async function marcarNotificacaoLida(id: string) {
  const supabase = await cliente();
  if (!supabase || !z.uuid().safeParse(id).success) return;
  await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", id).is("lida_em", null);
}

export async function marcarTodasLidas() {
  const supabase = await cliente();
  if (!supabase) return;
  await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).is("lida_em", null);
}
