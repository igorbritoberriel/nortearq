"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { linkDoCliente } from "@/lib/clientes";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Contratos do escritório (RN-01.12 a RN-01.16). Gerar, enviar e cancelar passam por funções do banco.

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_TEXTO = 60_000;

export async function gerarContrato(propostaId: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(propostaId)) return;
  const { data, error } = await ctx.supabase.rpc("gerar_contrato", { p_proposta: propostaId });
  if (error || !data) {
    console.error("[contratos] gerar", error?.message);
    return;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/contratos/${data}`);
}

// Texto do contrato em rascunho (o banco só deixa editar antes de enviar).
export async function salvarTextoContrato(id: string, corpo: string): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(id)) return { erro: "Contrato não encontrado." };
  if (corpo.trim().length < 50) return { erro: "O texto do contrato está curto demais." };
  if (corpo.length > LIMITE_TEXTO) return { erro: "O texto passou do limite de 60 mil caracteres." };

  const { error, count } = await ctx.supabase
    .from("contratos")
    .update({ corpo, atualizado_em: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("status", "rascunho");
  if (error || !count) {
    console.error("[contratos] salvar texto", error?.message);
    return { erro: "Não foi possível salvar. Depois de enviado, o contrato não pode ser editado." };
  }
  revalidatePath(`/app/contratos/${id}`);
  return { ok: true };
}

export async function enviarContrato(id: string): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(id)) return { erro: "Contrato não encontrado." };

  const { data, error } = await ctx.supabase.rpc("enviar_contrato", { p_contrato: id });
  if (error || !data) {
    console.error("[contratos] enviar", error?.message);
    if (error?.message.includes("contrato_fechado")) return { erro: "Este contrato já foi assinado ou cancelado." };
    return { erro: "Não foi possível enviar. Tente de novo." };
  }
  revalidatePath("/app", "layout");
  return { link: linkDoCliente(urlDoSite(), data as string, "contrato") };
}

export async function cancelarContrato(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { error } = await ctx.supabase.rpc("cancelar_contrato", { p_contrato: id });
  if (error) console.error("[contratos] cancelar", error.message);
  revalidatePath("/app", "layout");
}

// RN-01.16: na V1, pagamento é só controle (pago ou pendente).
export async function marcarPagamento(id: string, pago: boolean) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { error } = await ctx.supabase.from("pagamentos").update({ pago_em: pago ? hoje : null }).eq("id", id);
  if (error) console.error("[pagamentos] marcar", error.message);
  revalidatePath("/app/contratos", "layout");
}

// ---------- Modelo de contrato e dados do escritório ----------

export async function salvarModeloContrato(corpo: string): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (corpo.trim().length < 50) return { erro: "O modelo está curto demais." };
  if (corpo.length > LIMITE_TEXTO) return { erro: "O modelo passou do limite de 60 mil caracteres." };

  const { error, count } = await ctx.supabase
    .from("modelos_contrato")
    .update({ corpo, atualizado_em: new Date().toISOString() }, { count: "exact" })
    .eq("escritorio_id", ctx.sessao.escritorio.id);
  if (error || !count) {
    console.error("[contratos] salvar modelo", error?.message);
    return { erro: "Não foi possível salvar o modelo. Tente de novo." };
  }
  revalidatePath("/app/contratos/modelo");
  return { ok: true };
}

const opcional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max, `Use até ${max} caracteres.`).nullable());

const esquemaDados = z.object({
  documento: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 11 || v.length === 14, "CPF (11 números) ou CNPJ (14 números).")
      .nullable(),
  ),
  endereco: opcional(200),
  responsavel: opcional(120),
  registro_profissional: opcional(60),
});

export async function salvarDadosContratado(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaDados.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };

  const { error } = await ctx.supabase.from("escritorios").update(resultado.data).eq("id", ctx.sessao.escritorio.id);
  if (error) {
    console.error("[contratos] dados do escritório", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  revalidatePath("/app", "layout");
  return { status: "sucesso", mensagem: "Dados salvos." };
}
