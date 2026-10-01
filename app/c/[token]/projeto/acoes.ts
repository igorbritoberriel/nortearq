"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { avisarEtapaRespondida } from "@/lib/avisos";
import { criarClienteServidor } from "@/lib/supabase/server";

// Aprovação de etapa pelo cliente (RN-03.3 a RN-03.5), registrada com data, hora e IP.

const MENSAGENS: Record<string, string> = {
  etapa_respondida: "Esta etapa já foi respondida.",
  comentario_obrigatorio: "Conte o que precisa ser revisado.",
  link_invalido: "Este link não vale mais. Peça um link novo ao escritório.",
};

export async function responderEtapa(
  token: string,
  etapaId: string,
  decisao: "aprovada" | "revisao_pedida",
  comentario: string,
): Promise<{ ok: true; excedeu: boolean } | { erro: string }> {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { erro: MENSAGENS.link_invalido };
  if (decisao === "revisao_pedida" && !comentario.trim()) return { erro: MENSAGENS.comentario_obrigatorio };

  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O banco ainda não está ligado." };
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? null;

  const { data, error } = await supabase.rpc("responder_etapa", {
    p_token: token,
    p_etapa: etapaId,
    p_decisao: decisao,
    p_comentario: comentario,
    p_ip: ip,
  });
  if (error || !data) {
    console.error("[projeto] responder etapa", error?.message);
    const chave = Object.keys(MENSAGENS).find((k) => error?.message.includes(k));
    return { erro: chave ? MENSAGENS[chave] : "Não foi possível registrar agora. Tente de novo." };
  }
  const { excedeu } = data as { excedeu: boolean };
  after(() => avisarEtapaRespondida(etapaId, excedeu));
  return { ok: true, excedeu };
}
