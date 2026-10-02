"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Sofa, Trash2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import {
  criarModeloContrato,
  excluirModeloContrato,
  trocarModeloContrato,
} from "@/app/app/(sistema)/contratos/acoes";
import type { EstadoFormulario } from "@/lib/formulario";

// Vários modelos de contrato: cada um ligado aos serviços que atende.
// Ao gerar o contrato, o sistema escolhe sozinho o modelo pelos serviços da proposta.

const inicial: EstadoFormulario = { status: "inicial" };

export type ModeloResumo = { id: string; nome: string; padrao: boolean; servicos: string[] };

export function FormConfigModelo({
  acao,
  modelo,
  servicos,
}: {
  acao: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  modelo: ModeloResumo;
  servicos: { id: string; nome: string; ativo: boolean }[];
}) {
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const visiveis = servicos.filter((s) => s.ativo || modelo.servicos.includes(s.id));

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <Campo id="nome-modelo" rotulo="Nome do modelo" erro={estado.erros?.nome}>
        <input id="nome-modelo" name="nome" required defaultValue={estado.valores?.nome ?? modelo.nome} />
      </Campo>
      {modelo.padrao ? (
        <p className="campo-ajuda">
          Este é o modelo padrão: vale para qualquer proposta cujos serviços não tenham um modelo próprio.
        </p>
      ) : (
        <div className="campo">
          <span className="campo-rotulo" id="servicos-modelo">
            Usar este modelo em propostas de
          </span>
          <div className="lista-marcar" role="group" aria-labelledby="servicos-modelo">
            {visiveis.map((s) => (
              <label key={s.id} className="checagem">
                <input type="checkbox" name="servicos" value={s.id} defaultChecked={modelo.servicos.includes(s.id)} />
                <span>{s.nome}</span>
              </label>
            ))}
          </div>
          <p className="campo-ajuda">
            Se a proposta tiver serviços de modelos diferentes, vale o modelo que atende mais serviços dela. Você sempre
            pode trocar o modelo no contrato antes de enviar.
          </p>
        </div>
      )}
      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function NovoModelo() {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="novo-modelo">
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        disabled={pendente}
        onClick={() => iniciar(() => criarModeloContrato("interiores"))}
      >
        <Sofa size={16} aria-hidden="true" />
        Modelo de interiores (texto pronto)
      </button>
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        disabled={pendente}
        onClick={() => iniciar(() => criarModeloContrato("copia"))}
      >
        <Copy size={16} aria-hidden="true" />
        Cópia do modelo padrão
      </button>
      {pendente && <span className="campo-ajuda">Criando...</span>}
    </div>
  );
}

export function ExcluirModelo({ id, nome }: { id: string; nome: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      className="botao botao-fantasma botao-pequeno"
      disabled={pendente}
      onClick={() => {
        if (window.confirm(`Excluir o modelo "${nome}"? Contratos já gerados com ele não mudam.`)) {
          iniciar(() => excluirModeloContrato(id));
        }
      }}
    >
      <Trash2 size={16} aria-hidden="true" />
      {pendente ? "Excluindo..." : "Excluir modelo"}
    </button>
  );
}

// No contrato em rascunho: escolher outro modelo (substitui o texto deste contrato).
export function TrocarModelo({
  contratoId,
  modelos,
  atual,
}: {
  contratoId: string;
  modelos: ModeloResumo[];
  atual: string | null;
}) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState(atual ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="trocar-modelo">
      <label htmlFor="modelo-contrato" className="campo-rotulo">
        Modelo usado
      </label>
      <div className="trocar-modelo-linha">
        <select id="modelo-contrato" value={escolhido} onChange={(e) => setEscolhido(e.target.value)} disabled={pendente}>
          {!atual && <option value="">Escolha um modelo</option>}
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
              {m.padrao ? " (padrão)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="botao botao-secundario botao-pequeno"
          disabled={pendente || !escolhido || escolhido === atual}
          onClick={() => {
            if (!window.confirm("Trocar o modelo substitui o texto deste contrato, inclusive ajustes que você fez nele. Continuar?")) return;
            setErro(null);
            iniciar(async () => {
              const r = await trocarModeloContrato(contratoId, escolhido);
              if ("erro" in r) setErro(r.erro);
              else router.refresh();
            });
          }}
        >
          {pendente ? "Trocando..." : "Usar este modelo"}
        </button>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </div>
  );
}

