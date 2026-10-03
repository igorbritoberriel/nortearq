"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { EditarPergunta } from "@/components/briefing/EditarPergunta";
import { Aviso, Campo } from "@/components/Campo";
import {
  alternarPergunta,
  criarPergunta,
  excluirPergunta,
  salvarOrdemPerguntas,
} from "@/app/app/(sistema)/briefings/acoes";
import {
  AMBIENTES,
  ESTILOS,
  ORDEM_SECOES,
  SECOES,
  TIPOS_RESPOSTA,
  type Ambiente,
  type Estilo,
  type PerguntaModelo,
  type SecaoBriefing,
} from "@/lib/briefing";
import type { EstadoFormulario } from "@/lib/formulario";
import { IndicadorSalvamento, useSalvarEmFila } from "@/lib/salvar-em-fila";

const NOMES_BLOCOS: Record<SecaoBriefing, string> = {
  arquitetura: "Arquitetura",
  interiores: "Interiores",
  reforma: "Reforma",
  comum: "Comum a todos",
};

// Perguntas agrupadas como o cliente vê: bloco e, em interiores, ambiente.
function agrupar(perguntas: PerguntaModelo[]) {
  return ORDEM_SECOES.flatMap((secao) => {
    const daSecao = perguntas.filter((p) => p.tipo_briefing === secao);
    if (secao !== "interiores") return [{ chave: secao, titulo: NOMES_BLOCOS[secao], perguntas: daSecao }];
    return [
      { chave: "interiores", titulo: "Interiores · geral", perguntas: daSecao.filter((p) => !p.ambiente) },
      ...(Object.keys(AMBIENTES) as Ambiente[]).map((a) => ({
        chave: `interiores-${a}`,
        titulo: `Interiores · ${AMBIENTES[a]}`,
        perguntas: daSecao.filter((p) => p.ambiente === a),
      })),
    ];
  }).filter((g) => g.perguntas.length || g.chave === "comum");
}

// Grupo onde a pergunta pode trocar de lugar (mesmo bloco e, em interiores, mesmo ambiente).
const grupoDe = (p: PerguntaModelo) => `${p.tipo_briefing}:${p.ambiente ?? ""}`;

export function EditorPerguntas({ perguntas }: { perguntas: PerguntaModelo[] }) {
  // A tela muda na hora (estado local) e o salvamento roda por trás, sem travar os botões.
  const [lista, setLista] = useState(perguntas);
  const [pendente, iniciar] = useTransition();
  const [editando, setEditando] = useState<string | null>(null);
  const { agendar, status, ocupado } = useSalvarEmFila();
  const proprias = lista.filter((p) => !p.padrao).length;
  const grupos = agrupar(lista);

  // Dados novos do servidor (ex.: pergunta criada) só entram quando não há nada para salvar.
  useEffect(() => {
    if (!ocupado()) setLista(perguntas);
  }, [perguntas, ocupado]);

  // Sempre a lista mais recente, mesmo com cliques muito rápidos.
  const atual = useRef(lista);
  atual.current = lista;

  function mover(id: string, direcao: -1 | 1) {
    const base = atual.current;
    const pergunta = base.find((p) => p.id === id);
    if (!pergunta) return;
    const grupo = grupoDe(pergunta);
    const posicoes = base.flatMap((p, i) => (grupoDe(p) === grupo ? [i] : []));
    const k = posicoes.findIndex((i) => base[i].id === id);
    const alvo = posicoes[k + direcao];
    if (alvo === undefined) return;
    const nova = [...base];
    [nova[posicoes[k]], nova[alvo]] = [nova[alvo], nova[posicoes[k]]];
    atual.current = nova;
    setLista(nova);
    const ids = nova.filter((p) => grupoDe(p) === grupo).map((p) => p.id);
    agendar(`ordem:${grupo}`, () => salvarOrdemPerguntas(ids));
  }

  function alternar(id: string, ativa: boolean) {
    const nova = atual.current.map((p) => (p.id === id ? { ...p, ativa } : p));
    atual.current = nova;
    setLista(nova);
    agendar(`ativa:${id}`, () => alternarPergunta(id, ativa));
  }

  return (
    <>
      <div className="salvamento-faixa">
        <span className="muted">As mudanças são salvas sozinhas.</span>
        <IndicadorSalvamento status={status} />
      </div>
      {grupos.map((g) => (
        <section key={g.chave} className="cartao secao-config">
          <h2>{g.titulo}</h2>
          {g.chave === "comum" && <p className="muted">{SECOES.comum.descricao}</p>}
          <ol className="editor-perguntas">
            {g.perguntas.map((p, i) => (
              <li key={p.id} className={p.ativa ? "" : "desativada"}>
                <label className="editor-ativa" title={p.ativa ? "Desativar" : "Ativar"}>
                  <input type="checkbox" checked={p.ativa} onChange={(e) => alternar(p.id, e.target.checked)} />
                  <span className="sr-only">Pergunta ativa</span>
                </label>
                <div className="editor-texto">
                  <strong>{p.texto}</strong>
                  <small className="muted">
                    {TIPOS_RESPOSTA[p.tipo_resposta]}
                    {p.opcoes?.length ? `: ${p.opcoes.join(", ")}` : ""}
                    {p.padrao ? "" : " · sua pergunta"}
                  </small>
                </div>
                <div className="editor-botoes">
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={() => setEditando(editando === p.id ? null : p.id)}
                    aria-label={`Editar: ${p.texto}`}
                    title="Editar"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    disabled={i === 0}
                    onClick={() => mover(p.id, -1)}
                    aria-label={`Subir: ${p.texto}`}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    disabled={i === g.perguntas.length - 1}
                    onClick={() => mover(p.id, 1)}
                    aria-label={`Descer: ${p.texto}`}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  {/* RN-02.11: perguntas padrão só desativam. */}
                  {!p.padrao && (
                    <button
                      type="button"
                      className="botao-icone"
                      disabled={pendente}
                      onClick={() => {
                        if (confirm(`Apagar a pergunta "${p.texto}"?`)) iniciar(() => excluirPergunta(p.id));
                      }}
                      aria-label={`Apagar: ${p.texto}`}
                      title="Apagar"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {editando === p.id && <EditarPergunta pergunta={p} fechar={() => setEditando(null)} />}
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="cartao secao-config">
        <div className="titulo-com-acao">
          <h2>Nova pergunta</h2>
          <span className={`muted ${proprias >= 90 ? "texto-alerta" : ""}`}>{proprias} de 100 perguntas suas</span>
        </div>
        <p className="campo-ajuda">
          Até 40 perguntas por grupo: briefing longo demais cansa o cliente. Perguntas padrão não se apagam, só se desligam
          (quadradinho) ou se editam (lápis).
        </p>
        {proprias >= 100 ? (
          <Aviso tipo="erro">Você chegou a 100 perguntas próprias. Apague ou reaproveite uma antes de criar outra.</Aviso>
        ) : (
          <NovaPergunta />
        )}
      </section>
    </>
  );
}

const inicial: EstadoFormulario = { status: "inicial" };

function NovaPergunta() {
  const [estado, enviar, enviando] = useActionState(criarPergunta, inicial);
  const [bloco, setBloco] = useState<SecaoBriefing>("comum");
  const [tipo, setTipo] = useState("texto");
  const erro = estado.erros ?? {};
  const v = estado.status === "erro" ? (estado.valores ?? {}) : {};

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="tipo_briefing" rotulo="Bloco" erro={erro.tipo_briefing}>
          <select
            id="tipo_briefing"
            name="tipo_briefing"
            defaultValue={v.tipo_briefing ?? bloco}
            onChange={(e) => setBloco(e.target.value as SecaoBriefing)}
          >
            {ORDEM_SECOES.map((s) => (
              <option key={s} value={s}>
                {NOMES_BLOCOS[s]}
              </option>
            ))}
          </select>
        </Campo>
        {bloco === "interiores" ? (
          <Campo id="ambiente" rotulo="Ambiente" erro={erro.ambiente}>
            <select id="ambiente" name="ambiente" defaultValue={v.ambiente ?? ""}>
              <option value="">Geral (todos os ambientes)</option>
              {(Object.keys(AMBIENTES) as Ambiente[]).map((a) => (
                <option key={a} value={a}>
                  {AMBIENTES[a]}
                </option>
              ))}
            </select>
          </Campo>
        ) : (
          <input type="hidden" name="ambiente" value="" />
        )}
      </div>
      <Campo id="texto" rotulo="Pergunta" erro={erro.texto}>
        <input id="texto" name="texto" maxLength={300} defaultValue={v.texto} placeholder="Ex.: Você tem plantas em casa?" />
      </Campo>
      <Campo id="ajuda" rotulo="Explicação para o cliente" opcional erro={erro.ajuda}>
        <input id="ajuda" name="ajuda" maxLength={300} defaultValue={v.ajuda} />
      </Campo>
      <Campo id="tipo_resposta" rotulo="Tipo de resposta" erro={erro.tipo_resposta}>
        <select id="tipo_resposta" name="tipo_resposta" defaultValue={v.tipo_resposta ?? tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(TIPOS_RESPOSTA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Campo>
      {(tipo === "escolha" || tipo === "multipla") && (
        <Campo id="opcoes" rotulo="Opções" ajuda="Uma por linha." erro={erro.opcoes}>
          <textarea id="opcoes" name="opcoes" rows={4} defaultValue={v.opcoes} />
        </Campo>
      )}
      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Adicionar pergunta"}
        </button>
      </div>
    </form>
  );
}
