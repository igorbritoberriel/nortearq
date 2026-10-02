"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { avisarEtapaEnviada } from "@/lib/avisos";
import { linkDoCliente } from "@/lib/clientes";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { SEM_SUPABASE } from "@/lib/formulario";
import { TAMANHO_MAXIMO_ARQUIVO } from "@/lib/projetos";
import { criarClienteServidor } from "@/lib/supabase/server";

// Projeto (módulo 03). Aprovar é só do cliente: o banco barra o arquiteto (RN-03.4).

async function contexto() {
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  return supabase && sessao ? { supabase, sessao } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Resultado = { ok: true } | { erro: string };

const atualizar = (projetoId: string) => revalidatePath(`/app/projetos/${projetoId}`);

// Depois que o navegador sobe o arquivo para o Storage (pasta do projeto, protegida pelo RLS).
export async function registrarArquivo(
  projetoId: string,
  etapaId: string,
  arquivo: { nome: string; caminho: string; tamanho: number; tipo: string; visivel: boolean },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(projetoId) || !UUID.test(etapaId)) return { erro: "Etapa não encontrada." };
  if (arquivo.tamanho > TAMANHO_MAXIMO_ARQUIVO) return { erro: "Arquivo acima de 50 MB." };

  const { error } = await ctx.supabase.rpc("registrar_arquivo", {
    p_projeto: projetoId,
    p_etapa: etapaId,
    p_nome: arquivo.nome,
    p_caminho: arquivo.caminho,
    p_tamanho: arquivo.tamanho,
    p_tipo: arquivo.tipo || null,
    p_visivel: arquivo.visivel,
  });
  if (error) {
    console.error("[projeto] registrar arquivo", error.message);
    await ctx.supabase.storage.from("projetos").remove([arquivo.caminho]);
    if (error.message.includes("etapa_fechada")) return { erro: "Esta etapa já foi aprovada. Mudanças viram aditivo." };
    return { erro: "Não foi possível salvar o arquivo. Tente de novo." };
  }
  atualizar(projetoId);
  return { ok: true };
}

export async function alternarVisibilidade(projetoId: string, arquivoId: string, visivel: boolean) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(arquivoId)) return;
  const { error } = await ctx.supabase.from("arquivos").update({ visivel_cliente: visivel }).eq("id", arquivoId);
  if (error) console.error("[projeto] visibilidade", error.message);
  atualizar(projetoId);
}

// Só enquanto a etapa não foi enviada ao cliente (o banco confere).
export async function excluirArquivo(projetoId: string, arquivoId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(arquivoId)) return { erro: "Arquivo não encontrado." };
  const { data, error } = await ctx.supabase.from("arquivos").delete().eq("id", arquivoId).select("caminho_storage");
  if (error || !data?.length) {
    console.error("[projeto] excluir arquivo", error?.message);
    return { erro: "Este arquivo já foi enviado ao cliente e não pode ser apagado. Envie uma versão nova." };
  }
  await ctx.supabase.storage.from("projetos").remove([data[0].caminho_storage as string]);
  atualizar(projetoId);
  return { ok: true };
}

// Envia a etapa para aprovação e devolve o link do projeto para o WhatsApp (RN-03.2).
export async function enviarEtapa(projetoId: string, etapaId: string): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(etapaId)) return { erro: "Etapa não encontrada." };
  const { data, error } = await ctx.supabase.rpc("enviar_etapa", { p_etapa: etapaId });
  if (error || !data) {
    console.error("[projeto] enviar etapa", error?.message);
    if (error?.message.includes("sem_arquivo_visivel")) return { erro: "Envie pelo menos 1 arquivo visível ao cliente antes." };
    if (error?.message.includes("etapa_fechada")) return { erro: "Esta etapa já foi aprovada." };
    return { erro: "Não foi possível enviar. Tente de novo." };
  }
  const link = linkDoCliente(urlDoSite(), data as string, "projeto");
  after(() => avisarEtapaEnviada(etapaId, link));
  atualizar(projetoId);
  return { link };
}

// Link para o cliente acompanhar o projeto, sem etapa nova para aprovar.
export async function linkDoProjeto(projetoId: string): Promise<{ link: string } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_SUPABASE.mensagem! };
  if (!UUID.test(projetoId)) return { erro: "Projeto não encontrado." };
  const { data, error } = await ctx.supabase.rpc("link_do_projeto", { p_projeto: projetoId });
  if (error || !data) {
    console.error("[projeto] link", error?.message);
    return { erro: "Não foi possível gerar o link. Tente de novo." };
  }
  atualizar(projetoId);
  return { link: linkDoCliente(urlDoSite(), data as string, "projeto") };
}

// ---------- Etapas (RN-03.1: adicionar, renomear e reordenar) ----------

export async function renomearEtapa(projetoId: string, etapaId: string, nome: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(etapaId)) return { erro: "Etapa não encontrada." };
  const limpo = nome.trim();
  if (limpo.length < 2 || limpo.length > 80) return { erro: "Use de 2 a 80 caracteres." };
  const { error, count } = await ctx.supabase
    .from("etapas")
    .update({ nome: limpo, atualizado_em: new Date().toISOString() }, { count: "exact" })
    .eq("id", etapaId);
  if (error || !count) return { erro: "Etapa aprovada ou aguardando o cliente não pode ser renomeada." };
  atualizar(projetoId);
  return { ok: true };
}

export async function adicionarEtapa(projetoId: string, nome: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(projetoId)) return { erro: "Projeto não encontrado." };
  const limpo = nome.trim();
  if (limpo.length < 2 || limpo.length > 80) return { erro: "Use de 2 a 80 caracteres." };
  const { data: ultima } = await ctx.supabase
    .from("etapas")
    .select("ordem")
    .eq("projeto_id", projetoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await ctx.supabase.from("etapas").insert({ projeto_id: projetoId, nome: limpo, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) {
    console.error("[projeto] adicionar etapa", error.message);
    return { erro: "Não foi possível adicionar. Tente de novo." };
  }
  atualizar(projetoId);
  return { ok: true };
}

export async function excluirEtapa(projetoId: string, etapaId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(etapaId)) return { erro: "Etapa não encontrada." };
  const { data: comArquivo } = await ctx.supabase.from("arquivos").select("id").eq("etapa_id", etapaId).limit(1);
  if (comArquivo?.length) return { erro: "Apague os arquivos da etapa antes." };
  const { error, count } = await ctx.supabase.from("etapas").delete({ count: "exact" }).eq("id", etapaId);
  if (error || !count) return { erro: "Só etapas não iniciadas podem ser apagadas." };
  atualizar(projetoId);
  return { ok: true };
}

// Grava a ordem nova das etapas numa chamada só. A tela já moveu na hora.
// O banco recusa mover etapas aguardando o cliente ou aprovadas.
export async function salvarOrdemEtapas(projetoId: string, ids: string[]): Promise<boolean> {
  const ctx = await contexto();
  if (!ctx || !UUID.test(projetoId) || !Array.isArray(ids) || ids.length > 100 || !ids.every((id) => UUID.test(id))) {
    return false;
  }
  const { error } = await ctx.supabase.rpc("ordenar_etapas", { p_projeto: projetoId, p_ids: ids });
  if (error) console.error("[projeto] ordenar etapas", error.message);
  return !error;
}

// RN-03.10: revisão acima do limite que o arquiteto decide não cobrar.
export async function concederCortesia(projetoId: string, aprovacaoId: string) {
  const ctx = await contexto();
  if (!ctx || !UUID.test(aprovacaoId)) return;
  const { error } = await ctx.supabase.rpc("conceder_cortesia", { p_aprovacao: aprovacaoId });
  if (error) console.error("[projeto] cortesia", error.message);
  atualizar(projetoId);
}
