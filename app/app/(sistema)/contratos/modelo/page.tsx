import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, CircleCheck } from "lucide-react";
import { EditorContrato, FormDadosContratado } from "@/components/contratos/EditorContrato";
import { previaDoModelo } from "@/lib/contratos";
import { ExcluirModelo, FormConfigModelo, NovoModelo, type ModeloResumo } from "@/components/contratos/ModelosContrato";
import { EmConstrucao } from "@/components/EmConstrucao";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { salvarConfigModelo, salvarDadosContratado, salvarModeloContrato } from "../acoes";

export const metadata: Metadata = { title: "Seu contrato" };

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

  const faltam = [
    !e.documento && "CPF ou CNPJ",
    !e.endereco && "endereço do escritório",
    !e.responsavel && "quem assina",
    !e.registro_profissional && "registro no CAU ou CREA",
  ].filter((x): x is string => !!x);
  const dados = [
    { rotulo: "CPF ou CNPJ", ok: !!e.documento },
    { rotulo: "Endereço do escritório", ok: !!e.endereco },
    { rotulo: "Quem assina", ok: !!e.responsavel },
    { rotulo: "Registro no CAU ou CREA", ok: !!e.registro_profissional },
  ];
  const previa = modelo ? previaDoModelo(modelo.corpo, e) : [];

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/contratos" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Contratos
      </Link>
      <h1>Seu contrato</h1>
      <p className="muted">
        Ele já vem pronto: o sistema preenche sozinho com os dados de cada cliente e da proposta aprovada. Contratos já
        enviados guardam o texto da época.
      </p>

      <div className="contrato-pronto-grade">
        {modelo && (
          <section className="cartao contrato-pronto">
            <div className={`contrato-status ${faltam.length ? "contrato-status-falta" : ""}`}>
              {faltam.length ? <CircleAlert size={24} aria-hidden="true" /> : <CircleCheck size={24} aria-hidden="true" />}
              <div>
                <strong>{faltam.length ? "Quase pronto" : "Pronto para usar"}</strong>
                <p>
                  {faltam.length
                    ? `Falta preencher: ${faltam.join(", ")}. É só uma vez, em "Seus dados no contrato".`
                    : "Você não precisa mexer em nada. O sistema preenche sozinho com os dados de cada cliente."}
                </p>
              </div>
            </div>

            <p className="previa-legenda">
              <span className="previa-amostra" aria-hidden="true" />
              Assim o cliente vai ler <strong>{modelo.nome}</strong>. O que está destacado entra sozinho (aqui com dados de
              exemplo).
            </p>
            <div className="previa-modelo" tabIndex={0} aria-label={`Prévia do contrato ${modelo.nome}`}>
              {previa.map((t, i) =>
                t.automatico ? (
                  <mark key={i} className={t.falta ? "previa-falta" : "previa-auto"}>
                    {t.texto}
                  </mark>
                ) : (
                  <span key={i}>{t.texto}</span>
                ),
              )}
            </div>

            <details className="contrato-personalizar" key={`personalizar-${modelo.id}`}>
              <summary>Quero mudar alguma coisa no texto</summary>
              <p className="contato-alerta">
                O texto pronto é um ponto de partida. Peça para um advogado revisar antes de usar com clientes.
              </p>
              <EditorContrato key={modelo.id} texto={modelo.corpo} salvar={salvarModeloContrato.bind(null, modelo.id)} />
              <div className="contrato-config-modelo">
                <div className="titulo-com-acao">
                  <h2>Nome e serviços deste contrato</h2>
                  {!modelo.padrao && <ExcluirModelo id={modelo.id} nome={modelo.nome} />}
                </div>
                <FormConfigModelo
                  acao={salvarConfigModelo.bind(null, modelo.id, modelo.padrao)}
                  modelo={modelo}
                  servicos={servicos}
                />
              </div>
            </details>
          </section>
        )}

        <div className="contrato-lateral">
          <section className="cartao secao-config">
            <h2>Seus dados no contrato</h2>
            <p className="campo-ajuda">É só isso que você precisa preencher, uma vez. Vale para todos os contratos.</p>
            <ul className="contrato-dados-lista">
              {dados.map((d) => (
                <li key={d.rotulo} className={d.ok ? "" : "contrato-dado-falta"}>
                  {d.ok ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
                  {d.rotulo}
                  {!d.ok && " (falta)"}
                </li>
              ))}
            </ul>
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
            <h2>Tipos de contrato</h2>
            <p className="campo-ajuda">O sistema escolhe sozinho pelo serviço da proposta.</p>
            <nav className="modelos-lista" aria-label="Tipos de contrato">
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
            <p className="campo-rotulo novo-modelo-titulo">Criar outro tipo</p>
            <NovoModelo />
          </section>
        </div>
      </div>
    </div>
  );
}
