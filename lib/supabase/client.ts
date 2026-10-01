import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para componentes que rodam no navegador ("use client").
// Retorna null enquanto o .env.local não estiver configurado.
export function criarClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return null;
  return createBrowserClient(url, chave);
}
