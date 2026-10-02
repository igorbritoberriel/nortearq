import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import {
  MOTIVOS_RECUSA,
  STATUS_PROPOSTA,
  reais,
  statusVisivel,
  type MotivoRecusa,
  type StatusProposta,
} from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Propostas" };

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

type Linha = {
  id: string;
  versao: number;
  status: StatusProposta;
  valor_total: number | null;
  validade_ate: string | null;
  motivo_recusa: MotivoRecusa | null;
  atualizado_em: string;
  cliente: { nome: string } | null;
};

export default async function PropostasPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="01"
        titulo="Propostas"
        descricao="Ligue o Supabase no .env.local para ver as propostas."
        itens={["Lista com status", "Motivos de recusa agrupados", "Nova proposta a partir de um cliente"]}
      />
    );
  }

  // Versões substituídas ficam só no histórico de cada proposta.
  const { data: linhas, error } = await supabase
    .from("propostas")
    .select("id, versao, status, valor_total, validade_ate, motivo_recusa, atualizado_em, cliente:clientes(nome)")
    .neq("status", "substituida")
    .order("atualizado_em", { ascending: false })
    .limit(300);
  if (error) console.error("[propostas]", error.message);
  const propostas = (linhas ?? []) as unknown as Linha[];

  // RN-01.11: onde o escritório perde clientes.
  const recusadas = propostas.filter((p) => p.status === "recusada" && p.motivo_recusa);
  const motivos = Object.entries(
    recusadas.reduce<Record<string, number>>((conta, p) => ({ ...conta, [p.motivo_recusa!]: (conta[p.motivo_recusa!] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const aprovadas = propostas.filter((p) => p.status === "aprovada").length;
  const respondidas = aprovadas + recusadas.length;

  return (
    <div className="pagina-app pagina-larga">
      <h1>Propostas</h1>
      <p className="muted">Para criar uma proposta, abra a ficha do cliente e use “Nova proposta”.</p>

      {propostas.length === 0 ? (
        <div className="cartao vazio">
          <FileSignature size={36} aria-hidden="true" />
          <h2>Nenhuma proposta ainda</h2>
          <Link className="botao botao-primario" href="/app/clientes">
            Ir para clientes
          </Link>
        </div>
      ) : (
        <>
          {respondidas > 0 && (
            <section className="cartao secao-config">
              <h2>Resultado</h2>
              <p>
                <strong>{Math.round((aprovadas / respondidas) * 100)}%</strong> de aprovação ({aprovadas} de {respondidas}{" "}
                propostas respondidas).
              </p>
              {motivos.length > 0 && (
                <>
                  <h3 className="perfil-sub">Por que os clientes recusaram</h3>
                  <ul className="perfil-barras">
                    {motivos.map(([motivo, n]) => (
                      <li key={motivo}>
                        <span>{MOTIVOS_RECUSA[motivo as MotivoRecusa]}</span>
                        <span className="perfil-barra" aria-hidden="true">
                          <span style={{ width: `${(n / recusadas.length) * 100}%` }} />
                        </span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <div className="cartao tabela-cartao tabela-rolagem-app">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Situação</th>
                  <th>Valor</th>
                  <th>Atualizada</th>
                </tr>
              </thead>
              <tbody>
                {propostas.map((p) => {
                  const status = statusVisivel(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link className="tabela-link" href={`/app/propostas/${p.id}`}>
                          {p.cliente?.nome ?? "Cliente"}
                        </Link>
                        {p.versao > 1 && <small className="muted">Versão {p.versao}</small>}
                      </td>
                      <td>
                        <span className={`selo-status selo-proposta-${status}`}>{STATUS_PROPOSTA[status]}</span>
                      </td>
                      <td>{reais(p.valor_total)}</td>
                      <td>{data.format(new Date(p.atualizado_em))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
