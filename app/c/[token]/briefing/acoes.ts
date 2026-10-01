"use server";

import { after } from "next/server";
import { avisarBriefingRespondido } from "@/lib/avisos";
import {
  MAXIMO_FOTOS,
  TAMANHO_MAXIMO_FOTO,
  TIPOS_ARQUIVO_BRIEFING,
  type Respostas,
} from "@/lib/briefing";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

// Briefing respondido pelo cliente no link sem login (/c/[token]/briefing).
// Toda checagem (link válido, briefing aberto, pergunta existe) é feita pelo banco.

type Resultado = { ok: true } | { erro: string };

const TOKEN = /^[0-9a-f]{32,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mensagemDe(erro: string | undefined) {
  if (erro?.includes("briefing_fechado")) return "Este briefing já foi enviado. Fale com o escritório para reabrir.";
  if (erro?.includes("link_invalido")) return "Este link não vale mais. Peça um link novo ao escritório.";
  if (erro?.includes("limite_fotos")) return `Cada pergunta aceita até ${MAXIMO_FOTOS} arquivos.`;
  return "Não foi possível salvar agora. Confira a internet e tente de novo.";
}

export async function salvarBriefing(
  token: string,
  dados: { respostas: Respostas; ambientes: string[]; curtidos: string[]; rejeitados: string[] },
): Promise<Resultado> {
  if (!TOKEN.test(token)) return { erro: mensagemDe("link_invalido") };
  const supabase = await criarClienteServidor();
  if (!supabase) return { ok: true }; // modo esqueleto: nada para salvar

  const { error } = await supabase.rpc("salvar_briefing", {
    p_token: token,
    p_respostas: dados.respostas,
    p_ambientes: dados.ambientes,
    p_curtidos: dados.curtidos.filter((id) => UUID.test(id)),
    p_rejeitados: dados.rejeitados.filter((id) => UUID.test(id)),
  });
  if (error) {
    console.error("[briefing] salvar", error.message);
    return { erro: mensagemDe(error.message) };
  }
  return { ok: true };
}

export async function enviarBriefing(token: string): Promise<Resultado> {
  if (!TOKEN.test(token)) return { erro: mensagemDe("link_invalido") };
  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O banco ainda não está ligado." };

  const { data, error } = await supabase.rpc("enviar_briefing", { p_token: token });
  if (error || !data) {
    console.error("[briefing] enviar", error?.message);
    return { erro: mensagemDe(error?.message) };
  }
  // Aviso ao arquiteto por e-mail depois de responder ao cliente.
  after(() => avisarBriefingRespondido(data as string));
  return { ok: true };
}

// 1º passo do envio de foto: confere o link e devolve uma URL assinada para o navegador subir
// o arquivo direto no Storage (sem passar pelo limite de tamanho das Server Actions).
export async function pedirEnvioFoto(
  token: string,
  perguntaId: string,
  arquivo: { tipo: string; tamanho: number },
): Promise<{ caminho: string; tokenEnvio: string } | { erro: string }> {
  if (!TOKEN.test(token) || !UUID.test(perguntaId)) return { erro: mensagemDe("link_invalido") };
  const extensao = TIPOS_ARQUIVO_BRIEFING[arquivo.tipo];
  if (!extensao) return { erro: "Envie fotos (JPG, PNG ou WEBP) ou PDF." };
  if (arquivo.tamanho > TAMANHO_MAXIMO_FOTO) return { erro: "Cada arquivo pode ter até 10 MB." };

  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { erro: "O envio de arquivos ainda não está disponível. Avise o escritório." };

  const { data, error } = await supabase.rpc("briefing_foto_permitida", { p_token: token, p_pergunta: perguntaId });
  if (error || !data) return { erro: mensagemDe(error?.message) };
  const { briefing_id, quantidade } = data as { briefing_id: string; quantidade: number };
  if (quantidade >= MAXIMO_FOTOS) return { erro: mensagemDe("limite_fotos") };

  const caminho = `${briefing_id}/${perguntaId}/${crypto.randomUUID()}.${extensao}`;
  const { data: envio, error: erroEnvio } = await admin.storage.from("briefings").createSignedUploadUrl(caminho);
  if (erroEnvio || !envio) {
    console.error("[briefing] url de envio", erroEnvio?.message);
    return { erro: "Não foi possível preparar o envio. Tente de novo." };
  }
  return { caminho, tokenEnvio: envio.token };
}

// 2º passo: registra o arquivo no briefing e devolve um endereço temporário para a miniatura.
export async function confirmarFoto(
  token: string,
  perguntaId: string,
  caminho: string,
): Promise<{ url: string | null } | { erro: string }> {
  if (!TOKEN.test(token) || !UUID.test(perguntaId)) return { erro: mensagemDe("link_invalido") };
  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { erro: "O envio de arquivos ainda não está disponível." };

  const { error } = await supabase.rpc("adicionar_foto_briefing", {
    p_token: token,
    p_pergunta: perguntaId,
    p_caminho: caminho,
  });
  if (error) {
    // O arquivo não é apagado aqui: o caminho veio do navegador e pode não ser deste briefing.
    console.error("[briefing] confirmar foto", error.message);
    return { erro: mensagemDe(error.message) };
  }
  const { data } = await admin.storage.from("briefings").createSignedUrl(caminho, 60 * 60);
  return { url: data?.signedUrl ?? null };
}

export async function removerFoto(token: string, perguntaId: string, caminho: string): Promise<Resultado> {
  if (!TOKEN.test(token) || !UUID.test(perguntaId)) return { erro: mensagemDe("link_invalido") };
  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { erro: "O envio de arquivos ainda não está disponível." };

  const { data, error } = await supabase.rpc("remover_foto_briefing", {
    p_token: token,
    p_pergunta: perguntaId,
    p_caminho: caminho,
  });
  if (error) return { erro: mensagemDe(error.message) };
  // Só apaga o arquivo se ele era mesmo deste briefing (o banco confirmou).
  if (data) await admin.storage.from("briefings").remove([caminho]);
  return { ok: true };
}
