import { redirect } from "next/navigation";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";

// Pedidos de orçamento mostram o investimento do cliente: só dono e administrador. Matriz em lib/permissoes.ts; o banco também barra.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !pode(sessao.membro.papel, "ver_pedidos")) redirect("/app");
  return children;
}
