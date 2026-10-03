import { redirect } from "next/navigation";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";

// Editor de briefing é configuração do escritório: só dono e administrador. Matriz em lib/permissoes.ts; o banco também barra.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !pode(sessao.membro.papel, "configurar_escritorio")) redirect("/app");
  return children;
}
