import { NextResponse, type NextRequest } from "next/server";
import { avisarEtapaParada, avisarParcela } from "@/lib/avisos";
import { gerarCobranca } from "@/lib/cobranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Lembrete diário (Vercel Cron, vercel.json): etapa esperando aprovação há 3 e há 7 dias (RN-03.6).
// Só roda com o CRON_SECRET certo (a Vercel manda no cabeçalho Authorization).

const DIA = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = criarClienteAdmin();
  if (!admin) return NextResponse.json({ erro: "servidor sem chave" }, { status: 500 });

  const { data: etapas, error } = await admin
    .from("etapas")
    .select("id, enviada_em, lembrete_3_para, lembrete_7_para")
    .eq("status", "aguardando_aprovacao")
    .lte("enviada_em", new Date(Date.now() - 3 * DIA).toISOString())
    .limit(500);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  let enviados = 0;
  for (const e of etapas ?? []) {
    const enviada = e.enviada_em as string;
    const dias = (Date.now() - new Date(enviada).getTime()) / DIA;
    // Se o cron atrasar e já passou de 7 dias, sai só o de 7 (não manda os dois juntos).
    const marco = dias >= 7 ? 7 : 3;
    const coluna = marco === 7 ? "lembrete_7_para" : "lembrete_3_para";
    if (e[coluna] && new Date(e[coluna] as string).getTime() === new Date(enviada).getTime()) continue;

    // Reserva antes de enviar: se outra execução já marcou, esta não envia de novo.
    const { data: reservada } = await admin
      .from("etapas")
      .update({ [coluna]: enviada })
      .eq("id", e.id)
      .eq("status", "aguardando_aprovacao")
      .eq("enviada_em", enviada)
      .or(`${coluna}.is.null,${coluna}.neq."${enviada}"`)
      .select("id");
    if (!reservada?.length) continue;

    await avisarEtapaParada(e.id, marco);
    enviados += 1;
  }
  // Parcelas (0037): lembrete ao cliente 3 dias antes, no dia e 3 dias depois do vencimento (uma vez cada).
  const dia = (deslocamento: number) => {
    const d = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + deslocamento);
    return d.toISOString().slice(0, 10);
  };
  const marcos = [
    { momento: "antes", coluna: "lembrete_antes_em", vencimento: dia(3) },
    { momento: "dia", coluna: "lembrete_dia_em", vencimento: dia(0) },
    { momento: "atraso", coluna: "lembrete_atraso_em", vencimento: dia(-3) },
  ] as const;
  // Cobrança automática (0038): parcelas que vencem nos próximos 10 dias ganham a cobrança no Asaas do escritório
  // antes dos lembretes (assim o e-mail já leva o link de pagamento).
  const { data: aGerar } = await admin
    .from("pagamentos")
    .select("id, escritorio:escritorios!inner(cobranca_ativa)")
    .is("pago_em", null)
    .is("asaas_link", null)
    .not("vencimento", "is", null)
    .lte("vencimento", dia(10))
    .eq("escritorio.cobranca_ativa", true)
    .limit(100);
  let cobrancas = 0;
  for (const p of aGerar ?? []) {
    const r = await gerarCobranca(admin, p.id);
    if ("link" in r) cobrancas += 1;
  }

  let parcelas = 0;
  for (const m of marcos) {
    // Reserva antes de enviar: só quem marcar a coluna envia (evita lembrete duplicado).
    const { data: reservadas } = await admin
      .from("pagamentos")
      .update({ [m.coluna]: new Date().toISOString() })
      .eq("vencimento", m.vencimento)
      .is("pago_em", null)
      .is(m.coluna, null)
      .select("id")
      .limit(500);
    for (const p of reservadas ?? []) {
      await avisarParcela(p.id, m.momento);
      parcelas += 1;
    }
  }
  return NextResponse.json({ ok: true, enviados, parcelas, cobrancas });
}
