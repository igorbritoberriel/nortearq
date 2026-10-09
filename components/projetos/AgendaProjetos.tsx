import Link from "next/link";
import { dataCurta } from "@/lib/propostas";
import { responsavelEtapa, type StatusEtapa } from "@/lib/projetos";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function AgendaProjetos({ supabase }: { supabase: SupabaseClient }) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const fim = new Date(`${hoje}T12:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const { data, error } = await supabase.from("etapas")
    .select("id, nome, prazo, status, projeto:projetos!inner(id, nome, status, cliente:clientes(nome))")
    .eq("projeto.status", "ativo").neq("status", "aprovada")
    .lte("prazo", fim.toISOString().slice(0, 10)).order("prazo").order("id").limit(101);
  const itens = (data ?? []) as unknown as { id: string; nome: string; prazo: string; status: StatusEtapa; projeto: { id: string; nome: string; cliente: { nome: string } | null } }[];
  return <section className="cartao secao-config agenda-projetos">
    <h2>Agenda de entregas</h2>
    <p className="muted">Etapas em atraso e previstas para os próximos 7 dias. Projetos pausados ou finalizados ficam fora da agenda.</p>
    {error ? <p role="alert">Não foi possível carregar os prazos. Tente novamente.</p> : !itens.length ? <p className="campo-ajuda">Nenhuma entrega prevista neste período. Defina as datas dentro de cada projeto.</p> :
      <ul className="agenda-lista">{itens.slice(0, 100).map(e => <li key={e.id}>
        <span className={e.prazo < hoje ? "campo-erro" : "campo-ajuda"}>{dataCurta(e.prazo)} · {e.prazo < hoje ? "Em atraso" : e.prazo === hoje ? "Hoje" : "Planejada"}</span>
        <Link className="tabela-link" href={`/app/projetos/${e.projeto.id}#etapa-${e.id}`}>{e.projeto.nome} · {e.nome}</Link>
        <small className="muted">{e.projeto.cliente?.nome} · Próxima ação: {responsavelEtapa(e.status)}</small>
      </li>)}</ul>}
    {itens.length > 100 && <p className="campo-ajuda">Mostrando as 100 primeiras entregas. Consulte os demais prazos dentro dos projetos.</p>}
  </section>;
}
