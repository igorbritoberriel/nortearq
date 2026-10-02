import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus2, MessageCircle } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLink, FormCliente } from "@/components/clientes/FormCliente";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { STATUS_BRIEFING, type StatusBriefing } from "@/lib/briefing";
import { STATUS_CONTRATO, type StatusContrato } from "@/lib/contratos";
import { STATUS_PROPOSTA, reais, statusVisivel, type StatusProposta } from "@/lib/propostas";
import { DESTINOS_LINK, ETAPAS_CLIENTE, type Cliente, type LinkCliente } from "@/lib/clientes";
import { formatarReais, formatarWhatsapp, linkWhatsapp, type Contato } from "@/lib/contatos";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarProposta } from "../../propostas/acoes";
import { linkDoProjeto } from "../../projetos/acoes";
import { salvarCliente } from "../acoes";

export const metadata: Metadata = { title: "Ficha do cliente" };

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();

  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="00"
        titulo="Ficha do cliente"
        descricao="Ligue o Supabase no .env.local para ver a ficha."
        itens={["Dados do cliente", "Linha do tempo", "Links por WhatsApp", "Acesso ao portal"]}
      />
    );
  }
  if (!UUID.test(id)) notFound();

  const { data: linha } = await supabase
    .from("clientes")
    .select("id, nome, documento, telefone, email, endereco_imovel, servicos, observacoes, etapa, contato_id, usuario_id, criado_em")
    .eq("id", id)
    .maybeSingle();
  if (!linha) notFound();
  const cliente = linha as Cliente;

  const [servicos, { data: links }, { data: contato }, { data: briefing }, { data: listaPropostas }, { data: listaContratos }, { data: projetoDoCliente }] =
    await Promise.all([
    listarServicos(),
    supabase
      .from("links_cliente")
      .select("token, destino, criado_em, expira_em, usado_em")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false }),
    cliente.contato_id
      ? supabase
          .from("contatos")
          .select("orcamento_disponivel, prazo_desejado, area_m2, localizacao, mensagem, criado_em")
          .eq("id", cliente.contato_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("briefings")
      .select("id, status, respondido_em")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("propostas")
      .select("id, versao, status, valor_total, validade_ate, respondida_em")
      .eq("cliente_id", id)
      .neq("status", "substituida")
      .order("criado_em", { ascending: false }),
    supabase
      .from("contratos")
      .select("id, status, assinado_em")
      .eq("cliente_id", id)
      .neq("status", "cancelado")
      .order("criado_em", { ascending: false }),
    supabase.from("projetos").select("id").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const contratos = (listaContratos ?? []) as { id: string; status: StatusContrato; assinado_em: string | null }[];
  const propostas = (listaPropostas ?? []) as {
    id: string;
    versao: number;
    status: StatusProposta;
    valor_total: number | null;
    validade_ate: string | null;
    respondida_em: string | null;
  }[];

  const historicoLinks = (links ?? []) as LinkCliente[];
  const pedido = contato as Pick<
    Contato,
    "orcamento_disponivel" | "prazo_desejado" | "area_m2" | "localizacao" | "mensagem" | "criado_em"
  > | null;
  const agora = Date.now();
  const linkAtivo = (destino: string) =>
    historicoLinks.some((l) => l.destino === destino && new Date(l.expira_em).getTime() > agora);

  // Linha do tempo (mais recente primeiro).
  const eventos = [
    ...(pedido ? [{ quando: pedido.criado_em, texto: "Pediu orçamento pelo seu formulário" }] : []),
    { quando: cliente.criado_em, texto: pedido ? "Virou cliente" : "Cadastrado manualmente" },
    ...(briefing?.respondido_em ? [{ quando: briefing.respondido_em as string, texto: "Respondeu o briefing" }] : []),
    ...contratos.filter((c) => c.assinado_em).map((c) => ({ quando: c.assinado_em as string, texto: "Assinou o contrato" })),
    ...historicoLinks.map((l) => ({
      quando: l.criado_em,
      texto: `Link de ${DESTINOS_LINK[l.destino].rotulo.toLowerCase()} gerado${
        l.usado_em ? " · aberto pelo cliente" : new Date(l.expira_em).getTime() > agora ? " · ativo" : " · desativado"
      }`,
    })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  const acaoSalvar = salvarCliente.bind(null, cliente.id);

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/clientes" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>
      <div className="titulo-com-acao">
        <div>
          <h1>{cliente.nome}</h1>
          <p className="muted ficha-contato">
            <span className={`selo-status selo-etapa-${cliente.etapa}`}>{ETAPAS_CLIENTE[cliente.etapa]}</span>
            {[formatarWhatsapp(cliente.telefone), cliente.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        {cliente.telefone && (
          <a
            className="botao botao-secundario"
            href={linkWhatsapp(cliente.telefone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Abrir conversa
          </a>
        )}
      </div>

      <div className="ficha">
        <div className="ficha-principal">
          <section className="cartao secao-config">
            <h2>Enviar para o cliente</h2>
            <p className="muted">
              O cliente abre pelo celular, sem login e sem instalar nada. Cada link é único, só mostra os dados dele e
              vale 30 dias.
            </p>
            <div className="ficha-link">
              <div>
                <strong>Briefing</strong>
                <p className="campo-ajuda">
                  Perguntas do projeto, quiz de estilo e fotos.{" "}
                  {briefing ? (
                    <>
                      Situação: <strong>{STATUS_BRIEFING[briefing.status as StatusBriefing]}</strong> ·{" "}
                      <Link className="tabela-link" href={`/app/briefings/${briefing.id}`}>
                        ver respostas
                      </Link>
                    </>
                  ) : (
                    "Só aparecem os blocos dos serviços marcados abaixo."
                  )}
                </p>
              </div>
              <EnviarLink
                clienteId={cliente.id}
                destino="briefing"
                telefone={cliente.telefone}
                cliente={cliente.nome}
                escritorio={sessao.escritorio.nome}
                temLinkAtivo={linkAtivo("briefing")}
              />
            </div>
            <div className="ficha-link">
              <div>
                <strong>Proposta</strong>
                {propostas.length ? (
                  <ul className="ficha-propostas">
                    {propostas.map((p) => {
                      const status = statusVisivel(p);
                      return (
                        <li key={p.id}>
                          <Link className="tabela-link" href={`/app/propostas/${p.id}`}>
                            {reais(p.valor_total)}
                            {p.versao > 1 && ` · versão ${p.versao}`}
                          </Link>
                          <span className={`selo-status selo-proposta-${status}`}>{STATUS_PROPOSTA[status]}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="campo-ajuda">Escopo, honorários, revisões e visitas incluídas. O cliente aprova pelo link.</p>
                )}
              </div>
              <form action={criarProposta.bind(null, cliente.id)}>
                <button type="submit" className="botao botao-primario botao-pequeno">
                  <FilePlus2 size={16} aria-hidden="true" />
                  {propostas.some((p) => p.status === "rascunho") ? "Continuar rascunho" : "Nova proposta"}
                </button>
              </form>
            </div>
            <div className="ficha-link">
              <div>
                <strong>Contrato</strong>
                {contratos.length ? (
                  <ul className="ficha-propostas">
                    {contratos.map((c) => (
                      <li key={c.id}>
                        <Link className="tabela-link" href={`/app/contratos/${c.id}`}>
                          Abrir contrato
                        </Link>
                        <span className={`selo-status selo-contrato-${c.status}`}>{STATUS_CONTRATO[c.status]}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="campo-ajuda">Gerado a partir da proposta aprovada, com aceite pelo link.</p>
                )}
              </div>
            </div>
          </section>

          <section className="cartao secao-config">
            <h2>Dados do cliente</h2>
            <FormCliente acao={acaoSalvar} cliente={cliente} servicos={servicos} />
          </section>
        </div>

        <aside className="ficha-lateral">
          {pedido && (
            <section className="cartao secao-config">
              <h2>Pedido de orçamento</h2>
              <dl className="contato-dados ficha-dados">
                <div>
                  <dt>Investimento</dt>
                  <dd>{formatarReais(pedido.orcamento_disponivel) ?? "Não informou"}</dd>
                </div>
                <div>
                  <dt>Começar</dt>
                  <dd>{pedido.prazo_desejado ?? "—"}</dd>
                </div>
                <div>
                  <dt>Área</dt>
                  <dd>{pedido.area_m2 ? `${pedido.area_m2.toLocaleString("pt-BR")} m²` : "—"}</dd>
                </div>
                <div>
                  <dt>Local</dt>
                  <dd>{pedido.localizacao ?? "—"}</dd>
                </div>
              </dl>
              {pedido.mensagem && <blockquote className="contato-mensagem">{pedido.mensagem}</blockquote>}
            </section>
          )}

          <section className="cartao secao-config">
            <h2>Linha do tempo</h2>
            <ol className="linha-tempo">
              {eventos.map((e, i) => (
                <li key={`${e.quando}-${i}`}>
                  <time dateTime={e.quando}>{dataHora.format(new Date(e.quando))}</time>
                  <span>{e.texto}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="cartao secao-config">
            <h2>Portal do cliente</h2>
            {cliente.usuario_id ? (
              <p className="muted">✓ O cliente já tem acesso ao portal e entra com o próprio e-mail e senha.</p>
            ) : projetoDoCliente ? (
              <>
                <p className="muted">
                  Com o acesso, ele acompanha etapas, arquivos, contrato e recibos num endereço fixo. O convite vai pelo link do
                  projeto.
                </p>
                <EnviarLinkAcao
                  acao={linkDoProjeto.bind(null, projetoDoCliente.id)}
                  destino="projeto"
                  telefone={cliente.telefone}
                  cliente={cliente.nome}
                  escritorio={sessao.escritorio.nome}
                  rotulo={cliente.telefone ? "Convidar para o portal no WhatsApp" : "Gerar link de convite"}
                  mensagemEspecial="portal"
                />
              </>
            ) : (
              <p className="muted">Depois do contrato assinado, o cliente recebe o convite para criar o acesso ao portal.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
