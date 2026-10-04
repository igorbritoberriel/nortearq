import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { formaDoAsaas, hashToken } from "@/lib/cobranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Avisos do Asaas do ARQUITETO sobre as cobranças das parcelas (cobrança integrada, migração 0038).
// Cada escritório tem a própria senha (só o hash fica guardado). Pago → registra o pagamento com recibo.

type Evento = {
  id: string;
  event: string;
  payment?: {
    id: string;
    externalReference?: string | null;
    billingType?: string;
    status?: string;
    value?: number;
    netValue?: number;
    paymentDate?: string | null;
    clientPaymentDate?: string | null;
    confirmedDate?: string | null;
  };
};

const PAGO = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const escritorioId = request.nextUrl.searchParams.get("e") ?? "";
  const token = request.headers.get("asaas-access-token") ?? "";
  if (!UUID.test(escritorioId) || !token) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const admin = criarClienteAdmin();
  if (!admin) return NextResponse.json({ erro: "servidor sem chave" }, { status: 500 });

  const { data: cred } = await admin.from("cobranca_credenciais").select("webhook_token_hash").eq("escritorio_id", escritorioId).maybeSingle();
  const esperado = Buffer.from((cred?.webhook_token_hash as string | undefined) ?? "", "hex");
  const recebido = Buffer.from(hashToken(token), "hex");
  if (!esperado.length || esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const evento = (await request.json().catch(() => null)) as Evento | null;
  const pg = evento?.payment;
  if (!evento?.event || !pg?.id) return NextResponse.json({ ok: true });

  const { data: parcela } = await admin
    .from("pagamentos")
    .select("id, descricao, valor, contrato_id, escritorio_id, pago_em, contrato:contratos(cliente:clientes(nome))")
    .eq("asaas_cobranca_id", pg.id)
    .eq("escritorio_id", escritorioId)
    .maybeSingle();
  if (!parcela) return NextResponse.json({ ok: true, aviso: "cobrança não é do NorteArq" });

  await admin
    .from("pagamentos")
    .update({ asaas_status: pg.status ?? evento.event, asaas_forma: pg.billingType ?? null, asaas_valor_liquido: pg.netValue ?? null })
    .eq("id", parcela.id);

  const cliente = (parcela.contrato as unknown as { cliente: { nome: string } | null } | null)?.cliente?.nome ?? "Cliente";
  const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (PAGO.includes(evento.event) && !parcela.pago_em) {
    const data = (pg.clientPaymentDate || pg.paymentDate || pg.confirmedDate || "").slice(0, 10) || null;
    const { error } = await admin.rpc("baixa_automatica", {
      p_pagamento: parcela.id,
      p_data: data,
      p_forma: formaDoAsaas(pg.billingType),
      p_observacao: `Pago pelo Asaas (cobrança ${pg.id})`,
    });
    if (error) {
      console.error("[cobranças] baixa", error.message);
      return NextResponse.json({ erro: "falha ao registrar" }, { status: 500 }); // o Asaas tenta de novo
    }
    await admin.from("notificacoes").insert({
      escritorio_id: escritorioId,
      tipo: "pagamento",
      titulo: `${cliente} pagou ${reais(Number(parcela.valor))}`,
      texto: `${parcela.descricao} · registrado sozinho pelo Asaas, com recibo.${pg.netValue ? ` Líquido na sua conta: ${reais(pg.netValue)}.` : ""}`,
      link: `/app/contratos/${parcela.contrato_id}`,
    });
  } else if (evento.event === "PAYMENT_REFUNDED" || evento.event === "PAYMENT_DELETED") {
    await admin.from("notificacoes").insert({
      escritorio_id: escritorioId,
      tipo: "pagamento",
      titulo: evento.event === "PAYMENT_REFUNDED" ? `Pagamento estornado no Asaas: ${cliente}` : `Cobrança removida no Asaas: ${cliente}`,
      texto: `${parcela.descricao}. Confira a parcela no NorteArq${parcela.pago_em ? " e, se for o caso, estorne o registro." : "."}`,
      link: `/app/contratos/${parcela.contrato_id}`,
    });
    if (evento.event === "PAYMENT_DELETED" && !parcela.pago_em) {
      await admin.from("pagamentos").update({ asaas_cobranca_id: null, asaas_link: null, asaas_status: null }).eq("id", parcela.id);
    }
  }
  return NextResponse.json({ ok: true });
}
