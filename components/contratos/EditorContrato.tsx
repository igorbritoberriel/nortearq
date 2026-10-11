"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { CAMPOS_CONTRATO, GRUPOS_CAMPO, etiquetasDesconhecidas, paraCampos, paraEtiquetas, type GrupoCampo } from "@/lib/contratos";
import type { EstadoFormulario } from "@/lib/formulario";
import { InputMascara } from "@/components/InputMascara";

// Texto do contrato (RN-01.12). Na tela os dados automáticos aparecem como [Nome do cliente]; no banco
// continuam {{cliente.nome}}. A arquiteta pode clicar nos botões ou digitar a etiqueta entre colchetes.
export function EditorContrato({
  texto,
  salvar,
  ajuda,
}: {
  texto: string;
  salvar: (corpo: string) => Promise<{ ok: true } | { erro: string }>;
  ajuda?: string;
}) {
  const original = paraEtiquetas(texto);
  const [corpo, setCorpo] = useState(original);
  const [salvo, setSalvo] = useState(original);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [desconhecidas, setDesconhecidas] = useState<string[]>([]);
  const [pendente, iniciar] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const alterado = corpo !== salvo;

  function inserir(etiqueta: string) {
    const el = area.current;
    if (!el) return;
    const trecho = `[${etiqueta}]`;
    const inicio = el.selectionStart;
    setCorpo(corpo.slice(0, inicio) + trecho + corpo.slice(el.selectionEnd));
    setDesconhecidas([]);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio + trecho.length, inicio + trecho.length);
    });
  }

  function gravar(mesmoComAviso: boolean) {
    const erradas = etiquetasDesconhecidas(corpo);
    if (erradas.length && !mesmoComAviso) {
      setDesconhecidas(erradas);
      setMensagem(null);
      return;
    }
    iniciar(async () => {
      const r = await salvar(paraCampos(corpo));
      setDesconhecidas([]);
      if ("erro" in r) setMensagem({ tipo: "erro", texto: r.erro });
      else {
        setSalvo(corpo);
        setMensagem({ tipo: "sucesso", texto: "Texto salvo." });
      }
    });
  }

  const grupos = Object.keys(GRUPOS_CAMPO) as GrupoCampo[];

  return (
    <div className="editor-contrato">
      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
      <div className="editor-contrato-grade">
        <div className="campo">
          <label htmlFor="corpo-contrato">Texto do contrato</label>
          {ajuda && <p className="campo-ajuda">{ajuda}</p>}
          <textarea
            id="corpo-contrato"
            ref={area}
            rows={28}
            value={corpo}
            onChange={(e) => {
              setCorpo(e.target.value);
              setMensagem(null);
              setDesconhecidas([]);
            }}
            spellCheck
          />
          <p className="editor-dica">
            Tem um contrato pronto do seu advogado? Cole aqui e troque o nome do cliente por <strong>[Nome do cliente]</strong>,
            o valor por <strong>[Valor total]</strong>, e assim por diante. Onde estiver entre colchetes, o sistema troca pelos
            dados de cada cliente.
          </p>
        </div>
        <aside className="editor-campos" aria-label="Dados para colocar no texto">
          <strong>Colocar um dado no texto</strong>
          <p className="campo-ajuda">Clique no texto onde quer o dado e depois no botão. Ou digite a etiqueta entre colchetes.</p>
          {grupos.map((g) => (
            <div key={g} className={`editor-grupo editor-grupo-${g}`}>
              <span className="editor-grupo-titulo">{GRUPOS_CAMPO[g]}</span>
              <div className="editor-etiquetas">
                {CAMPOS_CONTRATO.filter((c) => c.grupo === g).map((c) => (
                  <button key={c.campo} type="button" className="editor-etiqueta" onClick={() => inserir(c.etiqueta)}>
                    [{c.etiqueta}]
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>
      {desconhecidas.length > 0 && (
        <Aviso tipo="erro">
          {desconhecidas.length === 1 ? "Esta etiqueta não existe: " : "Estas etiquetas não existem: "}
          <strong>{desconhecidas.map((d) => `[${d}]`).join(", ")}</strong>. Confira se está escrita igual a um dos botões ao lado. Se
          for texto normal do contrato, pode salvar assim mesmo.
        </Aviso>
      )}
      <div className="form-rodape">
        {alterado && <span className="campo-ajuda">Alterações não salvas</span>}
        {desconhecidas.length > 0 && (
          <button type="button" className="botao botao-secundario" disabled={pendente} onClick={() => gravar(true)}>
            Salvar assim mesmo
          </button>
        )}
        <button type="button" className="botao botao-primario" disabled={pendente || !alterado} onClick={() => gravar(false)}>
          {pendente ? "Salvando..." : "Salvar texto"}
        </button>
      </div>
    </div>
  );
}

const inicial: EstadoFormulario = { status: "inicial" };

// Dados do escritório que entram no contrato como CONTRATADO.
export function FormDadosContratado({
  acao,
  dados,
}: {
  acao: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  dados: { documento: string | null; endereco: string | null; responsavel: string | null; registro_profissional: string | null };
}) {
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  const valor = (campo: keyof typeof dados) => v[campo] ?? dados[campo] ?? "";

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="documento" rotulo="CPF ou CNPJ do escritório" erro={erro.documento}>
          <InputMascara
            mascara="documento"
            id="documento"
            name="documento"
            autoCapitalize="characters"
            placeholder="00.000.000/0000-00"
            defaultValue={valor("documento")}
          />
        </Campo>
        <Campo
          id="registro_profissional"
          rotulo="Registro profissional"
          ajuda="CAU: digite a letra e os números, o traço entra sozinho (A123456-7). CREA: como no seu registro."
          erro={erro.registro_profissional}
        >
          <InputMascara
            mascara="registro"
            id="registro_profissional"
            name="registro_profissional"
            placeholder="A123456-7"
            defaultValue={valor("registro_profissional")}
          />
        </Campo>
      </div>
      <Campo id="responsavel" rotulo="Quem assina pelo escritório" erro={erro.responsavel}>
        <input id="responsavel" name="responsavel" autoComplete="name" defaultValue={valor("responsavel")} />
      </Campo>
      <Campo id="endereco" rotulo="Endereço do escritório" erro={erro.endereco}>
        <input id="endereco" name="endereco" autoComplete="street-address" defaultValue={valor("endereco")} />
      </Campo>
      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}
