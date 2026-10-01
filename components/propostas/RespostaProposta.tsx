"use client";

import { useState, useTransition } from "react";
import { CircleCheck, MessageSquareText, X } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { responderProposta, type AcaoResposta } from "@/app/c/[token]/proposta/acoes";
import { MOTIVOS_RECUSA, opcoesParcelamento, reais, type MotivoRecusa } from "@/lib/propostas";

const CONFIRMACOES: Record<AcaoResposta, { titulo: string; texto: (e: string) => string }> = {
  aprovar: { titulo: "Proposta aprovada!", texto: (e) => `O ${e} vai preparar o contrato e enviar para você.` },
  ajuste: { titulo: "Pedido de ajuste enviado", texto: (e) => `O ${e} vai revisar a proposta e mandar uma versão nova por este mesmo link.` },
  recusar: { titulo: "Resposta enviada", texto: (e) => `Obrigado por avisar. O ${e} recebeu a sua resposta.` },
};

// Aprovar, pedir ajuste (comentário obrigatório) ou recusar (motivo obrigatório), RN-01.9.
export function RespostaProposta({
  token,
  escritorio,
  parcelamento = null,
  demonstracao = false,
}: {
  token: string;
  escritorio: string;
  parcelamento?: { total: number; entradaPct: number; maximo: number } | null;
  demonstracao?: boolean; // pré-visualização: nada é gravado
}) {
  const [acao, setAcao] = useState<AcaoResposta | null>(null);
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState<MotivoRecusa | "">("");
  const [vezes, setVezes] = useState<number | null>(parcelamento?.maximo === 1 ? 1 : null);
  const opcoes = parcelamento ? opcoesParcelamento(parcelamento.total, parcelamento.entradaPct, parcelamento.maximo) : [];
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<AcaoResposta | null>(null);
  const [pendente, iniciar] = useTransition();

  if (feito) {
    return (
      <div className="publico-sucesso" role="status">
        <CircleCheck size={44} aria-hidden="true" />
        <h2>{CONFIRMACOES[feito].titulo}</h2>
        <p>{CONFIRMACOES[feito].texto(escritorio)}</p>
      </div>
    );
  }

  function confirmar(escolhida: AcaoResposta) {
    setErro(null);
    iniciar(async () => {
      const resultado = demonstracao
        ? ({ ok: true } as const)
        : await responderProposta(token, escolhida, comentario, motivo || null, escolhida === "aprovar" ? vezes : null);
      if ("erro" in resultado) setErro(resultado.erro);
      else {
        setFeito(escolhida);
        window.scrollTo({ top: 0 });
      }
    });
  }

  return (
    <section className="resposta-proposta" aria-labelledby="resposta-titulo">
      <h2 id="resposta-titulo">O que você achou?</h2>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {acao === null && (
        <div className="resposta-botoes">
          <button type="button" className="botao botao-marca botao-bloco" onClick={() => setAcao("aprovar")}>
            <CircleCheck size={18} aria-hidden="true" /> Aprovar proposta
          </button>
          <button type="button" className="botao botao-secundario botao-bloco" onClick={() => setAcao("ajuste")}>
            <MessageSquareText size={18} aria-hidden="true" /> Pedir ajuste
          </button>
          <button type="button" className="botao botao-fantasma botao-bloco" onClick={() => setAcao("recusar")}>
            <X size={18} aria-hidden="true" /> Recusar
          </button>
        </div>
      )}

      {acao === "aprovar" && (
        <div className="resposta-etapa">
          {parcelamento && (
            <fieldset className="parcelamento-escolha">
              <legend>Como você quer pagar?</legend>
              {opcoes[0].entrada > 0 && (
                <p className="campo-ajuda">
                  Entrada de {reais(opcoes[0].entrada)} ({parcelamento.entradaPct}%) na assinatura do contrato, e o saldo em:
                </p>
              )}
              <div className="parcelamento-opcoes">
                {opcoes.map((o) => (
                  <label key={o.n} className={`parcelamento-opcao ${vezes === o.n ? "escolhida" : ""}`}>
                    <input type="radio" name="parcelas" value={o.n} checked={vezes === o.n} onChange={() => setVezes(o.n)} />
                    <strong>{o.n === 1 ? "À vista" : `${o.n}x`}</strong>
                    <span>{o.n === 1 ? reais(Math.round((parcelamento.total - o.entrada) * 100) / 100) : `de ${reais(o.parcela)}`}</span>
                  </label>
                ))}
              </div>
              {parcelamento.maximo > 1 && <p className="campo-ajuda">Parcelas mensais. A última pode ter diferença de centavos.</p>}
            </fieldset>
          )}
          <p>
            Ao aprovar, você concorda com o escopo, os valores e os prazos desta proposta. O contrato vem em seguida para
            assinatura. Sua resposta fica registrada com data e hora.
          </p>
          <div className="resposta-botoes">
            <button
              type="button"
              className="botao botao-marca"
              onClick={() => confirmar("aprovar")}
              disabled={pendente || (!!parcelamento && !vezes)}
            >
              {pendente ? "Enviando..." : "Confirmar aprovação"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setAcao(null)} disabled={pendente}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {acao === "ajuste" && (
        <div className="resposta-etapa">
          <Campo id="comentario" rotulo="O que você quer ajustar?">
            <textarea
              id="comentario"
              rows={4}
              maxLength={2000}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ex.: Gostaria de incluir o projeto da varanda e dividir em 4 parcelas."
            />
          </Campo>
          <div className="resposta-botoes">
            <button
              type="button"
              className="botao botao-marca"
              onClick={() => confirmar("ajuste")}
              disabled={pendente || !comentario.trim()}
            >
              {pendente ? "Enviando..." : "Enviar pedido de ajuste"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setAcao(null)} disabled={pendente}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {acao === "recusar" && (
        <div className="resposta-etapa">
          <Campo id="motivo" rotulo="Pode contar o motivo?">
            <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoRecusa)}>
              <option value="" disabled>
                Escolha uma opção
              </option>
              {Object.entries(MOTIVOS_RECUSA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="comentario-recusa" rotulo="Quer acrescentar algo?" opcional>
            <textarea id="comentario-recusa" rows={3} maxLength={2000} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </Campo>
          <div className="resposta-botoes">
            <button type="button" className="botao botao-secundario" onClick={() => confirmar("recusar")} disabled={pendente || !motivo}>
              {pendente ? "Enviando..." : "Confirmar recusa"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setAcao(null)} disabled={pendente}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
