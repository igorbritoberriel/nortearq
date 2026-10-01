"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, MessageSquareText } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { responderEtapa } from "@/app/c/[token]/projeto/acoes";

// O cliente aprova a etapa ou pede revisão (comentário obrigatório, RN-03.3).
// Antes de pedir revisão, ele vê quantas ainda tem (RN-03.9) e o aviso de cobrança (RN-03.10).
export function RespostaEtapa({
  token,
  etapaId,
  etapa,
  revisoesUsadas,
  revisoesIncluidas,
}: {
  token: string;
  etapaId: string;
  etapa: string;
  revisoesUsadas: number;
  revisoesIncluidas: number;
}) {
  const [modo, setModo] = useState<"escolher" | "aprovar" | "revisao">("escolher");
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const restantes = revisoesIncluidas - revisoesUsadas;

  function confirmar(decisao: "aprovada" | "revisao_pedida") {
    setErro(null);
    iniciar(async () => {
      const r = await responderEtapa(token, etapaId, decisao, comentario);
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  return (
    <div className="resposta-etapa">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {modo === "escolher" && (
        <div className="resposta-botoes">
          <button type="button" className="botao botao-marca" onClick={() => setModo("aprovar")}>
            <CircleCheck size={18} aria-hidden="true" /> Aprovar etapa
          </button>
          <button type="button" className="botao botao-secundario" onClick={() => setModo("revisao")}>
            <MessageSquareText size={18} aria-hidden="true" /> Pedir revisão
          </button>
        </div>
      )}

      {modo === "aprovar" && (
        <div className="resposta-etapa-confirmar">
          <p>
            Ao aprovar <strong>{etapa}</strong>, ela fica fechada: mudanças depois disso viram aditivo, com valor e prazo
            combinados. Sua aprovação fica registrada com data e hora.
          </p>
          <div className="resposta-botoes">
            <button type="button" className="botao botao-marca" onClick={() => confirmar("aprovada")} disabled={pendente}>
              {pendente ? "Registrando..." : "Confirmar aprovação"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setModo("escolher")} disabled={pendente}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {modo === "revisao" && (
        <div className="resposta-etapa-confirmar">
          {restantes > 0 ? (
            <p className="campo-ajuda">
              Você tem {restantes === 1 ? "1 revisão incluída" : `${restantes} revisões incluídas`} restante
              {restantes === 1 ? "" : "s"} no contrato. Este pedido usa 1.
            </p>
          ) : (
            <p className="contato-alerta">
              As revisões incluídas no contrato já foram usadas. Esta revisão pode ser cobrada à parte: o escritório vai
              conversar com você antes.
            </p>
          )}
          <Campo id={`revisao-${etapaId}`} rotulo="O que precisa mudar?">
            <textarea
              id={`revisao-${etapaId}`}
              rows={4}
              maxLength={3000}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Seja específico: ambiente, item e o que você quer diferente."
            />
          </Campo>
          <div className="resposta-botoes">
            <button
              type="button"
              className="botao botao-marca"
              onClick={() => confirmar("revisao_pedida")}
              disabled={pendente || !comentario.trim()}
            >
              {pendente ? "Enviando..." : "Enviar pedido de revisão"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setModo("escolher")} disabled={pendente}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
