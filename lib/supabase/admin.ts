import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a chave secreta do Supabase: ignora o RLS. Só roda no servidor.
// Usado para o que o visitante sem login não pode fazer sozinho: assinar o envio de fotos do
// briefing e descobrir o e-mail do arquiteto para os avisos. Sempre confira o link/permissão antes.
// Retorna null sem SUPABASE_SECRET_KEY no .env.local.
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
