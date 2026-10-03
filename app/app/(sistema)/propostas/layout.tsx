import { redirect } from "next/navigation";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";

// Propostas mostram valores: só dono e administrador. Matriz em lib/permissoes.ts; o banco também barra.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !pode(sessao.membro.papel, "ver_valores")) redirect("/app");
  return children;
}
