import type { Metadata } from "next";
import { FormRecuperarSenha } from "@/components/auth/FormulariosAuth";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function RecuperarSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <FormRecuperarSenha outroNavegador={erro === "navegador"} />;
}
