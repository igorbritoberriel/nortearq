"use server";

import { revalidatePath } from "next/cache";
import { lerNumero } from "@/lib/formatacao";
import { redirect } from "next/navigation";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { CAMPOS_CONTEUDO, COLUNAS_MODELO, combinarModelos, semNulos, type ModeloProposta } from "@/lib/modelos-proposta";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehRepetido, mensagemNomeRepetido, nomeLivre } from "@/lib/nomes";

// Modelos de proposta: salvar uma proposta como modelo, aplicar um modelo num rascunho e gerenciar.

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esquemaDados = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome ao modelo.").max(80, "Use até 80 caracteres."),
    servicos: z.array(z.string().regex(UUID)).min(1, "Marque pelo menos um serviço."),
    preco_tipo: z.enum(["vazio", "fixo", "m2"]),
    preco_valor: z.number().positive("Informe o valor.").max(100_000_000).nullable(),
  })
  .refine((d) => d.preco_tipo === "vazio" || d.preco_valor !== null, {
    message: "Informe o valor.",
    path: ["preco_valor"],
  });

function lerDados(formData: FormData) {
  const valor = lerNumero(String(formData.get("preco_valor") ?? ""));
  return esquemaDados.safeParse({
    nome: formData.get("nome"),
    servicos: formData.getAll("servicos").filter((v): v is string => typeof v === "string"),
    preco_tipo: formData.get("preco_tipo"),
    preco_valor: valor,
  });
}

// "Salvar como modelo": cria um modelo novo ou substitui um existente com o conteúdo desta proposta.
export async function salvarComoModelo(
  propostaId: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  for (const id of formData.getAll("servicos")) valores[`servico_${id}`] = "on";
  const resultado = lerDados(formData);
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx || !UUID.test(propostaId)) return { ...SEM_SUPABASE, valores };

  const { data: proposta } = await ctx.supabase.from("propostas").select(CAMPOS_CONTEUDO.join(", ")).eq("id", propostaId).maybeSingle();
  if (!proposta) return { status: "erro", mensagem: "Proposta não encontrada.", valores };

  const d = resultado.data;
  const registro = {
    ...(proposta as unknown as Record<string, unknown>),
    nome: d.nome,
    servicos: d.servicos,
    preco_tipo: d.preco_tipo,
    preco_valor: d.preco_tipo === "vazio" ? null : d.preco_valor,
    atualizado_em: new Date().toISOString(),
  };

  const substituir = String(formData.get("substituir") ?? "");
  const { error } = UUID.test(substituir)
    ? await ctx.supabase.from("modelos_proposta").update(registro).eq("id", substituir)
    : await ctx.supabase.from("modelos_proposta").insert({ ...registro, escritorio_id: ctx.sessao.escritorio.id });
  if (ehRepetido(error)) return nomeModeloRepetido(ctx.supabase, d.nome, valores);
  if (error) {
    console.error("[modelos] salvar", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar o modelo. Tente de novo.", valores };
  }
  revalidatePath("/app/propostas/modelos");
  return {
    status: "sucesso",
    mensagem: UUID.test(substituir)
      ? `Modelo "${d.nome}" atualizado. Vale para as próximas propostas.`
      : `Modelo "${d.nome}" criado. As próximas propostas desses serviços já começam com ele.`,
  };
}

// Troca o conteúdo de um rascunho pelo de um modelo (ou volta ao em branco).
export async function aplicarModelo(propostaId: string, modeloId: string | null): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(propostaId)) return { erro: SEM_SUPABASE.mensagem! };

  const { data: p } = await ctx.supabase
    .from("propostas")
    .select("status, cliente:clientes(servicos, contato:contatos!clientes_contato_id_fkey(area_m2))")
    .eq("id", propostaId)
    .maybeSingle();
  if (!p || p.status !== "rascunho") return { erro: "Só dá para trocar o modelo de uma proposta em rascunho." };

  const agora = new Date().toISOString();
  let dados: Record<string, unknown>;
  if (modeloId && UUID.test(modeloId)) {
    const { data: m } = await ctx.supabase.from("modelos_proposta").select(COLUNAS_MODELO).eq("id", modeloId).maybeSingle();
    if (!m) return { erro: "Modelo não encontrado." };
    const cliente = p.cliente as unknown as { contato: { area_m2: number | null } | null } | null;
    const area = Number(cliente?.contato?.area_m2) || null;
    const { conteudo, origem } = combinarModelos([m as unknown as ModeloProposta], area);
    // Campos vazios do modelo não apagam os padrões; o valor vem do modelo (ou fica em branco).
    dados = { ...semNulos(conteudo), valor_total: conteudo.valor_total, modelo_origem: origem, modelo_aplicado_em: agora };
  } else {
    // Em branco: mantém só os serviços do cliente e o parcelamento padrão do escritório.
    const e = ctx.sessao.escritorio;
    dados = {
      titulo: "Proposta de projeto",
      escopo: null,
      nao_incluido: null,
      prazo: null,
      valor_total: null,
      parcelas: [],
      modo_pagamento: "parcelado",
      entrada_pct: e.parcelamento_entrada_pct,
      parcelas_max: e.parcelamento_max,
      desconto_avista_pct: Number(e.desconto_avista_pct ?? 0) || null,
      modelo_origem: null,
      modelo_aplicado_em: agora,
    };
  }

  const { error } = await ctx.supabase.from("propostas").update(dados).eq("id", propostaId).eq("status", "rascunho");
  if (error) {
    console.error("[modelos] aplicar", error.message);
    return { erro: "Não foi possível aplicar o modelo." };
  }
  revalidatePath(`/app/propostas/${propostaId}`);
  return { ok: true };
}

// Tela de modelos: nome, serviços e valor.
export async function salvarDadosModelo(id: string, _anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  for (const s of formData.getAll("servicos")) valores[`servico_${s}`] = "on";
  const resultado = lerDados(formData);
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return { ...SEM_SUPABASE, valores };
  const d = resultado.data;
  const { error } = await ctx.supabase
    .from("modelos_proposta")
    .update({
      nome: d.nome,
      servicos: d.servicos,
      preco_tipo: d.preco_tipo,
      preco_valor: d.preco_tipo === "vazio" ? null : d.preco_valor,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (ehRepetido(error)) return nomeModeloRepetido(ctx.supabase, d.nome, valores);
  if (error) return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  revalidatePath("/app/propostas/modelos");
  return { status: "sucesso", mensagem: "Modelo salvo." };
}

export async function excluirModeloProposta(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { error } = await ctx.supabase.from("modelos_proposta").delete().eq("id", id);
  if (error) console.error("[modelos] excluir", error.message);
  revalidatePath("/app/propostas/modelos");
  redirect("/app/propostas/modelos");
}

// Nome repetido (o banco recusa): sugere o próximo livre.
async function nomeModeloRepetido(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteServidor>>>,
  nome: string,
  valores: Record<string, string>,
): Promise<EstadoFormulario> {
  const { data } = await supabase.from("modelos_proposta").select("nome");
  const msg = mensagemNomeRepetido("um modelo", nome, nomeLivre(nome, (data ?? []).map((m) => m.nome as string)));
  return { status: "erro", mensagem: msg, erros: { nome: msg }, valores };
}
