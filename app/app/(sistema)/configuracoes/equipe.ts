"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { confirmarSenha } from "@/lib/confirmar-senha";
import { enviarEmail, escaparHtml, modeloEmail } from "@/lib/email";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Equipe do escritório (0024). Só o dono convida, muda perfil e remove; o banco confere.

export type EstadoConvite = EstadoFormulario & { link?: string };

const ERROS: Record<string, string> = {
  somente_dono: "Só o dono do escritório gerencia a equipe.",
  plano_sem_equipe: "A equipe é do plano Escritório. Mude de plano para convidar pessoas.",
  email_invalido: "Informe um e-mail válido.",
  nome_obrigatorio: "Informe o nome da pessoa.",
  ja_na_equipe: "Essa pessoa já está na equipe.",
  email_de_outro_escritorio:
    "Este e-mail já tem conta em outro escritório do NorteArq (ou é de um cliente). Cada conta pertence a um escritório só: peça para a pessoa usar outro e-mail.",
  sem_vagas: "As 5 vagas do plano Escritório estão em uso. Remova alguém ou cancele um convite.",
};
const erroDe = (mensagem: string) => ERROS[Object.keys(ERROS).find((c) => mensagem.includes(c)) ?? ""] ?? "Não foi possível concluir. Tente de novo.";

const NOME_PAPEL = { administrador: "Administrador", colaborador: "Colaborador" } as const;

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

async function mandarConvite(dados: { email: string; nome: string; papel: "administrador" | "colaborador"; token: string; escritorio: string; quem: string }) {
  const link = `${urlDoSite()}/convite/${dados.token}`;
  await enviarEmail({
    para: dados.email,
    assunto: `${dados.quem} convidou você para o ${dados.escritorio} no NorteArq`,
    html: modeloEmail({
      titulo: `Convite para o ${dados.escritorio}`,
      linhas: [
        `Olá, ${escaparHtml(dados.nome.split(" ")[0])}! ${escaparHtml(dados.quem)} convidou você para a equipe do <strong>${escaparHtml(dados.escritorio)}</strong> no NorteArq, como <strong>${NOME_PAPEL[dados.papel]}</strong>.`,
        "Clique no botão para criar a sua senha e entrar. O convite vale por 7 dias.",
      ],
      botao: { texto: "Aceitar convite", url: link },
    }),
    texto: `${dados.quem} convidou você para o ${dados.escritorio} no NorteArq. Aceite em até 7 dias: ${link}`,
  }).catch((erro) => console.error("[equipe] e-mail do convite", erro));
  return link;
}

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  papel: z.enum(["administrador", "colaborador"], "Escolha o perfil."),
});

export async function convidar(_anterior: EstadoConvite, formData: FormData): Promise<EstadoConvite> {
  const valores = valoresDe(formData);
  const resultado = esquema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  const d = resultado.data;
  const { data: token, error } = await ctx.supabase.rpc("convidar_membro", { p_email: d.email, p_nome: d.nome, p_papel: d.papel });
  if (error || !token) return { status: "erro", mensagem: erroDe(error?.message ?? ""), valores };

  const link = await mandarConvite({ ...d, token: token as string, escritorio: ctx.sessao.escritorio.nome, quem: ctx.sessao.membro.nome });
  revalidatePath("/app/configuracoes");
  return { status: "sucesso", mensagem: `Convite enviado para ${d.email}. Ele vale por 7 dias.`, link };
}

// Reenviar = convite novo (o anterior deixa de valer e a validade recomeça).
export async function reenviarConvite(id: string): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  const { data: c } = await ctx.supabase.from("convites").select("email, nome, papel").eq("id", id).maybeSingle();
  if (!c) return { erro: "Convite não encontrado." };
  const { data: token, error } = await ctx.supabase.rpc("convidar_membro", { p_email: c.email, p_nome: c.nome, p_papel: c.papel });
  if (error || !token) return { erro: erroDe(error?.message ?? "") };
  const link = await mandarConvite({ ...c, token: token as string, escritorio: ctx.sessao.escritorio.nome, quem: ctx.sessao.membro.nome });
  revalidatePath("/app/configuracoes");
  return { link };
}

export async function cancelarConvite(id: string) {
  const ctx = await contexto();
  if (!ctx) return;
  await ctx.supabase.rpc("cancelar_convite", { p_convite: id });
  revalidatePath("/app/configuracoes");
}

// Mudar perfil: a tela muda na hora; aqui só grava.
export async function mudarPapel(id: string, papel: "administrador" | "colaborador"): Promise<boolean> {
  const ctx = await contexto();
  if (!ctx) return false;
  const { error } = await ctx.supabase.rpc("mudar_papel_membro", { p_membro: id, p_papel: papel });
  if (error) console.error("[equipe] mudar perfil", error.message);
  return !error;
}

// Remover corta o acesso na hora: pede a senha do dono.
export async function removerMembro(id: string, senha: string): Promise<{ erro: string } | { ok: true }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!(await confirmarSenha(ctx.sessao.email, senha))) {
    return { erro: "Senha incorreta. Digite a senha que você usa para entrar no NorteArq." };
  }
  const { error } = await ctx.supabase.rpc("remover_membro", { p_membro: id });
  if (error) {
    console.error("[equipe] remover", error.message);
    return { erro: erroDe(error.message) };
  }
  revalidatePath("/app/configuracoes");
  return { ok: true };
}
