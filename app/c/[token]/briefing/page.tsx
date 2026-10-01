import { CircleCheck } from "lucide-react";
import { BriefingCliente } from "@/components/briefing/BriefingCliente";
import { EmConstrucao } from "@/components/EmConstrucao";
import type { BriefingPublico } from "@/lib/briefing";
import { exigirLink } from "@/lib/link-cliente";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

// Briefing guiado do cliente (módulo 02), aberto pelo link do WhatsApp.
export default async function BriefingClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await exigirLink(token, "briefing");

  if (link === undefined) {
    return (
      <EmConstrucao
        modulo="02"
        titulo="Briefing do seu projeto"
        descricao="Ligue o Supabase no .env.local para ver o briefing de verdade."
        itens={[
          "Barra de progresso e salvamento automático",
          "Blocos de arquitetura, interiores (por ambiente) e reforma",
          "Quiz visual de estilo",
          "Fotos de referência e do imóvel",
        ]}
      />
    );
  }
  // Link vencido: o layout já mostra o aviso.
  if (!link.valido) return null;

  const supabase = (await criarClienteServidor())!;
  const { data, error } = await supabase.rpc("briefing_publico", { p_token: token });
  if (error || !data) {
    console.error("[briefing] abrir", error?.message);
    return (
      <div className="publico-sucesso">
        <h1>Não foi possível abrir o briefing</h1>
        <p>Atualize a página em instantes. Se continuar, avise o {link.escritorio.nome}.</p>
      </div>
    );
  }
  const briefing = data as BriefingPublico;

  // RN-02.7: depois de enviado, o cliente não edita mais.
  if (briefing.status === "respondido" || briefing.status === "validado") {
    return (
      <div className="publico-sucesso" role="status">
        <CircleCheck size={44} aria-hidden="true" />
        <h1>Briefing enviado</h1>
        <p>
          Obrigado, {link.cliente_nome}! O {link.escritorio.nome} já recebeu suas respostas. Se quiser mudar alguma coisa,
          é só pedir para reabrir.
        </p>
      </div>
    );
  }

  // Miniaturas das fotos já enviadas (endereços temporários, valem 1 hora).
  const admin = criarClienteAdmin();
  const caminhos = briefing.perguntas
    .filter((p) => p.tipo === "foto")
    .flatMap((p) => (Array.isArray(briefing.respostas[p.id]) ? (briefing.respostas[p.id] as string[]) : []));
  const miniaturas: Record<string, string> = {};
  if (admin && caminhos.length) {
    const { data: assinadas } = await admin.storage.from("briefings").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) miniaturas[a.path] = a.signedUrl;
  }

  return (
    <BriefingCliente
      token={token}
      briefing={briefing}
      miniaturas={miniaturas}
      cliente={link.cliente_nome}
      escritorio={link.escritorio.nome}
      fotosDisponiveis={!!admin}
    />
  );
}
