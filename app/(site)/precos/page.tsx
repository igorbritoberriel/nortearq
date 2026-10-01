import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ADICIONAIS, COMPARATIVO_PLANOS, PLANOS } from "@/lib/modulos";
import { PRE_LANCAMENTO, TEXTO_CHAMADA, linkChamada } from "@/lib/site";
import { Planos } from "@/components/site/Planos";

export const metadata: Metadata = {
  title: "Preços",
  description: "Planos do NorteArq para arquitetos: Briefing, Profissional e Escritório. 14 dias grátis, sem cartão.",
};

export default function PrecosPage() {
  return (
    <>
      <section className="zona">
        <div className="container">
          <span className="rotulo">Preços</span>
          <h1 className="titulo-pagina">Planos e preços</h1>
          <p className="zona-sub">
            14 dias grátis com tudo do plano Profissional, sem cartão. No anual, 2 meses grátis. Cancele quando
            quiser, sem multa.
          </p>
          <Planos />
        </div>
      </section>

      <section className="zona zona-clara">
        <div className="container">
          <h2>Compare os planos</h2>
          <div className="tabela-rolagem">
            <table className="comparativo">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Recurso</span></th>
                  {PLANOS.map((p) => (
                    <th key={p.id} scope="col" className={p.destaque ? "destaque" : undefined}>
                      {p.nome}
                      <small>R$ {p.preco}/mês</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARATIVO_PLANOS.map((linha) => (
                  <tr key={linha.item}>
                    <th scope="row">{linha.item}</th>
                    {PLANOS.map((p) => {
                      const valor = linha.valores[p.id];
                      return (
                        <td key={p.id} className={p.destaque ? "destaque" : undefined}>
                          {valor === true ? (
                            <Check size={18} aria-label="Incluído" className="sim" />
                          ) : valor === false ? (
                            <Minus size={18} aria-label="Não incluído" className="nao" />
                          ) : (
                            valor
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="zona">
        <div className="container estreito">
          <h2>Adicionais</h2>
          <p className="zona-sub">Contrate só se precisar.</p>
          <ul className="adicionais">
            {ADICIONAIS.map((a) => (
              <li key={a.item}>
                <span>{a.item}</span>
                <strong>{a.preco}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="zona zona-escura chamada-final">
        <div className="container">
          <h2>Ainda em dúvida sobre o plano?</h2>
          <p>
            {PRE_LANCAMENTO
              ? "Entre na lista. Você escolhe o plano só depois de testar."
              : "Teste 14 dias. Você escolhe o plano só no final."}
          </p>
          <Link href={linkChamada()} className="botao botao-claro botao-grande">
            {TEXTO_CHAMADA} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
