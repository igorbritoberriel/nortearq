import { obterSessaoArquiteto } from "@/lib/escritorio";

// Todo o /app exige arquiteto logado. O proxy.ts já barra quem não tem sessão;
// aqui o cliente final (sem escritório) é mandado para o portal.
export default async function AppRaizLayout({ children }: { children: React.ReactNode }) {
  await obterSessaoArquiteto();
  return children;
}
