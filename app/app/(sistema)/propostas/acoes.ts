"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { linkDoCliente } from "@/lib/clientes";
import { listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE } from "@/lib/formulario";
import { somaParcelas } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Propostas do escritório (RN-01.6 a RN-01.8). O banco só deixa editar rascunho;
// enviar e criar versão passam por funções do banco.

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textoOpcional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max, `Use até ${max} caracteres.`).nullable());

const esquema = z.object({
  titulo: z.string().trim().min(3, "Dê um título à proposta.").max(120, "Use até 120 caracteres."),
  escopo: textoOpcional(3000),
  itens: z
    .array(
      z.object({
        servico: z.string().trim().min(2, "Dê nome ao serviço.").max(120),
        escopo: z.string().trim().max(4000, "Use até 4.000 caracteres."),
        entregaveis: z.array(z.string().trim().min(1).max(200)).max(40),
      }),
    )
    .min(1, "Inclua pelo menos um serviço.")
    .max(10),
  valor_total: z.number("Informe o valor total.").positive("Informe o valor total.").max(100_000_000),
  parcelas: z
    .array(z.object({ descricao: z.string().trim().min(2, "Descreva a parcela.").max(120), valor: z.number().positive("Valor da parcela.") }))
    .max(24),
  modo_pagamento: z.enum(["manual", "parcelado"]),
  entrada_pct: z.number("Informe a entrada.").min(0, "Mínimo de 0%.").max(90, "Máximo de 90%.").nullable(),
  parcelas_max: z.number().int().min(1).max(24).nullable(),
  forma_pagamento: textoOpcional(1000),
  prazo: textoOpcional(300),
  revisoes_incluidas: z.number().int().min(0).max(50),
  visitas_incluidas: z.number().int().min(0).max(200),
  nao_incluido: textoOpcional(3000),
  deslocamento_tipo: z.enum(["incluido", "fixo", "km", "reembolso"], "Escolha como o deslocamento é cobrado."),
  deslocamento_valor: z.number().positive("Informe o valor.").max(100_000).nullable(),
  deslocamento_cidade: textoOpcional(80),
  deslocamento_obs: textoOpcional(500),
  validade_dias: z.number().int().min(1, "Mínimo de 1 dia.").max(90, "Máximo de 90 dias."),
})
  .superRefine((d, ctx) => {
    if (d.modo_pagamento === "parcelado" && (d.entrada_pct === null || !d.parcelas_max)) {
      ctx.addIssue({ code: "custom", path: ["entrada_pct"], message: "Informe a entrada e o máximo de parcelas." });
    }
    if ((d.deslocamento_tipo === "fixo" || d.deslocamento_tipo === "km") && !d.deslocamento_valor) {
      ctx.addIssue({ code: "custom", path: ["deslocamento_valor"], message: "Informe o valor do deslocamento." });
    }
  });

export type DadosProposta = z.input<typeof esquema>;
type Resultado = { ok: true } | { erro: string; erros?: Record<string, string> };

// Cria um rascunho com os serviços do cliente já listados. Se já existe rascunho, abre ele.
export async function criarProposta(clienteId: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(clienteId)) return;

  const { data: rascunho } = await ctx.supabase
    .from("propostas")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("status", "rascunho")
    .limit(1)
    .maybeSingle();
  if (rascunho) redirect(`/app/propostas/${rascunho.id}`);

  const [{ data: cliente }, servicos] = await Promise.all([
    ctx.supabase.from("clientes").select("servicos").eq("id", clienteId).maybeSingle(),
    listarServicos(),
  ]);
  if (!cliente) return;
  const doCliente = servicos.filter((s) => (cliente.servicos as string[]).includes(s.id));

  const { data, error } = await ctx.supabase
    .from("propostas")
    .insert({
      escritorio_id: ctx.sessao.escritorio.id,
      cliente_id: clienteId,
      itens: (doCliente.length ? doCliente : [{ nome: "" }]).map((s) => ({ servico: s.nome, escopo: "", entregaveis: [] })),
      forma_pagamento: "Pagamento por Pix ou transferência bancária.",
      modo_pagamento: "parcelado",
      entrada_pct: ctx.sessao.escritorio.parcelamento_entrada_pct,
      parcelas_max: ctx.sessao.escritorio.parcelamento_max,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[propostas] criar", error.message);
    return;
  }
  revalidatePath("/app/propostas");
  redirect(`/app/propostas/${data.id}`);
}

export async function salvarProposta(id: string, dados: DadosProposta): Promise<Resultado> {
  const resultado = esquema.safeParse(dados);
  if (!resultado.success) {
    const erros: Record<string, string> = {};
    for (const problema of resultado.error.issues) erros[problema.path.join(".")] ??= problema.message;
    return { erro: "Confira os campos destacados.", erros: { ...errosDe(resultado.error.issues), ...erros } };
  }
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(id)) return { erro: "Proposta não encontrada." };

  const { error, count } = await ctx.supabase
    .from("propostas")
    .update(
      {
        ...resultado.data,
        parcelas: resultado.data.modo_pagamento === "parcelado" ? [] : resultado.data.parcelas,
        atualizado_em: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "rascunho");
  if (error || !count) {
    console.error("[propostas] salvar", error?.message);
    return { erro: "Não foi possível salvar. Se a proposta já foi enviada, crie uma nova versão." };
  }
  revalidatePath(`/app/propostas/${id}`);
  return { ok: true };
}

// Fecha a versão (não edita mais, RN-01.7) e gera o link para o WhatsApp.
export async function enviarProposta(id: string): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(id)) return { erro: "Proposta não encontrada." };

  const { data: p } = await ctx.supabase.from("propostas").select("valor_total, parcelas, modo_pagamento").eq("id", id).maybeSingle();
  if (p?.modo_pagamento === "manual" && p?.parcelas?.length && Math.abs(somaParcelas(p.parcelas) - Number(p.valor_total)) >= 0.01) {
    return { erro: "A soma das parcelas está diferente do valor total. Ajuste antes de enviar." };
  }

  const { data, error } = await ctx.supabase.rpc("enviar_proposta", { p_proposta: id });
  if (error || !data) {
    console.error("[propostas] enviar", error?.message);
    if (error?.message.includes("proposta_incompleta")) return { erro: "Preencha o valor total e pelo menos um serviço." };
    if (error?.message.includes("proposta_respondida")) return { erro: "O cliente já respondeu esta proposta." };
    if (error?.message.includes("parcelamento_invalido")) return { erro: "Confira a entrada (0 a 90%) e o máximo de parcelas." };
    return { erro: "Não foi possível enviar. Tente de novo." };
  }
  revalidatePath("/app", "layout");
  return { link: linkDoCliente(urlDoSite(), data as string, "proposta") };
}

export async function novaVersao(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { data, error } = await ctx.supabase.rpc("nova_versao_proposta", { p_proposta: id });
  if (error || !data) {
    console.error("[propostas] nova versão", error?.message);
    return;
  }
  revalidatePath("/app/propostas");
  redirect(`/app/propostas/${data}`);
}

export async function excluirRascunho(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { error } = await ctx.supabase.from("propostas").delete().eq("id", id).eq("status", "rascunho");
  if (error) {
    console.error("[propostas] excluir", error.message);
    return;
  }
  revalidatePath("/app/propostas");
  redirect("/app/propostas");
}
