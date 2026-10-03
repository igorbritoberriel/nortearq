import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { fimDoPeriodo, type Periodo } from "@/lib/assinatura";
import { reais } from "@/lib/propostas";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Avisos do Asaas sobre os pagamentos da assinatura do arquiteto.
// Pagamento confirmado → libera o plano até o fim do período (pago_ate). Atraso → notificação.
// Cada evento é gravado uma vez só (o Asaas pode reenviar).

type Evento = {
  id: string;
  event: string;
  payment?: {
    id: string;
    customer: string;
    subscription?: string | null;
    value: number;
    dueDate: string;
    invoiceUrl?: string;
  };
};

function senhaConfere(recebida: string | null) {
  const esperada = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperada || !recebida) return false;
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

const PAGO = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];

export async function POST(request: NextRequest) {
  if (!senhaConfere(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = criarClienteAdmin();
  if (!admin) return NextResponse.json({ erro: "servidor sem chave" }, { status: 500 });

  const evento = (await request.json().catch(() => null)) as Evento | null;
  const pagamento = evento?.payment;
  if (!evento?.id || !pagamento) return NextResponse.json({ ok: true }); // eventos que não são de cobrança

  // De qual escritório é? Pela assinatura ou, se não vier, pelo cliente no Asaas.
  const { data: escritorio } = await admin
    .from("escritorios")
    .select("id, periodo, plano_escolhido, pago_ate")
    .or(
      pagamento.subscription
        ? `asaas_assinatura_id.eq.${pagamento.subscription},asaas_cliente_id.eq.${pagamento.customer}`
        : `asaas_cliente_id.eq.${pagamento.customer}`,
    )
    .limit(1)
    .maybeSingle();
  if (!escritorio) return NextResponse.json({ ok: true, aviso: "escritório não encontrado" });

  // Grava o evento; se já existia, não processa de novo.
  const { error: repetido } = await admin.from("assinatura_eventos").insert({
    id: evento.id,
    escritorio_id: escritorio.id,
    tipo: evento.event,
    pagamento_id: pagamento.id,
    valor: pagamento.value,
    vencimento: pagamento.dueDate,
    link_fatura: pagamento.invoiceUrl ?? null,
  });
  if (repetido) return NextResponse.json({ ok: true, repetido: true });

  const notificar = (titulo: string, texto: string) =>
    admin.from("notificacoes").insert({ escritorio_id: escritorio.id, tipo: "assinatura", titulo, texto, link: "/app/assinatura" });

  if (PAGO.includes(evento.event)) {
    const periodo = (escritorio.periodo ?? "mensal") as Periodo;
    const fim = fimDoPeriodo(pagamento.dueDate, periodo);
    const pagoAte = escritorio.pago_ate && escritorio.pago_ate > fim ? escritorio.pago_ate : fim;
    await admin
      .from("escritorios")
      .update({ plano: escritorio.plano_escolhido ?? "profissional", pago_ate: pagoAte })
      .eq("id", escritorio.id);
    await notificar("Pagamento da assinatura confirmado", `${reais(pagamento.value)} · em dia até ${pagoAte.split("-").reverse().join("/")}`);
  } else if (evento.event === "PAYMENT_OVERDUE") {
    await notificar(
      "Pagamento da assinatura em atraso",
      "Você tem 7 dias para regularizar antes de o sistema entrar em modo leitura.",
    );
  } else if (evento.event === "PAYMENT_REFUNDED") {
    await notificar("Pagamento da assinatura estornado", `${reais(pagamento.value)} devolvido pelo sistema de pagamento.`);
  }

  return NextResponse.json({ ok: true });
}
