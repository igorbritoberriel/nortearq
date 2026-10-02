import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Pagamentos } from "@/components/contratos/Pagamentos";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { EtapaArquiteto, type ArquivoArquiteto, type DecisaoArquiteto } from "@/components/projetos/EtapaArquiteto";
import { NovaEtapa } from "@/components/projetos/NovaEtapa";
import { obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
import { carregarPagamentos } from "@/lib/pagamentos";
import type { StatusEtapa } from "@/lib/projetos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { linkDoProjeto } from "../acoes";

export const metadata: Metadata = { title: "Projeto" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Etapa = { id: string; nome: string; ordem: number; status: StatusEtapa; enviada_em: string | null; aprovada_em: string | null };

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="03" titulo="Projeto" itens={["Ligue o Supabase no .env.local."]} />;
  }
  if (!UUID.test(id)) notFound();

  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, nome, contrato_id, revisoes_incluidas, visitas_incluidas, cliente:clientes(id, nome, telefone)")
    .eq("id", id)
    .maybeSingle();
  if (!projeto) notFound();
  const cliente = projeto.cliente as unknown as { id: string; nome: string; telefone: string | null };

  const [{ data: etapasBrutas }, { data: arquivosBrutos }, { data: usadas }, financeiro] = await Promise.all([
    supabase.from("etapas").select("id, nome, ordem, status, enviada_em, aprovada_em").eq("projeto_id", id).order("ordem").order("id"),
    supabase
      .from("arquivos")
      .select("id, etapa_id, nome, versao, caminho_storage, tamanho_bytes, visivel_cliente, criado_em")
      .eq("projeto_id", id)
      .order("criado_em"),
    supabase.rpc("revisoes_usadas", { p_projeto: id }),
    projeto.contrato_id
      ? carregarPagamentos(supabase, projeto.contrato_id)
      : Promise.resolve({ pagamentos: [], eventos: [] }),
  ]);
  const etapas = (etapasBrutas ?? []) as Etapa[];
  const arquivos = arquivosBrutos ?? [];

  const { data: decisoes } = etapas.length
    ? await supabase
        .from("aprovacoes")
        .select("id, etapa_id, decisao, comentario, decidido_em, ip, conta_revisao, cortesia")
        .in("etapa_id", etapas.map((e) => e.id))
        .order("decidido_em")
    : { data: [] };

  // Endereços temporários para abrir os arquivos (bucket privado).
  const urls: Record<string, string> = {};
  if (arquivos.length) {
    const { data: assinadas } = await supabase.storage
      .from("projetos")
      .createSignedUrls(arquivos.map((a) => a.caminho_storage as string), 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls[a.path] = a.signedUrl;
  }

  // RN-03.10: as revisões são contadas em ordem; as que passam do limite (e não são cortesia) ficam marcadas.
  let contador = 0;
  const historico = (decisoes ?? []).map((d) => {
    const conta = d.conta_revisao && !d.cortesia;
    if (conta) contador += 1;
    return { ...d, excedente: conta && contador > projeto.revisoes_incluidas } as DecisaoArquiteto & { etapa_id: string };
  });

  const revisoesUsadas = (usadas as number | null) ?? 0;
  const aprovadas = etapas.filter((e) => e.status === "aprovada").length;
  const passou = revisoesUsadas > projeto.revisoes_incluidas;

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/projetos" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Projetos
      </Link>
      <div className="titulo-com-acao">
        <div>
          <h1>{projeto.nome}</h1>
          <p className="muted ficha-contato">
            <Link className="tabela-link" href={`/app/clientes/${cliente.id}`}>
              {cliente.nome}
            </Link>
            {projeto.contrato_id && (
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
      </div>

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

      {etapas.map((e, i) => (
        <EtapaArquiteto
          key={e.id}
          projetoId={id}
          etapa={e}
          primeira={i === 0}
          ultima={i === etapas.length - 1}
          arquivos={arquivos
            .filter((a) => a.etapa_id === e.id)
            .map(
              (a): ArquivoArquiteto => ({
                id: a.id,
                nome: a.nome,
                versao: a.versao,
                tamanho_bytes: a.tamanho_bytes,
                visivel_cliente: a.visivel_cliente,
                criado_em: a.criado_em,
                url: urls[a.caminho_storage] ?? null,
              }),
            )}
          historico={historico.filter((h) => h.etapa_id === e.id)}
          cliente={{ nome: cliente.nome, telefone: cliente.telefone, escritorio: sessao.escritorio.nome }}
        />
      ))}
      <NovaEtapa projetoId={id} />

      {financeiro.pagamentos.length > 0 && (
        <section className="cartao secao-config">
          <h2>Pagamentos</h2>
          <Pagamentos
            pagamentos={financeiro.pagamentos}
            eventos={financeiro.eventos}
            souDono={sessao.membro.papel === "dono"}
            hoje={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())}
            site={urlDoSite()}
            cliente={{ nome: cliente.nome, telefone: cliente.telefone }}
            escritorio={sessao.escritorio.nome}
          />
        </section>
      )}
    </div>
  );
}
