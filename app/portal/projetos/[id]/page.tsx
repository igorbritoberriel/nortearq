import { EmConstrucao } from "@/components/EmConstrucao";

export default async function PortalProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <EmConstrucao
      modulo="03"
      titulo={`Projeto #${id}`}
      itens={[
        "Etapas e andamento em tempo real",
        "Arquivos para ver e baixar",
        "Aprovar etapa ou pedir revisão (com comentário) + revisões restantes",
        "Aditivos para aprovar",
        "Pagamentos por etapa: pago / pendente",
        "Obra (módulo 04): diário de visitas, “4 de 6 realizadas”, pedir visita, aprovar alterações",
        "Pós-entrega (módulo 05): avaliar a experiência",
      ]}
    />
  );
}
