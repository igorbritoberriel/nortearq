import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Financeiro } from "@/components/financeiro/Financeiro";
import { obterSessaoArquiteto, pixDoEscritorio } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeBrasilia, modulosLiberados } from "@/lib/assinatura";
import { pode } from "@/lib/permissoes";
import { mesValido } from "@/lib/financeiro";
import { somarMesesCalendario } from "@/lib/formatacao";
import { carregarFinanceiro, consultarSaldoAsaas } from "@/lib/financeiro-servidor";
export const metadata: Metadata = { title: "Financeiro" };
export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string }> }) {
  const sessao = await obterSessaoArquiteto(), db = await criarClienteServidor();
  if (!sessao || !db) redirect("/entrar");
  if (!pode(sessao.membro.papel, "ver_valores") || !modulosLiberados(sessao.escritorio.plano).includes("01")) redirect("/app");
  const params = await searchParams, hoje = hojeBrasilia(), mes = mesValido(params.mes, hoje);
  const [linhas, asaas] = await Promise.all([carregarFinanceiro(db, sessao.escritorio.id, somarMesesCalendario(`${mes}-01`, -4)), sessao.escritorio.cobranca_ativa ? consultarSaldoAsaas(sessao.escritorio.id, mes) : Promise.resolve({ ativo: false, teste: false, saldo: null, aLiberar: null, taxas: null, erro: false, atualizadoEm: null })]);
  return <Financeiro dados={{ ...linhas, asaas, mes, hoje, podeEditar: pode(sessao.membro.papel, "registrar_pagamento"), somenteLeitura: sessao.situacao === "leitura", cobrar: { escritorio: sessao.escritorio.nome, pix: pixDoEscritorio(sessao.escritorio), cobrancaAtiva: sessao.escritorio.cobranca_ativa } }} abaInicial={params.aba} />;
}
