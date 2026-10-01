import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { FormContato } from "@/components/publico/FormContato";
import { EmConstrucao } from "@/components/EmConstrucao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { enviarContato } from "./acoes";

// Página pública do escritório: o link que o arquiteto coloca no Instagram/WhatsApp.
// Ex.: nortearq.com.br/e/studio-ana. O cliente vê a marca do escritório, não a do NorteArq.

type EscritorioPublico = {
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string | null;
  whatsapp: string | null;
  servicos: { id: string; nome: string }[];
};

// Texto branco ou escuro, o que tiver mais contraste com a cor escolhida pelo escritório.
function textoSobre(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.179 ? "#1d1d1b" : "#ffffff";
}

// undefined = Supabase não configurado; null = escritório não existe (ou não terminou a configuração).
const carregar = cache(async (slug: string): Promise<EscritorioPublico | null | undefined> => {
  const supabase = await criarClienteServidor();
  if (!supabase) return undefined;
  const { data, error } = await supabase.rpc("escritorio_publico", { p_slug: slug });
  if (error) console.error("[escritorio_publico]", error.message);
  return (data as EscritorioPublico | null) ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ escritorio: string }> }): Promise<Metadata> {
  const escritorio = await carregar((await params).escritorio);
  if (!escritorio) return { title: { absolute: "Pedido de orçamento" }, robots: { index: false } };
  return {
    title: { absolute: `Pedido de orçamento · ${escritorio.nome}` },
    description: `Conte o seu projeto para o ${escritorio.nome} e receba um orçamento.`,
    openGraph: { title: `Pedido de orçamento · ${escritorio.nome}`, siteName: escritorio.nome },
  };
}

export default async function FormularioEscritorioPage({ params }: { params: Promise<{ escritorio: string }> }) {
  const { escritorio: slug } = await params;
  const escritorio = await carregar(slug);

  if (escritorio === undefined) {
    return (
      <div className="cliente">
        <EmConstrucao
          modulo="01"
          titulo={`Pedido de orçamento · ${slug}`}
          descricao="Ligue o Supabase no .env.local para ver o formulário."
          itens={["Marca do escritório", "Dados de contato", "Serviços", "Área, local, orçamento e prazo"]}
        />
      </div>
    );
  }
  if (!escritorio) notFound();

  const cor = escritorio.cor_primaria ?? "#1f3a5f";
  const acao = enviarContato.bind(null, escritorio.slug, escritorio.servicos.length > 0);
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
      </header>

      <main className="publico-conteudo">
        <h1>Conte o seu projeto</h1>
        <p className="muted">
          Leva uns 2 minutos. Com essas respostas, o {escritorio.nome} já chega na conversa entendendo o que você
          precisa.
        </p>
        <FormContato
          acao={acao}
          escritorio={escritorio.nome}
          servicos={escritorio.servicos}
          whatsapp={escritorio.whatsapp}
        />
      </main>

      <footer className="publico-rodape">Formulário seguro · NorteArq</footer>
    </div>
  );
}
