import { ExternalLink } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function VerPagamentoCliente({ id, destino = "contrato" }: { id: string; destino?: "contrato" | "projeto" }) {
  const supabase = await criarClienteServidor();
  if (!supabase) return null;
  // Usa a sessão do escritório e as regras de acesso, sem criar ou reenviar links.
  const { data } = await supabase.from("links_cliente").select("token")
    .eq("referencia_id", id).eq("destino", destino).gt("expira_em", new Date().toISOString())
    .order("expira_em", { ascending: false }).limit(1).maybeSingle();
  if (!data) return <p className="campo-ajuda">Envie o link ao cliente para visualizar a página de pagamento. O pagamento fica disponível após a assinatura.</p>;
  return <p><a className="botao botao-secundario" href={`/c/${data.token}/${destino}#pagamento`} target="_blank" rel="noopener noreferrer">
    <ExternalLink size={16} aria-hidden="true" /> Ver pagamento como cliente
  </a></p>;
}
