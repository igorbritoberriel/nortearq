import { cache } from "react";
import type { ConteudoProposta } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Documentos do projeto no portal: contrato assinado e proposta aprovada (função documentos_do_portal).

export type DocumentosPortal = {
  contrato: {
    status: string;
    conteudo: string | null;
    assinado_em: string | null;
    aceite_nome: string | null;
    codigo_verificacao: string | null;
  } | null;
  proposta: (ConteudoProposta & { respondida_em: string | null }) | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const carregarDocumentos = cache(async (projetoId: string): Promise<DocumentosPortal | null> => {
  if (!UUID.test(projetoId)) return null;
  const supabase = await criarClienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("documentos_do_portal", { p_projeto: projetoId });
  if (error) console.error("[portal] documentos", error.message);
  return (data as DocumentosPortal | null) ?? null;
});
