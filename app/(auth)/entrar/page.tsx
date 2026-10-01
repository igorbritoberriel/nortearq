import type { Metadata } from "next";
import { FormEntrar } from "@/components/auth/FormulariosAuth";

export const metadata: Metadata = { title: "Entrar" };

// Arquiteto vai para /app e cliente final para /portal (decidido em acoes.ts).
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string; confirmado?: string }>;
}) {
  const { proximo, erro, confirmado } = await searchParams;
  return <FormEntrar proximo={proximo} erroLink={erro === "link"} confirmado={confirmado === "1"} />;
}
