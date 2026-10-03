"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ETAPAS_CLIENTE, linkDoCliente, type DestinoLink, type EtapaCliente } from "@/lib/clientes";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { confirmarSenha } from "@/lib/confirmar-senha";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

// Clientes do escritório. O banco (RLS) garante que cada escritório só mexe nos seus.

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), esquema.nullable());

const esquemaCliente = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120, "Use até 120 caracteres."),
  telefone: opcional(
    z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length >= 10 && v.length <= 13, "Informe o WhatsApp com DDD."),
  ),
  email: opcional(z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."))),
  documento: opcional(
    z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF (11 números) ou CNPJ (14 números)."),
  ),
  endereco_imovel: opcional(z.string().trim().max(200, "Use até 200 caracteres.")),
  observacoes: opcional(z.string().trim().max(2000, "Use até 2.000 caracteres.")),
  etapa: z.enum(Object.keys(ETAPAS_CLIENTE) as [EtapaCliente, ...EtapaCliente[]]).optional(),
});

function lerFormulario(formData: FormData) {
  const resultado = esquemaCliente.safeParse(Object.fromEntries(formData));
  const servicos = formData.getAll("servicos").filter((v): v is string => typeof v === "string");
  return { resultado, servicos };
}

function valoresComServicos(formData: FormData) {
  const valores = valoresDe(formData);
  for (const id of formData.getAll("servicos")) valores[`servico_${id}`] = "on";
  valores.servicos_enviados = "1";
  return valores;
}

export async function criarCliente(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresComServicos(formData);
  const { resultado, servicos } = lerFormulario(formData);
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };

  const { data, error } = await ctx.supabase
    .from("clientes")
    .insert({ ...resultado.data, etapa: resultado.data.etapa ?? "contato", servicos, escritorio_id: ctx.sessao.escritorio.id })
    .select("id")
    .single();
  if (error) {
    console.error("[clientes] criar", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }

  revalidatePath("/app/clientes");
  redirect(`/app/clientes/${data.id}`);
}

export async function salvarCliente(
  id: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresComServicos(formData);
  const { resultado, servicos } = lerFormulario(formData);
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };

  const { error } = await ctx.supabase.from("clientes").update({ ...resultado.data, servicos }).eq("id", id);
  if (error) {
    console.error("[clientes] salvar", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }

  revalidatePath("/app/clientes", "layout");
  return { status: "sucesso", mensagem: "Dados salvos." };
}

// RN-01.5: o contato vira cliente com todos os dados que ele já preencheu.
export async function converterContato(contatoId: string) {
  const ctx = await contexto();
  if (!ctx) return;
  const { data, error } = await ctx.supabase.rpc("converter_contato", { p_contato_id: contatoId });
  if (error || !data) {
    console.error("[clientes] converter", error?.message);
    return;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/clientes/${data}`);
}

// Gera um link novo (o anterior do mesmo tipo deixa de valer) e devolve o endereço completo.
export async function gerarLink(
  clienteId: string,
  destino: DestinoLink,
): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };

  // Briefing: cria a cópia das perguntas antes do link (RN-02.12). Se já existe, reaproveita.
  if (destino === "briefing") {
    const { error } = await ctx.supabase.rpc("preparar_briefing", { p_cliente_id: clienteId });
    if (error) {
      console.error("[clientes] preparar briefing", error.message);
      return { erro: "Não foi possível preparar o briefing. Tente de novo." };
    }
  }

  const { data, error } = await ctx.supabase.rpc("criar_link_cliente", { p_cliente_id: clienteId, p_destino: destino });
  if (error || !data) {
    console.error("[clientes] link", error?.message);
    return { erro: "Não foi possível gerar o link. Tente de novo." };
  }
  revalidatePath(`/app/clientes/${clienteId}`);
  return { link: linkDoCliente(urlDoSite(), data as string, destino) };
}

// ---------- Arquivar, excluir e anonimizar (migração 0026) ----------

const ERROS_REMOCAO: Record<string, string> = {
  sem_permissao: "Só o dono ou um administrador pode fazer isso.",
  somente_dono: "Só o dono do escritório pode anonimizar um cliente.",
  tem_contrato_ou_pagamento:
    "Este cliente tem contrato assinado ou pagamento registrado: esses documentos precisam ficar guardados. Use Arquivar.",
  cliente_nao_encontrado: "Cliente não encontrado.",
};
const erroRemocao = (m: string) =>
  ERROS_REMOCAO[Object.keys(ERROS_REMOCAO).find((c) => m.includes(c)) ?? ""] ?? "Não foi possível concluir. Tente de novo.";

// Arquivar: some da lista, mas nada é apagado (desarquivar traz de volta).
export async function arquivarCliente(id: string, arquivar: boolean): Promise<boolean> {
  const ctx = await contexto();
  if (!ctx) return false;
  const { error } = await ctx.supabase
    .from("clientes")
    .update({ arquivado_em: arquivar ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) console.error("[clientes] arquivar", error.message);
  revalidatePath("/app/clientes", "layout");
  return !error;
}

// Fotos e arquivos do briefing guardados no Storage (caminhos dentro das respostas).
async function arquivosDoBriefing(supabase: NonNullable<Awaited<ReturnType<typeof contexto>>>["supabase"], clienteId: string) {
  const { data } = await supabase.from("briefings").select("respostas").eq("cliente_id", clienteId);
  const caminhos: string[] = [];
  for (const b of data ?? []) {
    for (const valor of Object.values((b.respostas ?? {}) as Record<string, unknown>)) {
      if (Array.isArray(valor)) {
        for (const v of valor) if (typeof v === "string" && /^[0-9a-f-]{36}\/.+\.(jpg|png|webp|pdf)$/i.test(v)) caminhos.push(v);
      }
    }
  }
  return caminhos;
}

async function apagarArquivos(caminhos: string[]) {
  const admin = criarClienteAdmin();
  if (admin && caminhos.length) await admin.storage.from("briefings").remove(caminhos);
}

const SENHA_ERRADA = "Senha incorreta. Digite a senha que você usa para entrar no NorteArq.";

// Excluir: só sem contrato assinado nem pagamento (o banco confere). Pede a senha de quem está logado.
export async function excluirCliente(id: string, senha: string): Promise<{ erro: string } | void> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!(await confirmarSenha(ctx.sessao.email, senha))) return { erro: SENHA_ERRADA };
  const caminhos = await arquivosDoBriefing(ctx.supabase, id);
  const { error } = await ctx.supabase.rpc("excluir_cliente", { p_cliente: id });
  if (error) return { erro: erroRemocao(error.message) };
  await apagarArquivos(caminhos);
  revalidatePath("/app", "layout");
  redirect("/app/clientes");
}

// LGPD (RG-9): troca os dados pessoais por "removido"; contrato e valores ficam (obrigação legal).
export async function anonimizarCliente(id: string, senha: string): Promise<{ erro: string } | { ok: true }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!(await confirmarSenha(ctx.sessao.email, senha))) return { erro: SENHA_ERRADA };
  const caminhos = await arquivosDoBriefing(ctx.supabase, id);
  const { data: usuario, error } = await ctx.supabase.rpc("anonimizar_cliente", { p_cliente: id });
  if (error) return { erro: erroRemocao(error.message) };
  await apagarArquivos(caminhos);
  // Login do portal do cliente deixa de existir.
  const admin = criarClienteAdmin();
  if (admin && usuario) await admin.auth.admin.deleteUser(usuario as string).catch(() => null);
  revalidatePath("/app", "layout");
  return { ok: true };
}
