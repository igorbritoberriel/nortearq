import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Limpeza diária (Vercel Cron, vercel.json): notificações com mais de 90 dias saem do banco.
// (As lidas já somem da lista do sininho depois de 30 dias.) Só roda com o CRON_SECRET certo.

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = criarClienteAdmin();
  if (!admin) return NextResponse.json({ erro: "servidor sem chave" }, { status: 500 });

  const { data, error } = await admin.rpc("limpar_notificacoes_antigas");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notificacoes_apagadas: data });
}
