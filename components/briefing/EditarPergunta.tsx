"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { editarPergunta, textoOriginal } from "@/app/app/(sistema)/briefings/acoes";
import { TIPOS_RESPOSTA, type PerguntaModelo } from "@/lib/briefing";
import type { EstadoFormulario } from "@/lib/formulario";

const inicial: EstadoFormulario = { status: "inicial" };

// Edição no lugar (lápis). Suas perguntas: texto, explicação, tipo e opções.
// Padrão: só texto e explicação, com "voltar ao texto original". Briefings já enviados não mudam.
export function EditarPergunta({ pergunta, fechar }: { pergunta: PerguntaModelo; fechar: () => void }) {
  const acao = useMemo(() => editarPergunta.bind(null, pergunta.id, pergunta.padrao), [pergunta.id, pergunta.padrao]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const [texto, setTexto] = useState(pergunta.texto);
  const [ajuda, setAjuda] = useState(pergunta.ajuda ?? "");
  const [tipo, setTipo] = useState<string>(pergunta.tipo_resposta);
  const [buscando, iniciar] = useTransition();
  const erro = estado.erros ?? {};

  useEffect(() => {
    if (estado.status === "sucesso") fechar();
  }, [estado.status, fechar]);

  return (
    <form action={enviar} noValidate className="pagamento-form editar-pergunta">
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id={`texto-${pergunta.id}`} rotulo="Pergunta" erro={erro.texto}>
        <input id={`texto-${pergunta.id}`} name="texto" maxLength={300} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      <Campo id={`ajuda-${pergunta.id}`} rotulo="Explicação para o cliente" opcional erro={erro.ajuda}>
        <input id={`ajuda-${pergunta.id}`} name="ajuda" maxLength={300} value={ajuda} onChange={(e) => setAjuda(e.target.value)} />
      </Campo>
      {!pergunta.padrao && (
        <>
          <Campo id={`tipo-${pergunta.id}`} rotulo="Tipo de resposta" erro={erro.tipo_resposta}>
            <select id={`tipo-${pergunta.id}`} name="tipo_resposta" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(TIPOS_RESPOSTA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
          {(tipo === "escolha" || tipo === "multipla") && (
            <Campo id={`opcoes-${pergunta.id}`} rotulo="Opções" ajuda="Uma por linha, até 20." erro={erro.opcoes}>
              <textarea id={`opcoes-${pergunta.id}`} name="opcoes" rows={4} defaultValue={(pergunta.opcoes ?? []).join("\n")} />
            </Campo>
          )}
        </>
      )}
      <p className="campo-ajuda">Vale para os próximos briefings. Os que já foram enviados continuam como estavam.</p>
      <div className="form-rodape">
        {pergunta.padrao && (
          <button
            type="button"
            className="botao botao-fantasma botao-pequeno"
            disabled={buscando}
            onClick={() =>
              iniciar(async () => {
                const original = await textoOriginal(pergunta.id);
                if (original) {
                  setTexto(original.texto);
                  setAjuda(original.ajuda ?? "");
                }
              })
            }
          >
            <RotateCcw size={16} aria-hidden="true" /> Voltar ao texto original
          </button>
        )}
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar pergunta"}
        </button>
      </div>
    </form>
  );
}
