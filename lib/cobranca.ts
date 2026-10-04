import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cobrança integrada (nível 3, migração 0038): cada parcela vira uma cobrança na conta Asaas do PRÓPRIO
// arquiteto (Pix, boleto ou cartão, o cliente escolhe), com split de R$ 0,99 para a carteira do NorteArq.
// A chave do arquiteto é guardada criptografada (AES-256-GCM, COBRANCA_CHAVE) e não pode sacar.

export const TAXA_PLATAFORMA = 0.99;

const URL_PRODUCAO = "https://api.asaas.com/v3";
const URL_TESTE = "https://api-sandbox.asaas.com/v3";

export type Ambiente = "producao" | "teste";
export const ambienteDaChave = (chave: string): Ambiente | null =>
  chave.startsWith("$aact_prod") ? "producao" : chave.startsWith("$aact_hmlg") ? "teste" : null;

// ---------- Criptografia da chave do arquiteto ----------
function chaveMestra() {
  const hex = process.env.COBRANCA_CHAVE;
  if (!hex || hex.length !== 64) throw new Error("COBRANCA_CHAVE ausente");
  return Buffer.from(hex, "hex");
}
export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chaveMestra(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}
export function decifrar(cifrado: string) {
  const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chaveMestra(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// ---------- Chamadas ao Asaas ----------
async function asaas<T>(chave: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const base = ambienteDaChave(chave) === "teste" ? URL_TESTE : URL_PRODUCAO;
  const r = await fetch(base + caminho, {
    ...init,
    headers: { access_token: chave, "User-Agent": "NorteArq", "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (corpo as { errors?: { description?: string }[] }).errors?.map((e) => e.description).join(" ") || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return corpo as T;
}

// Confere a chave e devolve a carteira e o nome da conta do arquiteto.
export async function validarConta(chave: string) {
  const ambiente = ambienteDaChave(chave);
  if (!ambiente) throw new Error("chave_invalida");
  const [info, carteiras] = await Promise.all([
    asaas<{ name?: string; companyName?: string }>(chave, "/myAccount/commercialInfo"),
    asaas<{ data: { id: string }[] }>(chave, "/wallets"),
  ]);
  const carteira = carteiras.data?.[0]?.id;
  if (!carteira) throw new Error("sem_carteira");
  return { ambiente, carteira, nome: info.companyName || info.name || "Conta Asaas" };
}

// Aviso de pagamento na conta do arquiteto, apontando para o NorteArq (com senha própria).
export async function criarWebhook(chave: string, escritorioId: string, token: string, site: string) {
  const w = await asaas<{ id: string }>(chave, "/webhooks", {
    method: "POST",
    body: JSON.stringify({
      name: "NorteArq - cobranças",
      url: `${site}/api/asaas/cobrancas?e=${escritorioId}`,
      email: "avisos@nortearq.com.br",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: token,
      sendType: "SEQUENTIALLY",
      events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_DELETED"],
    }),
  });
  return w.id;
}

export async function removerWebhook(chave: string, webhookId: string) {
  await asaas(chave, `/webhooks/${webhookId}`, { method: "DELETE" }).catch(() => null);
}

type ClienteCobranca = { id: string; nome: string; documento: string | null; email: string | null; telefone: string | null };

// Cliente do arquiteto dentro da conta Asaas dele (reaproveita se já existir).
async function garantirCliente(chave: string, c: ClienteCobranca) {
  const achado = await asaas<{ data: { id: string }[] }>(chave, `/customers?externalReference=${c.id}`);
  if (achado.data?.[0]?.id) return achado.data[0].id;
  const novo = await asaas<{ id: string }>(chave, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: c.nome,
      cpfCnpj: c.documento?.replace(/\D/g, ""),
      email: c.email ?? undefined,
      mobilePhone: c.telefone?.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") || undefined,
      externalReference: c.id,
      notificationDisabled: true, // os avisos ao cliente saem do NorteArq, com a marca do escritório
    }),
  });
  return novo.id;
}

// Gera a cobrança de uma parcela: o cliente escolhe Pix, boleto ou cartão na página do Asaas.
export async function gerarCobranca(
  admin: SupabaseClient,
  pagamentoId: string,
): Promise<{ link: string } | { erro: string }> {
  const { data: p } = await admin
    .from("pagamentos")
    .select("id, descricao, valor, vencimento, pago_em, asaas_link, escritorio_id, contrato:contratos(cliente:clientes(id, nome, documento, email, telefone)), escritorio:escritorios(nome, cobranca_ativa)")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!p) return { erro: "Parcela não encontrada." };
  if (p.pago_em) return { erro: "Esta parcela já foi paga." };
  if (p.asaas_link) return { link: p.asaas_link as string };
  const escritorio = p.escritorio as unknown as { nome: string; cobranca_ativa: boolean } | null;
  if (!escritorio?.cobranca_ativa) return { erro: "A cobrança automática não está ativa." };
  const cliente = (p.contrato as unknown as { cliente: ClienteCobranca | null } | null)?.cliente;
  if (!cliente) return { erro: "Cliente não encontrado." };
  if (!cliente.documento || cliente.documento.replace(/\D/g, "").length < 11) {
    return { erro: "Cadastre o CPF ou CNPJ do cliente na ficha dele: o Asaas exige para gerar a cobrança." };
  }
  const { data: cred } = await admin.from("cobranca_credenciais").select("chave_cifrada, carteira_id").eq("escritorio_id", p.escritorio_id).maybeSingle();
  if (!cred) return { erro: "A cobrança automática não está conectada." };

  try {
    const chave = decifrar(cred.chave_cifrada as string);
    const clienteAsaas = await garantirCliente(chave, cliente);
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const vencimento = p.vencimento && (p.vencimento as string) >= hoje ? (p.vencimento as string) : hoje;
    const carteiraNorteArq = process.env.ASAAS_CARTEIRA_NORTEARQ;
    // Split só em produção e quando a conta do arquiteto não é a própria conta do NorteArq.
    const comSplit = ambienteDaChave(chave) === "producao" && carteiraNorteArq && carteiraNorteArq !== cred.carteira_id;
    const cobranca = await asaas<{ id: string; invoiceUrl: string; status: string }>(chave, "/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: clienteAsaas,
        billingType: "UNDEFINED",
        value: Number(p.valor),
        dueDate: vencimento,
        description: `${p.descricao} · ${escritorio.nome}`.slice(0, 500),
        externalReference: p.id,
        ...(comSplit ? { split: [{ walletId: carteiraNorteArq, fixedValue: TAXA_PLATAFORMA }] } : {}),
      }),
    });
    await admin
      .from("pagamentos")
      .update({
        asaas_cobranca_id: cobranca.id,
        asaas_link: cobranca.invoiceUrl,
        asaas_status: cobranca.status,
        taxa_plataforma: comSplit ? TAXA_PLATAFORMA : 0,
        cobranca_gerada_em: new Date().toISOString(),
      })
      .eq("id", p.id);
    return { link: cobranca.invoiceUrl };
  } catch (e) {
    console.error("[cobrança] gerar", (e as Error).message);
    return { erro: `O Asaas recusou a cobrança: ${(e as Error).message}` };
  }
}

// Forma de pagamento do Asaas → forma do recibo.
export function formaDoAsaas(billingType: string | undefined) {
  if (billingType === "PIX") return "pix";
  if (billingType === "BOLETO") return "boleto";
  if (billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD") return "cartao";
  return "outro";
}
