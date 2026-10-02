import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/server";

// Portal do cliente: dados do cliente logado (função meu_portal, migração 0019).

export type ProjetoPortal = {
  id: string;
  nome: string;
  status: "ativo" | "entregue" | "encerrado";
  etapas_total: number;
  etapas_aprovadas: number;
  etapas_aguardando: number;
  aditivos_pendentes: number;
  parcelas_pendentes: number;
  valor_pendente: number;
};

export type Portal = {
  cliente: { nome: string; email: string | null };
  escritorio: { nome: string; logo_url: string | null; cor_primaria: string | null; whatsapp: string | null };
  projetos: ProjetoPortal[];
};

// undefined = Supabase não configurado; null = o login não é de um cliente.
export const carregarPortal = cache(async (): Promise<Portal | null | undefined> => {
  const supabase = await criarClienteServidor();
  if (!supabase) return undefined;
  const { data, error } = await supabase.rpc("meu_portal");
  if (error) console.error("[portal]", error.message);
  return (data as Portal | null) ?? null;
});
