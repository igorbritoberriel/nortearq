import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { sair } from "@/app/(auth)/acoes";

export const metadata: Metadata = { title: "Acesso pausado" };

// RG-5: o escritório saiu do plano Escritório; a equipe fica sem acesso até ele voltar (nada é apagado).
export default function SemAcessoPage() {
  return (
    <main className="assistente">
      <Logo />
      <section className="cartao assistente-cartao">
        <h1>Seu acesso está pausado</h1>
        <p>
          O escritório mudou para um plano sem equipe. Nada foi apagado: o seu acesso volta assim que o dono reativar o plano
          Escritório. Fale com ele se precisar.
        </p>
        <form action={sair}>
          <button type="submit" className="botao botao-secundario">
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </form>
      </section>
    </main>
  );
}
