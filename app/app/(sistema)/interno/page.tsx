import type { Metadata } from "next";
import { Bug, MessageSquareWarning } from "lucide-react";
import { AcoesErro, AcoesRelato } from "@/components/erros/AcoesInterno";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Painel interno" };

// Painel interno do NorteArq (só administradores do NorteArq; o layout confere):
// relatos enviados pelo botão "Relatar problema ou sugestão" e erros automáticos de todos os escritórios.

const quando = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const TIPOS: Record<string, string> = { problema: "Problema", sugestao: "Sugestão", duvida: "Dúvida" };

type Relato = { id: string; tipo: string; texto: string; caminho: string | null; situacao: string; criado_em: string; usuario_id: string | null; escritorio: { nome: string } | null };
type Erro = { id: string; origem: string; mensagem: string; caminho: string | null; ocorrencias: number; criado_em: string; ultima_em: string; detalhe: { pilha?: string; rota?: string; tipo?: string; navegador?: string }; escritorio: { nome: string } | null };

export default async function InternoPage() {
  const admin = criarClienteAdmin();
  if (!admin) {
    return (
      <div className="pagina-app">
        <h1>Painel interno</h1>
        <p className="muted">Configure SUPABASE_SECRET_KEY para ver os relatos e os erros.</p>
      </div>
    );
  }
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
      <h1>Painel interno</h1>
      <p className="muted">Só você vê esta página. Relatos e erros de todos os escritórios, do mais recente para o mais antigo.</p>

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
