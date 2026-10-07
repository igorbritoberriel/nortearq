import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { linkCheckout } from "./cobranca";

export type EventoCheckout = {
  event: string;
  checkout: { id: string; externalReference?: string | null; status?: string;
    callback?: { successUrl?: string }; items?: { quantity: number; value: number }[] };
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Somente o endpoint autenticado pela senha individual do escritório chama esta função.
export async function processarEventoCheckout(admin: SupabaseClient, escritorioId: string, evento: EventoCheckout) {
  const c = evento.checkout;
  if (!c?.id) return { ok: true };
  const estados: Record<string, string> = { CHECKOUT_CREATED: "ACTIVE", CHECKOUT_PAID: "PAID", CHECKOUT_EXPIRED: "EXPIRED", CHECKOUT_CANCELED: "CANCELED" };
  const estado = estados[evento.event];
  if (!estado) return { ok: true };
  let referencia = c.externalReference;
  if (!referencia && c.callback?.successUrl) {
    try { referencia = new URL(c.callback.successUrl).searchParams.get("pagamento"); } catch { /* payload sem callback válido */ }
  }
  let query = admin.from("cobranca_checkout_sessoes").select("id,valor,link,asaas_id").eq("escritorio_id", escritorioId);
  query = referencia && UUID.test(referencia) ? query.eq("id", referencia) : query.eq("asaas_id", c.id);
  const { data: sessao, error } = await query.maybeSingle();
  if (error) return { erro: "Não foi possível consultar o checkout." };
  if (!sessao) return { ok: true }; // outro pedido/integração dessa conta
  const total = c.items?.reduce((s, p) => s + Number(p.quantity) * Number(p.value), 0);
  if (total === undefined || !Number.isFinite(total) || Math.round(total * 100) !== Math.round(Number(sessao.valor) * 100))
    return { erro: "Os valores do checkout não correspondem ao contrato." };
  const { data: esc, error: escErro } = await admin.from("escritorios").select("cobranca_ambiente").eq("id", escritorioId).single();
  if (escErro || !esc) return { erro: "Não foi possível consultar o escritório." };
  const { data: resultado, error: registrarErro } = await admin.rpc("registrar_checkout", {
    p_sessao: sessao.id, p_escritorio: escritorioId, p_asaas: c.id, p_estado: estado,
    p_total: Math.round(total * 100) / 100, p_link: sessao.link ?? linkCheckout(c.id, esc.cobranca_ambiente === "teste" ? "teste" : "producao"),
  });
  if (registrarErro) return { erro: "Não foi possível registrar o evento do checkout." };
  if (resultado?.novo_pagamento) await admin.from("notificacoes").insert({
    escritorio_id: escritorioId, tipo: "pagamento", titulo: "Compra aprovada no cartão",
    texto: `O Asaas confirmou a compra de ${Number(resultado.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. O recibo foi gerado; o dinheiro fica disponível conforme os prazos do Asaas.`,
    link: `/app/contratos/${resultado.contrato_id}`,
  });
  return { ok: true };
}
