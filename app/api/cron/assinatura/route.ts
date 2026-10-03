import { NextResponse, type NextRequest } from "next/server";
import { hojeBrasilia, somarDias } from "@/lib/assinatura";
import { enviarEmail, modeloEmail } from "@/lib/email";
import { urlDoSite } from "@/lib/escritorio";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Lembrete diário (Vercel Cron, vercel.json): teste grátis terminando em 3 dias e no último dia.
// Só roda com o CRON_SECRET certo (a Vercel manda no cabeçalho Authorization).

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = criarClienteAdmin();
  if (!admin) return NextResponse.json({ erro: "servidor sem chave" }, { status: 500 });

  const hoje = hojeBrasilia();
  const avisos = [
    { data: somarDias(hoje, 3), titulo: "Seu teste grátis termina em 3 dias" },
    { data: hoje, titulo: "Seu teste grátis termina hoje" },
  ];

  let enviados = 0;
  for (const aviso of avisos) {
    const { data: escritorios } = await admin
      .from("escritorios")
      .select("id, nome")
      .eq("plano", "trial")
      .eq("trial_ate", aviso.data)
      .is("asaas_assinatura_id", null);

    for (const e of escritorios ?? []) {
      await admin.from("notificacoes").insert({
        escritorio_id: e.id,
        tipo: "assinatura",
        titulo: aviso.titulo,
        texto: "Escolha um plano para continuar criando. Seus dados e os acessos dos clientes continuam.",
        link: "/app/assinatura",
      });

      const { data: donos } = await admin.from("membros").select("id").eq("escritorio_id", e.id).eq("papel", "dono");
      for (const { id } of donos ?? []) {
        const email = (await admin.auth.admin.getUserById(id)).data.user?.email;
        if (!email) continue;
        await enviarEmail({
          para: email,
          assunto: `${aviso.titulo} · NorteArq`,
          html: modeloEmail({
            titulo: aviso.titulo,
            linhas: [
              `O teste grátis do <strong>${e.nome}</strong> termina em ${aviso.data.split("-").reverse().join("/")}.`,
              "Depois disso, o sistema entra em modo leitura: você vê tudo, mas não cria nada novo. Seus clientes continuam acessando os projetos.",
            ],
            botao: { texto: "Escolher meu plano", url: `${urlDoSite()}/app/assinatura` },
          }),
          texto: `${aviso.titulo}. Escolha seu plano: ${urlDoSite()}/app/assinatura`,
        });
        enviados += 1;
      }
    }
  }
  return NextResponse.json({ ok: true, enviados });
}
