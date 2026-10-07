"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeBrasilia, modulosLiberados } from "@/lib/assinatura";
import { pode } from "@/lib/permissoes";
import { dataValida, lerNumero } from "@/lib/formatacao";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";
const date = z.string().refine(dataValida, "Informe uma data válida.");
const schema = z.object({ id: z.uuid(), descricao: z.string().trim().min(3,"Descreva a despesa.").max(160), fornecedor: z.string().trim().max(120), categoria: z.enum(["fornecedor","servico","escritorio","software","deslocamento","imposto","outros"]), valor: z.string().transform(lerNumero).refine(n => n !== null && Number.isFinite(n) && n > 0 && n <= 100000000, "Informe um valor válido."), vencimento: date, pago_em: z.string().refine(s => !s || dataValida(s) && s <= hojeBrasilia(), "A data de pagamento deve ser válida e não pode ser futura."), observacao: z.string().trim().max(1000) });
async function contexto() {
  const sessao = await obterSessaoArquiteto(), db = await criarClienteServidor();
  if (!sessao || !db || !pode(sessao.membro.papel,"registrar_pagamento") || !modulosLiberados(sessao.escritorio.plano).includes("01") || ["leitura","suspenso"].includes(sessao.situacao)) return null;
  return { sessao, db };
}
export async function salvarDespesa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(form), parsed = schema.safeParse(valores);
  if (!parsed.success) return { status:"erro", mensagem:"Confira os campos destacados.", erros:errosDe(parsed.error.issues), valores };
  const ctx = await contexto();
  if (!ctx) return { status:"erro", mensagem:"Você não tem permissão para registrar despesas." };
  const p = parsed.data, payload = { ...p, escritorio_id:ctx.sessao.escritorio.id, fornecedor:p.fornecedor || null, pago_em:p.pago_em || null, observacao:p.observacao || null };
  const { error } = await ctx.db.from("financeiro_despesas").insert(payload);
  if (error) {
    if (error.code === "23505") {
      const {data:existente} = await ctx.db.from("financeiro_despesas").select("id,descricao,fornecedor,categoria,valor,vencimento,pago_em,observacao,cancelada_em").eq("id",p.id).eq("escritorio_id",ctx.sessao.escritorio.id).maybeSingle();
      if (existente && !existente.cancelada_em && existente.descricao===p.descricao && Number(existente.valor)===p.valor && existente.categoria===p.categoria && existente.fornecedor===payload.fornecedor && existente.vencimento===p.vencimento && existente.pago_em===payload.pago_em && existente.observacao===payload.observacao) { revalidatePath("/app/financeiro"); return {status:"sucesso",mensagem:"Despesa registrada."}; }
    }
    return { status:"erro", mensagem:"Não foi possível salvar a despesa. Tente novamente.", valores };
  }
  revalidatePath("/app/financeiro");
  return { status:"sucesso", mensagem:"Despesa registrada." };
}
export async function pagarDespesa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const parsed = z.object({id:z.uuid(),pago_em:date.refine(d=>d<=hojeBrasilia(),"A data não pode ser futura.")}).safeParse(valoresDe(form));
  if (!parsed.success) return {status:"erro",mensagem:"Confira a data do pagamento.",erros:errosDe(parsed.error.issues)};
  const ctx=await contexto(); if(!ctx)return{status:"erro",mensagem:"Você não tem permissão para registrar despesas."};
  const {data,error}=await ctx.db.from("financeiro_despesas").update({pago_em:parsed.data.pago_em}).eq("id",parsed.data.id).eq("escritorio_id",ctx.sessao.escritorio.id).is("cancelada_em",null).is("pago_em",null).select("id").maybeSingle();
  if(error||!data)return{status:"erro",mensagem:"A despesa não foi atualizada. Confira se já foi paga ou cancelada."};
  revalidatePath("/app/financeiro"); return{status:"sucesso",mensagem:"Pagamento da despesa registrado."};
}
export async function cancelarDespesa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const parsed=z.object({id:z.uuid(),motivo:z.string().trim().min(5,"Explique o motivo.").max(300)}).safeParse(valoresDe(form));
  if(!parsed.success)return{status:"erro",mensagem:"Informe o motivo do cancelamento.",erros:errosDe(parsed.error.issues)};
  const ctx=await contexto(); if(!ctx)return{status:"erro",mensagem:"Você não tem permissão para cancelar despesas."};
  const {data,error}=await ctx.db.from("financeiro_despesas").update({cancelada_em:new Date().toISOString(),motivo_cancelamento:parsed.data.motivo}).eq("id",parsed.data.id).eq("escritorio_id",ctx.sessao.escritorio.id).is("cancelada_em",null).select("id").maybeSingle();
  if(error||!data)return{status:"erro",mensagem:"Não foi possível cancelar esta despesa."};
  revalidatePath("/app/financeiro"); return{status:"sucesso",mensagem:"Despesa cancelada. O histórico foi preservado."};
}
