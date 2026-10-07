"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Campo";
import { consultarPagamentoCliente, escolherPagamentoCliente, prepararPagamentoCliente } from "@/app/c/[token]/contrato/pagamento";
import { MEIOS_PAGAMENTO, type MeioPagamento, type ResumoPagamento } from "@/lib/condicoes-pagamento";
import { dataCurta, reais } from "@/lib/propostas";

export function PagamentoContrato({ token, inicial }: { token: string; inicial: ResumoPagamento }) {
  const [info, setInfo] = useState(inicial);
  const [meio, setMeio] = useState<MeioPagamento | null>(inicial.meio ?? (inicial.meios.length === 1 ? inicial.meios[0] : null));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  useEffect(() => { setInfo(inicial); setMeio(inicial.meio ?? (inicial.meios.length === 1 ? inicial.meios[0] : null)); }, [inicial]);
  const assinado = info.status === "assinado";
  const precisaEscolher = !info.meio && !info.parcelas.some((p) => p.link || p.pago_em);
  const faltando = assinado && info.cobranca_ativa && !!info.meio && info.parcelas.some((p) => !p.pago_em && !p.link);

  // Só consulta o progresso; abrir a página não cria novas cobranças.
  useEffect(() => {
    if (!faltando) return;
    let cancelado = false, tentativas = 0;
    const timer = setInterval(async () => {
      if (++tentativas > 12) { clearInterval(timer); return; }
      const r = await consultarPagamentoCliente(token);
      if (!cancelado && "info" in r) setInfo(r.info);
    }, 2500);
    return () => { cancelado = true; clearInterval(timer); };
  }, [faltando, token]);

  const pagamentos = info.parcelas.filter((p) => !p.pago_em && p.link);
  const grupos = [...new Set(pagamentos.map((p) => p.parcelamento || p.id))].map((id) => pagamentos.filter((p) => (p.parcelamento || p.id) === id));
  return (
    <section id="pagamento" className="cartao pagamento-contrato nao-imprimir" aria-labelledby="pagamento-contrato-titulo">
      <h2 id="pagamento-contrato-titulo">{assinado ? "Seu pagamento" : "Condições de pagamento"}</h2>
      {precisaEscolher ? (
        <>
          <p>Escolha a forma de pagamento. Pix e boleto seguem a entrada e as parcelas aprovadas. No cartão, o valor total é enviado ao Asaas. Antes de assinar, confira as condições atualizadas no contrato.</p>
          <fieldset className="parcelamento-escolha">
            <legend>Forma de pagamento</legend>
            <div className="parcelamento-opcoes">
              {info.meios.map((m) => <label key={m} className={`parcelamento-opcao ${meio === m ? "escolhida" : ""}`}>
                <input type="radio" name="meio-contrato" checked={meio === m} onChange={() => setMeio(m)} disabled={pendente} />
                <strong>{MEIOS_PAGAMENTO[m]}</strong>
              </label>)}
            </div>
          </fieldset>
          <p className="campo-ajuda">{meio === "cartao" && !assinado
            ? "No cartão, você escolhe à vista ou parcelado no Asaas, sem entrada separada."
            : meio === "cartao" && info.modo === "parcelado"
            ? "Este contrato já foi assinado: a entrada e as parcelas aprovadas serão preservadas."
            : "Cada parcela será paga conforme as condições aprovadas. Não há débito automático."}</p>
          <button type="button" className="botao botao-marca" disabled={!meio || pendente} onClick={() => iniciar(async () => {
            setErro(null);
            const r = await escolherPagamentoCliente(token, meio!);
            if ("erro" in r) { setErro(r.erro); return; }
            const consulta = await consultarPagamentoCliente(token);
            if ("info" in consulta) setInfo(consulta.info);
            if (assinado) {
              const preparo = await prepararPagamentoCliente(token);
              if (preparo.info) setInfo(preparo.info);
              if (preparo.erro) setErro(preparo.erro);
            }
            router.refresh();
          })}>{pendente ? "Salvando..." : "Confirmar forma de pagamento"}</button>
        </>
      ) : <p><strong>Forma escolhida:</strong> {info.meio ? MEIOS_PAGAMENTO[info.meio] : "Conforme a cobrança já emitida"}.</p>}
      {assinado && !info.meio && !precisaEscolher && <p className="campo-ajuda">Este contrato já tinha cobrança emitida. Use os links disponíveis abaixo. O escritório disponibiliza os pagamentos das parcelas que ainda estão sem link.</p>}
      <ul className="proposta-lista">
        {(info.parcelas.length ? info.parcelas : info.condicoes).map((p, i) => <li key={i}>
          {p.descricao}: <strong>{reais(Number(p.valor))}</strong>
          {"vencimento" in p && typeof p.vencimento === "string" ? ` · vencimento ${dataCurta(p.vencimento)}` : ""}
          {"pago_em" in p && p.pago_em ? (info.cartao_no_asaas ? " · compra aprovada no cartão" : " · pagamento confirmado") : ""}
        </li>)}
      </ul>
      {!assinado && <p className="campo-ajuda">Confira o contrato abaixo. Após assinar, o acesso ao pagamento aparece nesta página.</p>}
      {assinado && info.meio === "cartao" && <p className="campo-ajuda">Os dados do cartão são informados somente na página segura do Asaas. {info.cartao_no_asaas ? "Você escolhe à vista ou parcelado no Asaas; o valor total não tem entrada separada." : info.cartao_total ? "O valor total é pago em uma única compra, sem entrada separada." : info.parcelas.length > 1 ? (info.modo === "parcelado" ? "A entrada, quando prevista, e o saldo parcelado têm pagamentos separados." : "As parcelas personalizadas são cobranças separadas, conforme o contrato.") : "O valor é pago em uma única cobrança."}</p>}
      {assinado && grupos.map((grupo) => <a key={grupo[0].parcelamento || grupo[0].id} className="botao botao-marca pagamento-acesso"
        href={grupo[0].link!} target="_blank" rel="noopener noreferrer">
        {info.cartao_no_asaas ? "Escolher parcelas e pagar no Asaas" : info.cartao_total ? `Pagar no cartão (${info.parcelas.length}x)` : grupo[0].parcelamento ? `Pagar saldo no cartão (${info.parcelas.filter((p) => p.parcelamento === grupo[0].parcelamento).length}x)` : `Pagar ${grupo[0].descricao.toLowerCase()}`} · {reais(grupo.reduce((s, p) => s + Number(p.valor), 0))}
      </a>)}
      {faltando && !precisaEscolher && <>
        <p className="campo-ajuda">Estamos preparando os links de pagamento. Se ainda não apareceram, use o botão abaixo para continuar.</p>
        <button type="button" className="botao botao-secundario" disabled={pendente} onClick={() => iniciar(async () => {
          setErro(null); const r = await prepararPagamentoCliente(token);
          if (r.info) setInfo(r.info); if (r.erro) setErro(r.erro);
        })}>{pendente ? "Preparando..." : "Ir para pagamento"}</button>
      </>}
      {assinado && !info.cobranca_ativa && <p className="campo-ajuda">O escritório não está com a cobrança Asaas ativa. Combine o pagamento com o escritório; os dados de Pix também ficam no projeto.</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </section>
  );
}
