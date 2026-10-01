import { cache } from "react";
import { notFound } from "next/navigation";
import type { DestinoLink } from "@/lib/clientes";
import { criarClienteServidor } from "@/lib/supabase/server";

// Link sem login (/c/[token]/...): o banco valida o código e devolve só a marca do escritório
// e o primeiro nome do cliente (função link_cliente_publico, RG-7).

export type LinkPublico = {
  destino: DestinoLink;
  valido: boolean;
  expira_em: string;
  cliente_nome: string;
  escritorio: { nome: string; logo_url: string | null; cor_primaria: string | null; whatsapp: string | null };
};

// undefined = Supabase não configurado (modo esqueleto); null = código não existe.
export const carregarLink = cache(async (token: string): Promise<LinkPublico | null | undefined> => {
  const supabase = await criarClienteServidor();
  if (!supabase) return undefined;
  if (!/^[0-9a-f]{32,128}$/.test(token)) return null;
  const { data, error } = await supabase.rpc("link_cliente_publico", { p_token: token });
  if (error) console.error("[link_cliente]", error.message);
  return (data as LinkPublico | null) ?? null;
});

// Cada página só abre com um link do próprio tipo (um link de briefing não abre a proposta).
export async function exigirLink(token: string, destino: DestinoLink) {
  const link = await carregarLink(token);
  if (link === null || (link && link.destino !== destino)) notFound();
  return link;
}

// Texto branco ou escuro, o que tiver mais contraste com a cor do escritório.
export function textoSobre(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#1d1d1b" : "#ffffff";
}
