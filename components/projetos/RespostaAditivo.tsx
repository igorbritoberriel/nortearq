"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, X } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { responderAditivo } from "@/app/c/[token]/projeto/acoes";
import { reais } from "@/lib/propostas";

// O cliente aprova o aditivo ou recusa com motivo (RN-03.15). Fica registrado com data, hora e IP.
export function RespostaAditivo({ token, aditivoId, valor }: { token: string; aditivoId: string; valor: number }) {
  const [modo, setModo] = useState<"escolher" | "aprovar" | "recusar">("escolher");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  function confirmar(decisao: "aprovado" | "recusado") {
    setErro(null);
    iniciar(async () => {
      const r = await responderAditivo(token, aditivoId, decisao, motivo);
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
            <CircleCheck size={18} aria-hidden="true" />
            Aprovar aditivo
          </button>
          <button type="button" className="botao botao-secundario" onClick={() => setModo("recusar")}>
            <X size={18} aria-hidden="true" />
            Recusar
          </button>
        </div>
      )}
      {modo === "aprovar" && (
        <div className="resposta-etapa-confirmar">
          <p>
            Ao aprovar, você concorda com o valor de <strong>{reais(valor)}</strong> e com o que está descrito acima. O aceite
            fica registrado com data, hora e IP.
          </p>
          <div className="resposta-botoes">
            <button type="button" className="botao botao-marca" disabled={pendente} onClick={() => confirmar("aprovado")}>
              {pendente ? "Registrando..." : "Confirmar aprovação"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setModo("escolher")}>
              Voltar
            </button>
          </div>
        </div>
      )}
      {modo === "recusar" && (
        <div className="resposta-etapa-confirmar">
          <Campo id={`motivo-${aditivoId}`} rotulo="Por que você não quer este aditivo?">
            <textarea id={`motivo-${aditivoId}`} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
          <div className="resposta-botoes">
            <button
              type="button"
              className="botao botao-marca"
              disabled={pendente || !motivo.trim()}
              onClick={() => confirmar("recusado")}
            >
              {pendente ? "Registrando..." : "Confirmar recusa"}
            </button>
            <button type="button" className="botao botao-fantasma" onClick={() => setModo("escolher")}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
