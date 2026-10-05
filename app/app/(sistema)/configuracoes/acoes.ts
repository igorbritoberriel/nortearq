"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TIPOS_PIX, normalizarChave, type TipoPix } from "@/lib/pix";

// Parcelamento padrão das propostas: vale para as próximas propostas, e cada uma pode mudar.
const esquema = z.object({
  parcelamento_entrada_pct: z.coerce
    .number("Informe a porcentagem.")
    .min(0, "Mínimo de 0%.")
    .max(90, "Máximo de 90%."),
  parcelamento_max: z.coerce.number().int().min(1, "Mínimo de 1x.").max(24, "Máximo de 24x."),
  // Desconto para pagamento à vista: 0 = sem a opção. Até 30% para evitar erro de digitação.
  desconto_avista_pct: z.coerce.number("Informe a porcentagem.").min(0, "Mínimo de 0%.").max(30, "Máximo de 30%."),
});

export async function salvarParcelamento(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquema.safeParse({
    parcelamento_entrada_pct: String(formData.get("parcelamento_entrada_pct") ?? "").replace(",", "."),
    parcelamento_max: formData.get("parcelamento_max"),
    desconto_avista_pct: String(formData.get("desconto_avista_pct") || "0").replace(",", "."),
  });
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  if (!supabase || !sessao) return { ...SEM_SUPABASE, valores };

  const { error } = await supabase.from("escritorios").update(resultado.data).eq("id", sessao.escritorio.id);
  if (error) {
    console.error("[configurações] parcelamento", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  revalidatePath("/app", "layout");
  return { status: "sucesso", mensagem: "Parcelamento salvo. Vale para as próximas propostas." };
}

// Chave Pix do escritório (0037). Tipo vazio = tira o Pix das parcelas.
export async function salvarPix(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const tipo = String(formData.get("pix_tipo") ?? "");
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  if (!supabase || !sessao) return { ...SEM_SUPABASE, valores };

  let dados: { pix_tipo: TipoPix | null; pix_chave: string | null; pix_nome: string | null; pix_cidade: string | null };
  if (!tipo) {
    dados = { pix_tipo: null, pix_chave: null, pix_nome: null, pix_cidade: null };
  } else {
    const erros: Record<string, string> = {};
    if (!(tipo in TIPOS_PIX)) erros.pix_tipo = "Escolha o tipo de chave.";
    const chave = tipo in TIPOS_PIX ? normalizarChave(tipo as TipoPix, String(formData.get("pix_chave") ?? "")) : null;
    if (!chave) erros.pix_chave = "Confira a chave: ela não bate com o tipo escolhido.";
    const nome = String(formData.get("pix_nome") ?? "").trim();
    const cidade = String(formData.get("pix_cidade") ?? "").trim();
    if (nome.length < 2 || nome.length > 25) erros.pix_nome = "De 2 a 25 letras.";
    if (cidade.length < 2 || cidade.length > 15) erros.pix_cidade = "De 2 a 15 letras.";
    if (Object.keys(erros).length) return { status: "erro", mensagem: "Confira os campos destacados.", erros, valores };
    dados = { pix_tipo: tipo as TipoPix, pix_chave: chave, pix_nome: nome, pix_cidade: cidade };
  }

  // Só o dono grava (migração 0041): a chave decide para onde vai o dinheiro das parcelas.
  const { error } = await supabase.rpc("salvar_pix", {
    p_tipo: dados.pix_tipo,
    p_chave: dados.pix_chave,
    p_nome: dados.pix_nome,
    p_cidade: dados.pix_cidade,
  });
  if (error) {
    console.error("[configurações] pix", error.message);
    if (error.message.includes("so_dono")) return { status: "erro", mensagem: "Só o dono do escritório pode mudar a chave Pix.", valores };
    if (error.message.includes("assinatura_pendente"))
      return { status: "erro", mensagem: "Sua assinatura está pendente: o sistema está só para consulta.", valores };
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  revalidatePath("/app", "layout");
  return {
    status: "sucesso",
    mensagem: tipo ? "Pix salvo. As parcelas em aberto já mostram o Pix para o cliente." : "Pix removido das parcelas.",
  };
}
