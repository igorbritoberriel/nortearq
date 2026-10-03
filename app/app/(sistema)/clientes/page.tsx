import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { ETAPAS_CLIENTE, type Cliente, type EtapaCliente } from "@/lib/clientes";
import { formatarWhatsapp } from "@/lib/contatos";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes" };

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; etapa?: string; arquivados?: string }>;
}) {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();

  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="00"
        titulo="Clientes"
        descricao="Ligue o Supabase no .env.local para ver os clientes."
        itens={["Lista de clientes com a etapa atual", "Busca e filtros", "Novo cliente", "Ficha do cliente"]}
      />
    );
  }

  const { q, etapa, arquivados } = await searchParams;
  const verArquivados = arquivados === "1";
  const busca = (q ?? "").trim().slice(0, 80);
  const etapaValida = etapa && etapa in ETAPAS_CLIENTE ? (etapa as EtapaCliente) : null;

  let consulta = supabase
    .from("clientes")
    .select("id, nome, telefone, email, etapa, servicos, criado_em, arquivado_em")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (etapaValida) consulta = consulta.eq("etapa", etapaValida);
  // Arquivados (0026) ficam fora da lista, a não ser que o filtro peça.
  consulta = verArquivados ? consulta.not("arquivado_em", "is", null) : consulta.is("arquivado_em", null);
  if (busca) {
    // Vírgula e parênteses quebram o filtro "or" do Supabase: ficam de fora da busca.
    const termo = busca.replace(/[,()%*\\]/g, " ");
    consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo.replace(/\D/g, "") || termo}%`);
  }

  const [{ data: linhas, error }, servicos] = await Promise.all([consulta, listarServicos()]);
  if (error) console.error("[clientes]", error.message);
  const clientes = (linhas ?? []) as Pick<Cliente, "id" | "nome" | "telefone" | "email" | "etapa" | "servicos" | "criado_em">[];
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));

  return (
    <div className="pagina-app pagina-larga">
      <div className="titulo-com-acao">
        <h1>Clientes</h1>
        <Link className="botao botao-primario" href="/app/clientes/novo">
          <Plus size={18} aria-hidden="true" />
          Novo cliente
        </Link>
      </div>

      <form className="filtros" role="search">
        <label className="filtros-busca">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar cliente</span>
          <input name="q" type="search" placeholder="Buscar por nome, e-mail ou telefone" defaultValue={busca} />
        </label>
        <label>
          <span className="sr-only">Etapa</span>
          <select name="etapa" defaultValue={etapaValida ?? ""}>
            <option value="">Todas as etapas</option>
            {Object.entries(ETAPAS_CLIENTE).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="checagem filtro-arquivados">
          <input type="checkbox" name="arquivados" value="1" defaultChecked={verArquivados} />
          <span>Só arquivados</span>
        </label>
        <button className="botao botao-secundario" type="submit">
          Filtrar
        </button>
      </form>

      {clientes.length === 0 ? (
        <div className="cartao vazio">
          <Users size={36} aria-hidden="true" />
          {busca || etapaValida || verArquivados ? (
            <p className="muted">Nenhum cliente encontrado com esse filtro.</p>
          ) : (
            <>
              <h2>Nenhum cliente ainda</h2>
              <p className="muted">
                Em Contatos, clique em <strong>Virar cliente</strong> num pedido de orçamento. Ou cadastre alguém que chegou
                por outro caminho.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="tabela-rolagem-app cartao tabela-cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Etapa</th>
                <th scope="col">Serviços</th>
                <th scope="col">Desde</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/clientes/${c.id}`} className="tabela-link">
                      {c.nome}
                    </Link>
                    <small className="muted">{formatarWhatsapp(c.telefone) ?? c.email ?? ""}</small>
                  </td>
                  <td>
                    <span className={`selo-status selo-etapa-${c.etapa}`}>{ETAPAS_CLIENTE[c.etapa]}</span>
                  </td>
                  <td>{c.servicos.map((id) => nomeServico.get(id)).filter(Boolean).join(", ") || "—"}</td>
                  <td>
                    <time dateTime={c.criado_em}>{data.format(new Date(c.criado_em))}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
