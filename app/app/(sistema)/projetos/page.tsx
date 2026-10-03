import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { assinarCaminhos } from "@/lib/arquivos";
import { STATUS_ETAPA, type StatusEtapa } from "@/lib/projetos";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projetos" };

type Linha = {
  id: string;
  nome: string;
  status: string;
  revisoes_incluidas: number;
  atualizado_em: string;
  cliente: { nome: string } | null;
  etapas: { nome: string; ordem: number; status: StatusEtapa }[];
};

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function ProjetosPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="03"
        titulo="Projetos"
        descricao="Ligue o Supabase no .env.local para ver os projetos."
        itens={["Etapas e aprovações", "Arquivos com versões", "Contador de revisões"]}
      />
    );
  }

  const { data: linhas, error } = await supabase
    .from("projetos")
    .select("id, nome, status, revisoes_incluidas, atualizado_em, cliente:clientes(nome), etapas(nome, ordem, status)")
    .order("atualizado_em", { ascending: false })
    .limit(200);
  if (error) console.error("[projetos]", error.message);
  const projetos = (linhas ?? []) as unknown as Linha[];

  // Capa de cada projeto (render escolhido ou o mais recente): só a miniatura, para a lista carregar rápido.
  const { data: capasBrutas } = projetos.length
    ? await supabase.rpc("capas_dos_projetos", { p_projetos: projetos.map((p) => p.id) })
    : { data: [] };
  const capas = (capasBrutas ?? []) as { projeto_id: string; miniatura: string | null; caminho: string }[];
  const urls = await assinarCaminhos(
    supabase.storage.from("projetos"),
    capas.map((c) => c.miniatura ?? c.caminho),
  );
  const capaDe = new Map(capas.map((c) => [c.projeto_id, urls[c.miniatura ?? c.caminho] ?? null]));

  return (
    <div className="pagina-app pagina-larga">
      <h1>Projetos</h1>
      <p className="muted">Cada contrato assinado vira um projeto com as etapas padrão.</p>

      {projetos.length === 0 ? (
        <div className="cartao vazio">
          <FolderKanban size={36} aria-hidden="true" />
          <h2>Nenhum projeto ainda</h2>
          <p className="muted">O projeto aparece aqui quando o cliente assina o contrato.</p>
          <Link className="botao botao-primario" href="/app/contratos">
            Ir para contratos
          </Link>
        </div>
      ) : (
        <div className="cartao tabela-cartao tabela-rolagem-app">
          <table className="tabela">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Etapa atual</th>
                <th>Progresso</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {projetos.map((p) => {
                const etapas = [...p.etapas].sort((a, b) => a.ordem - b.ordem);
                const atual = etapas.find((e) => e.status !== "aprovada");
                const aprovadas = etapas.length - etapas.filter((e) => e.status !== "aprovada").length;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="projeto-linha">
                        {capaDe.get(p.id) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="projeto-miniatura" src={capaDe.get(p.id)!} alt="" loading="lazy" />
                        ) : (
                          <span className="projeto-miniatura projeto-miniatura-vazia" aria-hidden="true">
                            {p.nome.trim()[0]?.toUpperCase()}
                          </span>
                        )}
                        <span>
                          <Link className="tabela-link" href={`/app/projetos/${p.id}`}>
                            {p.nome}
                          </Link>
                          <small className="muted">{p.cliente?.nome}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      {atual ? (
                        <>
                          {atual.nome}
                          <small>
                            <span className={`selo-status selo-etapa-status-${atual.status}`}>{STATUS_ETAPA[atual.status]}</span>
                          </small>
                        </>
                      ) : (
                        "Todas aprovadas"
                      )}
                    </td>
                    <td>
                      {aprovadas} de {etapas.length}
                    </td>
                    <td>{data.format(new Date(p.atualizado_em))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
