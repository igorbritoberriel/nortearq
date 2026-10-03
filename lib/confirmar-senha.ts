import "server-only";
import { createClient } from "@supabase/supabase-js";

// Confirma a senha de quem está logado antes de uma ação que não tem volta (excluir, anonimizar).
// Usa um cliente separado, sem cookies: a sessão do navegador não é tocada.
export async function confirmarSenha(email: string, senha: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave || !email || !senha) return false;
  const isolado = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await isolado.auth.signInWithPassword({ email, password: senha });
  if (error || data.user?.email?.toLowerCase() !== email.toLowerCase()) return false;
  // Encerra só esta conferência (escopo local), sem derrubar a sessão do navegador.
  await isolado.auth.signOut({ scope: "local" }).catch(() => null);
  return true;
}
