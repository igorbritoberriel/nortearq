"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { avisarAditivoRespondido, avisarEtapaRespondida } from "@/lib/avisos";
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

// Aditivo (RN-03.15): o cliente aprova ou recusa (motivo obrigatório), registrado com data, hora e IP.
const MENSAGENS_ADITIVO: Record<string, string> = {
  aditivo_respondido: "Este aditivo já foi respondido.",
  motivo_obrigatorio: "Conte o motivo da recusa.",
  link_invalido: "Este link não vale mais. Peça um link novo ao escritório.",
};

export async function responderAditivo(
  token: string,
  aditivoId: string,
  decisao: "aprovado" | "recusado",
  motivo: string,
): Promise<{ ok: true } | { erro: string }> {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { erro: MENSAGENS_ADITIVO.link_invalido };
  if (decisao === "recusado" && !motivo.trim()) return { erro: MENSAGENS_ADITIVO.motivo_obrigatorio };

  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O banco ainda não está ligado." };
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? null;

  const { error } = await supabase.rpc("responder_aditivo", {
    p_token: token,
    p_aditivo: aditivoId,
    p_decisao: decisao,
    p_motivo: motivo,
    p_ip: ip,
  });
  if (error) {
    console.error("[aditivo] responder", error.message);
    const chave = Object.keys(MENSAGENS_ADITIVO).find((k) => error.message.includes(k));
    return { erro: chave ? MENSAGENS_ADITIVO[chave] : "Não foi possível registrar agora. Tente de novo." };
  }
  after(() => avisarAditivoRespondido(aditivoId));
  return { ok: true };
}
