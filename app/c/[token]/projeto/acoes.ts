"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { nomeParaBaixar } from "@/lib/arquivos";
import { avisarAditivoRespondido, avisarEtapaRespondida } from "@/lib/avisos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
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

// Baixar o original com o nome certo. O banco confere que o arquivo é deste projeto e já foi enviado ao cliente.
export async function baixarArquivoCliente(token: string, arquivoId: string): Promise<{ url: string } | { erro: string }> {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { erro: MENSAGENS.link_invalido };
  if (!/^[0-9a-f-]{36}$/i.test(arquivoId)) return { erro: "Arquivo não encontrado." };
  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { erro: "O banco ainda não está ligado." };

  const { data, error } = await supabase.rpc("arquivo_do_link", { p_token: token, p_arquivo: arquivoId });
  if (error) return { erro: error.message.includes("link_invalido") ? MENSAGENS.link_invalido : "Arquivo não encontrado." };
  const a = data as { caminho: string; nome: string; versao: number } | null;
  if (!a) return { erro: "Arquivo não encontrado." };
  const { data: assinado } = await admin.storage
    .from("projetos")
    .createSignedUrl(a.caminho, 60 * 5, { download: nomeParaBaixar(a.nome, a.versao) });
  return assinado?.signedUrl ? { url: assinado.signedUrl } : { erro: "Não foi possível baixar agora. Tente de novo." };
}
