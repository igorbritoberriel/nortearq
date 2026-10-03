"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { CircleCheck, MessageSquareWarning, X } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { enviarRelato } from "@/app/app/relatos";

// Botão "Relatar problema ou sugestão": abre uma janela curta. A página atual vai junto, automaticamente.
type Tipo = "problema" | "sugestao" | "duvida";
const OPCOES: { valor: Tipo; rotulo: string; dica: string }[] = [
  { valor: "problema", rotulo: "Problema", dica: "O que você fez e o que aconteceu de errado?" },
  { valor: "sugestao", rotulo: "Sugestão", dica: "O que deixaria o NorteArq melhor para você?" },
  { valor: "duvida", rotulo: "Dúvida", dica: "Em que podemos ajudar?" },
];
const LIMITE = 2000;

export function RelatarProblema({
  tipoInicial = "problema",
  rotulo = "Relatar problema ou sugestão",
  destaque = false,
}: {
  tipoInicial?: Tipo;
  rotulo?: string;
  destaque?: boolean; // botão normal (na tela de erro) em vez do link discreto do menu
}) {
  const pathname = usePathname();
  const janela = useRef<HTMLDialogElement>(null);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const d = janela.current;
    const aoFechar = () => {
      setErro(null);
      if (enviado) {
        setEnviado(false);
        setTexto("");
      }
    };
    d?.addEventListener("close", aoFechar);
    return () => d?.removeEventListener("close", aoFechar);
  }, [enviado]);

  const dica = OPCOES.find((o) => o.valor === tipo)?.dica;

  return (
    <>
      <button
        type="button"
        className={destaque ? "botao botao-secundario" : "relatar-botao"}
        onClick={() => {
          setTipo(tipoInicial);
          janela.current?.showModal();
        }}
      >
        <MessageSquareWarning size={destaque ? 18 : 16} aria-hidden="true" />
        {rotulo}
      </button>

      <dialog ref={janela} className="relatar-janela" aria-labelledby="relatar-titulo">
        <div className="relatar-topo">
          <h2 id="relatar-titulo">{enviado ? "Recebido!" : "Fale com o NorteArq"}</h2>
          <button type="button" className="botao-icone" onClick={() => janela.current?.close()} aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {enviado ? (
          <div className="relatar-ok">
            <CircleCheck size={36} aria-hidden="true" />
            <p>Obrigado! Sua mensagem chegou para a equipe do NorteArq, junto com a página em que você estava.</p>
            <button type="button" className="botao botao-primario" onClick={() => janela.current?.close()}>
              Fechar
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErro(null);
              iniciar(async () => {
                const r = await enviarRelato({ tipo, texto, caminho: pathname, navegador: navigator.userAgent.slice(0, 300) });
                if ("erro" in r) setErro(r.erro);
                else setEnviado(true);
              });
            }}
          >
            <div className="relatar-tipos" role="radiogroup" aria-label="Tipo">
              {OPCOES.map((o) => (
                <label key={o.valor} className={`relatar-tipo ${tipo === o.valor ? "ativo" : ""}`}>
                  <input type="radio" name="tipo" value={o.valor} checked={tipo === o.valor} onChange={() => setTipo(o.valor)} />
                  {o.rotulo}
                </label>
              ))}
            </div>
            <label className="campo-rotulo" htmlFor="relatar-texto">
              {dica}
            </label>
            <textarea
              id="relatar-texto"
              rows={5}
              maxLength={LIMITE}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              autoFocus
            />
            <p className="campo-ajuda relatar-rodape">
              <span>A página em que você está vai junto, automaticamente.</span>
              <span>
                {texto.length}/{LIMITE}
              </span>
            </p>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <div className="form-rodape">
              <button type="button" className="botao botao-secundario" onClick={() => janela.current?.close()}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-primario" disabled={pendente || texto.trim().length < 3}>
                {pendente ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
