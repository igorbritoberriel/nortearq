import { cache } from "react";
import { redirect } from "next/navigation";
import type { SituacaoEscritorio } from "@/lib/assinatura";
import { criarClienteServidor } from "@/lib/supabase/server";

// Arquiteto logado + escritório dele. Usado pelo layout e pelas páginas de /app.
// cache(): várias chamadas na mesma requisição fazem uma consulta só.

export type Escritorio = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string | null;
  whatsapp: string | null;
  plano: "trial" | "briefing" | "profissional" | "escritorio";
  trial_ate: string | null;
  faixa_preco_min: number | null;
  faixa_preco_max: number | null;
  proxima_data_livre: string | null;
  briefing_antes_proposta: boolean;
  onboarding_concluido_em: string | null;
  // Dados do CONTRATADO no contrato (0008)
  documento: string | null;
  endereco: string | null;
  responsavel: string | null;
  registro_profissional: string | null;
  // Parcelamento padrão das propostas (0012)
  parcelamento_entrada_pct: number;
  parcelamento_max: number;
  // Assinatura (0020)
  plano_escolhido: "briefing" | "profissional" | "escritorio" | null;
  periodo: "mensal" | "anual" | null;
  pago_ate: string | null;
  assinatura_cancelada_em: string | null;
  asaas_assinatura_id: string | null;
};

export type Servico = {
  id: string;
  nome: string;
  tem_briefing: boolean;
  ativo: boolean;
  ordem: number;
};

export type SessaoArquiteto = {
  email: string;
  membro: { id: string; nome: string; papel: "dono" | "equipe" };
  escritorio: Escritorio;
  situacao: SituacaoEscritorio;
};

// null = Supabase não configurado (modo esqueleto, sem login).
export const obterSessaoArquiteto = cache(async (): Promise<SessaoArquiteto | null> => {
  const supabase = await criarClienteServidor();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: membro } = await supabase
    .from("membros")
    .select("id, nome, papel, escritorio:escritorios(*)")
    .eq("id", user.id)
    .maybeSingle();

  // Usuário sem escritório é cliente final: o lugar dele é o portal.
  if (!membro?.escritorio) redirect("/portal");

  const { escritorio, ...dadosMembro } = membro as unknown as SessaoArquiteto["membro"] & { escritorio: Escritorio };
  // RG-1 a RG-3: teste, ativo, tolerância, modo leitura ou suspenso (calculado pelo banco).
  const { data: situacao } = await supabase.rpc("situacao_escritorio", { p_escritorio: escritorio.id });
  return { email: user.email ?? "", membro: dadosMembro, escritorio, situacao: (situacao as SituacaoEscritorio) ?? "teste" };
});

export async function listarServicos(): Promise<Servico[]> {
  const supabase = await criarClienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.from("servicos").select("id, nome, tem_briefing, ativo, ordem").order("ordem");
  return (data ?? []) as Servico[];
}

// Dias restantes do teste grátis (RG-1). null quando já é assinante.
export function diasDeTeste(escritorio: Escritorio): number | null {
  if (escritorio.plano !== "trial" || !escritorio.trial_ate) return null;
  const fim = new Date(`${escritorio.trial_ate}T23:59:59`);
  return Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86_400_000));
}

export function urlDoSite() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function linkDoEscritorio(slug: string) {
  return `${urlDoSite()}/e/${slug}`;
}
