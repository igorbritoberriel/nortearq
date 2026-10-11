import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { sair } from "@/app/(auth)/acoes";
import { obterSessaoAdmin } from "@/lib/admin-nortearq";

export const metadata: Metadata = { title: { default: "Administrador", template: "%s · NorteArq" } };

// Painel de administrador do NorteArq: conta própria, sem escritório, só para pensar no
// crescimento e no dinheiro do negócio. Sem o menu de funções de arquiteto (Clientes, Propostas etc.).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoAdmin();
  return (
    <div className="app">
      <aside className="app-lateral">
        <Logo href="/admin" />
        <div className="app-escritorio">
          <strong>Administrador do NorteArq</strong>
          <span className="app-plano">{sessao.email}</span>
        </div>
        <form action={sair} className="app-usuario">
          <span title={sessao.email}>{sessao.email}</span>
          <button type="submit" className="app-sair">
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </form>
      </aside>
      <main className="app-conteudo">{children}</main>
    </div>
  );
}
