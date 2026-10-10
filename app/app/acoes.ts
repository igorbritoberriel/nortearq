"use server";

import { revalidatePath } from "next/cache";
import { lerNumero, dataValida } from "@/lib/formatacao";
import { redirect } from "next/navigation";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { destinoSeguro, errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Configurações do escritório (módulo 00). Usadas pelo assistente inicial (/app/onboarding)
// e pela tela de Configurações. Com o campo "proximo", a ação leva ao passo seguinte;
// sem ele, fica na mesma tela e mostra "Salvo".

const TIPOS_LOGO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const TAMANHO_MAX_LOGO = 2 * 1024 * 1024;

async function concluir(formData: FormData): Promise<EstadoFormulario> {
  revalidatePath("/app", "layout");
  const proximo = formData.get("proximo");
  if (typeof proximo === "string" && proximo) redirect(destinoSeguro(proximo, "/app"));
  return { status: "sucesso", mensagem: "Alterações salvas." };
}

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

// "R$ 15.000,50" -> 15000.5
function lerValor(texto: string) {
  return lerNumero(texto);
}

// ---------- Marca: nome, endereço do link, cor e logo ----------

const esquemaMarca = z.object({
  nome: z.string().trim().min(2, "Informe o nome do escritório.").max(120, "Use até 120 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use pelo menos 3 caracteres.")
    .max(60, "Use até 60 caracteres.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífen (sem acento ou espaço)."),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor."),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Informe o WhatsApp com DDD."),
});

export async function salvarMarca(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaMarca.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  const { supabase, sessao } = ctx;
  const escritorio = sessao.escritorio;

  let logo_url = escritorio.logo_url;
  const arquivo = formData.get("logo");
  const logoAntiga = escritorio.logo_url;

  if (arquivo instanceof File && arquivo.size > 0) {
    const extensao = TIPOS_LOGO[arquivo.type];
    if (!extensao) {
      return { status: "erro", mensagem: "Confira a logo.", erros: { logo: "Envie PNG, JPG ou WEBP." }, valores };
    }
    if (arquivo.size > TAMANHO_MAX_LOGO) {
      return { status: "erro", mensagem: "Confira a logo.", erros: { logo: "A logo pode ter até 2 MB." }, valores };
    }
    // Nome novo a cada envio: a logo antiga não fica presa no cache do navegador.
    const caminho = `${escritorio.id}/logo-${Date.now()}.${extensao}`;
    const { error } = await supabase.storage.from("marcas").upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) {
      console.error("[marca] upload", error.message);
      return { status: "erro", mensagem: "Não foi possível enviar a logo. Tente de novo.", valores };
    }
    logo_url = supabase.storage.from("marcas").getPublicUrl(caminho).data.publicUrl;
  } else if (formData.get("remover_logo") === "on") {
    logo_url = null;
  }

  const { nome, slug, cor_primaria, whatsapp } = resultado.data;
  const { error } = await supabase
    .from("escritorios")
    .update({ nome, slug, cor_primaria, whatsapp: whatsapp || null, logo_url })
    .eq("id", escritorio.id);

  if (error) {
    if (error.code === "23505") {
      return {
        status: "erro",
        mensagem: "Confira os campos destacados.",
        erros: { slug: "Esse endereço já está em uso por outro escritório. Tente outro." },
        valores,
      };
    }
    console.error("[marca]", error.code, error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }

  // Apaga do Storage a logo que foi trocada ou removida.
  if (logoAntiga && logoAntiga !== logo_url) {
    const caminhoAntigo = logoAntiga.split("/storage/v1/object/public/marcas/")[1];
    if (caminhoAntigo) await supabase.storage.from("marcas").remove([decodeURIComponent(caminhoAntigo)]);
  }

  return concluir(formData);
}

// ---------- Serviços (RN-00.4) ----------

export async function salvarServicos(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  const { supabase, sessao } = ctx;

  const BLOCOS_BRIEFING = ["arquitetura", "interiores", "reforma"] as const;
  const blocoValido = (v: FormDataEntryValue | null) =>
    (BLOCOS_BRIEFING as readonly string[]).includes(String(v ?? "")) ? (String(v) as (typeof BLOCOS_BRIEFING)[number]) : null;

  const ids = formData.getAll("servico_id").filter((v): v is string => typeof v === "string");
  const servicos = ids.map((id) => ({
    id,
    nome: String(formData.get(`nome_${id}`) ?? "").trim(),
    ativo: formData.get(`ativo_${id}`) === "on",
    tem_briefing: formData.get(`briefing_${id}`) === "on",
    bloco: blocoValido(formData.get(`bloco_${id}`)),
  }));
  const novoNome = String(formData.get("novo_nome") ?? "").trim();
  const novoBriefing = formData.get("novo_briefing") === "on";
  const novoBloco = blocoValido(formData.get("novo_bloco"));

  const erros: Record<string, string> = {};
  for (const s of servicos) {
    if (s.nome.length < 2 || s.nome.length > 60) erros[`nome_${s.id}`] = "Use de 2 a 60 caracteres.";
    if (s.tem_briefing && !s.bloco) erros[`bloco_${s.id}`] = "Escolha o bloco (arquitetura, interiores ou reforma).";
  }
  if (novoNome && novoNome.length < 2) erros.novo_nome = "Use pelo menos 2 caracteres.";
  if (novoNome && novoBriefing && !novoBloco) erros.novo_bloco = "Escolha o bloco (arquitetura, interiores ou reforma).";
  // Nomes repetidos (sem diferenciar maiúsculas): o banco também recusa.
  const vistos = new Map<string, string>();
  for (const s of servicos) {
    const chave = s.nome.trim().toLowerCase();
    if (vistos.has(chave)) erros[`nome_${s.id}`] = "Já existe um serviço com este nome.";
    else vistos.set(chave, s.id);
  }
  if (novoNome && vistos.has(novoNome.trim().toLowerCase())) erros.novo_nome = "Já existe um serviço com este nome.";
  if (!servicos.some((s) => s.ativo) && !novoNome) erros.geral = "Deixe pelo menos um serviço ativo.";
  if (Object.keys(erros).length) {
    return { status: "erro", mensagem: erros.geral ?? "Confira os campos destacados.", erros, valores };
  }

  for (const s of servicos) {
    const { error } = await supabase
      .from("servicos")
      .update({ nome: s.nome, ativo: s.ativo, tem_briefing: s.tem_briefing, tipo_briefing: s.tem_briefing ? s.bloco : null })
      .eq("id", s.id);
    if (error) {
      console.error("[servicos]", error.message);
      return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
    }
  }

  if (novoNome) {
    const { error } = await supabase.from("servicos").insert({
      escritorio_id: sessao.escritorio.id,
      nome: novoNome.slice(0, 60),
      tem_briefing: novoBriefing,
      tipo_briefing: novoBriefing ? novoBloco : null,
      ordem: ids.length + 1,
    });
    if (error) {
      console.error("[servicos] novo", error.message);
      return { status: "erro", mensagem: "Não foi possível adicionar o serviço.", valores };
    }
  }

  return concluir(formData);
}

// ---------- Faixa de preço e agenda (filtro de compatibilidade, RN-01.2) ----------

const valorEmReais = (mensagem: string) =>
  z
    .string()
    .transform(lerValor)
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 100_000_000), mensagem);

const esquemaPreco = z
  .object({
    // Os dois são opcionais: sem mínimo, todo pedido chega como "a avaliar".
    faixa_preco_min: valorEmReais("Informe um valor em reais, como 8.000."),
    faixa_preco_max: valorEmReais("Informe um valor em reais, como 40.000."),
    proxima_data_livre: z
      .string()
      .refine((v) => v === "" || dataValida(v), "Data inválida.")
      .transform((v) => v || null),
  })
  .refine((d) => d.faixa_preco_max === null || d.faixa_preco_min === null || d.faixa_preco_max >= d.faixa_preco_min, {
    message: "O valor máximo precisa ser maior que o mínimo.",
    path: ["faixa_preco_max"],
  });

export async function salvarPrecoAgenda(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaPreco.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };

  const { error } = await ctx.supabase.from("escritorios").update(resultado.data).eq("id", ctx.sessao.escritorio.id);
  if (error) {
    console.error("[preco]", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  return concluir(formData);
}

// ---------- Briefing (RN-02.2) e fim da configuração inicial (RN-00.3) ----------

export async function salvarBriefing(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };
  const { supabase, sessao } = ctx;

  const dados: { briefing_antes_proposta: boolean; onboarding_concluido_em?: string } = {
    briefing_antes_proposta: formData.get("momento_briefing") === "antes_proposta",
  };
  if (formData.get("concluir_onboarding") === "on" && !sessao.escritorio.onboarding_concluido_em) {
    dados.onboarding_concluido_em = new Date().toISOString();
  }

  const { error } = await supabase.from("escritorios").update(dados).eq("id", sessao.escritorio.id);
  if (error) {
    console.error("[briefing]", error.message);
    return { status: "erro", mensagem: "Não foi possível salvar. Tente de novo.", valores };
  }
  return concluir(formData);
}
