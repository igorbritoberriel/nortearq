import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  ClipboardList,
  FilePlus2,
  FileSignature,
  FileText,
  Hourglass,
  Inbox,
  RotateCcw,
  Scale,
  Wallet,
} from "lucide-react";
import { pode } from "@/lib/permissoes";
import { EmConstrucao } from "@/components/EmConstrucao";
import { LinkDoEscritorio } from "@/components/escritorio/FormulariosEscritorio";
import { diasDeTeste, linkDoEscritorio, obterSessaoArquiteto } from "@/lib/escritorio";
import { reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Painel inicial (RN-00.6): só pendências acionáveis, com a mais antiga em destaque.
// "Precisa de você" = depende do arquiteto; "Esperando o cliente" = já está com o cliente.

type Item = { id: string; quando: string | null; href: string };
type Cartao = {
  chave: string;
  icone: typeof Inbox;
  singular: string;
  plural: string;
  itens: Item[];
  lista: string; // página quando há mais de um
  detalhe?: string; // ex.: "2 novos"
};

function haQuanto(iso: string | null) {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

function CartaoPendencia({ c, esperando }: { c: Cartao; esperando?: boolean }) {
  const n = c.itens.length;
  const maisAntigo = [...c.itens].sort((a, b) => (a.quando ?? "").localeCompare(b.quando ?? ""))[0];
  const Icone = c.icone;
  return (
    <Link href={n === 1 ? c.itens[0].href : c.lista} className={`cartao painel-cartao ${esperando ? "painel-esperando" : ""}`}>
      <Icone size={22} aria-hidden="true" className="painel-icone" />
      <span className="painel-numero">{n}</span>
      <span className="painel-texto">
        <strong>{n === 1 ? c.singular : c.plural}</strong>
        {(maisAntigo?.quando || c.detalhe) && (
          <small className="muted">
            {c.detalhe && <span className="painel-detalhe">{c.detalhe}</span>}
            {c.detalhe && maisAntigo?.quando && " · "}
            {maisAntigo?.quando && `${n === 1 ? "desde" : "o mais antigo"} ${haQuanto(maisAntigo.quando)}`}
          </small>
        )}
      </span>
      <ArrowRight size={18} aria-hidden="true" className="painel-seta" />
    </Link>
  );
}

export default async function PainelPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = sessao ? await criarClienteServidor() : null;

  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="00"
        titulo="Painel inicial"
        descricao="Ligue o Supabase no .env.local para ver as pendências."
        itens={["Pendências do arquiteto", "O que está com o cliente", "Valores a receber"]}
      />
    );
  }

  const dias = diasDeTeste(sessao.escritorio);
  const papel = sessao.membro.papel;

  const [
    contatos,
    briefings,
    ajustes,
    enviadas,
    rascunhos,
    aguardandoAssinatura,
    revisoes,
    aguardandoAprovacao,
    aReceber,
    aditivosCliente,
    aprovadas,
    revisoesContadas,
    clientesSemProposta,
  ] = await Promise.all([
      // Todo pedido em aberto, visto ou não: só sai daqui quando vira cliente ou é encerrado (A6 da revisão de UX).
      supabase
        .from("contatos")
        .select("id, criado_em, reenviado_em, visto_em")
        .in("status", ["compativel", "a_avaliar", "novo"]),
      supabase.from("briefings").select("id, respondido_em").eq("status", "respondido"),
      supabase.from("propostas").select("id, atualizado_em").eq("status", "ajuste_pedido"),
      supabase.from("propostas").select("id, enviada_em").eq("status", "enviada"),
      supabase.from("contratos").select("id, criado_em").eq("status", "rascunho"),
      supabase.from("contratos").select("id, enviado_em").eq("status", "aguardando_assinatura"),
      supabase.from("etapas").select("id, projeto_id, atualizado_em").eq("status", "revisao"),
      supabase.from("etapas").select("id, projeto_id, enviada_em").eq("status", "aguardando_aprovacao"),
      supabase.from("pagamentos").select("valor").is("pago_em", null),
      supabase.from("aditivos").select("id, projeto_id, criado_em").eq("status", "enviado"),
      // A7: proposta aprovada sem contrato (cancelado não conta).
      supabase.from("propostas").select("id, respondida_em, contratos(status)").eq("status", "aprovada"),
      // A7: revisões que contam, para achar as que passaram do limite sem decisão (cortesia ou aditivo).
      pode(papel, "gerir_aditivos")
        ? supabase
            .from("aprovacoes")
            .select("id, decidido_em, cortesia, aditivo_id, etapa:etapas(projeto_id, projeto:projetos(revisoes_incluidas))")
            .eq("conta_revisao", true)
            .order("decidido_em")
        : Promise.resolve({ data: [] }),
      // A7: cliente ativo que ainda não recebeu proposta. Só para quem vê propostas: para o Colaborador
      // (que não enxerga propostas) todo cliente pareceria sem proposta.
      pode(papel, "ver_valores")
        ? supabase
            .from("clientes")
            .select("id, criado_em, propostas(id)")
            .in("etapa", ["contato", "briefing"])
            .is("arquivado_em", null)
            .is("anonimizado_em", null)
        : Promise.resolve({ data: [] }),
    ]);

  const semContrato = (aprovadas.data ?? []).filter(
    (p) => !((p.contratos ?? []) as { status: string }[]).some((c) => c.status !== "cancelado"),
  );

  // Conta as revisões de cada projeto em ordem; as que passam do limite e ainda não têm decisão ficam pendentes.
  type Revisao = {
    id: string;
    decidido_em: string;
    cortesia: boolean;
    aditivo_id: string | null;
    etapa: { projeto_id: string; projeto: { revisoes_incluidas: number } | null } | null;
  };
  const usadasPorProjeto = new Map<string, number>();
  const excedentes: Item[] = [];
  for (const r of (revisoesContadas.data ?? []) as unknown as Revisao[]) {
    if (!r.etapa || r.cortesia) continue;
    const n = (usadasPorProjeto.get(r.etapa.projeto_id) ?? 0) + 1;
    usadasPorProjeto.set(r.etapa.projeto_id, n);
    if (n > (r.etapa.projeto?.revisoes_incluidas ?? 0) && !r.aditivo_id) {
      excedentes.push({ id: r.id, quando: r.decidido_em, href: `/app/projetos/${r.etapa.projeto_id}` });
    }
  }

  const esperandoProposta = (clientesSemProposta.data ?? []).filter(
    (c) => !((c.propostas ?? []) as { id: string }[]).length,
  );
  const contatosNovos = (contatos.data ?? []).filter((c) => !c.visto_em).length;

  const precisaDeVoce: Cartao[] = [
    {
      chave: "contatos",
      icone: Inbox,
      singular: "pedido de orçamento para responder",
      plural: "pedidos de orçamento para responder",
      detalhe: contatosNovos ? `${contatosNovos} ${contatosNovos === 1 ? "novo" : "novos"}` : undefined,
      lista: "/app/contatos",
      itens: (contatos.data ?? []).map((c) => ({ id: c.id, quando: c.reenviado_em ?? c.criado_em, href: "/app/contatos" })),
    },
    {
      chave: "sem-proposta",
      icone: FilePlus2,
      singular: "cliente esperando proposta",
      plural: "clientes esperando proposta",
      lista: "/app/clientes",
      itens: esperandoProposta.map((c) => ({ id: c.id, quando: c.criado_em, href: `/app/clientes/${c.id}` })),
    },
    {
      chave: "sem-contrato",
      icone: FileSignature,
      singular: "proposta aprovada: falta gerar o contrato",
      plural: "propostas aprovadas: falta gerar o contrato",
      lista: "/app/propostas",
      itens: semContrato.map((p) => ({ id: p.id, quando: p.respondida_em, href: `/app/propostas/${p.id}` })),
    },
    {
      chave: "excedentes",
      icone: Scale,
      singular: "revisão além do limite: cortesia ou aditivo?",
      plural: "revisões além do limite: cortesia ou aditivo?",
      lista: "/app/projetos",
      itens: excedentes,
    },
    {
      chave: "briefings",
      icone: ClipboardList,
      singular: "briefing respondido para revisar",
      plural: "briefings respondidos para revisar",
      lista: "/app/briefings",
      itens: (briefings.data ?? []).map((b) => ({ id: b.id, quando: b.respondido_em, href: `/app/briefings/${b.id}` })),
    },
    {
      chave: "ajustes",
      icone: FileText,
      singular: "proposta com ajuste pedido",
      plural: "propostas com ajuste pedido",
      lista: "/app/propostas",
      itens: (ajustes.data ?? []).map((p) => ({ id: p.id, quando: p.atualizado_em, href: `/app/propostas/${p.id}` })),
    },
    {
      chave: "rascunhos",
      icone: FileSignature,
      singular: "contrato pronto para enviar",
      plural: "contratos prontos para enviar",
      lista: "/app/contratos",
      itens: (rascunhos.data ?? []).map((c) => ({ id: c.id, quando: c.criado_em, href: `/app/contratos/${c.id}` })),
    },
    {
      chave: "revisoes",
      icone: RotateCcw,
      singular: "etapa com revisão pedida",
      plural: "etapas com revisão pedida",
      lista: "/app/projetos",
      itens: (revisoes.data ?? []).map((e) => ({ id: e.id, quando: e.atualizado_em, href: `/app/projetos/${e.projeto_id}` })),
    },
  ].filter((c) => c.itens.length > 0);

  const esperandoCliente: Cartao[] = [
    {
      chave: "enviadas",
      icone: FileText,
      singular: "proposta esperando resposta",
      plural: "propostas esperando resposta",
      lista: "/app/propostas",
      itens: (enviadas.data ?? []).map((p) => ({ id: p.id, quando: p.enviada_em, href: `/app/propostas/${p.id}` })),
    },
    {
      chave: "assinatura",
      icone: FileSignature,
      singular: "contrato esperando assinatura",
      plural: "contratos esperando assinatura",
      lista: "/app/contratos",
      itens: (aguardandoAssinatura.data ?? []).map((c) => ({ id: c.id, quando: c.enviado_em, href: `/app/contratos/${c.id}` })),
    },
    {
      chave: "aprovacao",
      icone: Hourglass,
      singular: "etapa esperando aprovação",
      plural: "etapas esperando aprovação",
      lista: "/app/projetos",
      itens: (aguardandoAprovacao.data ?? []).map((e) => ({
        id: e.id,
        quando: e.enviada_em,
        href: `/app/projetos/${e.projeto_id}`,
      })),
    },
    {
      chave: "aditivos",
      icone: FileText,
      singular: "aditivo esperando resposta",
      plural: "aditivos esperando resposta",
      lista: "/app/projetos",
      itens: (aditivosCliente.data ?? []).map((a) => ({ id: a.id, quando: a.criado_em, href: `/app/projetos/${a.projeto_id}#aditivos` })),
    },
  ].filter((c) => c.itens.length > 0);

  // A mais antiga primeiro (RN-00.6).
  const maisAntiga = (c: Cartao) => c.itens.reduce((m, i) => ((i.quando ?? "9") < m ? (i.quando ?? "9") : m), "9");
  precisaDeVoce.sort((a, b) => maisAntiga(a).localeCompare(maisAntiga(b)));
  esperandoCliente.sort((a, b) => maisAntiga(a).localeCompare(maisAntiga(b)));

  const pendentes = aReceber.data ?? [];
  const totalReceber = pendentes.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="pagina-app pagina-larga">
      <h1>Olá, {sessao.membro.nome.split(" ")[0]}!</h1>
      {dias !== null && (
        <p className="muted">
          {dias > 0
            ? `Você está no teste grátis: faltam ${dias} ${dias === 1 ? "dia" : "dias"}, com todos os recursos do plano Profissional.`
            : "Seu teste grátis terminou. Escolha um plano para continuar criando."}
        </p>
      )}

      <section className="painel-secao" aria-labelledby="precisa-de-voce">
        <h2 id="precisa-de-voce">Precisa de você</h2>
        {precisaDeVoce.length ? (
          <div className="painel-grade">
            {precisaDeVoce.map((c) => (
              <CartaoPendencia key={c.chave} c={c} />
            ))}
          </div>
        ) : (
          <p className="painel-em-dia">
            <CircleCheck size={20} aria-hidden="true" />
            Tudo em dia. Nenhuma pendência sua agora.
          </p>
        )}
      </section>

      {esperandoCliente.length > 0 && (
        <section className="painel-secao" aria-labelledby="esperando-cliente">
          <h2 id="esperando-cliente">Esperando o cliente</h2>
          <div className="painel-grade">
            {esperandoCliente.map((c) => (
              <CartaoPendencia key={c.chave} c={c} esperando />
            ))}
          </div>
        </section>
      )}

      {totalReceber > 0 && (
        <section className="painel-secao" aria-labelledby="a-receber">
          <h2 id="a-receber">Financeiro</h2>
          <Link href="/app/contratos" className="cartao painel-cartao painel-receber">
            <Wallet size={22} aria-hidden="true" className="painel-icone" />
            <span className="painel-numero">{reais(totalReceber)}</span>
            <span className="painel-texto">
              <strong>a receber</strong>
              <small className="muted">
                {pendentes.length} {pendentes.length === 1 ? "parcela pendente" : "parcelas pendentes"} nos contratos assinados
              </small>
            </span>
            <ArrowRight size={18} aria-hidden="true" className="painel-seta" />
          </Link>
        </section>
      )}

      <section className="cartao secao-config painel-link">
        <h2>Seu link para receber pedidos de orçamento</h2>
        <LinkDoEscritorio link={linkDoEscritorio(sessao.escritorio.slug)} nome={sessao.escritorio.nome} />
      </section>
    </div>
  );
}
