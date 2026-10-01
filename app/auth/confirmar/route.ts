import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { destinoSeguro } from "@/lib/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

// Destino dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
// Aceita os dois formatos do Supabase: ?code=... (padrão) e ?token_hash=...&type=... (modelo de e-mail próprio).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const destino = destinoSeguro(params.get("proximo"), "/app");

  const supabase = await criarClienteServidor();
  if (supabase) {
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const tipo = params.get("type") as EmailOtpType | null;

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && tipo
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
        : { error: new Error("link sem código") };

    if (!error) return NextResponse.redirect(new URL(destino, request.url));
    console.error("[auth/confirmar]", error.message);

    // Link aberto em outro navegador (ex.: app do Gmail): o Supabase já validou o link antes de mandar
    // o ?code, mas a sessão só pode ser criada no navegador onde o pedido começou.
    if (code && /code verifier/i.test(error.message)) {
      const recuperacao = destino.startsWith("/redefinir-senha");
      return NextResponse.redirect(
        new URL(recuperacao ? "/recuperar-senha?erro=navegador" : "/entrar?confirmado=1", request.url),
      );
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
}
