"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { prepararCobrancasContrato } from "@/lib/cobranca";
import type { MeioPagamento, ResumoPagamento } from "@/lib/condicoes-pagamento";

const TOKEN = /^[0-9a-f]{32,128}$/;
export async function consultarPagamentoCliente(token: string): Promise<{ info: ResumoPagamento } | { erro: string }> {
  if (!TOKEN.test(token)) return { erro: "Este link não é válido." };
  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "Não foi possível consultar o pagamento." };
  const { data, error } = await supabase.rpc("resumo_pagamento_cliente", { p_token: token });
  if (error || !data) return { erro: "Não foi possível acessar este pagamento. Peça um link válido ao escritório." };
  return { info: data as ResumoPagamento };
}

export async function escolherPagamentoCliente(token: string, meio: MeioPagamento): Promise<{ ok: true } | { erro: string }> {
  if (!TOKEN.test(token) || !["pix", "boleto", "cartao"].includes(meio)) return { erro: "Escolha uma forma de pagamento válida." };
  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "Não foi possível salvar a escolha." };
  const { error } = await supabase.rpc("escolher_meio_contrato", { p_token: token, p_meio: meio });
  if (error) return { erro: error.message.includes("cartao_limite")
    ? "O cartão permite até 12 parcelas de pelo menos R$ 5,00. Fale com o escritório para ajustar a proposta."
    : error.message.includes("meio_ja_escolhido") || error.message.includes("cobranca_ja_existente")
      ? "Já há uma escolha ou cobrança registrada. Atualize a página; ajustes devem ser combinados com o escritório."
      : "Esta forma de pagamento não está disponível. Atualize ou fale com o escritório." };
  return { ok: true };
}

export async function prepararPagamentoCliente(token: string): Promise<{ info?: ResumoPagamento; erro?: string }> {
  // A consulta pelo token valida destino, validade, escritório, cliente e referência antes de usar o serviço.
  const consulta = await consultarPagamentoCliente(token);
  if ("erro" in consulta) return consulta;
  if (consulta.info.status !== "assinado") return { erro: "Assine o contrato primeiro." };
  const admin = criarClienteAdmin();
  if (!admin) return { erro: "Não foi possível preparar o pagamento agora." };
  const r = await prepararCobrancasContrato(admin, consulta.info.contrato_id);
  const atualizada = await consultarPagamentoCliente(token);
  return { ...("info" in atualizada ? atualizada : {}), ...("erro" in r ? r : {}) };
}
