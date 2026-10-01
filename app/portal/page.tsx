import { EmConstrucao } from "@/components/EmConstrucao";

export default function PortalPage() {
  return (
    <EmConstrucao
      modulo="00"
      titulo="Meus projetos"
      itens={[
        "Lista dos projetos do cliente com o escritório",
        "Pendências do cliente: aprovar etapa, aprovar aditivo, pagamento",
      ]}
    />
  );
}
