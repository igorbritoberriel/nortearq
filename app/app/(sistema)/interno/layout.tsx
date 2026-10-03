import { notFound } from "next/navigation";
import { ehAdminNorteArq } from "@/lib/admin-nortearq";
import { obterSessaoArquiteto } from "@/lib/escritorio";

// Painel interno: só quem administra o NorteArq (NORTEARQ_ADMINS). Para os demais, a página não existe.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (!sessao || !ehAdminNorteArq(sessao.email)) notFound();
  return children;
}
