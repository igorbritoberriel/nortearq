import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { VisualizacaoProposta } from "@/components/propostas/VisualizacaoProposta";
import { carregarDocumentos } from "@/lib/portal-documentos";

// Proposta aprovada no portal: leitura e PDF a qualquer momento.
export default async function PortalPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentos = await carregarDocumentos(id);
  if (!documentos?.proposta) notFound();

  return (
    <>
      <div className="nao-imprimir portal-doc-topo">
        <Link href={`/portal/projetos/${id}`} className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao projeto
        </Link>
        <BotaoImprimir />
      </div>
      <div className="publico-form">
        <VisualizacaoProposta proposta={documentos.proposta} />
      </div>
    </>
  );
}
