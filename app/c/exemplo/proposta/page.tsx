import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/Campo";
import { RespostaProposta } from "@/components/propostas/RespostaProposta";
import { VisualizacaoProposta } from "@/components/propostas/VisualizacaoProposta";
import { textoSobre } from "@/lib/link-cliente";
import type { ConteudoProposta } from "@/lib/propostas";

// Demonstração da proposta como o cliente vê, só em desenvolvimento: http://localhost:3000/c/exemplo/proposta

export const metadata: Metadata = { title: { absolute: "Proposta (exemplo)" }, robots: { index: false } };

const proposta: ConteudoProposta = {
  versao: 2,
  titulo: "Projeto de interiores · Apartamento Icaraí",
  escopo:
    "Mariana, obrigada pela conversa. A proposta abaixo cobre a sala integrada, a cozinha e a suíte, como combinamos, já com o ajuste das parcelas que você pediu.",
  itens: [
    {
      servico: "Interiores",
      escopo: "Projeto completo de sala, cozinha e suíte, do layout ao detalhamento para execução.",
      entregaveis: ["Estudo de layout com 2 opções", "Projeto 3D com imagens realistas", "Detalhamento de marcenaria", "Lista de compras com links"],
    },
    {
      servico: "Reforma",
      escopo: "Adequação da cozinha para integrar com a sala.",
      entregaveis: ["Planta de demolir e construir", "Paginação de piso e revestimentos"],
    },
  ],
  valor_total: 18000,
  parcelas: [],
  modo_pagamento: "parcelado",
  entrada_pct: 30,
  parcelas_max: 12,
  parcelas_escolhidas: null,
  forma_pagamento: "Pagamento por Pix ou transferência bancária.",
  prazo: "60 dias úteis após a validação do briefing.",
  revisoes_incluidas: 3,
  visitas_incluidas: 4,
  nao_incluido: "Projeto elétrico e hidráulico executivo, aprovação no condomínio, acompanhamento diário da obra.",
  deslocamento_tipo: "km",
  deslocamento_valor: 1.5,
  deslocamento_cidade: "Niterói",
  deslocamento_obs: "Pedágios à parte.",
  validade_dias: 15,
  validade_ate: "2026-10-16",
  enviada_em: "2026-10-01",
};

export default function PropostaExemploPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const cor = "#7a5c3e";
  const estilo = { "--cor-marca": cor, "--cor-marca-texto": textoSobre(cor) } as React.CSSProperties;

  return (
    <div className="publico" style={estilo}>
      <header className="publico-topo">
        <span className="publico-inicial" aria-hidden="true">
          S
        </span>
        <strong>Studio Ana Arquitetura</strong>
      </header>
      <main className="publico-conteudo">
        <Aviso tipo="sucesso">Página de exemplo: nada é salvo.</Aviso>
        <p className="muted">Olá, Mariana! Esta é a proposta do Studio Ana Arquitetura para o seu projeto.</p>
        <div className="publico-form proposta-cliente">
          <VisualizacaoProposta proposta={proposta} />
        </div>
        <div className="publico-form">
          <RespostaProposta
            token="exemplo"
            escritorio="Studio Ana Arquitetura"
            parcelamento={{ total: 18000, entradaPct: 30, maximo: 12 }}
            demonstracao
          />
        </div>
      </main>
      <footer className="publico-rodape">Link seguro e pessoal · NorteArq</footer>
    </div>
  );
}
