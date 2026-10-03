"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { linkDoCliente } from "@/lib/clientes";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { confirmarSenha } from "@/lib/confirmar-senha";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehRepetido, mensagemNomeRepetido, nomeLivre } from "@/lib/nomes";

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

const SENHA_ERRADA = "Senha incorreta. Digite a senha que você usa para entrar no NorteArq.";

// Cancelar contrato invalida um documento já enviado ao cliente: pede a senha.
export async function cancelarContrato(id: string, senha: string): Promise<{ erro: string } | { ok: true }> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return { erro: SEM_SUPABASE.mensagem! };
  if (!(await confirmarSenha(ctx.sessao.email, senha))) return { erro: SENHA_ERRADA };
  const { error } = await ctx.supabase.rpc("cancelar_contrato", { p_contrato: id });
  if (error) {
    console.error("[contratos] cancelar", error.message);
    return { erro: "Não foi possível cancelar. Tente de novo." };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------- Pagamentos protegidos (migração 0015) ----------
// Baixa é definitiva; desfazer só por estorno com motivo, feito pelo dono. O banco garante as regras.

const ERROS_PAGAMENTO: Record<string, string> = {
  pagamento_ja_baixado: "Este pagamento já foi registrado. Para corrigir, use Estornar.",
  pagamento_pendente: "Este pagamento ainda não foi registrado.",
  data_invalida: "A data do pagamento não pode ser no futuro.",
  forma_invalida: "Escolha a forma de pagamento.",
  somente_dono: "Só o dono do escritório pode estornar um pagamento.",
  motivo_obrigatorio: "Explique o motivo do estorno (pelo menos 5 letras).",
};

function erroPagamento(mensagem: string) {
  const codigo = Object.keys(ERROS_PAGAMENTO).find((c) => mensagem.includes(c));
  return codigo ? ERROS_PAGAMENTO[codigo] : "Não foi possível salvar. Tente de novo.";
}

const esquemaBaixa = z.object({
  pagamento_id: z.uuid(),
  pago_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do pagamento."),
  forma: z.enum(["pix", "transferencia", "boleto", "cartao", "dinheiro", "outro"], "Escolha a forma de pagamento."),
  observacao: z.string().trim().max(300, "Use até 300 caracteres.").optional(),
});

export async function registrarPagamento(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaBaixa.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  const d = resultado.data;
  const { error } = await ctx.supabase.rpc("registrar_pagamento", {
    p_pagamento: d.pagamento_id,
    p_data: d.pago_em,
    p_forma: d.forma,
    p_observacao: d.observacao ?? null,
  });
  if (error) {
    console.error("[pagamentos] registrar", error.message);
    return { status: "erro", mensagem: erroPagamento(error.message), valores };
  }
  revalidatePath("/app", "layout");
  return { status: "sucesso", mensagem: "Pagamento registrado." };
}

const esquemaEstorno = z.object({
  senha: z.string().min(1, "Digite a sua senha."),
  pagamento_id: z.uuid(),
  motivo: z.string().trim().min(5, "Explique o motivo do estorno.").max(300, "Use até 300 caracteres."),
});

export async function estornarPagamento(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaEstorno.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  if (!(await confirmarSenha(ctx.sessao.email, resultado.data.senha))) {
    return { status: "erro", mensagem: SENHA_ERRADA, erros: { senha: "Senha incorreta." }, valores };
  }
  const { error } = await ctx.supabase.rpc("estornar_pagamento", {
    p_pagamento: resultado.data.pagamento_id,
    p_motivo: resultado.data.motivo,
  });
  if (error) {
    console.error("[pagamentos] estornar", error.message);
    return { status: "erro", mensagem: erroPagamento(error.message), valores };
  }
  revalidatePath("/app", "layout");
  return { status: "sucesso", mensagem: "Pagamento estornado. O recibo foi cancelado." };
}

// ---------- Modelo de contrato e dados do escritório ----------

export async function salvarModeloContrato(id: string, corpo: string): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(id)) return { erro: "Modelo não encontrado." };
  if (corpo.trim().length < 50) return { erro: "O modelo está curto demais." };
  if (corpo.length > LIMITE_TEXTO) return { erro: "O modelo passou do limite de 60 mil caracteres." };

  const { error, count } = await ctx.supabase
    .from("modelos_contrato")
    .update({ corpo, atualizado_em: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error || !count) {
    console.error("[contratos] salvar modelo", error?.message);
    return { erro: "Não foi possível salvar o modelo. Tente de novo." };
  }
  revalidatePath("/app/contratos/modelo");
  return { ok: true };
}

// ---------- Vários modelos: um para cada tipo de projeto ----------

// Novo modelo a partir do texto pronto de interiores ou de uma cópia do padrão.
export async function criarModeloContrato(base: "interiores" | "copia") {
  const ctx = await contexto();
  if (!ctx) return;
  const { supabase, sessao } = ctx;

  let corpo: string | null = null;
  if (base === "interiores") {
    const { data } = await supabase.rpc("texto_contrato_interiores");
    corpo = data as string | null;
  } else {
    await supabase.rpc("garantir_modelo_contrato");
    const { data } = await supabase.from("modelos_contrato").select("corpo").eq("padrao", true).maybeSingle();
    corpo = data?.corpo ?? null;
  }
  if (!corpo) return;

  // Já marca o serviço "Interiores" do escritório, se existir.
  let servicos: string[] = [];
  if (base === "interiores") {
    const { data } = await supabase.from("servicos").select("id, nome");
    servicos = (data ?? []).filter((s) => /interior/i.test(s.nome)).map((s) => s.id);
  }

  // Nome sem repetir o de outro modelo: "Novo modelo (2)".
  const { data: existentes } = await supabase.from("modelos_contrato").select("nome");
  const { data: novo, error } = await supabase
    .from("modelos_contrato")
    .insert({
      escritorio_id: sessao.escritorio.id,
      nome: nomeLivre(base === "interiores" ? "Design de interiores" : "Novo modelo", (existentes ?? []).map((m) => m.nome as string)),
      corpo,
      servicos,
    })
    .select("id")
    .single();
  if (error || !novo) {
    console.error("[contratos] criar modelo", error?.message);
    return;
  }
  revalidatePath("/app/contratos/modelo");
  redirect(`/app/contratos/modelo?id=${novo.id}`);
}

const esquemaConfigModelo = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao modelo.").max(80, "Use até 80 caracteres."),
});

export async function salvarConfigModelo(
  id: string,
  padrao: boolean,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaConfigModelo.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const servicos = formData.getAll("servicos").filter((v): v is string => typeof v === "string" && UUID.test(v));
  if (!padrao && servicos.length === 0) {
    return { status: "erro", mensagem: "Marque pelo menos um serviço para este modelo.", valores };
  }

  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return { ...SEM_SUPABASE, valores };
  const { error } = await ctx.supabase
    .from("modelos_contrato")
    .update({ nome: resultado.data.nome, servicos: padrao ? [] : servicos, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (ehRepetido(error)) {
    const { data: existentes } = await ctx.supabase.from("modelos_contrato").select("nome");
    const msg = mensagemNomeRepetido("um modelo", resultado.data.nome, nomeLivre(resultado.data.nome, (existentes ?? []).map((m) => m.nome as string)));
    return { status: "erro", mensagem: msg, erros: { nome: msg }, valores };
  }
  if (error) {
    console.error("[contratos] config modelo", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  revalidatePath("/app/contratos/modelo");
  return { status: "sucesso", mensagem: "Modelo salvo." };
}

export async function excluirModeloContrato(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  // O banco não deixa apagar o padrão (RLS).
  const { error } = await ctx.supabase.from("modelos_contrato").delete().eq("id", id).eq("padrao", false);
  if (error) console.error("[contratos] excluir modelo", error.message);
  revalidatePath("/app/contratos/modelo");
  redirect("/app/contratos/modelo");
}

// Troca o modelo de um contrato ainda em rascunho: o texto dele é substituído.
export async function trocarModeloContrato(contratoId: string, modeloId: string): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(contratoId) || !UUID.test(modeloId)) return { erro: "Modelo não encontrado." };
  const { error } = await ctx.supabase.rpc("trocar_modelo_contrato", { p_contrato: contratoId, p_modelo: modeloId });
  if (error) {
    console.error("[contratos] trocar modelo", error.message);
    return { erro: error.message.includes("contrato_fechado") ? "Contrato já enviado: o texto não muda mais." : "Não foi possível trocar o modelo." };
  }
  revalidatePath(`/app/contratos/${contratoId}`);
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
      .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF (11 números) ou CNPJ (14 números).")
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
