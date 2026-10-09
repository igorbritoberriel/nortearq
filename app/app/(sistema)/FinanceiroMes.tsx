"use client";
import Link from "next/link";
import { reais } from "@/lib/propostas";
import { BotaoOcultarValores, useOcultarValores, Valor } from "@/components/valores/OcultarValores";

// Quadro "Financeiro do mês" da tela Início (RN-00.6). Componente cliente só porque
// precisa do olho que esconde os valores (lembrado por aparelho, começa escondido).
export function FinanceiroMes({
  mesNome,
  recebidoContratos,
  recebidoOutras,
  totalReceber,
  parcelasPendentes,
  totalAtrasado,
  parcelasAtrasadas,
  totalDespesas,
  despesasPendentes,
  despesasHoje,
}: {
  mesNome: string;
  recebidoContratos: number;
  recebidoOutras: number;
  totalReceber: number;
  parcelasPendentes: number;
  totalAtrasado: number;
  parcelasAtrasadas: number;
  totalDespesas: number;
  despesasPendentes: number;
  despesasHoje: number;
}) {
  const [oculto] = useOcultarValores();
  return (
    <section className="cartao inicio-cartao inicio-financeiro" aria-labelledby="financeiro-mes">
      <div className="inicio-financeiro-topo">
        <h2 id="financeiro-mes">
          Financeiro de {mesNome} <BotaoOcultarValores />
        </h2>
        <Link href="/app/financeiro">Abrir financeiro</Link>
      </div>
      <div className="inicio-numeros">
        <div className="inicio-numero inicio-numero-verde">
          <span>Recebido no mês</span>
          <b>
            <Valor oculto={oculto}>{reais(recebidoContratos + recebidoOutras)}</Valor>
          </b>
          <small>
            Contratos <Valor oculto={oculto}>{reais(recebidoContratos)}</Valor> · outras <Valor oculto={oculto}>{reais(recebidoOutras)}</Valor>
          </small>
        </div>
        <div className="inicio-numero">
          <span>A receber</span>
          <b>
            <Valor oculto={oculto}>{reais(totalReceber)}</Valor>
          </b>
          <small>
            {parcelasPendentes} {parcelasPendentes === 1 ? "parcela pendente" : "parcelas pendentes"}
          </small>
        </div>
        <div className={`inicio-numero ${totalAtrasado > 0 ? "inicio-numero-vermelho" : ""}`}>
          <span>Em atraso</span>
          <b>
            <Valor oculto={oculto}>{reais(totalAtrasado)}</Valor>
          </b>
          <small>
            {parcelasAtrasadas} {parcelasAtrasadas === 1 ? "parcela vencida" : "parcelas vencidas"}
          </small>
        </div>
        <div className="inicio-numero">
          <span>Despesas a pagar</span>
          <b>
            <Valor oculto={oculto}>{reais(totalDespesas)}</Valor>
          </b>
          <small>
            {despesasPendentes} {despesasPendentes === 1 ? "despesa" : "despesas"}
            {despesasHoje > 0 && ` · ${despesasHoje} ${despesasHoje === 1 ? "vencida ou vence hoje" : "vencidas ou vencem hoje"}`}
          </small>
        </div>
      </div>
    </section>
  );
}
