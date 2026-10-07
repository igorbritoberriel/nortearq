"use server";

import { revalidatePath } from "next/cache";
import { documentoValido } from "@/lib/contratos";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  asaasConfigurado,
  atualizarAssinaturaAsaas,
  cancelarAssinaturaAsaas,
  cobrancaEmAberto,
  criarAssinaturaAsaas,
  criarClienteAsaas,
} from "@/lib/asaas";
import { hojeBrasilia, planoPorId, precoDo, somarDias, type Periodo } from "@/lib/assinatura";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { confirmarSenha } from "@/lib/confirmar-senha";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Assinatura do arquiteto pelo Asaas. Só o dono assina, troca de plano ou cancela.
// Os campos de cobrança do escritório só mudam com a chave secreta (o arquiteto não altera direto).

const SEM_ASAAS = "A cobrança ainda não está ligada. Tente mais tarde.";

const esquema = z.object({
  plano: z.enum(["briefing", "profissional", "escritorio"], "Escolha um plano."),
  periodo: z.enum(["mensal", "anual"], "Escolha mensal ou anual."),
  documento: z
    .string()
    .refine(documentoValido, "Informe um CPF ou CNPJ válido.")
      .transform((v) => v.replace(/\D/g, "")),
});

async function contexto() {
  const sessao = await obterSessaoArquiteto();
  const admin = criarClienteAdmin();
  if (!sessao || !admin) return null;
  return { sessao, admin };
}

export async function assinar(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const ctx = await contexto();
  if (!ctx || !asaasConfigurado()) return { status: "erro", mensagem: SEM_ASAAS, valores };
  const { sessao, admin } = ctx;
  if (sessao.membro.papel !== "dono") {
    return { status: "erro", mensagem: "Só o dono do escritório pode mudar a assinatura.", valores };
  }

  const { plano: idPlano, periodo, documento } = resultado.data;
  const plano = planoPorId(idPlano)!;
  const valor = precoDo(plano, periodo as Periodo);
  const ciclo = periodo === "anual" ? "YEARLY" : "MONTHLY";
  const descricao = `NorteArq · plano ${plano.nome} (${periodo})`;
  const e = sessao.escritorio;

  // Dados de cobrança atuais (a sessão não traz o id do cliente no Asaas).
  const { data: cobranca } = await admin
    .from("escritorios")
    .select("asaas_cliente_id, asaas_assinatura_id, trial_ate, pago_ate")
    .eq("id", e.id)
    .single();

  let destino: string | null = null;
  try {
    let clienteAsaas = cobranca?.asaas_cliente_id as string | null;
    if (!clienteAsaas) {
      clienteAsaas = (
        await criarClienteAsaas({ nome: e.nome, cpfCnpj: documento, email: sessao.email, telefone: e.whatsapp, escritorioId: e.id })
      ).id;
    }

    let assinaturaId = cobranca?.asaas_assinatura_id as string | null;
    if (assinaturaId && !e.assinatura_cancelada_em) {
      // Troca de plano ou de período: a próxima cobrança já sai com o valor novo (RG-5: nada se perde).
      await atualizarAssinaturaAsaas(assinaturaId, { valor, ciclo, descricao });
    } else {
      // Primeira cobrança: no fim do teste ou do período pago (não perde os dias que faltam), ou hoje.
      const hoje = hojeBrasilia();
      const fimAtual = [cobranca?.pago_ate, cobranca?.trial_ate].filter(Boolean).sort().pop() as string | undefined;
      const vencimento = fimAtual && fimAtual >= hoje ? somarDias(fimAtual, 1) : hoje;
      assinaturaId = (
        await criarAssinaturaAsaas({ clienteAsaas, valor, ciclo, primeiroVencimento: vencimento, descricao, escritorioId: e.id })
      ).id;
    }

    const { error } = await admin
      .from("escritorios")
      .update({
        asaas_cliente_id: clienteAsaas,
        asaas_assinatura_id: assinaturaId,
        plano_escolhido: idPlano,
        periodo,
        assinatura_cancelada_em: null,
        documento: e.documento ?? documento,
      })
      .eq("id", e.id);
    if (error) throw new Error(error.message);

    destino = (await cobrancaEmAberto(assinaturaId))?.invoiceUrl ?? null;
  } catch (erro) {
    console.error("[assinatura] assinar", erro);
    return {
      status: "erro",
      mensagem: `Não foi possível falar com o sistema de pagamento: ${(erro as Error).message}`,
      valores,
    };
  }

  revalidatePath("/app", "layout");
  // Leva direto para a página de pagamento do Asaas (Pix, boleto ou cartão).
  if (destino) redirect(destino);
  return { status: "sucesso", mensagem: "Plano atualizado. A próxima cobrança já sai com o valor novo." };
}

// Abre a cobrança em aberto (pagar agora).
export async function pagarAgora() {
  const ctx = await contexto();
  const id = ctx?.sessao.escritorio.asaas_assinatura_id;
  if (!ctx || !id || !asaasConfigurado()) return;
  const cobranca = await cobrancaEmAberto(id).catch(() => null);
  if (cobranca?.invoiceUrl) redirect(cobranca.invoiceUrl);
}

// RG-6: cancela sem multa; o acesso vale até o fim do período pago.
export async function cancelarAssinatura(senha: string): Promise<{ ok: true } | { erro: string }> {
  const ctx = await contexto();
  if (!ctx) return { erro: SEM_ASAAS };
  const { sessao, admin } = ctx;
  if (!(await confirmarSenha(sessao.email, senha))) {
    return { erro: "Senha incorreta. Digite a senha que você usa para entrar no NorteArq." };
  }
  if (sessao.membro.papel !== "dono") return { erro: "Só o dono do escritório pode cancelar a assinatura." };
  const id = sessao.escritorio.asaas_assinatura_id;
  if (!id) return { erro: "Não há assinatura para cancelar." };
  try {
    if (asaasConfigurado()) await cancelarAssinaturaAsaas(id);
  } catch (erro) {
    console.error("[assinatura] cancelar", erro);
    return { erro: "Não foi possível cancelar agora. Tente de novo." };
  }
  await admin.from("escritorios").update({ assinatura_cancelada_em: new Date().toISOString() }).eq("id", sessao.escritorio.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}
