"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CreditCard, ExternalLink, History, Lock, MessageCircle, Receipt, Undo2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { alterarVencimento, definirVencimento, estornarPagamento, gerarCobrancaParcela, registrarPagamento } from "@/app/app/(sistema)/contratos/acoes";
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
  cobrancaAtiva?: boolean; // cobrança automática pelo Asaas (0038)
};

export function Pagamentos({ pagamentos, eventos, souDono, hoje, site, cliente, escritorio, pix = null, cobrancaAtiva = false }: Props) {
  const [aberto, setAberto] = useState<{ id: string; modo: "baixa" | "estorno" | "vencimento" | "alterar" } | null>(null);
  const pago = pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + p.valor, 0);
  const total = pagamentos.reduce((s, p) => s + p.valor, 0);
  const nomePagamento = new Map(pagamentos.map((p) => [p.id, p.descricao]));
  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <>
      {!cobrancaAtiva && pagamentos.some((p) => !p.pago_em) && (
        <p className="cobranca-convite">
          <CreditCard size={16} aria-hidden="true" />
          <span>Receba por Pix, boleto e cartão com baixa automática e recibo.</span>
          <a className="tabela-link" href="/app/configuracoes#cobranca">
            Ativar cobrança automática
          </a>
        </p>
      )}
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
                  {p.alteracao && !p.pago_em && (
                    <small className="muted">
                      Vencimento alterado em {dataCurta(p.alteracao.criado_em.slice(0, 10))} (antes {dataCurta(p.alteracao.antes)})
                      {p.alteracao.motivo ? ` · ${p.alteracao.motivo}` : ""}
                    </small>
                  )}
                  {p.pago_em && p.asaas_valor_liquido != null && (
                    <small className="muted pagamento-asaas">
                      Pelo Asaas: pago {reais(p.valor)} · líquido na sua conta {reais(Number(p.asaas_valor_liquido))}
                      {Number(p.taxa_plataforma) > 0
                        ? ` (inclui taxa NorteArq de ${reais(Number(p.taxa_plataforma))} e tarifa do Asaas)`
                        : " (tarifa do Asaas)"}
                    </small>
                  )}
                  {p.asaas_checkout_id && <small className="muted">{p.pago_em ? "Compra aprovada no cartão. O recebimento segue os prazos e tarifas do Asaas." : "O cliente escolhe as parcelas no Asaas. A entrada e o limite de parcelas do escritório não se aplicam ao cartão."}</small>}
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
                {!p.pago_em && p.asaas_link && aberto?.id !== p.id && (
                  <a className="botao botao-fantasma botao-pequeno" href={p.asaas_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={16} aria-hidden="true" />
                    Ver pagamento como cliente
                  </a>
                )}
                {!p.pago_em && !p.asaas_link && cobrancaAtiva && aberto?.id !== p.id && <GerarCobranca pagamentoId={p.id} />}
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
                {!p.pago_em && p.vencimento && !p.asaas_parcelamento_id && !p.asaas_checkout_id && aberto?.id !== p.id && (
                  <button
                    type="button"
                    className="botao botao-fantasma botao-pequeno"
                    onClick={() => setAberto({ id: p.id, modo: "alterar" })}
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    Alterar vencimento
                  </button>
                )}
                {!p.pago_em && cliente.telefone && aberto?.id !== p.id && (
                  <a
                    className="botao botao-fantasma botao-pequeno"
                    href={linkWhatsapp(
                      cliente.telefone,
                      `Olá, ${primeiroNome}! Aqui é do ${escritorio}. Lembrete da parcela "${p.descricao}" de ${reais(p.valor)}${
                        p.vencimento ? `, com vencimento em ${dataCurta(p.vencimento)}` : ""
                      }.${
                        p.asaas_link
                          ? `\n\nAcesse o pagamento neste link: ${p.asaas_link}`
                          : pix && !cobrancaAtiva
                            ? `\n\nPix copia e cola:\n${pixCopiaECola(pix, p.valor, p.descricao)}`
                            : ""
                      }`,
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
              {aberto?.id === p.id && aberto.modo === "alterar" && (
                <FormAlterarVencimento
                  pagamento={p}
                  proximas={pagamentos.filter((x) => !x.pago_em && x.vencimento && x.vencimento > (p.vencimento ?? "") && x.id !== p.id && !x.asaas_parcelamento_id)}
                  todas={pagamentos}
                  hoje={hoje}
                  cliente={cliente}
                  escritorio={escritorio}
                  fechar={() => setAberto(null)}
                />
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

// Mudança de data de parcela não paga (0050): registra no histórico e atualiza a cobrança do Asaas.
function FormAlterarVencimento({
  pagamento,
  proximas,
  todas,
  hoje,
  cliente,
  escritorio,
  fechar,
}: {
  pagamento: PagamentoComBaixa;
  proximas: PagamentoComBaixa[];
  todas: PagamentoComBaixa[];
  hoje: string;
  cliente: { nome: string; telefone: string | null };
  escritorio: string;
  fechar: () => void;
}) {
  const [data, setData] = useState(pagamento.vencimento && pagamento.vencimento >= hoje ? pagamento.vencimento : hoje);
  const [motivo, setMotivo] = useState("");
  const [moverProximas, setMoverProximas] = useState(proximas.length > 0);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ alteradas: { id: string; depois: string }[]; aviso?: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const delta = pagamento.vencimento ? Math.round((Date.parse(data) - Date.parse(pagamento.vencimento)) / 86_400_000) : 0;
  const somarDias = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
  const descricao = new Map(todas.map((p) => [p.id, p.descricao]));

  if (feito) {
    const linhas = feito.alteradas.map((a) => `• ${descricao.get(a.id) ?? "Parcela"}: ${dataCurta(a.depois)}`).join("\n");
    const mensagem = `Olá, ${cliente.nome.split(" ")[0]}! Aqui é do ${escritorio}. Conforme combinado, ${
      feito.alteradas.length === 1 ? "o novo vencimento ficou assim" : "os novos vencimentos ficaram assim"
    }:\n${linhas}\n\nO link de pagamento continua o mesmo.`;
    return (
      <div className="pagamento-form">
        {feito.aviso ? <Aviso tipo="erro">{feito.aviso}</Aviso> : <Aviso tipo="sucesso">Vencimento alterado.</Aviso>}
        <p className="campo-ajuda">
          {feito.alteradas.length === 1 ? "Nova data" : "Novas datas"}: {feito.alteradas.map((a) => `${descricao.get(a.id)} em ${dataCurta(a.depois)}`).join(" · ")}.
          O cliente vê a data nova no projeto e os lembretes por e-mail passam a seguir essa data.
        </p>
        <div className="form-rodape">
          <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
            Fechar
          </button>
          {cliente.telefone && (
            <a className="botao botao-primario botao-pequeno" href={linkWhatsapp(cliente.telefone, mensagem)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden="true" />
              Avisar o cliente no WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pagamento-form">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="form-linha">
        <Campo id={`novo-venc-${pagamento.id}`} rotulo="Novo vencimento">
          <input id={`novo-venc-${pagamento.id}`} type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo id={`motivo-venc-${pagamento.id}`} rotulo="Motivo" opcional>
          <input
            id={`motivo-venc-${pagamento.id}`}
            maxLength={200}
            placeholder="Ex.: cliente recebe no dia 20"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
      {proximas.length > 0 && (
        <label className="checagem">
          <input type="checkbox" checked={moverProximas} onChange={(e) => setMoverProximas(e.target.checked)} />
          <span>
            Mover também as próximas {proximas.length === 1 ? "parcela" : `${proximas.length} parcelas`}
            {delta !== 0 && proximas[0].vencimento
              ? ` (${dataCurta(proximas[0].vencimento)} → ${dataCurta(somarDias(proximas[0].vencimento, delta))}${proximas.length > 1 ? "…" : ""})`
              : ""}
          </span>
        </label>
      )}
      <p className="campo-ajuda">
        O valor não muda. {pagamento.asaas_link ? "A cobrança no Asaas é atualizada sozinha e o link de pagamento continua o mesmo. " : ""}
        A mudança fica registrada com a data e o motivo.
      </p>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar} disabled={pendente}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao botao-primario botao-pequeno"
          disabled={pendente || !data || data === pagamento.vencimento}
          onClick={() =>
            iniciar(async () => {
              setErro(null);
              const r = await alterarVencimento(pagamento.id, data, motivo, moverProximas && proximas.length > 0);
              if ("erro" in r) setErro(r.erro);
              else {
                setFeito(r);
                router.refresh();
              }
            })
          }
        >
          {pendente ? "Salvando..." : "Salvar vencimento"}
        </button>
      </div>
    </div>
  );
}

// Cobrança automática (0038): gera a cobrança da parcela no Asaas do escritório.
function GerarCobranca({ pagamentoId }: { pagamentoId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <>
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await gerarCobrancaParcela(pagamentoId);
            if ("erro" in r) setErro(r.erro);
          })
        }
      >
        <CreditCard size={16} aria-hidden="true" />
        {pendente ? "Gerando..." : "Gerar cobrança"}
      </button>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </>
  );
}
