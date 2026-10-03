import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { registrarErro } from "@/lib/erros";
import { criarClienteServidor } from "@/lib/supabase/server";

// Erros das telas (navegador): o componente CapturaErros e as telas de erro mandam para cá.
// Aceita visitante sem login (área do cliente final). Tamanho limitado; repetições o banco junta.

const esquema = z.object({
  mensagem: z.string().trim().min(1).max(1000),
  caminho: z.string().max(300).optional(),
  pilha: z.string().max(4000).optional(),
  origemArquivo: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  const corpo = await request.text();
  if (corpo.length > 8000) return NextResponse.json({ ok: false }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const dados = esquema.safeParse(json);
  if (!dados.success) return NextResponse.json({ ok: false }, { status: 400 });

  // Quem estava usando (se estiver logado no sistema).
  let usuarioId: string | null = null;
  let escritorioId: string | null = null;
  const supabase = await criarClienteServidor();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    usuarioId = data.user?.id ?? null;
    if (usuarioId) {
      const { data: membro } = await supabase.from("membros").select("escritorio_id").eq("id", usuarioId).maybeSingle();
      escritorioId = (membro?.escritorio_id as string | undefined) ?? null;
    }
  }

  const d = dados.data;
  await registrarErro({
    origem: "navegador",
    mensagem: d.mensagem,
    caminho: d.caminho?.split("?")[0] ?? null,
    detalhe: {
      pilha: d.pilha?.split("\n").slice(0, 8).join("\n"),
      arquivo: d.origemArquivo,
      navegador: request.headers.get("user-agent")?.slice(0, 200),
    },
    usuarioId,
    escritorioId,
  });
  return NextResponse.json({ ok: true });
}
