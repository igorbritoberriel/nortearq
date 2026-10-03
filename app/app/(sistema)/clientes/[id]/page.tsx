import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FilePlus2, Hourglass, MessageCircle } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLink, FormCliente } from "@/components/clientes/FormCliente";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { RemoverCliente } from "@/components/clientes/RemoverCliente";
import { pode } from "@/lib/permissoes";
import { ClientesParecidos } from "@/components/clientes/ClientesParecidos";
import { Aviso } from "@/components/Campo";
import { STATUS_BRIEFING, type StatusBriefing } from "@/lib/briefing";
import { STATUS_CONTRATO, type StatusContrato } from "@/lib/contratos";
import { STATUS_PROPOSTA, reais, statusVisivel, type StatusProposta } from "@/lib/propostas";
import { DESTINOS_LINK, ETAPAS_CLIENTE, linkDoCliente, type Cliente, type LinkCliente } from "@/lib/clientes";
import { formatarReais, formatarWhatsapp, linkWhatsapp, type Contato } from "@/lib/contatos";
import { listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";
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

// Resposta do cliente à proposta, na linha do tempo.
const RESPOSTA_PROPOSTA: Partial<Record<StatusProposta, string>> = {
  aprovada: "Aprovou a proposta",
  ajuste_pedido: "Pediu ajuste na proposta",
  recusada: "Recusou a proposta",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vinculado?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { vinculado, erro } = await searchParams;
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
    .select("id, nome, documento, telefone, email, endereco_imovel, servicos, observacoes, etapa, contato_id, usuario_id, arquivado_em, anonimizado_em, criado_em")
    .eq("id", id)
    .maybeSingle();
  if (!linha) notFound();
  const cliente = linha as Cliente;
  // Arquivar/excluir (0026): com contrato assinado ou pagamento, só arquivar.
  const { data: registroLegal } = await supabase.rpc("cliente_tem_registro_legal", { p_cliente: id });
  // Outros cadastros com o mesmo CPF/CNPJ, e-mail ou WhatsApp (para juntar).
  const { data: parecidosBrutos } = cliente.anonimizado_em
    ? { data: [] }
    : await supabase.rpc("clientes_parecidos", {
        p_email: cliente.email,
        p_telefone: cliente.telefone,
        p_documento: cliente.documento,
        p_ignorar: cliente.id,
      });
  const parecidos = (parecidosBrutos ?? []) as { id: string; nome: string; motivo: string }[];

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
      .select("id, versao, status, valor_total, validade_ate, respondida_em, enviada_em")
      .eq("cliente_id", id)
      .neq("status", "substituida")
      .order("criado_em", { ascending: false }),
    supabase
      .from("contratos")
      .select("id, status, assinado_em")
      .eq("cliente_id", id)
      .neq("status", "cancelado")
      .order("criado_em", { ascending: false }),
    supabase
      .from("projetos")
      .select("id, nome, etapas(status, nome, aprovada_em)")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const etapasProjeto = ((projetoDoCliente?.etapas ?? []) as { status: string; nome: string; aprovada_em: string | null }[]);
  const contratos = (listaContratos ?? []) as { id: string; status: StatusContrato; assinado_em: string | null }[];
  const propostas = (listaPropostas ?? []) as {
    id: string;
    versao: number;
    status: StatusProposta;
    valor_total: number | null;
    validade_ate: string | null;
    respondida_em: string | null;
    enviada_em: string | null;
  }[];

  const historicoLinks = (links ?? []) as LinkCliente[];
  const pedido = contato as Pick<
    Contato,
    "orcamento_disponivel" | "prazo_desejado" | "area_m2" | "localizacao" | "mensagem" | "criado_em"
  > | null;
  const agora = Date.now();
  const linkAtivo = (destino: string) =>
    historicoLinks.some((l) => l.destino === destino && new Date(l.expira_em).getTime() > agora);
  // Briefing ainda aberto com link valendo: dá para reenviar o mesmo (M4 da revisão de UX).
  const tokenBriefing =
    briefing && ["pendente", "em_andamento"].includes(briefing.status as string)
      ? historicoLinks.find((l) => l.destino === "briefing" && new Date(l.expira_em).getTime() > agora)?.token
      : undefined;
  const linkAtualBriefing = tokenBriefing ? linkDoCliente(urlDoSite(), tokenBriefing, "briefing") : null;

  // Linha do tempo (mais recente primeiro).
  const eventos = [
    ...(pedido ? [{ quando: pedido.criado_em, texto: "Pediu orçamento pelo seu formulário" }] : []),
    { quando: cliente.criado_em, texto: pedido ? "Virou cliente" : "Cadastrado manualmente" },
    ...(briefing?.respondido_em ? [{ quando: briefing.respondido_em as string, texto: "Respondeu o briefing" }] : []),
    ...contratos.filter((c) => c.assinado_em).map((c) => ({ quando: c.assinado_em as string, texto: "Assinou o contrato" })),
    // B2 da revisão de UX: proposta e etapas também contam a história do cliente.
    ...propostas.filter((p) => p.enviada_em).map((p) => ({ quando: p.enviada_em as string, texto: `Proposta enviada${p.versao > 1 ? ` (versão ${p.versao})` : ""}` })),
    ...propostas
      .filter((p) => p.respondida_em && RESPOSTA_PROPOSTA[p.status])
      .map((p) => ({ quando: p.respondida_em as string, texto: RESPOSTA_PROPOSTA[p.status] as string })),
    ...etapasProjeto.filter((e) => e.aprovada_em).map((e) => ({ quando: e.aprovada_em as string, texto: `Aprovou a etapa ${e.nome}` })),
    ...historicoLinks.map((l) => ({
      quando: l.criado_em,
      texto: `Link de ${DESTINOS_LINK[l.destino].rotulo.toLowerCase()} gerado${
        l.usado_em ? " · aberto pelo cliente" : new Date(l.expira_em).getTime() > agora ? " · ativo" : " · desativado"
      }`,
    })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  const acaoSalvar = salvarCliente.bind(null, cliente.id);
  const papel = sessao.membro.papel;
  const verValores = pode(papel, "ver_valores");

  // Próximo passo da jornada (M3 da revisão de UX): o que fazer agora com este cliente.
  const ultimaProposta = propostas[0];
  const statusProposta = ultimaProposta ? statusVisivel(ultimaProposta) : null;
  const contratoAtual = contratos[0];
  const proximo: { texto: string; href?: string; acao?: "proposta"; rotulo?: string; esperando?: boolean } | null = (() => {
    if (cliente.anonimizado_em || cliente.arquivado_em) return null;
    const projeto = projetoDoCliente
      ? {
          texto: etapasProjeto.some((e) => e.status === "revisao")
            ? "O cliente pediu revisão de uma etapa do projeto."
            : etapasProjeto.some((e) => e.status === "aguardando_aprovacao")
              ? "Etapa do projeto esperando a aprovação do cliente."
              : "Projeto em andamento: envie os arquivos e as etapas para aprovação.",
          href: `/app/projetos/${projetoDoCliente.id}`,
          rotulo: "Abrir o projeto",
          esperando: etapasProjeto.some((e) => e.status === "aguardando_aprovacao") && !etapasProjeto.some((e) => e.status === "revisao"),
        }
      : null;
    if (briefing?.status === "respondido") {
      return { texto: "O cliente respondeu o briefing: revise e valide na reunião.", href: `/app/briefings/${briefing.id}`, rotulo: "Ver o Perfil do Cliente" };
    }
    if (!verValores) return projeto;
    if (contratoAtual?.status === "assinado") {
      if (!briefing) return { texto: "Contrato assinado. Próximo passo: enviar o briefing detalhado.", href: "#briefing", rotulo: "Ir para o briefing" };
      return projeto;
    }
    if (contratoAtual?.status === "rascunho") return { texto: "Contrato pronto: confira e envie para o cliente assinar.", href: `/app/contratos/${contratoAtual.id}`, rotulo: "Abrir o contrato" };
    if (contratoAtual?.status === "aguardando_assinatura") return { texto: "Aguardando o cliente assinar o contrato.", href: `/app/contratos/${contratoAtual.id}`, rotulo: "Ver o contrato", esperando: true };
    if (!ultimaProposta) return { texto: "Próximo passo: montar a proposta.", acao: "proposta", rotulo: "Nova proposta" };
    const href = `/app/propostas/${ultimaProposta.id}`;
    if (statusProposta === "rascunho") return { texto: "A proposta está em rascunho: termine e envie.", href, rotulo: "Continuar a proposta" };
    if (statusProposta === "enviada") return { texto: "Aguardando o cliente responder a proposta.", href, rotulo: "Ver a proposta", esperando: true };
    if (statusProposta === "ajuste_pedido") return { texto: "O cliente pediu ajustes na proposta: crie uma nova versão.", href, rotulo: "Ver o pedido de ajuste" };
    if (statusProposta === "expirada") return { texto: "A proposta expirou sem resposta: crie uma nova versão.", href, rotulo: "Abrir a proposta" };
    if (statusProposta === "aprovada") return { texto: "Proposta aprovada! Próximo passo: gerar o contrato.", href, rotulo: "Gerar o contrato" };
    return null;
  })();

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/clientes" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>
      {erro === "proposta" && (
        <Aviso tipo="erro">Não foi possível criar a proposta agora. Tente de novo em instantes.</Aviso>
      )}
      {vinculado && (
        <Aviso tipo="sucesso">
          Este pedido de orçamento era de alguém que já é seu cliente: ele foi ligado a este cadastro, sem criar outro.
        </Aviso>
      )}
      {parecidos.length > 0 && pode(papel, "juntar_clientes") && (
        <ClientesParecidos clienteId={cliente.id} nome={cliente.nome} parecidos={parecidos} />
      )}
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

      {proximo && (
        <div className={`proximo-passo ${proximo.esperando ? "proximo-esperando" : ""}`}>
          <span>
            {proximo.esperando ? <Hourglass size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            {proximo.texto}
          </span>
          {proximo.acao === "proposta" ? (
            <form action={criarProposta.bind(null, cliente.id)}>
              <button type="submit" className="botao botao-primario botao-pequeno">
                <FilePlus2 size={16} aria-hidden="true" /> {proximo.rotulo}
              </button>
            </form>
          ) : (
            proximo.href && (
              <Link className={`botao botao-pequeno ${proximo.esperando ? "botao-secundario" : "botao-primario"}`} href={proximo.href}>
                {proximo.rotulo}
              </Link>
            )
          )}
        </div>
      )}

      <div className="ficha">
        <div className="ficha-principal">
          {projetoDoCliente && (
            <section className="cartao secao-config">
              <h2>Projeto</h2>
              <div className="ficha-link">
                <div>
                  <strong>{projetoDoCliente.nome}</strong>
                  <p className="campo-ajuda">
                    {etapasProjeto.filter((e) => e.status === "aprovada").length} de {etapasProjeto.length} etapas aprovadas
                    {etapasProjeto.some((e) => e.status === "aguardando_aprovacao") && " · etapa esperando o cliente"}
                    {etapasProjeto.some((e) => e.status === "revisao") && " · revisão pedida"}
                  </p>
                </div>
                <Link className="botao botao-secundario botao-pequeno" href={`/app/projetos/${projetoDoCliente.id}`}>
                  Abrir o projeto
                </Link>
              </div>
            </section>
          )}
          <section className="cartao secao-config">
            <h2>Enviar para o cliente</h2>
            <p className="muted">
              O cliente abre pelo celular, sem login e sem instalar nada. Cada link é único e só mostra os dados dele. Os
              links de briefing, proposta e contrato valem 30 dias.
            </p>
            <div className="ficha-link" id="briefing">
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
                linkAtual={linkAtualBriefing}
              />
            </div>
            {verValores && (
              <>
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
              </>
            )}
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

          {/* Ações perigosas por último (B3 da revisão de UX). */}
          <section className="cartao secao-config">
            <h2>{cliente.arquivado_em ? "Cliente arquivado" : "Arquivar ou excluir"}</h2>
            {verValores && (
              <p className="campo-ajuda">
                Se o cliente pedir os dados dele (LGPD):{" "}
                <a className="tabela-link" href={`/app/clientes/${cliente.id}/exportar`} download>
                  Exportar dados do cliente
                </a>
                .
              </p>
            )}
            <RemoverCliente
              clienteId={cliente.id}
              nome={cliente.nome}
              arquivado={!!cliente.arquivado_em}
              anonimizado={!!cliente.anonimizado_em}
              temRegistroLegal={!!registroLegal}
              podeExcluir={pode(papel, "excluir_cliente")}
              dono={pode(papel, "anonimizar_cliente")}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
