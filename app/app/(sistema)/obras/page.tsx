import { EmConstrucao } from "@/components/EmConstrucao";

export default function ObrasPage() {
  return (
    <EmConstrucao
      modulo="04"
      titulo="Acompanhamento de obra"
      descricao="Módulo opcional: só para quem contratou acompanhamento de obra."
      itens={[
        "Registrar visita: data, horário, motivo, fotos e observações",
        "Contador: “4 de 6 visitas realizadas” + aviso ao acabar as contratadas",
        "Pedidos de visita feitos pelo cliente",
        "Alterações na obra com impacto em custo/prazo, aprovadas antes de executar",
        "Vistoria final com lista de pendências",
        "Entrega final e recebimento formalizado",
      ]}
    />
  );
}
