import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { carregarDocumentos } from "@/lib/portal-documentos";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Contrato assinado no portal: leitura e PDF a qualquer momento.
export default async function PortalContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentos = await carregarDocumentos(id);
  const contrato = documentos?.contrato;
  if (!contrato || contrato.status !== "assinado" || !contrato.conteudo) notFound();

  return (
    <>
      <div className="nao-imprimir portal-doc-topo">
        <Link href={`/portal/projetos/${id}`} className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao projeto
        </Link>
        <BotaoImprimir />
      </div>
      <div className="publico-form contrato-documento">
        <pre className="contrato-texto">{contrato.conteudo}</pre>
        <div className="contrato-aceite">
          <h2>
            <ShieldCheck size={20} aria-hidden="true" /> Aceite eletrônico
          </h2>
          <p>
            Aceito por {contrato.aceite_nome} em {contrato.assinado_em && dataHora.format(new Date(contrato.assinado_em))}{" "}
            (horário de Brasília).
          </p>
          <p className="campo-ajuda">
            Código de verificação: <code className="contrato-codigo">{contrato.codigo_verificacao}</code>
          </p>
        </div>
      </div>
    </>
  );
}
