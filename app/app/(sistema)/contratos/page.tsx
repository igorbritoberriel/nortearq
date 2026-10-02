import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature, Settings2 } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { STATUS_CONTRATO, type StatusContrato } from "@/lib/contratos";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contratos" };

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

type Linha = {
  id: string;
  status: StatusContrato;
  assinado_em: string | null;
  atualizado_em: string;
  cliente: { nome: string } | null;
  proposta: { valor_total: number | null } | null;
  pagamentos: { valor: number; pago_em: string | null }[];
};

export default async function ContratosPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="01"
        titulo="Contratos"
        descricao="Ligue o Supabase no .env.local para ver os contratos."
        itens={["Contrato gerado da proposta aprovada", "Aceite eletrônico", "Pagamentos"]}
      />
    );
  }

  const { data: linhas, error } = await supabase
    .from("contratos")
    .select("id, status, assinado_em, atualizado_em, cliente:clientes(nome), proposta:propostas(valor_total), pagamentos(valor, pago_em)")
    .order("atualizado_em", { ascending: false })
    .limit(300);
  if (error) console.error("[contratos]", error.message);
  const contratos = (linhas ?? []) as unknown as Linha[];
  const e = sessao.escritorio;
  const faltamDados = !e.documento || !e.endereco || !e.responsavel;

  return (
    <div className="pagina-app pagina-larga">
      <div className="titulo-com-acao">
        <div>
          <h1>Contratos</h1>
          <p className="muted">Gerados da proposta aprovada. O cliente confere os dados e aceita pelo link.</p>
        </div>
        <Link className="botao botao-secundario" href="/app/contratos/modelo">
          <Settings2 size={18} aria-hidden="true" />
          Modelo e dados do escritório
        </Link>
      </div>

      {faltamDados && (
        <Link href="/app/contratos/modelo" className="cartao pendencia">
          <span>Preencha o CPF/CNPJ, o endereço e quem assina pelo escritório: eles entram no contrato.</span>
        </Link>
      )}

      {contratos.length === 0 ? (
        <div className="cartao vazio">
          <FileSignature size={36} aria-hidden="true" />
          <h2>Nenhum contrato ainda</h2>
          <p className="muted">Quando o cliente aprovar uma proposta, use “Gerar contrato” na própria proposta.</p>
          <Link className="botao botao-primario" href="/app/propostas">
            Ir para propostas
          </Link>
        </div>
      ) : (
        <div className="cartao tabela-cartao tabela-rolagem-app">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Situação</th>
                <th>Valor</th>
                <th>Recebido</th>
                <th>Assinado em</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const recebido = c.pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + Number(p.valor), 0);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="tabela-link" href={`/app/contratos/${c.id}`}>
                        {c.cliente?.nome ?? "Cliente"}
                      </Link>
                    </td>
                    <td>
                      <span className={`selo-status selo-contrato-${c.status}`}>{STATUS_CONTRATO[c.status]}</span>
                    </td>
                    <td>{reais(c.proposta?.valor_total)}</td>
                    <td>{c.status === "assinado" ? reais(recebido) : "—"}</td>
                    <td>{c.assinado_em ? data.format(new Date(c.assinado_em)) : "—"}</td>
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
