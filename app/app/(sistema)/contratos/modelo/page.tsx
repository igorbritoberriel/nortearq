import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditorContrato, FormDadosContratado } from "@/components/contratos/EditorContrato";
import { ExcluirModelo, FormConfigModelo, NovoModelo, type ModeloResumo } from "@/components/contratos/ModelosContrato";
import { EmConstrucao } from "@/components/EmConstrucao";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { salvarConfigModelo, salvarDadosContratado, salvarModeloContrato } from "../acoes";

export const metadata: Metadata = { title: "Modelos de contrato" };

export default async function ModeloContratoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="01" titulo="Modelo de contrato" itens={["Ligue o Supabase no .env.local."]} />;
  }

  // Primeiro acesso: o escritório ganha o modelo padrão.
  await supabase.rpc("garantir_modelo_contrato");
  const [{ data }, servicos] = await Promise.all([
    supabase
      .from("modelos_contrato")
      .select("id, nome, padrao, servicos, corpo")
      .order("padrao", { ascending: false })
      .order("criado_em"),
    listarServicos(),
  ]);
  const modelos = (data ?? []) as (ModeloResumo & { corpo: string })[];
  const pedido = (await searchParams).id;
  const modelo = modelos.find((m) => m.id === pedido) ?? modelos[0];
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));
  const e = sessao.escritorio;

  const descricao = (m: ModeloResumo) =>
    m.padrao ? "Todos os outros serviços" : m.servicos.map((id) => nomeServico.get(id)).filter(Boolean).join(", ") || "Nenhum serviço marcado";

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/contratos" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Contratos
      </Link>
      <h1>Modelos de contrato</h1>
      <p className="muted">
        Tenha um modelo para cada tipo de projeto. Quando o cliente aprova a proposta, o contrato sai do modelo certo pelos
        serviços dela. Contratos já gerados guardam o texto da época.
      </p>

      <section className="cartao secao-config">
        <h2>Dados do escritório no contrato</h2>
        <p className="campo-ajuda">Valem para todos os modelos.</p>
        <FormDadosContratado
          acao={salvarDadosContratado}
          dados={{
            documento: e.documento,
            endereco: e.endereco,
            responsavel: e.responsavel,
            registro_profissional: e.registro_profissional,
          }}
        />
      </section>

      <section className="cartao secao-config">
        <h2>Seus modelos</h2>
        <nav className="modelos-lista" aria-label="Modelos de contrato">
          {modelos.map((m) => (
            <Link
              key={m.id}
              href={`/app/contratos/modelo?id=${m.id}`}
              className={m.id === modelo?.id ? "ativo" : ""}
              aria-current={m.id === modelo?.id ? "page" : undefined}
            >
              <strong>
                {m.nome}
                {m.padrao && <span className="selo-status">Padrão</span>}
              </strong>
              <small>{descricao(m)}</small>
            </Link>
          ))}
        </nav>
        <p className="campo-rotulo novo-modelo-titulo">Criar outro modelo</p>
        <NovoModelo />
      </section>

      {modelo && (
        <>
          <section className="cartao secao-config" key={`config-${modelo.id}`}>
            <div className="titulo-com-acao">
              <h2>{modelo.nome}</h2>
              {!modelo.padrao && <ExcluirModelo id={modelo.id} nome={modelo.nome} />}
            </div>
            <FormConfigModelo
              acao={salvarConfigModelo.bind(null, modelo.id, modelo.padrao)}
              modelo={modelo}
              servicos={servicos}
            />
          </section>

          <section className="cartao secao-config">
            <h2>Texto: {modelo.nome}</h2>
            <p className="contato-alerta">
              O texto pronto é um ponto de partida. Peça para um advogado revisar antes de usar com clientes.
            </p>
            <EditorContrato key={modelo.id} texto={modelo.corpo} salvar={salvarModeloContrato.bind(null, modelo.id)} />
          </section>
        </>
      )}
    </div>
  );
}
