import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para Server Components, Server Actions e rotas de API.
// Retorna null enquanto o .env.local não estiver configurado.
export async function criarClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return null;

  const cookieStore = await cookies();
  return createServerClient(url, chave, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: cookies são somente leitura aqui.
          // TODO: criar proxy.ts para renovar a sessão e proteger /app e /portal.
        }
      },
    },
  });
}
