"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export type CampoListaEspera = "nome" | "email" | "whatsapp" | "cidade" | "perfil" | "aceite";

export type EstadoListaEspera = {
  status: "inicial" | "sucesso" | "erro";
  mensagem?: string;
  erros?: Partial<Record<CampoListaEspera, string>>;
  valores?: Record<string, string>; // devolvidos para o formulário não perder o que foi digitado
  nome?: string;
};

const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), esquema.optional());

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  whatsapp: opcional(
    z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length >= 10 && v.length <= 13, "Informe o WhatsApp com DDD."),
  ),
  cidade: opcional(z.string().trim().max(80, "Use até 80 caracteres.")),
  perfil: z.enum(["autonomo", "escritorio_pequeno", "escritorio_grande", "estudante"], "Escolha uma opção."),
  maior_dor: opcional(z.enum(["briefing", "proposta_contrato", "aprovacoes", "revisoes_visitas", "outro"])),
  plano_interesse: opcional(z.enum(["briefing", "profissional", "escritorio"])),
  aceita_conversa: z.preprocess((v) => v === "on", z.boolean()),
  aceite: z.literal("on", "É preciso aceitar a política de privacidade."),
  utm_source: opcional(z.string().max(100)),
  utm_medium: opcional(z.string().max(100)),
  utm_campaign: opcional(z.string().max(100)),
});

export async function entrarNaListaEspera(
  _anterior: EstadoListaEspera,
  formData: FormData,
): Promise<EstadoListaEspera> {
  const valores = Object.fromEntries(
    [...formData.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );

  // Campo invisível: só robôs preenchem. Finge sucesso para não dar pista.
  if (valores.site) return { status: "sucesso" };

  const resultado = esquema.safeParse(valores);
  if (!resultado.success) {
    const erros: EstadoListaEspera["erros"] = {};
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0] as CampoListaEspera;
      erros[campo] ??= problema.message;
    }
    return { status: "erro", mensagem: "Confira os campos destacados.", erros, valores };
  }

  const { aceite: _aceite, ...dados } = resultado.data;
  const primeiroNome = dados.nome.split(" ")[0];

  const supabase = await criarClienteServidor();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[lista de espera] Supabase não configurado; inscrição não salva:", dados);
      return { status: "sucesso", nome: primeiroNome };
    }
    return { status: "erro", mensagem: "Não foi possível salvar agora. Tente de novo em instantes.", valores };
  }

  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0].trim() ?? cabecalhos.get("x-real-ip");

  const { error } = await supabase.from("lista_espera").insert({
    ...dados,
    aceite_privacidade_em: new Date().toISOString(),
    ip,
  });

  // 23505 = e-mail já inscrito. Para quem preencheu, o resultado é o mesmo.
  if (error && error.code !== "23505") {
    console.error("[lista de espera]", error);
    return { status: "erro", mensagem: "Não foi possível salvar agora. Tente de novo em instantes.", valores };
  }

  return { status: "sucesso", nome: primeiroNome };
}
