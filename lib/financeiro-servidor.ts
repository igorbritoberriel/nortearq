import "server-only";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteAdmin } from "./supabase/admin";
import { carregarFornecedores } from "./fornecedores-servidor";
import { ambienteDaChave, decifrar } from "./cobranca";
import { intervaloMes, somaValores, type Recebivel, type Despesa, type Entrada, type SaldoAsaas } from "./financeiro";

// Nenhum dado nem credencial de outro escritório chega ao navegador.
export async function carregarFinanceiro(db: SupabaseClient, escritorioId: string, inicio: string) {
  const pagamentos: Recebivel[] = [], despesas: Despesa[] = [];
  const passo = 1000;
  for (let offset = 0; ; offset += passo) {
    const { data, error } = await db.from("pagamentos")
      .select("id,contrato_id,descricao,valor,vencimento,pago_em,asaas_cobranca_id,asaas_checkout_id,asaas_forma,asaas_link,baixa:pagamentos_eventos!pagamentos_baixa_fk(forma),contrato:contratos!inner(status,cliente:clientes(nome,telefone),proposta:propostas(titulo,meio_escolhido))")
      .eq("escritorio_id", escritorioId).eq("contrato.status", "assinado")
      .or(`pago_em.is.null,pago_em.gte.${inicio}`).order("id").range(offset, offset + passo - 1);
    if (error) throw new Error("Não foi possível carregar os recebimentos. Tente novamente.");
    for (const row of data ?? []) {
      const p = row as unknown as { id: string; contrato_id: string; descricao: string; valor: number; vencimento: string | null; pago_em: string | null; asaas_cobranca_id: string | null; asaas_checkout_id: string | null; asaas_forma: string | null; asaas_link: string | null; baixa: { forma: string | null } | null; contrato: { cliente: { nome: string; telefone: string | null } | null; proposta: { titulo: string; meio_escolhido: string | null } | null } };
      pagamentos.push({ id: p.id, contratoId: p.contrato_id, cliente: p.contrato.cliente?.nome ?? "Cliente", projeto: p.contrato.proposta?.titulo ?? "Projeto", descricao: p.descricao, valor: Number(p.valor), vencimento: p.vencimento, pagoEm: p.pago_em, forma: p.baixa?.forma ?? p.asaas_forma ?? p.contrato.proposta?.meio_escolhido ?? null, asaas: !!(p.asaas_cobranca_id || p.asaas_checkout_id), checkout: !!p.asaas_checkout_id, telefone: p.contrato.cliente?.telefone ?? null, link: p.asaas_link });
    }
    if ((data?.length ?? 0) < passo) break;
    if (offset >= 49000) throw new Error("Este volume de recebimentos precisa de um relatório específico. Fale com o suporte.");
  }
  for (let offset = 0; ; offset += passo) {
    const { data, error } = await db.from("financeiro_despesas").select("id,descricao,fornecedor,categoria,valor,vencimento,pago_em,observacao")
      .eq("escritorio_id", escritorioId).is("cancelada_em", null).or(`pago_em.is.null,pago_em.gte.${inicio}`).order("id").range(offset, offset + passo - 1);
    if (error) throw new Error("Não foi possível carregar as despesas. Tente novamente.");
    despesas.push(...(data ?? []).map(d => ({ ...d, valor: Number(d.valor) })) as Despesa[]);
    if ((data?.length ?? 0) < passo) break;
    if (offset >= 49000) throw new Error("Este volume de despesas precisa de um relatório específico. Fale com o suporte.");
  }
  const entradas: Entrada[] = [];
  for (let offset = 0; ; offset += passo) {
    const { data, error } = await db.from("financeiro_entradas").select("id,descricao,origem,categoria,valor,recebido_em,observacao")
      .eq("escritorio_id", escritorioId).is("cancelada_em", null).gte("recebido_em", inicio).order("id").range(offset, offset + passo - 1);
    if (error) throw new Error("Não foi possível carregar as entradas. Tente novamente.");
    entradas.push(...(data ?? []).map(e => ({ ...e, valor: Number(e.valor) })) as Entrada[]);
    if ((data?.length ?? 0) < passo) break;
    if (offset >= 49000) throw new Error("Este volume de entradas precisa de um relatório específico. Fale com o suporte.");
  }
  const fornecedores = await carregarFornecedores(db, escritorioId, true);
  return { recebiveis: pagamentos, despesas, entradas, fornecedores };
}

const indisponivel: SaldoAsaas = { ativo: true, teste: false, saldo: null, aLiberar: null, taxas: null, erro: true, atualizadoEm: null };
export const consultarSaldoAsaas = unstable_cache(async (escritorioId: string, mes: string): Promise<SaldoAsaas> => {
  const admin = criarClienteAdmin();
  if (!admin) return indisponivel;
  const { data: cred, error } = await admin.from("cobranca_credenciais").select("chave_cifrada").eq("escritorio_id", escritorioId).maybeSingle();
  if (error || !cred) return indisponivel;
  try {
    const chave = decifrar(cred.chave_cifrada), ambiente = ambienteDaChave(chave);
    if (!ambiente) return indisponivel;
    const base = `https://${ambiente === "teste" ? "api-sandbox" : "api"}.asaas.com/v3`;
    async function get<T>(path: string): Promise<T> {
      const r = await fetch(base + path, { headers: { access_token: chave, "User-Agent": "NorteArq" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (!r.ok) throw new Error(`Asaas ${r.status}`);
      return r.json();
    }
    const results = await Promise.allSettled([get<{ balance: number }>("/finance/balance"), get<{ netValue: number }>("/finance/payment/statistics?status=CONFIRMED"), (async () => {
      const periodo = intervaloMes(mes), valores: number[] = [];
      for (const status of ["CONFIRMED", "RECEIVED"]) for (let offset = 0; ; offset += 100) {
        const params = new URLSearchParams({ status, "paymentDate[ge]": periodo.inicio, "paymentDate[le]": periodo.fim, limit: "100", offset: String(offset) });
        const page = await get<{ data: { value: number; netValue: number }[]; hasMore: boolean }>(`/payments?${params}`);
        for (const p of page.data) {
          if (typeof p.netValue !== "number" || typeof p.value !== "number") throw new Error("Taxa não informada");
          valores.push(Math.max(0, p.value - p.netValue));
        }
        if (!page.hasMore) break;
        if (offset >= 900) throw new Error("Taxas exigem consulta completa no Asaas");
      }
      return somaValores(valores);
    })()]);
    const saldo = results[0].status === "fulfilled" && Number.isFinite(results[0].value.balance) ? results[0].value.balance : null;
    const aLiberar = results[1].status === "fulfilled" && Number.isFinite(results[1].value.netValue) ? results[1].value.netValue : null;
    const taxas = results[2].status === "fulfilled" ? results[2].value : null;
    return { ativo: true, teste: ambiente === "teste", saldo, aLiberar, taxas, erro: saldo === null || aLiberar === null || taxas === null, atualizadoEm: new Date().toISOString() };
  } catch { return indisponivel; }
}, ["financeiro-asaas-v1"], { revalidate: 300 });
