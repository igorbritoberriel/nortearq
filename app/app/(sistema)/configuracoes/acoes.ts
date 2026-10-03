"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

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
