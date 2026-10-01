"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { avisarNovoContato } from "@/lib/avisos";
import { PRAZOS } from "@/lib/contatos";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Pedido de orçamento enviado pelo formulário público do escritório (RN-01.1).
// A classificação (compatível, fora do perfil, a avaliar) é feita pelo banco: função enviar_contato.

const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), esquema.optional());

// "R$ 15.000,50" -> 15000.5
const numeroBr = (mensagem: string) =>
  z
    .string()
    .transform((v) => Number(v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v > 0 && v < 1_000_000_000, mensagem);

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe o WhatsApp com DDD."),
  email: opcional(z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."))),
  area_m2: opcional(numeroBr("Informe a área em m², como 80.")),
  localizacao: opcional(z.string().trim().max(120, "Use até 120 caracteres.")),
  orcamento: opcional(numeroBr("Informe um valor em reais, como 30.000.")),
  prazo: z.enum(PRAZOS.map((p) => p.valor) as [string, ...string[]], "Escolha uma opção."),
  mensagem: opcional(z.string().trim().max(2000, "Use até 2.000 caracteres.")),
  aceite: z.literal("on", "É preciso aceitar a política de privacidade."),
});

function somarMeses(meses: number) {
  const data = new Date();
  data.setMonth(data.getMonth() + meses);
  return data.toISOString().slice(0, 10);
}

export async function enviarContato(
  slug: string,
  temServicos: boolean,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  for (const id of formData.getAll("servicos")) valores[`servico_${id}`] = "on";

  // Campo invisível: só robôs preenchem. Finge sucesso para não dar pista.
  if (valores.site) return { status: "sucesso" };

  const resultado = esquema.safeParse(Object.fromEntries(formData));
  const servicos = formData.getAll("servicos").filter((v): v is string => typeof v === "string");
  const erros = resultado.success ? {} : errosDe(resultado.error.issues);
  if (temServicos && servicos.length === 0) erros.servicos = "Marque pelo menos um serviço.";
  if (!resultado.success || Object.keys(erros).length) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros, valores };
  }

  const supabase = await criarClienteServidor();
  if (!supabase) return { ...SEM_SUPABASE, valores };

  const d = resultado.data;
  const prazo = PRAZOS.find((p) => p.valor === d.prazo)!;
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? null;

  const { data: contatoId, error } = await supabase.rpc("enviar_contato", {
    p_slug: slug,
    p_nome: d.nome,
    p_whatsapp: d.whatsapp,
    p_email: d.email ?? null,
    p_servicos: servicos,
    p_area_m2: d.area_m2 ?? null,
    p_localizacao: d.localizacao ?? null,
    p_orcamento: d.orcamento ?? null,
    p_prazo_desejado: prazo.rotulo,
    p_inicio_desejado: prazo.meses === null ? null : somarMeses(prazo.meses),
    p_mensagem: d.mensagem ?? null,
    p_ip: ip,
  });

  if (error) {
    // Pedido repetido em menos de 10 minutos: o primeiro já chegou.
    if (error.message.includes("pedido_repetido")) return { status: "sucesso" };
    console.error("[contato]", error.code, error.message);
    return { status: "erro", mensagem: "Não foi possível enviar agora. Tente de novo em instantes.", valores };
  }

  // Aviso por e-mail ao arquiteto, depois de responder ao visitante.
  if (contatoId) after(() => avisarNovoContato(contatoId as string));
  return { status: "sucesso" };
}
