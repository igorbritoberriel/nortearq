import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, FileText } from "lucide-react";
import { ProjetoCliente } from "@/components/projetos/ProjetoCliente";
import { carregarPortal } from "@/lib/portal";
import { carregarDocumentos } from "@/lib/portal-documentos";
import { dataCurta } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const maxDuration = 120;

// Projeto no portal: o mesmo conteúdo do link do WhatsApp (etapas, aprovação, aditivos, pagamentos)
// e mais os documentos do projeto.
export default async function PortalProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portal = await carregarPortal();
  if (!portal) return null;
  if (!portal.projetos.some((p) => p.id === id)) notFound();

  const supabase = (await criarClienteServidor())!;
  const [{ data: token, error }, documentos] = await Promise.all([
    supabase.rpc("token_do_portal", { p_projeto: id }),
    carregarDocumentos(id),
  ]);
  if (error || !token) {
    console.error("[portal] projeto", error?.message);
    notFound();
  }

  return (
    <>
      {portal.projetos.length > 1 && (
        <Link href="/portal" className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Meus projetos
        </Link>
      )}
      <ProjetoCliente token={token as string} clienteNome={portal.cliente.nome.split(" ")[0]} escritorioNome={portal.escritorio.nome} />

      {(documentos?.contrato || documentos?.proposta) && (
        <section className="cartao projeto-pagamentos" aria-labelledby="documentos">
          <h2 id="documentos">Documentos</h2>
          <ul className="portal-documentos">
            {documentos.contrato?.status === "assinado" && (
              <li>
                <Link href={`/portal/projetos/${id}/contrato`} className="portal-documento">
                  <FileSignature size={20} aria-hidden="true" />
                  <span>
                    <strong>Contrato assinado</strong>
                    <small className="muted">
                      {documentos.contrato.assinado_em ? `Assinado em ${dataCurta(documentos.contrato.assinado_em)}` : ""}
                    </small>
                  </span>
                </Link>
              </li>
            )}
            {documentos.proposta && (
              <li>
                <Link href={`/portal/projetos/${id}/proposta`} className="portal-documento">
                  <FileText size={20} aria-hidden="true" />
                  <span>
                    <strong>Proposta aprovada</strong>
                    <small className="muted">
                      {documentos.proposta.respondida_em ? `Aprovada em ${dataCurta(documentos.proposta.respondida_em)}` : ""}
                    </small>
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}
    </>
  );
}
