import type { Metadata } from "next";
import { FormRedefinirSenha } from "@/components/auth/FormulariosAuth";

export const metadata: Metadata = { title: "Criar senha nova" };

// Aberta pelo link do e-mail de recuperação (passa antes por /auth/confirmar, que cria a sessão).
export default function RedefinirSenhaPage() {
  return <FormRedefinirSenha />;
}
