import type { Metadata } from "next";
import Link from "next/link";
import { BuscaPorCliente, termoDaBusca } from "@/components/BuscaPorCliente";
import { ClipboardList, Settings2 } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { ESTILOS, STATUS_BRIEFING, type Estilo, type StatusBriefing } from "@/lib/briefing";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Briefings" };

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

type LinhaBriefing = {
  id: string;
  status: StatusBriefing;
  estilos_principais: Estilo[];
  atualizado_em: string;
  respondido_em: string | null;
  cliente: { id: string; nome: string } | null;
};

export default async function BriefingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();

  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="02"
        titulo="Briefings"
        descricao="Ligue o Supabase no .env.local para ver os briefings."
        itens={["Briefings por cliente e status", "Perfil do Cliente em PDF", "Validar o programa de necessidades"]}
      />
    );
  }

  const busca = termoDaBusca((await searchParams).q);
  const colunas = "id, status, estilos_principais, atualizado_em, respondido_em, cliente:clientes(id, nome)";
  let base = supabase
    .from("briefings")
    .select(busca ? colunas.replace("cliente:clientes(", "cliente:clientes!inner(") : colunas);
  if (busca) base = base.ilike("cliente.nome", `%${busca}%`);
  const { data: linhas, error } = await base
    .order("atualizado_em", { ascending: false })
    .limit(200);
  if (error) console.error("[briefings]", error.message);
  const briefings = (linhas ?? []) as unknown as LinhaBriefing[];

  return (
    <div className="pagina-app pagina-larga">
      <div className="titulo-com-acao">
        <div>
          <h1>Briefings</h1>
          <p className="muted">O que cada cliente respondeu, com o estilo e as referências.</p>
        </div>
        {pode(sessao.membro.papel, "configurar_escritorio") && (
          <Link className="botao botao-secundario" href="/app/briefings/editor">
            <Settings2 size={18} aria-hidden="true" />
            Editar perguntas e imagens
          </Link>
        )}
      </div>

      <BuscaPorCliente busca={busca} limpar="/app/briefings" />
      {busca && briefings.length === 0 ? (
        <p className="muted">Nenhum briefing de cliente com “{busca}” no nome.</p>
      ) : briefings.length === 0 ? (
        <div className="cartao vazio">
          <ClipboardList size={36} aria-hidden="true" />
          <h2>Nenhum briefing enviado ainda</h2>
          <p className="muted">
            Abra a ficha de um cliente e use <strong>Gerar link e enviar no WhatsApp</strong> no bloco Briefing.
          </p>
          <Link className="botao botao-primario" href="/app/clientes">
            Ir para clientes
          </Link>
        </div>
      ) : (
        <div className="cartao tabela-cartao tabela-rolagem-app">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Situação</th>
                <th>Estilo</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {briefings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link className="tabela-link" href={`/app/briefings/${b.id}`}>
                      {b.cliente?.nome ?? "Cliente"}
                    </Link>
                  </td>
                  <td>
                    <span className={`selo-status selo-briefing-${b.status}`}>{STATUS_BRIEFING[b.status]}</span>
                  </td>
                  <td>{b.estilos_principais.map((e) => ESTILOS[e] ?? e).join(" e ") || "—"}</td>
                  <td>{data.format(new Date(b.atualizado_em))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
