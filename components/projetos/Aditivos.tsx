"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { FilePlus, Trash2, X } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import {
  cancelarAditivo,
  criarAditivo,
  criarAprovacaoExterna,
  excluirAprovacaoExterna,
  linkDoProjeto,
  mudarSituacaoExterna,
} from "@/app/app/(sistema)/projetos/acoes";
import {
  SITUACOES_EXTERNAS,
  STATUS_ADITIVO,
  resumoAditivo,
  type Aditivo,
  type AprovacaoExterna,
  type SituacaoExterna,
} from "@/lib/aditivos";
import type { EstadoFormulario } from "@/lib/formulario";
import { dataCurta, reais } from "@/lib/propostas";

const inicial: EstadoFormulario = { status: "inicial" };

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

type Cliente = { nome: string; telefone: string | null; escritorio: string };

// ---------- Aditivos (RN-03.15, RN-03.16) ----------

export function Aditivos({
  projetoId,
  aditivos,
  cobrar,
  cliente,
  temContrato,
}: {
  projetoId: string;
  aditivos: Aditivo[];
  cobrar: { aprovacaoId: string; etapa: string } | null; // veio do "Cobrar como aditivo" de uma revisão excedente
  cliente: Cliente;
  temContrato: boolean;
}) {
  const [abrindo, setAbrindo] = useState(!!cobrar);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const aguardando = aditivos.some((a) => a.status === "enviado");

  return (
    <section className="cartao secao-config" id="aditivos">
      <div className="titulo-com-acao">
        <h2>Aditivos</h2>
        {!abrindo && (
          <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setAbrindo(true)}>
            <FilePlus size={16} aria-hidden="true" />
            Novo aditivo
          </button>
        )}
      </div>
      <p className="muted">
        O que fica fora do contratado: revisão além do limite, mudança em etapa aprovada, ambiente a mais, visitas extras. O
        cliente aprova ou recusa pelo link do projeto, e o aditivo aprovado entra nos Pagamentos.
      </p>
      {!temContrato && <Aviso tipo="erro">Este projeto não tem contrato: o aditivo aprovado não gera parcelas.</Aviso>}

      {abrindo && (
        <FormAditivo projetoId={projetoId} cobrar={cobrar} fechar={() => setAbrindo(false)} />
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {aditivos.length > 0 && (
        <ul className="aditivos">
          {aditivos.map((a) => (
            <li key={a.id} className={`aditivo aditivo-${a.status}`}>
              <div className="aditivo-linha">
                <span className="aditivo-descricao">
                  <strong>
                    Aditivo {a.numero}: {a.descricao}
                  </strong>
                  <small className="muted">{resumoAditivo(a)}</small>
                </span>
                <span className="aditivo-valor">
                  <strong>{reais(Number(a.valor))}</strong>
                  <span className={`selo-status selo-aditivo-${a.status}`}>{STATUS_ADITIVO[a.status]}</span>
                </span>
              </div>
              {a.status === "aprovado" && a.respondido_em && (
                <p className="campo-ajuda">
                  Aprovado pelo cliente em {dataHora.format(new Date(a.respondido_em))}
                  {a.resposta_ip ? ` · IP ${a.resposta_ip}` : ""}
                </p>
              )}
              {a.status === "recusado" && (
                <p className="campo-ajuda">
                  Recusado{a.respondido_em ? ` em ${dataHora.format(new Date(a.respondido_em))}` : ""}. Motivo:{" "}
                  {a.motivo_recusa ?? "—"}
                </p>
              )}
              {a.status === "enviado" && (
                <div className="aditivo-acoes">
                  <EnviarLinkAcao
                    acao={linkDoProjeto.bind(null, projetoId)}
                    destino="projeto"
                    telefone={cliente.telefone}
                    cliente={cliente.nome}
                    escritorio={cliente.escritorio}
                    rotulo={cliente.telefone ? "Enviar para o cliente no WhatsApp" : "Gerar link do projeto"}
                    mensagemEspecial="aditivo"
                  />
                  <button
                    type="button"
                    className="botao botao-fantasma botao-pequeno"
                    disabled={pendente}
                    onClick={() => {
                      if (!window.confirm(`Cancelar o aditivo ${a.numero}? O cliente deixa de ver.`)) return;
                      setErro(null);
                      iniciar(async () => {
                        const r = await cancelarAditivo(projetoId, a.id);
                        if ("erro" in r) setErro(r.erro);
                      });
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                    Cancelar aditivo
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!aditivos.length && !abrindo && <p className="campo-ajuda">Nenhum aditivo neste projeto.</p>}
      {aguardando && (
        <p className="campo-ajuda">O link do projeto mostra os aditivos pendentes para o cliente aprovar ou recusar.</p>
      )}
    </section>
  );
}

function FormAditivo({
  projetoId,
  cobrar,
  fechar,
}: {
  projetoId: string;
  cobrar: { aprovacaoId: string; etapa: string } | null;
  fechar: () => void;
}) {
  const aprovacaoId = cobrar?.aprovacaoId ?? null;
  const acao = useMemo(() => criarAditivo.bind(null, projetoId, aprovacaoId), [projetoId, aprovacaoId]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  useEffect(() => {
    if (estado.status === "sucesso") fechar();
  }, [estado.status, fechar]);

  return (
    <form action={enviar} className="pagamento-form aditivo-form" noValidate>
      {cobrar && (
        <p className="contato-alerta">
          Cobrando a revisão excedente da etapa &quot;{cobrar.etapa}&quot;. Ao ser aprovado, o aditivo soma 1 revisão ao
          projeto.
        </p>
      )}
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id="aditivo-descricao" rotulo="O que o aditivo cobre" erro={erro.descricao}>
        <textarea
          id="aditivo-descricao"
          name="descricao"
          rows={3}
          defaultValue={v.descricao ?? (cobrar ? `Revisão extra na etapa "${cobrar.etapa}", além do limite contratado.` : "")}
          placeholder="Ex.: inclusão do projeto de interiores da varanda"
        />
      </Campo>
      <div className="form-linha">
        <Campo id="aditivo-valor" rotulo="Valor (R$)" erro={erro.valor}>
          <input id="aditivo-valor" name="valor" inputMode="decimal" placeholder="1.500" defaultValue={v.valor} />
        </Campo>
        <Campo id="aditivo-parcelas" rotulo="Pagamento" erro={erro.parcelas}>
          <select id="aditivo-parcelas" name="parcelas" defaultValue={v.parcelas ?? "1"}>
            <option value="1">À vista (1 parcela)</option>
            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                Em {n} parcelas
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="form-linha form-linha-3">
        <Campo id="aditivo-prazo" rotulo="Dias a mais no prazo" erro={erro.prazo_dias}>
          <input id="aditivo-prazo" name="prazo_dias" type="number" min={0} max={3650} defaultValue={v.prazo_dias ?? "0"} />
        </Campo>
        <Campo id="aditivo-revisoes" rotulo="Revisões extras" erro={erro.revisoes_extras}>
          <input
            id="aditivo-revisoes"
            name="revisoes_extras"
            type="number"
            min={0}
            max={50}
            defaultValue={v.revisoes_extras ?? (cobrar ? "1" : "0")}
          />
        </Campo>
        <Campo id="aditivo-visitas" rotulo="Visitas extras" erro={erro.visitas_extras}>
          <input id="aditivo-visitas" name="visitas_extras" type="number" min={0} max={100} defaultValue={v.visitas_extras ?? "0"} />
        </Campo>
      </div>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Criando..." : "Criar aditivo"}
        </button>
      </div>
    </form>
  );
}

// ---------- Aprovações externas (RN-03.17) ----------

export function AprovacoesExternas({ projetoId, itens }: { projetoId: string; itens: AprovacaoExterna[] }) {
  const [abrindo, setAbrindo] = useState(false);
  const [, iniciar] = useTransition();
  // Mudar situação e apagar aparecem na hora; voltam sozinhos se o servidor recusar.
  const [lista, aplicar] = useOptimistic(
    itens,
    (atual, m: { tipo: "situacao"; id: string; situacao: SituacaoExterna } | { tipo: "apagar"; id: string }) =>
      m.tipo === "apagar"
        ? atual.filter((i) => i.id !== m.id)
        : atual.map((i) => (i.id === m.id ? { ...i, situacao: m.situacao } : i)),
  );

  return (
    <section className="cartao secao-config" id="aprovacoes-externas">
      <div className="titulo-com-acao">
        <h2>Aprovações externas</h2>
        {!abrindo && (
          <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setAbrindo(true)}>
            <FilePlus size={16} aria-hidden="true" />
            Registrar
          </button>
        )}
      </div>
      <p className="muted">Condomínio, prefeitura, bombeiros: protocolo e situação. O cliente vê a situação no link do projeto.</p>

      {abrindo && <FormExterna projetoId={projetoId} fechar={() => setAbrindo(false)} />}

      {lista.length > 0 ? (
        <ul className="externas">
          {lista.map((x) => (
            <li key={x.id} className={`externa externa-${x.situacao}`}>
              <span className="externa-dados">
                <strong>{x.orgao}</strong>
                <small className="muted">
                  {[x.protocolo && `Protocolo ${x.protocolo}`, x.entrada_em && `entrada em ${dataCurta(x.entrada_em)}`]
                    .filter(Boolean)
                    .join(" · ") || "Sem protocolo ainda"}
                  {x.observacao ? ` · ${x.observacao}` : ""}
                </small>
              </span>
              <label>
                <span className="sr-only">Situação de {x.orgao}</span>
                <select
                  value={x.situacao}
                  onChange={(e) => {
                    const situacao = e.target.value as SituacaoExterna;
                    iniciar(async () => {
                      aplicar({ tipo: "situacao", id: x.id, situacao });
                      await mudarSituacaoExterna(x.id, situacao);
                    });
                  }}
                >
                  {Object.entries(SITUACOES_EXTERNAS).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="botao-icone"
                aria-label={`Apagar ${x.orgao}`}
                onClick={() => {
                  if (!window.confirm(`Apagar o registro de ${x.orgao}?`)) return;
                  iniciar(async () => {
                    aplicar({ tipo: "apagar", id: x.id });
                    await excluirAprovacaoExterna(projetoId, x.id);
                  });
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !abrindo && <p className="campo-ajuda">Nenhuma aprovação externa registrada.</p>
      )}
    </section>
  );
}

function FormExterna({ projetoId, fechar }: { projetoId: string; fechar: () => void }) {
  const acao = useMemo(() => criarAprovacaoExterna.bind(null, projetoId), [projetoId]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  useEffect(() => {
    if (estado.status === "sucesso") fechar();
  }, [estado.status, fechar]);

  return (
    <form action={enviar} className="pagamento-form" noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="externa-orgao" rotulo="Órgão" erro={erro.orgao}>
          <input id="externa-orgao" name="orgao" list="orgaos-comuns" placeholder="Prefeitura" defaultValue={v.orgao} />
          <datalist id="orgaos-comuns">
            <option value="Prefeitura" />
            <option value="Condomínio" />
            <option value="Corpo de Bombeiros" />
            <option value="Concessionária de energia" />
            <option value="Órgão de patrimônio histórico" />
          </datalist>
        </Campo>
        <Campo id="externa-situacao" rotulo="Situação" erro={erro.situacao}>
          <select id="externa-situacao" name="situacao" defaultValue={v.situacao ?? "em_preparo"}>
            {Object.entries(SITUACOES_EXTERNAS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="form-linha">
        <Campo id="externa-protocolo" rotulo="Nº do protocolo" opcional erro={erro.protocolo}>
          <input id="externa-protocolo" name="protocolo" defaultValue={v.protocolo} />
        </Campo>
        <Campo id="externa-entrada" rotulo="Data de entrada" opcional erro={erro.entrada_em}>
          <input id="externa-entrada" name="entrada_em" type="date" defaultValue={v.entrada_em} />
        </Campo>
      </div>
      <Campo id="externa-obs" rotulo="Observação" opcional erro={erro.observacao}>
        <input id="externa-obs" name="observacao" maxLength={500} defaultValue={v.observacao} />
      </Campo>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
          {enviando ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}
