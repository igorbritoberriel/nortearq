import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planejarCobrancas, type MeioPagamento, type ParcelaCobranca } from "./condicoes-pagamento";
import { hojeBrasilia } from "./assinatura";

// Cobrança integrada (nível 3, migração 0038): cada parcela vira uma cobrança na conta Asaas do PRÓPRIO
// arquiteto (Pix, boleto ou cartão, o cliente escolhe), com split de R$ 0,99 para a carteira do NorteArq.
// A chave do arquiteto é guardada criptografada (AES-256-GCM, COBRANCA_CHAVE) e não pode sacar.

export const TAXA_PLATAFORMA = 0.99;
export const EVENTOS_CHECKOUT = ["CHECKOUT_CREATED", "CHECKOUT_PAID", "CHECKOUT_EXPIRED", "CHECKOUT_CANCELED"];

const URL_PRODUCAO = "https://api.asaas.com/v3";
const URL_TESTE = "https://api-sandbox.asaas.com/v3";
class ErroAsaas extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export type Ambiente = "producao" | "teste";
// O site de verdade (Vercel) não aceita conta do ambiente de testes do Asaas: o cliente veria uma página de mentira.
export const siteEmProducao = () => process.env.ASAAS_AMBIENTE === "producao";
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
    signal: AbortSignal.timeout(30_000),
    ...init,
    headers: { access_token: chave, "User-Agent": "NorteArq", "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (corpo as { errors?: { description?: string }[] }).errors?.map((e) => e.description).join(" ") || `HTTP ${r.status}`;
    throw new ErroAsaas(msg, r.status);
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
      events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_DELETED", ...EVENTOS_CHECKOUT],
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
  const { data: contrato } = await admin.from("pagamentos").select("contrato_id").eq("id", pagamentoId).single();
  if (contrato) {
    const { data: escolha } = await admin.from("contratos").select("proposta:propostas(meio_escolhido, parcelas)").eq("id", contrato.contrato_id).single();
    const proposta = escolha?.proposta as unknown as { meio_escolhido: string | null; parcelas: { descricao: string; valor: number }[] } | null;
    if (proposta?.meio_escolhido && proposta.parcelas.some((x) => x.descricao === p.descricao && Number(x.valor) === Number(p.valor))) {
      const preparo = await prepararCobrancasContrato(admin, contrato.contrato_id as string);
      if ("erro" in preparo) return preparo;
      const { data: pronta } = await admin.from("pagamentos").select("asaas_link").eq("id", pagamentoId).single();
      return pronta?.asaas_link ? { link: pronta.asaas_link as string } : { erro: "O pagamento ainda está sendo preparado. Atualize em instantes." };
    }
  }
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
    if (siteEmProducao() && ambienteDaChave(chave) === "teste") {
      return { erro: "A conta Asaas conectada é do ambiente de testes: conecte a chave da sua conta real em Configurações." };
    }
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
    const m = (e as Error).message;
    if (/aprova|an[aá]lise|documenta|cadastro (n[aã]o|incompleto)|conta (n[aã]o|ainda)/i.test(m)) {
      return { erro: "A sua conta Asaas ainda está em análise. Termine o cadastro no Asaas e tente de novo quando for aprovada." };
    }
    if (/cpf|cnpj/i.test(m)) return { erro: "O Asaas recusou o CPF ou CNPJ do cliente. Confira na ficha dele." };
    return { erro: `O Asaas recusou a cobrança: ${m}` };
  }
}

type CobrancaCriada = {
  id: string; invoiceUrl: string; status: string; value: number; dueDate: string;
  installment?: string | null; installmentNumber?: number; billingType?: string;
};

// Retentativas consultam externalReference antes de criar. A trava impede duas gerações concorrentes.
export async function prepararCobrancasContrato(admin: SupabaseClient, contratoId: string): Promise<{ ok: true } | { erro: string }> {
  const inicio = Date.now();
  const dono = randomBytes(16).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  const { data: adquirido, error: erroTrava } = await admin.rpc("iniciar_preparo_cobranca", { p_contrato: contratoId, p_dono: dono });
  if (erroTrava) return { erro: "Não foi possível preparar o pagamento. Tente novamente." };
  if (!adquirido) return { erro: "O pagamento está sendo preparado. Atualize em instantes." };
  try {
    const { data: c, error } = await admin.from("contratos").select(
      "id,status,escritorio_id,proposta:propostas(meio_escolhido,modo_pagamento,avista,parcelas,cartao_valor_total,cartao_no_asaas),cliente:clientes(id,nome,documento,email,telefone),escritorio:escritorios(nome,cobranca_ativa)",
    ).eq("id", contratoId).single();
    if (error || !c || c.status !== "assinado") return { erro: "Assine o contrato antes de acessar o pagamento." };
    const p = c.proposta as unknown as { meio_escolhido: MeioPagamento | null; modo_pagamento: string; avista: boolean; cartao_valor_total?: boolean; cartao_no_asaas?: boolean; parcelas: { descricao: string; valor: number }[] };
    const esc = c.escritorio as unknown as { nome: string; cobranca_ativa: boolean };
    const cliente = c.cliente as unknown as ClienteCobranca;
    if (!p.meio_escolhido) return { erro: "Escolha a forma de pagamento primeiro." };
    if (!esc.cobranca_ativa) return { erro: "O escritório não está com o Asaas ativo. Fale com o escritório para combinar o pagamento." };
    if (!cliente.documento) return { erro: "Confira o CPF ou CNPJ informado no contrato." };
    const { data: cred } = await admin.from("cobranca_credenciais").select("chave_cifrada,carteira_id,webhook_id").eq("escritorio_id", c.escritorio_id).single();
    if (!cred) return { erro: "O escritório precisa reconectar a conta Asaas." };
    const chave = decifrar(cred.chave_cifrada as string);
    if (siteEmProducao() && ambienteDaChave(chave) !== "producao") return { erro: "O escritório precisa conectar sua conta real do Asaas." };
    const { data: linhas, error: erroParcelas } = await admin.from("pagamentos")
      .select("id,descricao,valor,vencimento,pago_em,asaas_cobranca_id,asaas_link,asaas_parcelamento_id")
      .eq("contrato_id", contratoId).order("ordem").order("descricao");
    if (erroParcelas) throw new Error("Não foi possível consultar as parcelas.");
    const todas = (linhas ?? []).map((x) => ({ ...x, valor: Number(x.valor) }));
    // Aditivos são cobranças independentes; o preparo do contrato usa apenas as condições aprovadas.
    const parcelas = p.parcelas.length ? p.parcelas.map((x) => {
      const linha = todas.find((r) => r.descricao === x.descricao && r.valor === Number(x.valor));
      if (!linha) throw new Error("As parcelas do contrato precisam ser conferidas pelo escritório.");
      return linha;
    }) : todas.filter((r) => r.descricao === "Valor total");
    if (new Set(parcelas.map((r) => r.id)).size !== parcelas.length) throw new Error("As parcelas do contrato precisam ser conferidas pelo escritório.");
    if (p.cartao_no_asaas && p.meio_escolhido === "cartao") {
      if (parcelas.length !== 1) throw new Error("Confira o valor total do contrato antes de abrir o cartão.");
      return await prepararCheckoutCartao(admin, chave, parcelas[0], c.id, c.escritorio_id, esc.nome, cred.webhook_id, cred.carteira_id);
    }
    if (parcelas.length && parcelas.every((r) => r.pago_em || r.asaas_cobranca_id && r.asaas_link)) return { ok: true };
    const grupos = planejarCobrancas(parcelas as ParcelaCobranca[], p.meio_escolhido, (p.cartao_valor_total || p.modo_pagamento === "parcelado") && !p.avista, hojeBrasilia());
    const clienteAsaas = await garantirCliente(chave, cliente);
    const billingType = { pix: "PIX", boleto: "BOLETO", cartao: "CREDIT_CARD" }[p.meio_escolhido];
    const carteira = process.env.ASAAS_CARTEIRA_NORTEARQ;
    const split = ambienteDaChave(chave) === "producao" && carteira && carteira !== cred.carteira_id
      ? [{ walletId: carteira, fixedValue: TAXA_PLATAFORMA }] : undefined;
    for (const grupo of grupos) {
      if (grupo.parcelas.every((r) => r.asaas_cobranca_id && r.asaas_link)) continue;
      if (Date.now() - inicio > 55_000) throw new Error("Parte dos pagamentos já foi preparada. Use Ir para pagamento para continuar com as parcelas restantes.");
      if (grupo.parcelado && grupo.parcelas.some((r) => r.asaas_cobranca_id)) {
        const ids = new Set(grupo.parcelas.map((r) => todas.find((x) => x.id === r.id)?.asaas_parcelamento_id).filter(Boolean));
        if (ids.size !== 1) throw new Error("Já existem cobranças separadas para este saldo. O escritório precisa conferir antes de gerar outro parcelamento.");
      }
      const { data: renovada, error: renovarErro } = await admin.from("cobranca_preparos").update({ iniciado_em: new Date().toISOString() })
        .eq("contrato_id", contratoId).eq("dono", dono).select("contrato_id").maybeSingle();
      if (renovarErro || !renovada) throw new Error("O pagamento está sendo preparado. Tente novamente em instantes.");
      const referencia = `nortearq:${contratoId}:${createHash("sha256").update(grupo.parcelas.map((r) => r.id).join(":") + ":" + p.meio_escolhido).digest("hex").slice(0, 20)}`;
      let cobrancas: CobrancaCriada[];
      if (!grupo.parcelado && grupo.parcelas[0].asaas_cobranca_id) {
        cobrancas = [await asaas<CobrancaCriada>(chave, `/payments/${encodeURIComponent(grupo.parcelas[0].asaas_cobranca_id)}`)];
      } else {
        const existentes = await asaas<{ data: CobrancaCriada[] }>(chave, `/payments?externalReference=${encodeURIComponent(referencia)}&limit=100`);
        cobrancas = existentes.data ?? [];
      }
      if (!cobrancas.length) {
        const { error: pedidoErro } = await admin.from("cobranca_solicitacoes").insert({ referencia, contrato_id: contratoId });
        if (pedidoErro?.code === "23505") throw new Error("Uma solicitação já foi enviada ao Asaas, mas ainda não foi confirmada. Atualize em instantes; se continuar, fale com o escritório. Não geraremos uma cobrança duplicada.");
        if (pedidoErro) throw new Error("Não foi possível registrar o preparo da cobrança. Tente novamente.");
        const total = Math.round(grupo.parcelas.reduce((s, r) => s + r.valor, 0) * 100) / 100;
        let primeira: CobrancaCriada;
        try { primeira = await asaas<CobrancaCriada>(chave, "/payments", {
          method: "POST", body: JSON.stringify({ customer: clienteAsaas, billingType, dueDate: grupo.vencimento,
            ...(grupo.parcelado ? { installmentCount: grupo.parcelas.length, totalValue: total } : { value: total }),
            description: `${grupo.parcelado ? (p.cartao_valor_total ? "Valor total parcelado do contrato" : "Saldo parcelado do contrato") : grupo.parcelas[0].descricao} · ${esc.nome}`.slice(0, 500),
            externalReference: referencia, ...(split ? { split } : {}),
          }),
        }); } catch (e) {
          // Só uma recusa conclusiva permite nova criação. Timeout/5xx exige consulta/reconciliação.
          if (e instanceof ErroAsaas && [400,401,403,404,422].includes(e.status))
            await admin.from("cobranca_solicitacoes").delete().eq("referencia", referencia);
          throw e;
        }
        cobrancas = [primeira];
      }
      const parcelamento = cobrancas[0]?.installment;
      if (grupo.parcelado) {
        if (!parcelamento) throw new Error("O Asaas não retornou o parcelamento. O escritório precisa conferir a cobrança.");
        const lista = await asaas<{ data: CobrancaCriada[] }>(chave, `/installments/${encodeURIComponent(parcelamento)}/payments?limit=100`);
        cobrancas = lista.data;
        cobrancas.sort((a, b) => a.installmentNumber && b.installmentNumber
          ? a.installmentNumber - b.installmentNumber : a.dueDate.localeCompare(b.dueDate));
      }
      if (cobrancas.length !== grupo.parcelas.length || cobrancas.some((r, i) => Math.round(Number(r.value) * 100) !== Math.round(grupo.parcelas[i].valor * 100)))
        throw new Error("Os valores retornados pelo Asaas diferem do contrato. O escritório precisa conferir antes do pagamento.");
      const linkGrupo = cobrancas[0].invoiceUrl;
      for (const [i, pg] of grupo.parcelas.entries()) {
        const r = cobrancas[i];
        if (!r.id || !r.invoiceUrl) throw new Error("O Asaas ainda não disponibilizou o link de pagamento.");
        const { data: salva, error: salvarErro } = await admin.from("pagamentos").update({
          asaas_cobranca_id: r.id, asaas_link: grupo.parcelado ? linkGrupo : r.invoiceUrl,
          asaas_parcelamento_id: parcelamento ?? null, asaas_status: r.status, asaas_forma: billingType,
          taxa_plataforma: split ? TAXA_PLATAFORMA : 0, cobranca_gerada_em: new Date().toISOString(),
        }).eq("id", pg.id).eq("escritorio_id", c.escritorio_id).select("id").maybeSingle();
        if (salvarErro || !salva) throw new Error("A cobrança foi criada, mas o link ainda não foi salvo. Tente novamente para recuperar o mesmo pagamento.");
        if (["CONFIRMED", "RECEIVED"].includes(r.status) && !pg.pago_em) {
          const { error: baixaErro } = await admin.rpc("baixa_automatica", { p_pagamento: pg.id, p_data: null,
            p_forma: formaDoAsaas(r.billingType ?? billingType), p_observacao: `Pagamento confirmado no Asaas (${r.id})` });
          if (baixaErro) throw new Error("O pagamento foi confirmado, mas o registro precisa ser atualizado. Tente novamente.");
        }
      }
    }
    return { ok: true };
  } catch (e) {
    const m = (e as Error).message;
    console.error("[cobrança] preparar contrato", m);
    if (/timeout|abort|fetch failed/i.test(m)) return { erro: "O Asaas demorou para responder. Tente novamente: vamos consultar a cobrança antes de gerar outra." };
    if (/aprova|an[aá]lise|documenta|cadastro incompleto/i.test(m)) return { erro: "A conta Asaas do escritório precisa estar aprovada para receber. Fale com o escritório." };
    return { erro: m.startsWith("HTTP") ? "Não foi possível preparar o pagamento no Asaas. Tente novamente ou fale com o escritório." : m };
  } finally {
    await admin.from("cobranca_preparos").delete().eq("contrato_id", contratoId).eq("dono", dono);
  }
}

export function linkCheckout(id: string, ambiente: Ambiente) {
  return `https://${ambiente === "teste" ? "sandbox.asaas.com" : "asaas.com"}/checkoutSession/show?id=${encodeURIComponent(id)}`;
}

export async function habilitarEventosCheckout(chave: string, webhookId: string) {
  const w = await asaas<{ events: string[]; enabled: boolean; interrupted: boolean }>(chave, `/webhooks/${encodeURIComponent(webhookId)}`);
  if (!w.enabled || w.interrupted) throw new Error("O escritório precisa verificar o webhook no Asaas antes de receber pelo cartão.");
  const events = [...new Set([...w.events, ...EVENTOS_CHECKOUT])];
  if (events.length !== w.events.length) await asaas(chave, `/webhooks/${encodeURIComponent(webhookId)}`, {
    method: "PUT", body: JSON.stringify({ events }),
  });
}

async function prepararCheckoutCartao(
  admin: SupabaseClient, chave: string, pg: { id: string; valor: number; pago_em: string | null },
  contratoId: string, escritorioId: string, nome: string, webhookId: string | null, carteiraId: string,
): Promise<{ ok: true }> {
  if (pg.pago_em) return { ok: true };
  const { data: anterior, error: consultarErro } = await admin.from("cobranca_checkout_sessoes").select("id,estado,link")
    .eq("pagamento_id", pg.id).eq("escritorio_id", escritorioId).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (consultarErro) throw new Error("Não foi possível consultar o pagamento no cartão.");
  if (anterior?.estado === "PAID") return { ok: true };
  if (anterior?.estado === "ACTIVE" && anterior.link) return { ok: true };
  if (anterior && ["SOLICITADO", "ACTIVE"].includes(anterior.estado))
    throw new Error("O Asaas está confirmando a abertura do pagamento. Atualize em instantes; não criaremos outro checkout enquanto essa solicitação estiver pendente.");
  if (!webhookId) throw new Error("O escritório precisa reconectar a conta Asaas para receber pelo cartão.");
  await habilitarEventosCheckout(chave, webhookId);
  const { data: publico, error: linkErro } = await admin.from("links_cliente").select("token,destino")
    .eq("referencia_id", contratoId).eq("destino", "contrato").eq("escritorio_id", escritorioId)
    .gt("expira_em", new Date().toISOString()).order("expira_em", { ascending: false }).limit(1).maybeSingle();
  if (linkErro || !publico) throw new Error("Peça ao escritório um link válido do contrato antes de pagar.");
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nortearq.com.br").replace(/\/$/, "");
  if (!site.startsWith("https://") && siteEmProducao()) throw new Error("O endereço seguro do site precisa ser configurado pelo suporte.");
  const sessao = randomUUID();
  const retorno = `${site}/c/${publico.token}/contrato?pagamento=${sessao}#pagamento`;
  const { error: iniciarErro } = await admin.from("cobranca_checkout_sessoes").insert({
    id: sessao, pagamento_id: pg.id, escritorio_id: escritorioId, valor: pg.valor,
  });
  if (iniciarErro) throw new Error("O pagamento está sendo preparado. Atualize em instantes.");
  const maximo = Math.min(21, Math.floor(pg.valor / 5));
  const carteira = process.env.ASAAS_CARTEIRA_NORTEARQ;
  const comSplit = ambienteDaChave(chave) === "producao" && carteira && carteira !== carteiraId;
  let checkout: { id: string; status?: string };
  try {
    checkout = await asaas(chave, "/checkouts", { method: "POST", body: JSON.stringify({
      billingTypes: ["CREDIT_CARD"], chargeTypes: maximo > 1 ? ["DETACHED", "INSTALLMENT"] : ["DETACHED"],
      ...(maximo > 1 ? { installment: { maxInstallmentCount: maximo } } : {}),
      minutesToExpire: 1440, externalReference: sessao,
      callback: { successUrl: retorno, cancelUrl: retorno, expiredUrl: retorno },
      items: [{ name: "Serviços contratados", description: `Valor total · ${nome}`.slice(0, 150), quantity: 1, value: pg.valor, externalReference: pg.id }],
      ...(comSplit ? { splits: [{ walletId: carteira, fixedValue: TAXA_PLATAFORMA }] } : {}),
    }) });
  } catch (e) {
    // Recusa conclusiva libera nova tentativa. Timeout/5xx depende do webhook e de conferência.
    if (e instanceof ErroAsaas && [400,401,403,404,422].includes(e.status))
      await admin.from("cobranca_checkout_sessoes").update({ estado: "RECUSADO" }).eq("id", sessao).eq("estado", "SOLICITADO");
    throw e;
  }
  if (!checkout.id) throw new Error("O Asaas ainda não confirmou o acesso ao cartão. Atualize em instantes.");
  const { error: salvarErro } = await admin.rpc("registrar_checkout", { p_sessao: sessao, p_escritorio: escritorioId,
    p_asaas: checkout.id, p_estado: "ACTIVE", p_total: pg.valor, p_link: linkCheckout(checkout.id, ambienteDaChave(chave)!),
  });
  if (salvarErro) throw new Error("O checkout foi aberto, mas ainda estamos recuperando o link pelo Asaas. Atualize em instantes.");
  return { ok: true };
}

// Forma de pagamento do Asaas → forma do recibo.
export function formaDoAsaas(billingType: string | undefined) {
  if (billingType === "PIX") return "pix";
  if (billingType === "BOLETO") return "boleto";
  if (billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD") return "cartao";
  return "outro";
}
