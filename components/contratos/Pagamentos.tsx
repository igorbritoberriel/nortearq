"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CalendarDays, History, Lock, MessageCircle, Receipt, Undo2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { definirVencimento, estornarPagamento, registrarPagamento } from "@/app/app/(sistema)/contratos/acoes";
import { linkWhatsapp } from "@/lib/contatos";
import type { EstadoFormulario } from "@/lib/formulario";
import {
  FORMAS_PAGAMENTO,
  linkDoRecibo,
  rotuloForma,
  type EventoPagamento,
  type PagamentoComBaixa,
} from "@/lib/pagamentos";
import { dataCurta, reais } from "@/lib/propostas";
import { pixCopiaECola, type DadosPix } from "@/lib/pix";

// Pagamentos do contrato (RN-01.16), protegidos:
// - registrar pagamento pede data, forma e confirmação; depois disso fica travado;
// - corrigir só por estorno, com motivo, feito pelo dono; tudo fica no histórico;
// - cada baixa gera um recibo com número, que o cliente abre pelo link.

const inicial: EstadoFormulario = { status: "inicial" };

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

type Props = {
  pagamentos: PagamentoComBaixa[];
  eventos: EventoPagamento[];
  souDono: boolean;
  hoje: string;
  site: string;
  cliente: { nome: string; telefone: string | null };
  escritorio: string;
  pix?: DadosPix | null; // chave Pix do escritório: vai no "Cobrar no WhatsApp"
};

export function Pagamentos({ pagamentos, eventos, souDono, hoje, site, cliente, escritorio, pix = null }: Props) {
  const [aberto, setAberto] = useState<{ id: string; modo: "baixa" | "estorno" | "vencimento" } | null>(null);
  const pago = pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + p.valor, 0);
  const total = pagamentos.reduce((s, p) => s + p.valor, 0);
  const nomePagamento = new Map(pagamentos.map((p) => [p.id, p.descricao]));
  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <>
      <ul className="pagamentos">
        {pagamentos.map((p) => {
          const b = p.baixa;
          const linkRecibo = b?.recibo_codigo ? linkDoRecibo(site, b.recibo_codigo) : null;
          return (
            <li key={p.id} className={`pagamento ${p.pago_em ? "pagamento-pago" : ""}`}>
              <div className="pagamento-linha">
                <span className="pagamento-descricao">
                  {p.pago_em ? <Lock size={14} aria-label="Pagamento registrado" className="pagamento-cadeado" /> : null}
                  {p.descricao}
                  {p.pago_em ? (
                    <small className="muted">
                      Pago em {dataCurta(p.pago_em)} · {rotuloForma(b?.forma ?? null)}
                      {b?.recibo_numero ? ` · recibo nº ${b.recibo_numero}` : ""}
                    </small>
                  ) : p.vencimento && p.vencimento < hoje ? (
                    <small className="pagamento-atrasada">Atrasada · venceu em {dataCurta(p.vencimento)}</small>
                  ) : (
                    <small className="muted">
                      Pendente{p.vencimento ? ` · vence em ${dataCurta(p.vencimento)}` : " · sem data de vencimento"}
                    </small>
                  )}
                </span>
                <strong>{reais(p.valor)}</strong>
              </div>

              <div className="pagamento-acoes">
                {!p.pago_em && aberto?.id !== p.id && (
                  <button
                    type="button"
                    className="botao botao-secundario botao-pequeno"
                    onClick={() => setAberto({ id: p.id, modo: "baixa" })}
                  >
                    Registrar pagamento
                  </button>
                )}
                {!p.pago_em && !p.vencimento && aberto?.id !== p.id && (
                  <button
                    type="button"
                    className="botao botao-fantasma botao-pequeno"
                    onClick={() => setAberto({ id: p.id, modo: "vencimento" })}
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    Definir vencimento
                  </button>
                )}
                {!p.pago_em && cliente.telefone && aberto?.id !== p.id && (
                  <a
                    className="botao botao-fantasma botao-pequeno"
                    href={linkWhatsapp(
                      cliente.telefone,
                      `Olá, ${primeiroNome}! Aqui é do ${escritorio}. Lembrete da parcela "${p.descricao}" de ${reais(p.valor)}${
                        p.vencimento ? `, com vencimento em ${dataCurta(p.vencimento)}` : ""
                      }.${pix ? `\n\nPix copia e cola:\n${pixCopiaECola(pix, p.valor, p.descricao)}` : ""}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    Cobrar no WhatsApp
                  </a>
                )}
                {p.pago_em && linkRecibo && (
                  <>
                    <a className="botao botao-fantasma botao-pequeno" href={linkRecibo} target="_blank" rel="noopener noreferrer">
                      <Receipt size={16} aria-hidden="true" />
                      Recibo
                    </a>
                    {cliente.telefone && (
                      <a
                        className="botao botao-fantasma botao-pequeno"
                        href={linkWhatsapp(
                          cliente.telefone,
                          `Olá, ${primeiroNome}! Aqui é do ${escritorio}. Confirmamos o recebimento de ${reais(p.valor)} (${p.descricao}). Seu recibo: ${linkRecibo}`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={16} aria-hidden="true" />
                        Enviar recibo
                      </a>
                    )}
                  </>
                )}
                {p.pago_em && souDono && aberto?.id !== p.id && (
                  <button
                    type="button"
                    className="botao botao-fantasma botao-pequeno pagamento-estornar"
                    onClick={() => setAberto({ id: p.id, modo: "estorno" })}
                  >
                    <Undo2 size={16} aria-hidden="true" />
                    Estornar
                  </button>
                )}
              </div>

              {aberto?.id === p.id && aberto.modo === "baixa" && (
                <FormBaixa pagamento={p} hoje={hoje} fechar={() => setAberto(null)} />
              )}
              {aberto?.id === p.id && aberto.modo === "estorno" && (
                <FormEstorno pagamento={p} fechar={() => setAberto(null)} />
              )}
              {aberto?.id === p.id && aberto.modo === "vencimento" && (
                <FormVencimento pagamento={p} hoje={hoje} fechar={() => setAberto(null)} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="campo-ajuda">
        Recebido {reais(pago)} de {reais(total)}
        {total - pago > 0 ? ` · falta ${reais(total - pago)}` : " · tudo recebido"}
      </p>

      {eventos.length > 0 && (
        <details className="pagamentos-historico">
          <summary>
            <History size={16} aria-hidden="true" />
            Histórico de pagamentos
          </summary>
          <ol>
            {eventos.map((e) => (
              <li key={e.id} className={e.tipo === "estorno" ? "evento-estorno" : ""}>
                <time dateTime={e.criado_em}>{dataHora.format(new Date(e.criado_em))}</time>
                <span>
                  {e.tipo === "baixa" ? (
                    <>
                      <strong>{e.feito_por_nome ?? "Escritório"}</strong> registrou {nomePagamento.get(e.pagamento_id)}: pago em{" "}
                      {e.pago_em ? dataCurta(e.pago_em) : "—"}, {rotuloForma(e.forma)}
                      {e.recibo_numero ? ` (recibo nº ${e.recibo_numero}${e.estornado_em ? ", cancelado" : ""})` : ""}
                      {e.observacao ? ` · ${e.observacao}` : ""}
                    </>
                  ) : (
                    <>
                      <strong>{e.feito_por_nome ?? "Escritório"}</strong> estornou {nomePagamento.get(e.pagamento_id)}. Motivo:{" "}
                      {e.motivo}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

function FormBaixa({ pagamento, hoje, fechar }: { pagamento: PagamentoComBaixa; hoje: string; fechar: () => void }) {
  const [estado, enviar, enviando] = useActionState(registrarPagamento, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  useEffect(() => {
    if (estado.status === "sucesso") fechar();
  }, [estado.status, fechar]);

  return (
    <form action={enviar} className="pagamento-form" noValidate>
      <input type="hidden" name="pagamento_id" value={pagamento.id} />
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id={`pago-em-${pagamento.id}`} rotulo="Data do pagamento" erro={erro.pago_em}>
          <input id={`pago-em-${pagamento.id}`} name="pago_em" type="date" max={hoje} required defaultValue={v.pago_em ?? hoje} />
        </Campo>
        <Campo id={`forma-${pagamento.id}`} rotulo="Forma" erro={erro.forma}>
          <select id={`forma-${pagamento.id}`} name="forma" required defaultValue={v.forma ?? ""}>
            <option value="" disabled>
              Escolha
            </option>
            {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo id={`obs-${pagamento.id}`} rotulo="Observação ou nº do comprovante" opcional erro={erro.observacao}>
        <input id={`obs-${pagamento.id}`} name="observacao" maxLength={300} defaultValue={v.observacao} />
      </Campo>
      <p className="contato-alerta">
        <Lock size={16} aria-hidden="true" />
        Confirme com atenção: depois de registrado, o pagamento não pode ser editado. Erros só por estorno, feito pelo dono do
        escritório.
      </p>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Registrando..." : `Confirmar ${reais(pagamento.valor)} recebido`}
        </button>
      </div>
    </form>
  );
}

function FormEstorno({ pagamento, fechar }: { pagamento: PagamentoComBaixa; fechar: () => void }) {
  const [estado, enviar, enviando] = useActionState(estornarPagamento, inicial);
  useEffect(() => {
    if (estado.status === "sucesso") fechar();
  }, [estado.status, fechar]);

  return (
    <form action={enviar} className="pagamento-form pagamento-form-estorno" noValidate>
      <input type="hidden" name="pagamento_id" value={pagamento.id} />
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id={`motivo-${pagamento.id}`} rotulo="Motivo do estorno" erro={estado.erros?.motivo}>
        <input
          id={`motivo-${pagamento.id}`}
          name="motivo"
          required
          minLength={5}
          maxLength={300}
          placeholder="Ex.: registrei a parcela errada"
          defaultValue={estado.valores?.motivo}
        />
      </Campo>
      <Campo id={`senha-estorno-${pagamento.id}`} rotulo="Para confirmar, digite a sua senha do NorteArq" erro={estado.erros?.senha}>
        <input id={`senha-estorno-${pagamento.id}`} name="senha" type="password" autoComplete="current-password" />
      </Campo>
      <p className="campo-ajuda">
        A parcela volta a ficar pendente, o recibo nº {pagamento.baixa?.recibo_numero ?? "—"} passa a aparecer como cancelado e o
        estorno fica registrado no histórico com o seu nome.
      </p>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Estornando..." : "Confirmar estorno"}
        </button>
      </div>
    </form>
  );
}

// Parcela sem data (ex.: "na entrega do anteprojeto"): o arquiteto define o vencimento uma vez.
function FormVencimento({ pagamento, hoje, fechar }: { pagamento: PagamentoComBaixa; hoje: string; fechar: () => void }) {
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="pagamento-form">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Campo id={`venc-${pagamento.id}`} rotulo="Vencimento desta parcela">
        <input id={`venc-${pagamento.id}`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </Campo>
      <p className="campo-ajuda">Depois de definido, não muda. O cliente recebe lembrete por e-mail perto da data.</p>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar} disabled={pendente}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao botao-primario botao-pequeno"
          disabled={pendente || !data}
          onClick={() =>
            iniciar(async () => {
              const r = await definirVencimento(pagamento.id, data);
              if ("erro" in r) setErro(r.erro);
              else fechar();
            })
          }
        >
          {pendente ? "Salvando..." : "Salvar vencimento"}
        </button>
      </div>
    </div>
  );
}
