"use client";

import { useActionState, useEffect, useState } from "react";
import { mudarSituacaoProjeto, definirPrazoEtapa } from "@/app/app/(sistema)/projetos/situacao-acoes";
import { STATUS_PROJETO, situacaoPrazo, responsavelEtapa, type StatusProjeto, type StatusEtapa } from "@/lib/projetos";
import { dataCurta } from "@/lib/propostas";
import type { EstadoFormulario } from "@/lib/formulario";

const inicial: EstadoFormulario = { status: "inicial" };
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
export type EventoProjeto = { id: string; tipo: "situacao" | "prazo"; etapa_nome: string | null; antes: string | null; depois: string | null; motivo: string | null; membro_nome: string | null; criado_em: string };

export function SituacaoProjeto({ projetoId, status, podeEditar, podeEntregar, eventos }: { projetoId: string; status: StatusProjeto; podeEditar: boolean; podeEntregar: boolean; eventos: EventoProjeto[] }) {
  const [destino, setDestino] = useState<StatusProjeto | null>(null);
  const [estado, action, pendente] = useActionState(mudarSituacaoProjeto, inicial);
  useEffect(() => { if (estado.status === "sucesso") setDestino(null); }, [estado]);
  const rotulo = (s: StatusProjeto) => s === "ativo" ? status === "pausado" ? "Retomar projeto" : "Reabrir projeto" : s === "pausado" ? "Pausar projeto" : s === "entregue" ? "Concluir entrega" : "Encerrar projeto";
  return <section className="cartao secao-config projeto-situacao">
    <div className="titulo-com-acao"><h2>Situação do projeto</h2><span className={`selo-status selo-projeto-${status}`}>{STATUS_PROJETO[status]}</span></div>
    <p className="muted">{status === "ativo" ? "Organize os prazos e acompanhe as aprovações." : status === "pausado" ? "O trabalho está pausado. Os arquivos continuam disponíveis e a vaga do plano fica reservada." : "Arquivos e histórico continuam disponíveis. Os pagamentos seguem o contrato e podem ser acompanhados no Financeiro."}</p>
    {podeEditar && !destino && <div className="editor-botoes">
      {status === "ativo" && <><button className="botao botao-secundario botao-pequeno" onClick={() => setDestino("pausado")}>Pausar projeto</button><button className="botao botao-secundario botao-pequeno" disabled={!podeEntregar} onClick={() => setDestino("entregue")}>Concluir entrega</button></>}
      {(status === "ativo" || status === "pausado") && <button className="botao botao-fantasma botao-pequeno" onClick={() => setDestino("encerrado")}>Encerrar projeto</button>}
      {status !== "ativo" && <button className="botao botao-secundario botao-pequeno" onClick={() => setDestino("ativo")}>{rotulo("ativo")}</button>}
    </div>}
    {podeEditar && status === "ativo" && !podeEntregar && <p className="campo-ajuda">A entrega fica disponível quando todas as etapas forem aprovadas e os aditivos forem respondidos.</p>}
    {destino && <form action={action} className="pagamento-form" key={`${status}-${destino}`}>
      <input type="hidden" name="projeto_id" value={projetoId}/><input type="hidden" name="situacao" value={destino}/>
      <p><strong>{rotulo(destino)}?</strong> {destino === "encerrado" ? "O trabalho será fechado, com os registros preservados. Para continuar, você poderá reabrir o projeto." : destino === "entregue" ? "A entrega será registrada no histórico." : destino === "pausado" ? "Novas alterações e respostas de aprovação ficam pausadas até a retomada." : "O trabalho volta a aceitar alterações e respostas. Revise os prazos ao retomar."}</p>
      <label htmlFor="motivo-projeto">Motivo{destino === "pausado" || destino === "encerrado" ? "" : " (opcional)"}</label>
      <textarea id="motivo-projeto" name="motivo" required={destino === "pausado" || destino === "encerrado"} minLength={5} maxLength={500} rows={2}/>
      {estado.status === "erro" && <p role="alert" className="contato-alerta">{estado.mensagem}</p>}
      <div className="form-rodape"><button type="button" className="botao botao-fantasma botao-pequeno" disabled={pendente} onClick={() => setDestino(null)}>Voltar</button><button className="botao botao-primario botao-pequeno" disabled={pendente}>{pendente ? "Salvando…" : rotulo(destino)}</button></div>
    </form>}
    {estado.status === "sucesso" && <p role="status" className="campo-ajuda">{estado.mensagem}</p>}
    {!!eventos.length && <details className="arquivos-anteriores"><summary>Histórico de situação e prazos</summary><ol className="linha-tempo">{eventos.map(e => <li key={e.id}><time dateTime={e.criado_em}>{DATA_HORA.format(new Date(e.criado_em))} · {e.membro_nome ?? "Equipe"}</time><span>{e.tipo === "situacao" ? `${STATUS_PROJETO[e.antes as StatusProjeto]} → ${STATUS_PROJETO[e.depois as StatusProjeto]}` : `${e.etapa_nome}: ${e.antes ? dataCurta(e.antes) : "Sem prazo"} → ${e.depois ? dataCurta(e.depois) : "Sem prazo"}`}{e.motivo && <small>{e.motivo}</small>}</span></li>)}</ol></details>}
  </section>;
}

export function PrazoEtapa({ etapa, hoje, podeEditar }: { etapa: { id: string; status: StatusEtapa; prazo: string | null }; hoje: string; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false), [estado, action, pendente] = useActionState(definirPrazoEtapa, inicial);
  useEffect(() => { if (estado.status === "sucesso") setEditando(false); }, [estado]);
  const situacao = situacaoPrazo(etapa.prazo, etapa.status, hoje);
  return <div className="projeto-prazo">
    <p className={situacao === "atrasado" ? "campo-erro" : "campo-ajuda"}>Entrega planejada: <strong>{etapa.prazo ? dataCurta(etapa.prazo) : "Sem data"}</strong>{situacao === "atrasado" ? " · Em atraso" : situacao === "hoje" ? " · Hoje" : ""}{etapa.status !== "aprovada" && ` · Próxima ação: ${responsavelEtapa(etapa.status)}`}</p>
    {podeEditar && etapa.status !== "aprovada" && !editando && <button type="button" className="tabela-link" onClick={() => setEditando(true)}>Alterar prazo</button>}
    {editando && <form action={action} className="form-linha"><input type="hidden" name="etapa_id" value={etapa.id}/><label>Entrega planejada<input name="prazo" aria-label="Entrega planejada" type="date" min="2000-01-01" max="2100-12-31" defaultValue={etapa.prazo ?? ""}/></label><div className="editor-botoes"><button className="botao botao-secundario botao-pequeno" disabled={pendente}>{pendente ? "Salvando…" : "Salvar prazo"}</button><button type="button" className="botao botao-fantasma botao-pequeno" disabled={pendente} onClick={() => setEditando(false)}>Voltar</button></div><p className="campo-ajuda">Deixe a data vazia para retirar o prazo. A alteração fica registrada no histórico.</p>{estado.status === "erro" && <p role="alert" className="campo-erro">{estado.mensagem}</p>}</form>}
  </div>;
}
