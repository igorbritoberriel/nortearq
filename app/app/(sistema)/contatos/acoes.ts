"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOTIVOS_ENCERRAMENTO, statusDoFiltro, type MotivoEncerramento } from "@/lib/contatos";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { SEM_SUPABASE, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Andamento dos contatos (módulo 01). O banco (RLS) garante que só o escritório dono altera.

async function cliente() {
  const supabase = await criarClienteServidor();
  if (supabase) await obterSessaoArquiteto();
  return supabase;
}

async function atualizar(id: string, dados: Record<string, unknown>): Promise<EstadoFormulario> {
  const supabase = await cliente();
  if (!supabase) return SEM_SUPABASE;
  const { error } = await supabase.from("contatos").update(dados).eq("id", id);
  if (error) {
    console.error("[contatos]", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/app", "layout");
  return { status: "sucesso" };
}

const esquemaEncerrar = z.object({
  id: z.uuid(),
  motivo: z.enum(Object.keys(MOTIVOS_ENCERRAMENTO) as [MotivoEncerramento, ...MotivoEncerramento[]], "Escolha o motivo."),
  observacao: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
});

// RN-01.4: encerrar exige motivo.
export async function encerrarContato(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const resultado = esquemaEncerrar.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: resultado.error.issues[0]?.message ?? "Confira os dados." };
  }
  const { id, motivo, observacao } = resultado.data;
  return atualizar(id, {
    status: "encerrado",
    motivo_encerramento: motivo,
    observacao_encerramento: observacao || null,
  });
}

// Volta para a classificação que o filtro (ou o arquiteto) tinha dado.
export async function reabrirContato(id: string, compativel: boolean | null) {
  await atualizar(id, {
    status: statusDoFiltro(compativel),
    motivo_encerramento: null,
    observacao_encerramento: null,
  });
}

// RN-01.3: o filtro só sinaliza; o arquiteto pode reclassificar.
export async function reclassificarContato(id: string, compativel: boolean | null) {
  await atualizar(id, { status: statusDoFiltro(compativel), compativel });
}

// Tira o selo "Novo" dos contatos que o arquiteto já viu na lista.
// Sem revalidatePath: o selo continua na tela aberta e some na próxima visita.
export async function marcarVistos(ids: string[]) {
  const supabase = await cliente();
  if (!supabase || ids.length === 0) return;
  const validos = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 200);
  await supabase.from("contatos").update({ visto_em: new Date().toISOString() }).in("id", validos).is("visto_em", null);
}
