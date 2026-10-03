import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, MessageCircle } from "lucide-react";
import { linkWhatsapp } from "@/lib/contatos";
import { carregarLink, textoSobre } from "@/lib/link-cliente";

// Links enviados ao cliente por WhatsApp, sem login (RG-7).
// O código identifica cliente + escritório (tabela `links_cliente`), expira e só abre o próprio item.
// O cliente vê a marca do escritório, nunca a do NorteArq em destaque.

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const link = await carregarLink((await params).token);
  return {
    title: { absolute: link ? link.escritorio.nome : "Link do cliente" },
    robots: { index: false, follow: false },
    referrer: "no-referrer", // o código do link não vaza para sites abertos a partir daqui
  };
}

export default async function LinkClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const link = await carregarLink((await params).token);

  // Modo esqueleto (sem Supabase): mostra as telas de exemplo.
  if (link === undefined) {
    return (
      <div className="cliente">
        <header className="cliente-topo">
          <strong>Logo do escritório</strong>
        </header>
        {children}
      </div>
    );
  }
  if (!link) notFound();

  const { escritorio } = link;
  const cor = escritorio.cor_primaria ?? "#1f3a5f";
  const estilo = { "--cor-marca": cor, "--cor-marca-texto": textoSobre(cor) } as React.CSSProperties;

  return (
    <div className="publico" style={estilo}>
      <header className="publico-topo">
        {escritorio.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={escritorio.logo_url} alt={escritorio.nome} className="publico-logo" />
        ) : (
          <span className="publico-inicial" aria-hidden="true">
            {escritorio.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <strong>{escritorio.nome}</strong>
        {/* M9 da revisão de UX: o cliente sempre tem como falar com o escritório. */}
        {escritorio.whatsapp && link.valido && (
          <a
            className="publico-falar"
            href={linkWhatsapp(escritorio.whatsapp, `Olá! Sou ${link.cliente_nome} e tenho uma dúvida sobre o meu projeto.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Falar com o escritório
          </a>
        )}
      </header>

      <main className="publico-conteudo">
        {link.valido ? (
          children
        ) : (
          <div className="publico-sucesso">
            <Clock size={44} aria-hidden="true" className="icone-aviso" />
            <h1>Este link não vale mais</h1>
            <p>
              Ele expirou ou o {escritorio.nome} enviou um link mais novo. Peça o link atualizado, {link.cliente_nome}.
            </p>
            {escritorio.whatsapp && (
              <a
                className="botao botao-marca"
                href={linkWhatsapp(escritorio.whatsapp, "Olá! Meu link expirou, pode me mandar um novo?")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" />
                Pedir link novo no WhatsApp
              </a>
            )}
          </div>
        )}
      </main>

      <footer className="publico-rodape">Link seguro e pessoal · NorteArq</footer>
    </div>
  );
}
