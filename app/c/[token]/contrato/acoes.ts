"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { avisarContratoAssinado } from "@/lib/avisos";
import { documentoValido } from "@/lib/contratos";
import { criarClienteServidor } from "@/lib/supabase/server";

// Aceite eletrônico do contrato (RN-01.13 a RN-01.15). O banco fecha o texto, gera o código de
// verificação e cria o projeto e os pagamentos.

const MENSAGENS: Record<string, string> = {
  contrato_fechado: "Este contrato já foi assinado ou cancelado.",
  nome_invalido: "Informe o nome completo.",
  documento_invalido: "Informe um CPF ou CNPJ válido.",
  endereco_invalido: "Informe o endereço completo do imóvel.",
  link_invalido: "Este link não vale mais. Peça um link novo ao escritório.",
};

export async function assinarContrato(
  token: string,
  dados: { nome: string; documento: string; endereco: string; aceite: boolean },
): Promise<{ ok: true } | { erro: string; campo?: string }> {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { erro: MENSAGENS.link_invalido };
  const nome = dados.nome.trim().replace(/\s+/g, " ");
  if (nome.length < 5 || !nome.includes(" ")) return { erro: MENSAGENS.nome_invalido, campo: "nome" };
  if (!documentoValido(dados.documento)) return { erro: MENSAGENS.documento_invalido, campo: "documento" };
  if (dados.endereco.trim().length < 8) return { erro: MENSAGENS.endereco_invalido, campo: "endereco" };
  if (!dados.aceite) return { erro: "Marque que leu e concorda com o contrato.", campo: "aceite" };

  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O banco ainda não está ligado." };

  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? null;

  const { data, error } = await supabase.rpc("assinar_contrato", {
    p_token: token,
    p_nome: nome,
    p_documento: dados.documento,
    p_endereco: dados.endereco.trim(),
    p_ip: ip,
    p_navegador: cabecalhos.get("user-agent"),
  });
  if (error || !data) {
    console.error("[contrato] assinar", error?.message);
    const chave = Object.keys(MENSAGENS).find((k) => error?.message.includes(k));
    return { erro: chave ? MENSAGENS[chave] : "Não foi possível registrar agora. Tente de novo." };
  }

  after(() => avisarContratoAssinado(data as string));
  return { ok: true };
}
