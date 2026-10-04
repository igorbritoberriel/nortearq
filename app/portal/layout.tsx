import { PerguntasFrequentes } from "@/components/publico/PerguntasFrequentes";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, MessageCircle } from "lucide-react";
import { sair } from "@/app/(auth)/acoes";
import { linkWhatsapp } from "@/lib/contatos";
import { textoSobre } from "@/lib/link-cliente";
import { carregarPortal } from "@/lib/portal";
import { criarClienteServidor } from "@/lib/supabase/server";

// Portal do cliente final (com login; o proxy.ts já exige). Sempre com a marca do escritório (RN-00.2).

export async function generateMetadata(): Promise<Metadata> {
  const portal = await carregarPortal();
  return {
    title: { absolute: portal ? `Meu projeto · ${portal.escritorio.nome}` : "Portal do cliente" },
    robots: { index: false },
    // Ícone da aba com a logo do escritório (o cliente vê a marca do escritório).
    ...(portal?.escritorio.logo_url ? { icons: { icon: portal.escritorio.logo_url, apple: portal.escritorio.logo_url } } : {}),
  };
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const portal = await carregarPortal();

  if (portal === null) {
    // Login de arquiteto: o lugar dele é o sistema.
    const supabase = await criarClienteServidor();
    const { data: usuario } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (usuario.user) {
      const { data: membro } = await supabase!.from("membros").select("id").eq("id", usuario.user.id).maybeSingle();
      if (membro) redirect("/app");
    }
    return (
      <div className="cliente">
        <div className="publico-sucesso">
          <h1>Sua conta ainda não está ligada a um projeto</h1>
          <p>Abra o link que o escritório mandou no WhatsApp e use “Criar meu acesso” por lá.</p>
          <form action={sair}>
            <button type="submit" className="botao botao-secundario">
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (portal === undefined) {
    return (
      <div className="cliente">
        <p className="muted">Ligue o Supabase no .env.local para ver o portal.</p>
        {children}
      </div>
    );
  }

  const { escritorio } = portal;
  const cor = escritorio.cor_primaria ?? "#1f3a5f";
  const estilo = { "--cor-marca": cor, "--cor-marca-texto": textoSobre(cor) } as React.CSSProperties;

  return (
    <div className="publico portal" style={estilo}>
      <header className="publico-topo portal-topo">
        <Link href="/portal" className="portal-marca">
          {escritorio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={escritorio.logo_url} alt={escritorio.nome} className="publico-logo" />
          ) : (
            <span className="publico-inicial" aria-hidden="true">
              {escritorio.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <strong>{escritorio.nome}</strong>
        </Link>
        {escritorio.whatsapp && (
          <a
            className="publico-falar"
            href={linkWhatsapp(escritorio.whatsapp, `Olá! Sou ${portal.cliente.nome.split(" ")[0]} e tenho uma dúvida sobre o meu projeto.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Falar com o escritório
          </a>
        )}
        <form action={sair} className="portal-sair">
          <span className="muted">{portal.cliente.nome.split(" ")[0]}</span>
          <button type="submit" className="botao botao-fantasma botao-pequeno">
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </form>
      </header>
      <main className="publico-conteudo">{children}</main>
      <PerguntasFrequentes />
      <footer className="publico-rodape">Portal do cliente · NorteArq</footer>
    </div>
  );
}
