"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { avisarPropostaRespondida } from "@/lib/avisos";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { MeioPagamento } from "@/lib/condicoes-pagamento";

// Resposta do cliente à proposta (RN-01.9), com data, hora e IP (RN-01.10). O banco valida tudo.

export type AcaoResposta = "aprovar" | "ajuste" | "recusar";

const MENSAGENS: Record<string, string> = {
  proposta_respondida: "Esta proposta já foi respondida.",
  proposta_expirada: "A validade desta proposta acabou. Fale com o escritório.",
  comentario_obrigatorio: "Conte o que você quer ajustar.",
  motivo_obrigatorio: "Escolha o motivo.",
  parcelas_invalidas: "Escolha em quantas vezes quer pagar.",
  sem_desconto_avista: "Esta proposta não tem a opção à vista com desconto.",
  meio_invalido: "Escolha uma forma de pagamento disponível. Se a página ficou aberta, atualize antes de continuar.",
  cobranca_desativada: "O escritório precisa ativar o Asaas para esta forma de pagamento.",
  cartao_maximo: "No cartão, escolha até 12 parcelas para o saldo.",
  cartao_minimo: "No cartão, cada pagamento precisa ser de pelo menos R$ 5,00.",
  cartao_condicoes: "No cartão, o valor total deve ser de pelo menos R$ 5,00; as parcelas serão escolhidas no Asaas. Atualize a página para continuar.",
  link_invalido: "Este link não vale mais. Peça um link novo ao escritório.",
};

export async function responderProposta(
  token: string,
  acao: AcaoResposta,
  comentario: string,
  motivo: string | null,
  parcelas: number | null = null,
  avista = false,
  meio: MeioPagamento | null = null,
): Promise<{ ok: true } | { erro: string }> {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { erro: MENSAGENS.link_invalido };
  if (acao === "ajuste" && !comentario.trim()) return { erro: MENSAGENS.comentario_obrigatorio };
  if (acao === "recusar" && !motivo) return { erro: MENSAGENS.motivo_obrigatorio };

  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O banco ainda não está ligado." };

  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? null;

  const { data, error } = await supabase.rpc("responder_proposta", {
    p_token: token,
    p_acao: acao,
    p_comentario: comentario,
    p_motivo: motivo,
    p_ip: ip,
    p_parcelas: avista ? null : parcelas,
    p_avista: avista,
    p_meio: meio,
  });
  if (error || !data) {
    console.error("[proposta] responder", error?.message);
    const chave = Object.keys(MENSAGENS).find((k) => error?.message.includes(k));
    return { erro: chave ? MENSAGENS[chave] : "Não foi possível registrar agora. Tente de novo." };
  }

  after(() => avisarPropostaRespondida(data as string));
  return { ok: true };
}
