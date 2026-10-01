"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { CAMPOS_CONTRATO } from "@/lib/contratos";
import type { EstadoFormulario } from "@/lib/formulario";

// Texto do contrato com os {{campos}} automáticos (RN-01.12). Clicar num campo insere no cursor.
export function EditorContrato({
  texto,
  salvar,
  ajuda,
}: {
  texto: string;
  salvar: (corpo: string) => Promise<{ ok: true } | { erro: string }>;
  ajuda?: string;
}) {
  const [corpo, setCorpo] = useState(texto);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const alterado = corpo !== texto;

  function inserir(campo: string) {
    const el = area.current;
    if (!el) return;
    const inicio = el.selectionStart;
    const novo = corpo.slice(0, inicio) + campo + corpo.slice(el.selectionEnd);
    setCorpo(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio + campo.length, inicio + campo.length);
    });
  }

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
            }}
            spellCheck
          />
        </div>
        <aside className="editor-campos" aria-label="Campos automáticos">
          <strong>Campos automáticos</strong>
          <p className="campo-ajuda">Clique para inserir no texto. O sistema troca pelos dados reais.</p>
          <ul>
            {CAMPOS_CONTRATO.map((c) => (
              <li key={c.campo}>
                <button type="button" className="botao-link" onClick={() => inserir(c.campo)} title={c.descricao}>
                  <code>{c.campo}</code>
                </button>
                <small className="muted">{c.descricao}</small>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="form-rodape">
        {alterado && <span className="campo-ajuda">Alterações não salvas</span>}
        <button
          type="button"
          className="botao botao-primario"
          disabled={pendente || !alterado}
          onClick={() =>
            iniciar(async () => {
              const r = await salvar(corpo);
              setMensagem("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "sucesso", texto: "Texto salvo." });
            })
          }
        >
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
          <input id="documento" name="documento" inputMode="numeric" defaultValue={valor("documento")} />
        </Campo>
        <Campo id="registro_profissional" rotulo="Registro profissional" ajuda="Ex.: CAU A123456-7" erro={erro.registro_profissional}>
          <input id="registro_profissional" name="registro_profissional" defaultValue={valor("registro_profissional")} />
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
