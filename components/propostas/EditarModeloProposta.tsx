"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { InputMascara } from "@/components/InputMascara";
import { Trash2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { excluirModeloProposta, salvarDadosModelo } from "@/app/app/(sistema)/propostas/modelos/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { TIPOS_PRECO, type TipoPreco } from "@/lib/modelos-proposta";

const inicial: EstadoFormulario = { status: "inicial" };

// Nome, serviços e valor de um modelo. O conteúdo muda pelo "Salvar como modelo" numa proposta.
export function EditarModeloProposta({
  modelo,
  servicos,
}: {
  modelo: { id: string; nome: string; servicos: string[]; preco_tipo: TipoPreco; preco_valor: number | null };
  servicos: { id: string; nome: string }[];
}) {
  const acao = useMemo(() => salvarDadosModelo.bind(null, modelo.id), [modelo.id]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const [tipo, setTipo] = useState<TipoPreco>(modelo.preco_tipo);
  const [excluindo, iniciar] = useTransition();
  const erro = estado.erros ?? {};
  const v = estado.valores;

  return (
    <form action={enviar} noValidate className="editar-modelo">
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <Campo id={`nome-${modelo.id}`} rotulo="Nome" erro={erro.nome}>
        <input id={`nome-${modelo.id}`} name="nome" defaultValue={v?.nome ?? modelo.nome} />
      </Campo>
      <div className={`campo ${erro.servicos ? "com-erro" : ""}`}>
        <span className="campo-rotulo" id={`servicos-${modelo.id}`}>
          Usar automaticamente em propostas de
        </span>
        {servicos.length === 0 && (
          <p className="campo-ajuda">
            Nenhum serviço cadastrado. Cadastre seus serviços em <a href="/app/configuracoes#servicos">Configurações → Serviços</a>.
          </p>
        )}
        <div className="lista-marcar" role="group" aria-labelledby={`servicos-${modelo.id}`}>
          {servicos.map((s) => (
            <label key={s.id} className="checagem">
              <input
                type="checkbox"
                name="servicos"
                value={s.id}
                defaultChecked={v ? v[`servico_${s.id}`] === "on" : modelo.servicos.includes(s.id)}
              />
              <span>{s.nome}</span>
            </label>
          ))}
        </div>
        {erro.servicos && <p className="campo-erro">{erro.servicos}</p>}
      </div>
      <div className="form-linha">
        <Campo id={`tipo-${modelo.id}`} rotulo="Valor no modelo">
          <select id={`tipo-${modelo.id}`} name="preco_tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPreco)}>
            {(Object.keys(TIPOS_PRECO) as TipoPreco[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_PRECO[t]}
              </option>
            ))}
          </select>
        </Campo>
        {tipo !== "vazio" && (
          <Campo id={`valor-${modelo.id}`} rotulo={tipo === "m2" ? "Valor por m² (R$)" : "Valor (R$)"} erro={erro.preco_valor}>
            <InputMascara mascara="dinheiro"
              id={`valor-${modelo.id}`}
              name="preco_valor"
              inputMode="decimal"
              defaultValue={v?.preco_valor ?? (modelo.preco_valor ? String(modelo.preco_valor).replace(".", ",") : "")}
            />
          </Campo>
        )}
      </div>
      <div className="form-rodape">
        <button
          type="button"
          className="botao botao-fantasma botao-pequeno"
          disabled={excluindo}
          onClick={() => {
            if (window.confirm(`Excluir o modelo "${modelo.nome}"? Propostas já criadas com ele não mudam.`)) {
              iniciar(() => excluirModeloProposta(modelo.id));
            }
          }}
        >
          <Trash2 size={16} aria-hidden="true" /> {excluindo ? "Excluindo..." : "Excluir"}
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
