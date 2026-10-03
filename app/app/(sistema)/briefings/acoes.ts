"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AMBIENTES, ESTILOS, TIPOS_RESPOSTA, type Ambiente, type Estilo, type TipoResposta } from "@/lib/briefing";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Briefings do escritório e editor do modelo. O banco (RLS) garante que cada escritório só mexe nos seus.

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Perfil do Cliente ----------

// RN-02.7: o arquiteto reabre e o cliente volta a editar pelo mesmo link.
export async function reabrirBriefing(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { error } = await ctx.supabase
    .from("briefings")
    .update({ status: "em_andamento", validado_em: null, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[briefing] reabrir", error.message);
  revalidatePath("/app/briefings", "layout");
}

// RN-02.9: validado na reunião, vira o programa de necessidades oficial.
export async function validarBriefing(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const agora = new Date().toISOString();
  const { error } = await ctx.supabase
    .from("briefings")
    .update({ status: "validado", validado_em: agora, atualizado_em: agora })
    .eq("id", id)
    .eq("status", "respondido");
  if (error) console.error("[briefing] validar", error.message);
  revalidatePath("/app/briefings", "layout");
}

// ---------- Editor do modelo (RN-02.10, RN-02.11) ----------

const esquemaPergunta = z
  .object({
    tipo_briefing: z.enum(["comum", "arquitetura", "interiores", "reforma"], "Escolha o bloco."),
    ambiente: z.preprocess(
      (v) => (v === "" ? null : v),
      z.enum(Object.keys(AMBIENTES) as [Ambiente, ...Ambiente[]]).nullable(),
    ),
    texto: z.string().trim().min(3, "Escreva a pergunta.").max(300, "Use até 300 caracteres."),
    ajuda: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(300, "Use até 300 caracteres.").nullable(),
    ),
    tipo_resposta: z.enum(Object.keys(TIPOS_RESPOSTA) as [TipoResposta, ...TipoResposta[]], "Escolha o tipo."),
    opcoes: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
          .slice(0, 20),
      ),
  })
  .superRefine((d, ctx) => {
    if ((d.tipo_resposta === "escolha" || d.tipo_resposta === "multipla") && d.opcoes.length < 2) {
      ctx.addIssue({ code: "custom", path: ["opcoes"], message: "Escreva pelo menos 2 opções, uma por linha." });
    }
  });

export async function criarPergunta(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaPergunta.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx) return { ...SEM_SUPABASE, valores };

  const d = resultado.data;
  const ambiente = d.tipo_briefing === "interiores" ? d.ambiente : null;
  const usaOpcoes = d.tipo_resposta === "escolha" || d.tipo_resposta === "multipla";

  // Entra no fim do grupo.
  let consulta = ctx.supabase
    .from("briefing_perguntas")
    .select("ordem")
    .eq("tipo_briefing", d.tipo_briefing)
    .order("ordem", { ascending: false })
    .limit(1);
  consulta = ambiente ? consulta.eq("ambiente", ambiente) : consulta.is("ambiente", null);
  const { data: ultima } = await consulta.maybeSingle();

  const { error } = await ctx.supabase.from("briefing_perguntas").insert({
    escritorio_id: ctx.sessao.escritorio.id,
    tipo_briefing: d.tipo_briefing,
    ambiente,
    texto: d.texto,
    ajuda: d.ajuda,
    tipo_resposta: d.tipo_resposta,
    opcoes: usaOpcoes ? d.opcoes : null,
    ordem: (ultima?.ordem ?? 0) + 10,
  });
  if (error) {
    console.error("[editor] criar pergunta", error.message);
    return { status: "erro", mensagem: erroPergunta(error.message), valores };
  }
  revalidatePath("/app/briefings/editor");
  return { status: "sucesso", mensagem: "Pergunta adicionada. Ela vale para os próximos briefings." };
}

// Limites e regras do editor (migração 0027), com mensagens claras.
const ERROS_PERGUNTA: Record<string, string> = {
  limite_perguntas: "Você chegou a 100 perguntas próprias. Apague ou reaproveite uma antes de criar outra.",
  limite_grupo: "Este grupo já tem 40 perguntas. Um briefing longo demais cansa o cliente: reaproveite ou apague alguma.",
  pergunta_repetida: "Já existe uma pergunta igual neste grupo.",
  padrao_so_texto: "Nas perguntas padrão dá para mudar só o texto e a explicação.",
  opcoes_invalidas: "Use até 20 opções, cada uma com até 80 caracteres.",
  texto_invalido: "A pergunta precisa ter de 3 a 300 caracteres.",
};
function erroPergunta(mensagem: string) {
  const codigo = Object.keys(ERROS_PERGUNTA).find((c) => mensagem.includes(c));
  return codigo ? ERROS_PERGUNTA[codigo] : "Não foi possível salvar. Tente de novo.";
}

// Editar uma pergunta no lugar. Padrão: só texto e explicação. Briefings já enviados não mudam (RN-02.12).
export async function editarPergunta(
  id: string,
  padrao: boolean,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return { ...SEM_SUPABASE, valores };

  const texto = String(formData.get("texto") ?? "").trim();
  const ajuda = String(formData.get("ajuda") ?? "").trim() || null;
  const erros: Record<string, string> = {};
  if (texto.length < 3 || texto.length > 300) erros.texto = "Escreva a pergunta (3 a 300 caracteres).";
  if (ajuda && ajuda.length > 300) erros.ajuda = "Use até 300 caracteres.";

  let dados: Record<string, unknown> = { texto, ajuda };
  if (!padrao) {
    const tipo = String(formData.get("tipo_resposta") ?? "");
    if (!(tipo in TIPOS_RESPOSTA)) erros.tipo_resposta = "Escolha o tipo.";
    const usaOpcoes = tipo === "escolha" || tipo === "multipla";
    const opcoes = String(formData.get("opcoes") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (usaOpcoes && opcoes.length < 2) erros.opcoes = "Escreva pelo menos 2 opções, uma por linha.";
    if (opcoes.length > 20) erros.opcoes = "Use até 20 opções.";
    dados = { ...dados, tipo_resposta: tipo, opcoes: usaOpcoes ? opcoes : null };
  }
  if (Object.keys(erros).length) return { status: "erro", mensagem: "Confira os campos destacados.", erros, valores };

  const { error } = await ctx.supabase.from("briefing_perguntas").update(dados).eq("id", id);
  if (error) {
    console.error("[editor] editar pergunta", error.message);
    return { status: "erro", mensagem: erroPergunta(error.message), valores };
  }
  revalidatePath("/app/briefings/editor");
  return { status: "sucesso", mensagem: "Pergunta salva. Vale para os próximos briefings." };
}

// Texto original do modelo NorteArq de uma pergunta padrão.
export async function textoOriginal(id: string): Promise<{ texto: string; ajuda: string | null } | null> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return null;
  const { data } = await ctx.supabase.rpc("texto_original_pergunta", { p_pergunta: id });
  return (data as { texto: string; ajuda: string | null } | null) ?? null;
}

// Liga/desliga a pergunta. A tela já mudou na hora; aqui só grava (sem recarregar a página).
export async function alternarPergunta(id: string, ativa: boolean): Promise<boolean> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return false;
  const { error } = await ctx.supabase.from("briefing_perguntas").update({ ativa }).eq("id", id);
  if (error) console.error("[editor] ativar", error.message);
  return !error;
}

// Grava a ordem nova de um grupo (bloco + ambiente) numa chamada só. A tela já moveu na hora.
export async function salvarOrdemPerguntas(ids: string[]): Promise<boolean> {
  const ctx = await contexto();
  if (!ctx || !Array.isArray(ids) || ids.length > 300 || !ids.every((id) => UUID.test(id))) return false;
  const { error } = await ctx.supabase.rpc("ordenar_perguntas", { p_ids: ids });
  if (error) console.error("[editor] ordenar", error.message);
  return !error;
}

// RN-02.11: só perguntas criadas pelo escritório podem ser apagadas (o banco também barra).
export async function excluirPergunta(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  const { error } = await ctx.supabase.from("briefing_perguntas").delete().eq("id", id).eq("padrao", false);
  if (error) console.error("[editor] excluir", error.message);
  revalidatePath("/app/briefings/editor");
}

// ---------- Banco de imagens de estilo ----------
// O arquivo sobe do navegador direto para o bucket "estilos" (pasta do escritório, RLS);
// aqui só registramos a imagem.

export async function registrarImagemEstilo(caminho: string, estilo: Estilo): Promise<{ erro?: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem };
  if (!(estilo in ESTILOS)) return { erro: "Escolha o estilo." };
  const pasta = `${ctx.sessao.escritorio.id}/`;
  if (!caminho.startsWith(pasta) || caminho.includes("..")) return { erro: "Arquivo inválido." };

  const imagem_url = ctx.supabase.storage.from("estilos").getPublicUrl(caminho).data.publicUrl;
  const { error } = await ctx.supabase
    .from("estilos_imagens")
    .insert({ escritorio_id: ctx.sessao.escritorio.id, estilo, imagem_url, caminho });
  if (error) {
    console.error("[estilos] registrar", error.message);
    await ctx.supabase.storage.from("estilos").remove([caminho]);
    return { erro: "Não foi possível salvar a imagem. Tente de novo." };
  }
  revalidatePath("/app/briefings/editor");
  return {};
}

export async function removerImagemEstilo(id: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(id)) return;
  // O arquivo fica no Storage: briefings já enviados guardam a URL dele (RN-02.12).
  const { error } = await ctx.supabase.from("estilos_imagens").delete().eq("id", id);
  if (error) console.error("[estilos] remover", error.message);
  revalidatePath("/app/briefings/editor");
}
