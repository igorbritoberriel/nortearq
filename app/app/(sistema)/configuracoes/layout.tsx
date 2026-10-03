import { redirect } from "next/navigation";
import { obterSessaoArquiteto, podeVerFinanceiro } from "@/lib/escritorio";

// Só dono e administrador (o colaborador não vê valores nem configurações). O banco também barra.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !podeVerFinanceiro(sessao.membro.papel)) redirect("/app");
  return children;
}
