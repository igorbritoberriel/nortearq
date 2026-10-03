import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { EditarModeloProposta } from "@/components/propostas/EditarModeloProposta";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { COLUNAS_MODELO, TIPOS_PRECO, type ModeloProposta } from "@/lib/modelos-proposta";
import { reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Modelos de proposta" };

export default async function ModelosPropostaPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) return null;

  const [{ data }, servicos] = await Promise.all([
    supabase.from("modelos_proposta").select(COLUNAS_MODELO).order("criado_em"),
    listarServicos(),
  ]);
  const modelos = (data ?? []) as unknown as ModeloProposta[];
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));
  const ativos = servicos.filter((s) => s.ativo).map((s) => ({ id: s.id, nome: s.nome }));

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/propostas" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Propostas
      </Link>
      <h1>Modelos de proposta</h1>
      <p className="muted">
        A proposta nova já começa com o modelo dos serviços do cliente. Cliente de Arquitetura e Interiores recebe os dois
        modelos juntos, numa proposta só.
      </p>

      {modelos.length === 0 ? (
        <div className="cartao vazio">
          <LayoutTemplate size={36} aria-hidden="true" />
          <h2>Nenhum modelo ainda</h2>
          <p className="muted">
            Abra uma proposta bem preenchida e use <strong>Salvar como modelo</strong>, no fim da página.
          </p>
        </div>
      ) : (
        <ul className="modelos-proposta">
          {modelos.map((m) => (
            <li key={m.id} className="cartao secao-config">
              <div className="titulo-com-acao">
                <h2>{m.nome}</h2>
                <span className="muted">
                  {m.preco_tipo === "vazio"
                    ? "Valor em branco"
                    : m.preco_tipo === "fixo"
                      ? `Valor fixo ${reais(Number(m.preco_valor))}`
                      : `${reais(Number(m.preco_valor))} por m²`}
                </span>
              </div>
              <p className="campo-ajuda">
                Serviços no modelo:{" "}
                {(m.itens ?? []).map((i) => `${i.servico} (${i.entregaveis?.length ?? 0} entregáveis)`).join(" · ") || "—"}
                {" · "}
                {m.revisoes_incluidas} revisões · {m.visitas_incluidas} visitas
              </p>
              <details>
                <summary className="tabela-link">Editar nome, serviços e valor</summary>
                <EditarModeloProposta
                  modelo={{ id: m.id, nome: m.nome, servicos: m.servicos, preco_tipo: m.preco_tipo, preco_valor: m.preco_valor }}
                  servicos={ativos}
                />
              </details>
              <p className="campo-ajuda">
                Usado em: {m.servicos.map((id) => nomeServico.get(id)).filter(Boolean).join(", ") || "nenhum serviço"}. Para mudar
                o conteúdo, ajuste uma proposta e use <strong>Salvar como modelo → Substituir “{m.nome}”</strong>.
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="campo-ajuda">Tipos de valor: {Object.values(TIPOS_PRECO).join(" · ")}.</p>
    </div>
  );
}
