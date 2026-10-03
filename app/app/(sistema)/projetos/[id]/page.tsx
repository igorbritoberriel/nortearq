import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Pagamentos } from "@/components/contratos/Pagamentos";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { CapaProjeto, GaleriaRenders } from "@/components/arquivos/GaleriaRenders";
import { MiniaturasPendentes, type Pendente } from "@/components/arquivos/MiniaturasPendentes";
import { ProvedorArquivos } from "@/components/arquivos/ProvedorArquivos";
import { EtapaArquiteto, type DecisaoArquiteto } from "@/components/projetos/EtapaArquiteto";
import { ListaEtapas } from "@/components/projetos/ListaEtapas";
import { Aditivos, AprovacoesExternas } from "@/components/projetos/Aditivos";
import { COLUNAS_ADITIVO, type Aditivo, type AprovacaoExterna } from "@/lib/aditivos";
import { NovaEtapa } from "@/components/projetos/NovaEtapa";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";
import { carregarPagamentos } from "@/lib/pagamentos";
import { assinarCaminhos, formatarEspaco, formatoDe, rendersAtuais, type ArquivoVisivel, type Categoria } from "@/lib/arquivos";
import type { StatusEtapa } from "@/lib/projetos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { baixarArquivo, definirCapa, linkDoProjeto } from "../acoes";

export const metadata: Metadata = { title: "Projeto" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Etapa = { id: string; nome: string; ordem: number; status: StatusEtapa; enviada_em: string | null; aprovada_em: string | null };

export default async function ProjetoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cobrar?: string }>;
}) {
  const { id } = await params;
  const { cobrar } = await searchParams;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="03" titulo="Projeto" itens={["Ligue o Supabase no .env.local."]} />;
  }
  if (!UUID.test(id)) notFound();

  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, nome, contrato_id, capa_arquivo_id, revisoes_incluidas, visitas_incluidas, cliente:clientes(id, nome, telefone)")
    .eq("id", id)
    .maybeSingle();
  if (!projeto) notFound();
  const cliente = projeto.cliente as unknown as { id: string; nome: string; telefone: string | null };

  const [{ data: etapasBrutas }, { data: arquivosBrutos }, { data: usadas }, financeiro, { data: espaco }] = await Promise.all([
    supabase.from("etapas").select("id, nome, ordem, status, enviada_em, aprovada_em").eq("projeto_id", id).order("ordem").order("id"),
    supabase
      .from("arquivos")
      .select(
        "id, etapa_id, nome, versao, caminho_storage, tamanho_bytes, tipo, visivel_cliente, criado_em, categoria, miniatura_caminho, previa_caminho, miniatura_tentada_em",
      )
      .eq("projeto_id", id)
      .order("criado_em"),
    supabase.rpc("revisoes_usadas", { p_projeto: id }),
    projeto.contrato_id
      ? carregarPagamentos(supabase, projeto.contrato_id)
      : Promise.resolve({ pagamentos: [], eventos: [] }),
    supabase.rpc("meu_espaco"),
  ]);
  const etapas = (etapasBrutas ?? []) as Etapa[];
  const arquivos = arquivosBrutos ?? [];

  const { data: decisoes } = etapas.length
    ? await supabase
        .from("aprovacoes")
        .select("id, etapa_id, decisao, comentario, decidido_em, ip, conta_revisao, cortesia, aditivo_id")
        .in("etapa_id", etapas.map((e) => e.id))
        .order("decidido_em")
    : { data: [] };

  // Endereços temporários (bucket privado): original, miniatura e prévia.
  const urls = await assinarCaminhos(
    supabase.storage.from("projetos"),
    arquivos.flatMap((a) => [a.caminho_storage, a.miniatura_caminho, a.previa_caminho]),
  );
  const etapaPorId = new Map(etapas.map((e) => [e.id, e]));
  const todos: ArquivoVisivel[] = arquivos
    .filter((a) => a.etapa_id && etapaPorId.has(a.etapa_id))
    .map((a) => {
      const etapa = etapaPorId.get(a.etapa_id)!;
      return {
        id: a.id,
        nome: a.nome,
        versao: a.versao,
        tipo: a.tipo,
        tamanho: a.tamanho_bytes,
        criado_em: a.criado_em,
        categoria: a.categoria as Categoria,
        etapa_id: etapa.id,
        etapa: etapa.nome,
        url: urls[a.caminho_storage] ?? null,
        miniatura: a.miniatura_caminho ? (urls[a.miniatura_caminho] ?? null) : null,
        previa: a.previa_caminho ? (urls[a.previa_caminho] ?? null) : null,
        visivel: a.visivel_cliente,
        // O cliente vê o que foi criado até o último envio da etapa.
        enviado: !!etapa.enviada_em && new Date(a.criado_em) <= new Date(etapa.enviada_em),
      };
    });

  // Capa: a escolhida (se ainda é render visível) ou o render visível mais recente.
  const renders = rendersAtuais(todos);
  const capa =
    todos.find((a) => a.id === projeto.capa_arquivo_id && a.categoria === "render" && a.visivel) ??
    renders.find((r) => r.visivel) ??
    null;

  // Arquivos antigos sem miniatura (imagem e PDF): o navegador gera uma vez, em segundo plano.
  const dezMinutos = Date.now() - 10 * 60 * 1000;
  const pendentes: Pendente[] = arquivos
    .filter(
      (a) =>
        !a.miniatura_caminho &&
        formatoDe(a.nome, a.tipo) !== "outro" &&
        urls[a.caminho_storage] &&
        (!a.miniatura_tentada_em || new Date(a.miniatura_tentada_em).getTime() < dezMinutos),
    )
    .map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo, caminho: a.caminho_storage, url: urls[a.caminho_storage] }));
  const verValores = pode(sessao.membro.papel, "ver_valores");
  const espacoPlano = espaco as { usado: number; limite: number } | null;
  const pctEspaco = espacoPlano?.limite ? espacoPlano.usado / espacoPlano.limite : 0;

  // RN-03.10: as revisões são contadas em ordem; as que passam do limite (e não são cortesia) ficam marcadas.
  let contador = 0;
  const historico = (decisoes ?? []).map((d) => {
    const conta = d.conta_revisao && !d.cortesia;
    if (conta) contador += 1;
    return { ...d, excedente: conta && contador > projeto.revisoes_incluidas } as DecisaoArquiteto & { etapa_id: string };
  });

  const revisoesUsadas = (usadas as number | null) ?? 0;

  // Aditivos e aprovações externas (RN-03.15 a RN-03.17).
  const [{ data: aditivos }, { data: externas }] = await Promise.all([
    supabase.from("aditivos").select(COLUNAS_ADITIVO).eq("projeto_id", id).neq("status", "cancelado").order("criado_em"),
    supabase
      .from("aprovacoes_externas")
      .select("id, orgao, protocolo, entrada_em, situacao, observacao")
      .eq("projeto_id", id)
      .order("criado_em"),
  ]);
  // "Cobrar como aditivo" numa revisão excedente: abre o formulário já preenchido.
  const excedente = cobrar ? historico.find((h) => h.id === cobrar && h.excedente && !h.aditivo_id) : undefined;
  const revisaoACobrar = excedente
    ? { aprovacaoId: excedente.id, etapa: etapas.find((e) => e.id === excedente.etapa_id)?.nome ?? "" }
    : null;
  const aprovadas = etapas.filter((e) => e.status === "aprovada").length;
  const passou = revisoesUsadas > projeto.revisoes_incluidas;

  return (
    <ProvedorArquivos todos={todos} baixar={baixarArquivo.bind(null, id)}>
    <div className="pagina-app pagina-larga">
      <MiniaturasPendentes projetoId={id} pendentes={pendentes} />
      <Link href="/app/projetos" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Projetos
      </Link>
      <div className="titulo-com-acao projeto-cabecalho">
        <CapaProjeto nome={projeto.nome} capa={capa} lista={renders.length ? renders : capa ? [capa] : []} />
        <div>
          <h1>{projeto.nome}</h1>
          <p className="muted ficha-contato">
            <Link className="tabela-link" href={`/app/clientes/${cliente.id}`}>
              {cliente.nome}
            </Link>
            {projeto.contrato_id && verValores && (
              <Link className="tabela-link" href={`/app/contratos/${projeto.contrato_id}`}>
                Contrato
              </Link>
            )}
          </p>
        </div>
      </div>

      {/* RN-03.9: o contador fica visível para os dois lados. */}
      <div className="projeto-resumo">
        <div className="cartao">
          <span className="muted">Etapas aprovadas</span>
          <strong>
            {aprovadas} de {etapas.length}
          </strong>
        </div>
        <div className={`cartao ${passou ? "projeto-alerta" : ""}`}>
          <span className="muted">Revisões usadas</span>
          <strong>
            {revisoesUsadas} de {projeto.revisoes_incluidas}
          </strong>
        </div>
        <div className="cartao">
          <span className="muted">Visitas incluídas</span>
          <strong>{projeto.visitas_incluidas}</strong>
        </div>
        {espacoPlano && (
          <div className={`cartao ${pctEspaco >= 0.8 ? "projeto-alerta" : ""}`}>
            <span className="muted">Espaço do plano</span>
            <strong>
              {formatarEspaco(espacoPlano.usado)} de {formatarEspaco(espacoPlano.limite)}
            </strong>
            <span className="medidor" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.round(pctEspaco * 100))}%` }} />
            </span>
            {pctEspaco >= 0.8 && (
              <small className="campo-ajuda">
                {pctEspaco >= 1 ? "O espaço acabou: apague arquivos ou" : "Quase cheio. Se precisar,"}{" "}
                <Link className="tabela-link" href="/app/assinatura">
                  mude de plano
                </Link>
                .
              </small>
            )}
          </div>
        )}
      </div>

      <GaleriaRenders
        renders={renders}
        capaId={capa?.id ?? null}
        escolhidaId={projeto.capa_arquivo_id}
        definirCapa={definirCapa.bind(null, id)}
      />

      <section className="cartao secao-config">
        <h2>Link do cliente</h2>
        <p className="muted">
          O cliente acompanha as etapas e baixa os arquivos visíveis por este link. Ao enviar uma etapa para aprovação, o link
          já vai junto.
        </p>
        <EnviarLinkAcao
          acao={linkDoProjeto.bind(null, id)}
          destino="projeto"
          telefone={cliente.telefone}
          cliente={cliente.nome}
          escritorio={sessao.escritorio.nome}
          rotulo="Gerar link do projeto"
        />
      </section>

      <ListaEtapas
        projetoId={id}
        itens={etapas.map((e) => ({
          id: e.id,
          status: e.status,
          conteudo: (
            <EtapaArquiteto
              projetoId={id}
              etapa={e}
              arquivos={todos.filter((a) => a.etapa_id === e.id)}
              historico={historico.filter((h) => h.etapa_id === e.id)}
              podeCobrar={pode(sessao.membro.papel, "gerir_aditivos")}
              cliente={{ nome: cliente.nome, telefone: cliente.telefone, escritorio: sessao.escritorio.nome }}
            />
          ),
        }))}
      />
      <NovaEtapa projetoId={id} />

      {verValores && (
      <Aditivos
        projetoId={id}
        aditivos={(aditivos ?? []) as Aditivo[]}
        cobrar={revisaoACobrar}
        cliente={{ nome: cliente.nome, telefone: cliente.telefone, escritorio: sessao.escritorio.nome }}
        temContrato={!!projeto.contrato_id}
      />
      )}
      <AprovacoesExternas projetoId={id} itens={(externas ?? []) as AprovacaoExterna[]} />

      {verValores && financeiro.pagamentos.length > 0 && (
        <section className="cartao secao-config">
          <h2>Pagamentos</h2>
          <Pagamentos
            pagamentos={financeiro.pagamentos}
            eventos={financeiro.eventos}
            souDono={pode(sessao.membro.papel, "estornar_pagamento")}
            hoje={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())}
            site={urlDoSite()}
            cliente={{ nome: cliente.nome, telefone: cliente.telefone }}
            escritorio={sessao.escritorio.nome}
          />
        </section>
      )}
    </div>
    </ProvedorArquivos>
  );
}
