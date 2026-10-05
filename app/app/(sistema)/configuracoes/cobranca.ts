"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { confirmarSenha } from "@/lib/confirmar-senha";
import { cifrar, criarWebhook, decifrar, hashToken, removerWebhook, siteEmProducao, validarConta } from "@/lib/cobranca";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import type { EstadoFormulario } from "@/lib/formulario";
import { pode } from "@/lib/permissoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Cobrança integrada (0038): o dono conecta a conta Asaas do escritório. Só o servidor guarda a chave (criptografada).

export async function ativarCobranca(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = { chave: "", aceite: formData.get("aceite") === "on" ? "on" : "" };
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin) return { status: "erro", mensagem: "Sistema indisponível agora. Tente de novo.", valores };
  if (!pode(sessao.membro.papel, "gerir_assinatura")) {
    return { status: "erro", mensagem: "Só o dono do escritório pode ativar a cobrança automática.", valores };
  }
  const chave = String(formData.get("chave") ?? "").trim();
  if (!chave.startsWith("$aact_")) {
    return { status: "erro", mensagem: "Confira a chave: ela começa com $aact_.", erros: { chave: "Chave inválida." }, valores };
  }
  if (formData.get("aceite") !== "on") {
    return { status: "erro", mensagem: "Para ativar, aceite a taxa de serviço.", erros: { aceite: "Obrigatório." }, valores };
  }

  let conta: Awaited<ReturnType<typeof validarConta>>;
  try {
    conta = await validarConta(chave);
  } catch (e) {
    const m = (e as Error).message;
    return {
      status: "erro",
      mensagem: m === "chave_invalida" ? "Essa não parece uma chave de API do Asaas." : `O Asaas não aceitou a chave: ${m}`,
      erros: { chave: "Não aceita pelo Asaas." },
      valores,
    };
  }

  if (siteEmProducao() && conta.ambiente === "teste") {
    return {
      status: "erro",
      mensagem:
        "Essa chave é do ambiente de testes do Asaas (sandbox.asaas.com), onde nenhum pagamento é real. Entre na sua conta em www.asaas.com, vá em Integrações > Chaves de API, gere uma chave (ela começa com $aact_prod) e cole aqui.",
      erros: { chave: "Chave do ambiente de testes." },
      valores,
    };
  }

  const escritorioId = sessao.escritorio.id;
  // Se já havia uma conexão, remove o aviso antigo antes de criar o novo.
  const { data: antiga } = await admin.from("cobranca_credenciais").select("chave_cifrada, webhook_id").eq("escritorio_id", escritorioId).maybeSingle();
  if (antiga?.webhook_id) await removerWebhook(decifrar(antiga.chave_cifrada as string), antiga.webhook_id as string);

  const token = randomBytes(24).toString("hex");
  let webhookId: string;
  try {
    webhookId = await criarWebhook(chave, escritorioId, token, urlDoSite());
  } catch (e) {
    return { status: "erro", mensagem: `Não foi possível criar o aviso de pagamento no Asaas: ${(e as Error).message}`, valores };
  }

  const { error } = await admin.from("cobranca_credenciais").upsert({
    escritorio_id: escritorioId,
    chave_cifrada: cifrar(chave),
    carteira_id: conta.carteira,
    webhook_id: webhookId,
    webhook_token_hash: hashToken(token),
  });
  if (error) {
    console.error("[cobrança] salvar", error.message);
    await removerWebhook(chave, webhookId);
    return { status: "erro", mensagem: "Não foi possível salvar a conexão. Tente de novo.", valores };
  }
  await admin
    .from("escritorios")
    .update({ cobranca_ativa: true, cobranca_aceite_em: new Date().toISOString(), cobranca_conta_nome: conta.nome, cobranca_ambiente: conta.ambiente })
    .eq("id", escritorioId);
  revalidatePath("/app", "layout");
  return {
    status: "sucesso",
    mensagem:
      conta.ambiente === "teste"
        ? `Conectado à conta de TESTE do Asaas (${conta.nome}). Nenhum dinheiro real passa por ela.`
        : `Cobrança automática ativada na conta ${conta.nome}.`,
  };
}

export async function desativarCobranca(senha: string): Promise<{ erro: string } | { ok: true }> {
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin) return { erro: "Sistema indisponível agora. Tente de novo." };
  if (!pode(sessao.membro.papel, "gerir_assinatura")) return { erro: "Só o dono do escritório pode desativar." };
  if (!(await confirmarSenha(sessao.email, senha))) return { erro: "Senha incorreta. Digite a senha que você usa para entrar no NorteArq." };
  const { data: cred } = await admin.from("cobranca_credenciais").select("chave_cifrada, webhook_id").eq("escritorio_id", sessao.escritorio.id).maybeSingle();
  if (cred?.webhook_id) await removerWebhook(decifrar(cred.chave_cifrada as string), cred.webhook_id as string);
  await admin.from("cobranca_credenciais").delete().eq("escritorio_id", sessao.escritorio.id);
  await admin.from("escritorios").update({ cobranca_ativa: false }).eq("id", sessao.escritorio.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}
