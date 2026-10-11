import type { Metadata } from "next";
import { Bug, MessageSquareWarning } from "lucide-react";
import { AcoesErro, AcoesRelato } from "@/components/erros/AcoesInterno";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_SITUACAO, type SituacaoEscritorio } from "@/lib/assinatura";
import { PLANOS } from "@/lib/modulos";

export const metadata: Metadata = { title: "Administrador" };

// Painel de administrador do NorteArq: visão de negócio de todos os escritórios, relatos enviados
// pelo botão "Relatar problema ou sugestão" e erros automáticos capturados pelo próprio sistema.

const quando = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const quandoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const TIPOS: Record<string, string> = { problema: "Problema", sugestao: "Sugestão", duvida: "Dúvida" };

type Relato = { id: string; tipo: string; texto: string; caminho: string | null; situacao: string; criado_em: string; usuario_id: string | null; escritorio: { nome: string } | null };
type Erro = { id: string; origem: string; mensagem: string; caminho: string | null; ocorrencias: number; criado_em: string; ultima_em: string; detalhe: { pilha?: string; rota?: string; tipo?: string; navegador?: string }; escritorio: { nome: string } | null };
type EscritorioBruto = {
  id: string; nome: string; plano: string; plano_escolhido: string | null; periodo: string | null;
  trial_ate: string | null; pago_ate: string | null; assinatura_cancelada_em: string | null; criado_em: string;
};

export default async function AdminPage() {
  const admin = criarClienteAdmin();
  if (!admin) {
    return (
      <div className="pagina-app">
        <h1>Administrador</h1>
        <p className="muted">Configure SUPABASE_SECRET_KEY para ver os relatos e os erros.</p>
      </div>
    );
  }
  const { data: escritoriosBrutos } = await admin
    .from("escritorios")
    .select("id, nome, plano, plano_escolhido, periodo, trial_ate, pago_ate, assinatura_cancelada_em, criado_em")
    .order("criado_em", { ascending: false });
  const escritorios = (escritoriosBrutos ?? []) as EscritorioBruto[];
  const [situacoes, contagemClientes, contagemProjetos] = await Promise.all([
    Promise.all(escritorios.map((e) => admin.rpc("situacao_escritorio", { p_escritorio: e.id }))),
    Promise.all(escritorios.map((e) => admin.from("clientes").select("id", { count: "exact", head: true }).eq("escritorio_id", e.id))),
    Promise.all(escritorios.map((e) => admin.from("projetos").select("id", { count: "exact", head: true }).eq("escritorio_id", e.id).eq("status", "ativo"))),
  ]);
  const linhas = escritorios.map((e, i) => ({
    ...e,
    situacao: ((situacoes[i].data as SituacaoEscritorio | null) ?? "teste") as SituacaoEscritorio,
    clientes: contagemClientes[i].count ?? 0,
    projetosAtivos: contagemProjetos[i].count ?? 0,
  }));
  const pagando = linhas.filter((l) => l.situacao === "ativo" || l.situacao === "tolerancia");
  const emTeste = linhas.filter((l) => l.situacao === "teste").length;
  const parados = linhas.filter((l) => l.situacao === "leitura" || l.situacao === "suspenso").length;
  const mrr = pagando.reduce((soma, l) => soma + (PLANOS.find((p) => p.id === l.plano_escolhido)?.preco ?? 0), 0);
  const totalClientes = linhas.reduce((s, l) => s + l.clientes, 0);
  const totalProjetosAtivos = linhas.reduce((s, l) => s + l.projetosAtivos, 0);

  const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: relatosBrutos }, { data: errosBrutos }] = await Promise.all([
    admin
      .from("relatos")
      .select("id, tipo, texto, caminho, situacao, criado_em, usuario_id, escritorio:escritorios(nome)")
      .neq("situacao", "resolvido")
      .order("criado_em", { ascending: false })
      .limit(100),
    admin
      .from("erros_sistema")
      .select("id, origem, mensagem, caminho, ocorrencias, criado_em, ultima_em, detalhe, escritorio:escritorios(nome)")
      .is("resolvido_em", null)
      .gt("ultima_em", trintaDias)
      .order("ultima_em", { ascending: false })
      .limit(100),
  ]);
  const relatos = (relatosBrutos ?? []) as unknown as Relato[];
  const erros = (errosBrutos ?? []) as unknown as Erro[];

  const ids = [...new Set(relatos.map((r) => r.usuario_id).filter((x): x is string => !!x))];
  const { data: pessoas } = ids.length ? await admin.from("membros").select("id, nome, email").in("id", ids) : { data: [] };
  const pessoa = new Map((pessoas ?? []).map((p) => [p.id as string, p as { nome: string; email: string | null }]));

  return (
    <div className="pagina-app pagina-larga">
      <h1>Administrador</h1>
      <p className="muted">Visão de negócio, relatos e erros de todos os escritórios.</p>

      <section className="cartao secao-config">
        <h2 className="interno-titulo">Visão de negócio</h2>
        <div className="interno-resumo">
          <div className="interno-resumo-item">
            <strong>{escritorios.length}</strong>
            <small>Escritórios no total</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{emTeste}</strong>
            <small>Em teste grátis</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{pagando.length}</strong>
            <small>Pagando</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{parados}</strong>
            <small>Em leitura ou suspensos</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{dinheiro.format(mrr)}</strong>
            <small>Receita mensal estimada</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{totalClientes}</strong>
            <small>Clientes cadastrados</small>
          </div>
          <div className="interno-resumo-item">
            <strong>{totalProjetosAtivos}</strong>
            <small>Projetos ativos</small>
          </div>
        </div>
        {linhas.length === 0 ? (
          <p className="muted">Nenhum escritório cadastrado ainda.</p>
        ) : (
          <div className="tabela-rolagem-app">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Escritório</th>
                  <th>Plano</th>
                  <th>Situação</th>
                  <th>Clientes</th>
                  <th>Projetos ativos</th>
                  <th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const plano = PLANOS.find((p) => p.id === l.plano_escolhido);
                  return (
                    <tr key={l.id}>
                      <td>{l.nome}</td>
                      <td>
                        {plano?.nome ?? "Teste"}
                        {plano && l.periodo === "anual" ? " · anual" : ""}
                      </td>
                      <td>
                        <span className={`selo-status interno-situacao-${l.situacao}`}>{NOME_SITUACAO[l.situacao]}</span>
                      </td>
                      <td>{l.clientes}</td>
                      <td>{l.projetosAtivos}</td>
                      <td>{quandoData.format(new Date(l.criado_em))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cartao secao-config">
        <h2 className="interno-titulo">
          <MessageSquareWarning size={20} aria-hidden="true" /> Relatos dos usuários
          <small className="muted"> · {relatos.length} em aberto</small>
        </h2>
        {relatos.length === 0 ? (
          <p className="muted">Nenhum relato em aberto.</p>
        ) : (
          <ul className="interno-lista">
            {relatos.map((r) => {
              const p = r.usuario_id ? pessoa.get(r.usuario_id) : undefined;
              return (
                <li key={r.id} className={`interno-item interno-${r.situacao}`}>
                  <div className="interno-cabeca">
                    <span className={`selo-status interno-tipo-${r.tipo}`}>{TIPOS[r.tipo] ?? r.tipo}</span>
                    <strong>{p?.nome ?? "Usuário removido"}</strong>
                    <span className="muted">
                      {r.escritorio?.nome ?? "—"} · {quando.format(new Date(r.criado_em))} · {r.caminho}
                    </span>
                  </div>
                  <p className="interno-texto">{r.texto}</p>
                  <AcoesRelato id={r.id} situacao={r.situacao as "novo" | "visto"} email={p?.email ?? null} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cartao secao-config">
        <h2 className="interno-titulo">
          <Bug size={20} aria-hidden="true" /> Erros automáticos (últimos 30 dias)
          <small className="muted"> · {erros.length} em aberto</small>
        </h2>
        {erros.length === 0 ? (
          <p className="muted">Nenhum erro em aberto. 🎉</p>
        ) : (
          <ul className="interno-lista">
            {erros.map((e) => (
              <li key={e.id} className="interno-item">
                <div className="interno-cabeca">
                  <span className="selo-status">{e.origem === "servidor" ? "Servidor" : "Tela"}</span>
                  <strong>{e.caminho ?? "página desconhecida"}</strong>
                  <span className="muted">
                    {e.ocorrencias}× · última {quando.format(new Date(e.ultima_em))} · {e.escritorio?.nome ?? "visitante"}
                  </span>
                </div>
                <p className="interno-texto">{e.mensagem}</p>
                {(e.detalhe?.pilha || e.detalhe?.rota) && (
                  <details className="interno-detalhe">
                    <summary>Detalhes técnicos</summary>
                    <pre>
                      {[e.detalhe.rota && `Rota: ${e.detalhe.rota} (${e.detalhe.tipo})`, e.detalhe.navegador, e.detalhe.pilha]
                        .filter(Boolean)
                        .join("\n")}
                    </pre>
                  </details>
                )}
                <AcoesErro id={e.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
