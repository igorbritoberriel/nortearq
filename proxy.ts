import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renova a sessão do Supabase e faz a checagem rápida de login.
// A checagem de verdade (quem é membro de qual escritório) fica nos layouts e no banco (RLS).
// Sem .env.local o sistema fica aberto, para dar para navegar pelo esqueleto.

const AREAS_PROTEGIDAS = ["/app", "/portal"];
const TELAS_DE_ENTRADA = ["/entrar", "/cadastro"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;

  if (!user && AREAS_PROTEGIDAS.some((area) => caminho === area || caminho.startsWith(`${area}/`))) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = `?proximo=${encodeURIComponent(caminho + request.nextUrl.search)}`;
    return redirecionar(destino, resposta);
  }

  if (user && TELAS_DE_ENTRADA.includes(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/app";
    destino.search = "";
    return redirecionar(destino, resposta);
  }

  return resposta;
}

// Leva junto os cookies renovados, senão a sessão se perde no redirecionamento.
function redirecionar(destino: URL, resposta: NextResponse) {
  const redirecionamento = NextResponse.redirect(destino);
  resposta.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}

export const config = {
  matcher: ["/app/:path*", "/portal/:path*", "/entrar", "/cadastro", "/redefinir-senha"],
};
