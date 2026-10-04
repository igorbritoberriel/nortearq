import type { Metadata, Viewport } from "next";
import { obterSessaoArquiteto } from "@/lib/escritorio";

// Aplicativo instalável (PWA) só para o sistema do arquiteto.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NorteArq", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#132640" };

// Todo o /app exige arquiteto logado. O proxy.ts já barra quem não tem sessão;
// aqui o cliente final (sem escritório) é mandado para o portal.
export default async function AppRaizLayout({ children }: { children: React.ReactNode }) {
  await obterSessaoArquiteto();
  return children;
}
