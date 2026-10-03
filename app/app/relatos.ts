"use server";

import { z } from "zod";
import { adminsNorteArq, ehAdminNorteArq } from "@/lib/admin-nortearq";
import { enviarEmail, escaparHtml, modeloEmail } from "@/lib/email";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// "Relatar problema ou sugestão" (migração 0034): grava com a página em que a pessoa estava e avisa
// quem administra o NorteArq por e-mail. No máximo 20 relatos por pessoa por dia.

const TIPOS = { problema: "Problema", sugestao: "Sugestão", duvida: "Dúvida" } as const;

const esquema = z.object({
  tipo: z.enum(["problema", "sugestao", "duvida"]),
  texto: z.string().trim().min(3, "Conte um pouco mais (pelo menos 3 letras).").max(2000, "Use até 2.000 caracteres."),
  caminho: z.string().max(300),
  navegador: z.string().max(300),
});

export async function enviarRelato(dados: z.input<typeof esquema>): Promise<{ ok: true } | { erro: string }> {
  const r = esquema.safeParse(dados);
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Confira o texto." };
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin) return { erro: "Não foi possível enviar agora. Tente de novo em instantes." };

  const { count } = await admin
    .from("relatos")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", sessao.membro.id)
    .gt("criado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= 20) return { erro: "Você já mandou 20 relatos hoje. Obrigado! Amanhã libera de novo." };

  const d = r.data;
  const { error } = await admin.from("relatos").insert({
    tipo: d.tipo,
    texto: d.texto,
    caminho: d.caminho.split("?")[0],
    navegador: d.navegador,
    usuario_id: sessao.membro.id,
    escritorio_id: sessao.escritorio.id,
  });
  if (error) {
    console.error("[relatos]", error.message);
    return { erro: "Não foi possível enviar agora. Tente de novo em instantes." };
  }

  await enviarEmail({
    para: adminsNorteArq(),
    assunto: `[NorteArq] ${TIPOS[d.tipo]} de ${sessao.membro.nome} (${sessao.escritorio.nome})`,
    html: modeloEmail({
      titulo: `${TIPOS[d.tipo]} enviada pelo sistema`,
      linhas: [
        `<strong>De:</strong> ${escaparHtml(sessao.membro.nome)} · ${escaparHtml(sessao.email)} · ${escaparHtml(sessao.escritorio.nome)}`,
        `<strong>Página:</strong> ${escaparHtml(d.caminho)}`,
        `<em>“${escaparHtml(d.texto)}”</em>`,
      ],
      botao: { texto: "Abrir o painel interno", url: `${urlDoSite()}/app/interno` },
    }),
    texto: `${TIPOS[d.tipo]} de ${sessao.membro.nome} (${sessao.escritorio.nome})\nPágina: ${d.caminho}\n\n${d.texto}`,
  });
  return { ok: true };
}

// Painel interno: só quem administra o NorteArq.
export async function mudarSituacaoRelato(id: string, situacao: "visto" | "resolvido" | "novo"): Promise<boolean> {
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin || !ehAdminNorteArq(sessao.email) || !z.uuid().safeParse(id).success) return false;
  const { error } = await admin.from("relatos").update({ situacao, atualizado_em: new Date().toISOString() }).eq("id", id);
  return !error;
}

export async function marcarErroResolvido(id: string): Promise<boolean> {
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin || !ehAdminNorteArq(sessao.email) || !z.uuid().safeParse(id).success) return false;
  const { error } = await admin.from("erros_sistema").update({ resolvido_em: new Date().toISOString() }).eq("id", id);
  return !error;
}
