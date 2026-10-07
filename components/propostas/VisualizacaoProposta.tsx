import { CalendarClock, Car, Eye, PencilRuler, Wallet } from "lucide-react";
import { MEIOS_PAGAMENTO } from "@/lib/condicoes-pagamento";
import { type ConteudoProposta, dataCurta, linhasDaProposta, opcoesParcelamento, reais, valorAvista, somaParcelas, textoDeslocamento } from "@/lib/propostas";

// A proposta como o cliente lê (RN-01.6). Usada no link do cliente e na pré-visualização do arquiteto.
export function VisualizacaoProposta({ proposta }: { proposta: ConteudoProposta }) {
  const p = proposta;
  const diferenca = p.parcelas.length && p.valor_total ? p.valor_total - somaParcelas(p.parcelas) : 0;
  // Parcelado e o cliente ainda não escolheu: mostra as opções.
  const aEscolher = p.modo_pagamento === "parcelado" && !p.parcelas.length && !!p.valor_total;
  const opcoes = aEscolher ? opcoesParcelamento(p.valor_total!, p.entrada_pct ?? 0, p.parcelas_max ?? 1) : [];

  return (
    <article className="proposta">
      <header className="proposta-topo">
        <p className="perfil-rotulo">
          Proposta{p.versao > 1 ? ` · versão ${p.versao}` : ""}
          {p.enviada_em && ` · ${dataCurta(p.enviada_em)}`}
        </p>
        <h1>{p.titulo}</h1>
        {p.escopo && <p className="proposta-apresentacao">{p.escopo}</p>}
      </header>

      {p.itens.map((item, i) => (
        <section key={i} className="proposta-bloco">
          <h2>{item.servico || "Serviço"}</h2>
          {linhasDaProposta(item.escopo).length > 0 && (
            <ul className="proposta-lista">
              {linhasDaProposta(item.escopo).map((linha, n) => (
                <li key={n}>{linha}</li>
              ))}
            </ul>
          )}
          {item.entregaveis.length > 0 && (
            <>
              <h3>O que você recebe</h3>
              <ul className="proposta-lista">
                {item.entregaveis.map((e, n) => (
                  <li key={n}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}

      <section className="proposta-bloco">
        <h2>Investimento</h2>
        <p className="campo-ajuda">{p.meio_escolhido
          ? `Forma escolhida: ${MEIOS_PAGAMENTO[p.meio_escolhido]}.`
          : p.meios_pagamento?.length ? `Formas aceitas: ${p.meios_pagamento.map((m) => MEIOS_PAGAMENTO[m]).join(", ")}.` : null}</p>
        <p className="proposta-total">{reais(p.valor_total)}</p>
        {aEscolher && !!p.desconto_avista_pct && p.desconto_avista_pct > 0 && (
          <p className="proposta-texto avista-destaque">
            <strong>À vista: {reais(valorAvista(p.valor_total!, p.desconto_avista_pct))}</strong> (
            {String(p.desconto_avista_pct).replace(".", ",")}% de desconto, pagamento único na assinatura do contrato). Ou:
          </p>
        )}
        {aEscolher && (!p.meios_pagamento || p.meios_pagamento.some((m) => m !== "cartao")) && (
          <>
            <p className="proposta-texto">
              {p.meios_pagamento?.includes("cartao") ? "Pix ou boleto: " : ""}
              {opcoes[0].entrada > 0
                ? `Entrada de ${reais(opcoes[0].entrada)} (${p.entrada_pct}%) na assinatura do contrato e o saldo `
                : "Pagamento "}
              {(p.parcelas_max ?? 1) > 1 ? `em até ${p.parcelas_max}x mensais, à sua escolha:` : "à vista."}
            </p>
            {(p.parcelas_max ?? 1) > 1 && (
              <ul className="parcelamento-lista">
                {opcoes.map((o) => (
                  <li key={o.n}>
                    <strong>{o.n === 1 ? (o.entrada > 0 ? "Saldo em 1x" : "1x") : `${o.n}x`}</strong>{" "}
                    {o.n === 1 ? reais(Math.round((p.valor_total! - o.entrada) * 100) / 100) : `de ${reais(o.parcela)}`}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {!p.meio_escolhido && p.meios_pagamento?.includes("cartao") && !!p.valor_total && (
          <>
            <p className="proposta-texto">Cartão de crédito: valor total sem entrada, em até {Math.min(12, p.parcelas_max ?? 1)}x.</p>
            <ul className="parcelamento-lista">
              {opcoesParcelamento(p.valor_total, 0, Math.min(12, p.parcelas_max ?? 1)).filter((o) => o.parcela >= 5).map((o) => (
                <li key={o.n}><strong>{o.n}x</strong> de {reais(o.parcela)}</li>
              ))}
            </ul>
          </>
        )}
        {p.parcelas_escolhidas && (
          <p className="proposta-texto">
            <strong>Forma escolhida:</strong>{" "}
            {p.avista
              ? `à vista, com ${String(p.desconto_avista_pct ?? 0).replace(".", ",")}% de desconto`
              : p.cartao_valor_total
                ? `valor total no cartão em ${p.parcelas_escolhidas}x, sem entrada`
              : p.parcelas_escolhidas === 1
                ? "saldo em parcela única"
                : `saldo em ${p.parcelas_escolhidas}x`}
            .
          </p>
        )}
        {p.parcelas.length > 0 && (
          <table className="proposta-parcelas">
            <tbody>
              {p.parcelas.map((parcela, i) => (
                <tr key={i}>
                  <th scope="row">{parcela.descricao}</th>
                  <td>{reais(parcela.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {Math.abs(diferenca) >= 0.01 && (
          <p className="contato-alerta">As parcelas somam {reais(somaParcelas(p.parcelas))}, diferente do total.</p>
        )}
        {p.forma_pagamento && <p className="proposta-texto">{p.forma_pagamento}</p>}
      </section>

      {/* Controle do contratado: o cliente sabe desde o início o que está incluído. */}
      <section className="proposta-bloco">
        <h2>O que está incluído</h2>
        <ul className="proposta-resumo">
          {p.prazo && (
            <li>
              <CalendarClock size={20} aria-hidden="true" />
              <span>
                <strong>Prazo</strong>
                {p.prazo}
              </span>
            </li>
          )}
          <li>
            <PencilRuler size={20} aria-hidden="true" />
            <span>
              <strong>{p.revisoes_incluidas === 1 ? "1 revisão incluída" : `${p.revisoes_incluidas} revisões incluídas`}</strong>
              no total do projeto; as seguintes podem ser cobradas à parte
            </span>
          </li>
          <li>
            <Eye size={20} aria-hidden="true" />
            <span>
              <strong>
                {p.visitas_incluidas === 0
                  ? "Sem visitas à obra"
                  : p.visitas_incluidas === 1
                    ? "1 visita à obra"
                    : `${p.visitas_incluidas} visitas à obra`}
              </strong>
              {p.visitas_incluidas > 0 ? "incluídas no valor" : "visitas podem ser contratadas à parte"}
            </span>
          </li>
          <li>
            <Car size={20} aria-hidden="true" />
            <span>
              <strong>{p.deslocamento_tipo === "incluido" ? "Deslocamento incluído" : "Deslocamento para visitas"}</strong>
              {textoDeslocamento(p)}
            </span>
          </li>
          <li>
            <Wallet size={20} aria-hidden="true" />
            <span>
              <strong>Válida até {p.validade_ate ? dataCurta(p.validade_ate) : `${p.validade_dias} dias após o envio`}</strong>
              depois disso, os valores podem mudar
            </span>
          </li>
        </ul>
        {p.nao_incluido && (
          <>
            <h3>Não está incluído</h3>
            <p className="proposta-texto">{p.nao_incluido}</p>
          </>
        )}
      </section>
    </article>
  );
}
