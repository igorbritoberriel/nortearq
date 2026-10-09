"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { pode } from "@/lib/permissoes";
import { dataValida } from "@/lib/formatacao";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";

const MENSAGENS: Record<string, string> = {
  sem_permissao: "Você não tem permissão para alterar esta situação.",
  modo_leitura: "Seu escritório está em modo leitura.",
  projeto_invalido: "Projeto não encontrado.", etapa_invalida: "Etapa não encontrada.",
  situacao_ja_registrada: "Esta situação já foi registrada. Atualize a página.",
  transicao_invalida: "A situação do projeto mudou. Atualize a página.",
  motivo_obrigatorio: "Informe um motivo com pelo menos 5 caracteres.",
  projeto_com_pendencias: "Para entregar, todas as etapas precisam estar aprovadas e os aditivos respondidos.",
  limite_projetos: "O limite de projetos em andamento do plano foi atingido. Encerre outro projeto ou mude de plano.",
  projeto_inativo: "Retome ou reabra o projeto antes de alterar o trabalho.",
  etapa_aprovada: "O prazo de uma etapa aprovada permanece no histórico.",
};
const mensagem = (erro: string) => Object.entries(MENSAGENS).find(([chave]) => erro.includes(chave))?.[1] ?? "Não foi possível salvar. Tente novamente.";
const atualizar = () => revalidatePath("/app", "layout");

export async function mudarSituacaoProjeto(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(form);
  const parsed = z.object({ projeto_id: z.uuid(), situacao: z.enum(["ativo", "pausado", "entregue", "encerrado"]), motivo: z.string().trim().max(500) }).safeParse(valores);
  if (!parsed.success) return { status: "erro", mensagem: "Confira os campos.", erros: errosDe(parsed.error.issues), valores };
  const sessao = await obterSessaoArquiteto(), db = await criarClienteServidor();
  if (!sessao || !db || !pode(sessao.membro.papel, "encerrar_projetos")) return { status: "erro", mensagem: MENSAGENS.sem_permissao };
  const { error } = await db.rpc("mudar_situacao_projeto", { p_projeto: parsed.data.projeto_id, p_situacao: parsed.data.situacao, p_motivo: parsed.data.motivo || null });
  if (error) return { status: "erro", mensagem: mensagem(error.message), valores };
  atualizar();
  return { status: "sucesso", mensagem: "Situação do projeto atualizada." };
}

export async function definirPrazoEtapa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(form);
  const parsed = z.object({ etapa_id: z.uuid(), prazo: z.string().refine(v => !v || dataValida(v) && v >= "2000-01-01" && v <= "2100-12-31", "Informe uma data válida entre 2000 e 2100.") }).safeParse(valores);
  if (!parsed.success) return { status: "erro", mensagem: "Confira a data planejada.", erros: errosDe(parsed.error.issues), valores };
  const sessao = await obterSessaoArquiteto(), db = await criarClienteServidor();
  if (!sessao || !db || !pode(sessao.membro.papel, "gerir_projetos")) return { status: "erro", mensagem: MENSAGENS.sem_permissao };
  const { error } = await db.rpc("definir_prazo_etapa", { p_etapa: parsed.data.etapa_id, p_prazo: parsed.data.prazo || null });
  if (error) return { status: "erro", mensagem: mensagem(error.message), valores };
  atualizar();
  return { status: "sucesso", mensagem: "Prazo planejado atualizado." };
}
