import Link from "next/link";
import {
  CalendarDays,
  CircleCheck,
  ClipboardList,
  FilePlus2,
  FileSignature,
  FileText,
  Inbox,
  Receipt,
  RotateCcw,
  Ruler,
  Scale,
  Wallet,
} from "lucide-react";
import { pode } from "@/lib/permissoes";
import { EmConstrucao } from "@/components/EmConstrucao";
import { LinkDoEscritorio } from "@/components/escritorio/FormulariosEscritorio";
import { diasDeTeste, linkDoEscritorio, obterSessaoArquiteto } from "@/lib/escritorio";
import { reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FinanceiroMes } from "./FinanceiroMes";
import "./inicio.css";

// Painel inicial (RN-00.6): o dia do escritório em uma lista única, por prioridade.
// "Para fazer" depende do escritório; "Esperando o cliente" já está com o cliente.

type Nivel = "urgente" | "hoje" | "pendencia";
type Tarefa = {
  chave: string;
  nivel: Nivel;
  icone: typeof Inbox;
  titulo: string;
  quem: string;
  detalhe: string;
  acao: string;
  href: string;
  quando: string;
};
type Espera = { chave: string; titulo: string; quem: string; quando: string | null; href: string };
type ComCliente = { cliente?: { nome: string | null } | null };
type ComProjeto = { projeto?: { nome: string | null; cliente?: { nome: string | null } | null } | null };

const TZ = "America/Sao_Paulo";
const diaBr = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const nomeCliente = (x: ComCliente) => x.cliente?.nome ?? "Cliente";
const doProjeto = (x: ComProjeto) => [x.projeto?.cliente?.nome, x.projeto?.nome].filter(Boolean).join(" · ") || "Projeto";
const dataCurta = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function diasDesde(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
function haQuanto(iso: string | null) {
  const d = diasDesde(iso);
  if (d === null) return "";
  return d === 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
}
function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);
}

const ROTULO_NIVEL: Record<Nivel, string> = { urgente: "Urgente", hoje: "Vence hoje", pendencia: "Pendências" };
const VISIVEIS = 8;

function LinhaTarefa({ t }: { t: Tarefa }) {
  const Icone = t.icone;
  return (
    <li className="inicio-tarefa">
      <span className={`inicio-icone inicio-icone-${t.nivel}`} aria-hidden="true">
        <Icone size={18} />
      </span>
      <span className="inicio-tarefa-texto">
        <strong>{t.titulo}</strong>
        <small>
          {t.quem}
          {t.detalhe && (
            <>
              {" · "}
              <span className={`inicio-marca-${t.nivel}`}>{t.detalhe}</span>
            </>
          )}
        </small>
      </span>
      <Link href={t.href} className="botao botao-secundario botao-pequeno inicio-acao">
        {t.acao}
      </Link>
    </li>
  );
}

function ListaTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  const grupos = (["urgente", "hoje", "pendencia"] as Nivel[])
    .map((nivel) => ({ nivel, itens: tarefas.filter((t) => t.nivel === nivel) }))
    .filter((g) => g.itens.length);
  let mostradas = 0;
  const visiveis = grupos.map((g) => {
    const itens = g.itens.slice(0, Math.max(0, VISIVEIS - mostradas));
    mostradas += itens.length;
    return { ...g, itens, resto: g.itens.slice(itens.length) };
  });
  const resto = visiveis.flatMap((g) => g.resto.map((t) => ({ ...t })));
  return (
    <>
      {visiveis
        .filter((g) => g.itens.length)
        .map((g) => (
          <div key={g.nivel}>
            <h3 className={`inicio-grupo inicio-grupo-${g.nivel}`}>{ROTULO_NIVEL[g.nivel]}</h3>
            <ul className="inicio-lista">
              {g.itens.map((t) => (
                <LinhaTarefa key={t.chave} t={t} />
              ))}
            </ul>
          </div>
        ))}
      {resto.length > 0 && (
        <details className="inicio-mais">
          <summary>
            Ver mais {resto.length} {resto.length === 1 ? "tarefa" : "tarefas"}
          </summary>
          <ul className="inicio-lista">
            {resto.map((t) => (
              <LinhaTarefa key={t.chave} t={t} />
            ))}
          </ul>
        </details>
      )}
    </>
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
  const verValores = pode(papel, "ver_valores");
  const agora = new Date();
  const hoje = diaBr(agora);
  const daquiSete = diaBr(new Date(agora.getTime() + 7 * 86_400_000));
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const vazio = Promise.resolve({ data: [] as never[] });

  const [
    contatos,
    briefings,
    ajustes,
    enviadas,
    rascunhos,
    aguardandoAssinatura,
    revisoes,
    aguardandoAprovacao,
    comPrazo,
    aReceber,
    recebidosMes,
    entradasMes,
    despesasPendentes,
    aditivosCliente,
    aprovadas,
    revisoesContadas,
    clientesSemProposta,
  ] = await Promise.all([
    // Todo pedido em aberto, visto ou não: só sai daqui quando vira cliente ou é encerrado (A6 da revisão de UX).
    supabase.from("contatos").select("id, nome, criado_em, reenviado_em, visto_em, status").in("status", ["compativel", "a_avaliar", "novo"]),
    supabase.from("briefings").select("id, respondido_em, cliente:clientes(nome)").eq("status", "respondido"),
    supabase.from("propostas").select("id, atualizado_em, comentario_cliente, cliente:clientes(nome)").eq("status", "ajuste_pedido"),
    supabase.from("propostas").select("id, enviada_em, cliente:clientes(nome)").eq("status", "enviada"),
    supabase.from("contratos").select("id, criado_em, cliente:clientes(nome)").eq("status", "rascunho"),
    supabase.from("contratos").select("id, enviado_em, cliente:clientes(nome)").eq("status", "aguardando_assinatura"),
    supabase
      .from("etapas")
      .select("id, nome, projeto_id, atualizado_em, projeto:projetos!inner(status, nome, cliente:clientes(nome))")
      .eq("projeto.status", "ativo")
      .eq("status", "revisao"),
    supabase
      .from("etapas")
      .select("id, nome, projeto_id, enviada_em, projeto:projetos!inner(status, nome, cliente:clientes(nome))")
      .eq("projeto.status", "ativo")
      .eq("status", "aguardando_aprovacao"),
    // Agenda (0047): etapas não aprovadas com prazo até daqui a 7 dias, inclusive as atrasadas.
    supabase
      .from("etapas")
      .select("id, nome, prazo, status, projeto_id, projeto:projetos!inner(status, nome, cliente:clientes(nome))")
      .eq("projeto.status", "ativo")
      .neq("status", "aprovada")
      .not("prazo", "is", null)
      .lte("prazo", daquiSete)
      .order("prazo"),
    verValores
      ? supabase.from("pagamentos").select("valor, vencimento, contrato_id, contrato:contratos(cliente:clientes(nome))").is("pago_em", null)
      : vazio,
    verValores ? supabase.from("pagamentos").select("valor").gte("pago_em", inicioMes).lte("pago_em", hoje) : vazio,
    verValores
      ? supabase.from("financeiro_entradas").select("valor").is("cancelada_em", null).gte("recebido_em", inicioMes).lte("recebido_em", hoje)
      : vazio,
    verValores
      ? supabase.from("financeiro_despesas").select("id, descricao, fornecedor, valor, vencimento").is("pago_em", null).is("cancelada_em", null)
      : vazio,
    supabase
      .from("aditivos")
      .select("id, projeto_id, criado_em, projeto:projetos!inner(status, nome, cliente:clientes(nome))")
      .eq("projeto.status", "ativo")
      .eq("status", "enviado"),
    // A7: proposta aprovada sem contrato (cancelado não conta).
    supabase.from("propostas").select("id, respondida_em, cliente:clientes(nome), contratos(status)").eq("status", "aprovada"),
    // A7: revisões que contam, para achar as que passaram do limite sem decisão (cortesia ou aditivo).
    pode(papel, "gerir_aditivos")
      ? supabase
          .from("aprovacoes")
          .select(
            "id, decidido_em, cortesia, aditivo_id, etapa:etapas!inner(nome, projeto_id, projeto:projetos!inner(revisoes_incluidas, status, nome, cliente:clientes(nome)))",
          )
          .eq("etapa.projeto.status", "ativo")
          .eq("conta_revisao", true)
          .order("decidido_em")
      : vazio,
    // A7: cliente ativo que ainda não recebeu proposta. Só para quem vê propostas.
    verValores
      ? supabase
          .from("clientes")
          .select("id, nome, criado_em, propostas(id)")
          .in("etapa", ["contato", "briefing"])
          .is("arquivado_em", null)
          .is("anonimizado_em", null)
      : vazio,
  ]);

  // M10 da revisão de UX: primeiros passos para quem está começando (some quando tudo estiver feito).
  const e = sessao.escritorio;
  const passos = pode(papel, "configurar_escritorio")
    ? await Promise.all([
        supabase.from("modelos_proposta").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("briefings").select("id", { count: "exact", head: true }),
        supabase.from("propostas").select("id", { count: "exact", head: true }).neq("status", "rascunho"),
      ]).then(([modelos, clientes, briefingsEnviados, propostasEnviadas]) => [
        { feito: !!(e.documento && e.endereco && e.responsavel), texto: "Preencher os dados do escritório que entram no contrato", href: "/app/contratos/modelo" },
        { feito: (modelos.count ?? 0) > 0, texto: "Criar um modelo de proposta (salve uma proposta como modelo)", href: "/app/propostas/modelos" },
        { feito: (clientes.count ?? 0) > 0, texto: "Cadastrar o primeiro cliente (ou testar o seu formulário)", href: "/app/clientes/novo" },
        { feito: (briefingsEnviados.count ?? 0) > 0, texto: "Enviar o primeiro briefing", href: "/app/clientes" },
        { feito: (propostasEnviadas.count ?? 0) > 0, texto: "Enviar a primeira proposta", href: "/app/clientes" },
        {
          feito: !!(e.pix_chave || e.cobranca_ativa),
          texto: "Receber pelo NorteArq: cadastrar o Pix ou ativar a cobrança automática (Pix, boleto e cartão)",
          href: "/app/configuracoes#pix",
        },
      ])
    : [];
  const faltamPassos = passos.filter((p) => !p.feito).length;

  // Limites do plano (migração 0036): aviso a partir de 2 vagas do fim.
  const { data: usoBruto } = await supabase.rpc("uso_do_plano");
  const uso = usoBruto as { projetos: number; limite_projetos: number | null; briefings_mes: number; limite_briefings: number | null } | null;
  const avisoLimite =
    uso?.limite_projetos && uso.projetos >= uso.limite_projetos - 2
      ? `${uso.projetos} de ${uso.limite_projetos} projetos em andamento no seu plano.${uso.projetos >= uso.limite_projetos ? " Novos contratos só depois que um projeto for entregue ou encerrado." : ""}`
      : uso?.limite_briefings && uso.briefings_mes >= uso.limite_briefings - 2
        ? `${uso.briefings_mes} de ${uso.limite_briefings} briefings usados neste mês.${uso.briefings_mes >= uso.limite_briefings ? " Novos briefings só no dia 1º." : ""}`
        : null;

  const tarefas: Tarefa[] = [];

  // Urgente: dinheiro atrasado, um item por contrato.
  type Parcela = { valor: number; vencimento: string | null; contrato_id: string; contrato?: ComCliente | null };
  const pendentes = (aReceber.data ?? []) as unknown as Parcela[];
  const atrasadas = pendentes.filter((p) => p.vencimento && p.vencimento < hoje);
  const porContrato = new Map<string, Parcela[]>();
  for (const p of atrasadas) porContrato.set(p.contrato_id, [...(porContrato.get(p.contrato_id) ?? []), p]);
  for (const [contratoId, ps] of porContrato) {
    const antiga = ps.map((p) => p.vencimento as string).sort()[0];
    const total = ps.reduce((s, p) => s + Number(p.valor), 0);
    tarefas.push({
      chave: `parcela-${contratoId}`,
      nivel: "urgente",
      icone: Wallet,
      titulo: ps.length === 1 ? "Cobrar parcela atrasada" : `Cobrar ${ps.length} parcelas atrasadas`,
      quem: `${ps[0].contrato ? nomeCliente(ps[0].contrato) : "Cliente"} · ${reais(total)}`,
      detalhe: `venceu há ${diasEntre(antiga, hoje)} ${diasEntre(antiga, hoje) === 1 ? "dia" : "dias"}`,
      acao: "Cobrar",
      href: `/app/contratos/${contratoId}`,
      quando: antiga,
    });
  }

  // Prazos das etapas: só viram tarefa quando a próxima ação é do escritório.
  type EtapaPrazo = ComProjeto & { id: string; nome: string; prazo: string; status: string; projeto_id: string };
  const agenda = (comPrazo.data ?? []) as unknown as EtapaPrazo[];
  for (const et of agenda) {
    if (et.status === "aguardando_aprovacao" || et.prazo > hoje) continue;
    const atraso = diasEntre(et.prazo, hoje);
    tarefas.push({
      chave: `prazo-${et.id}`,
      nivel: atraso > 0 ? "urgente" : "hoje",
      icone: Ruler,
      titulo: `Entregar ${et.nome}`,
      quem: doProjeto(et),
      detalhe: atraso > 0 ? `prazo era ${dataCurta(et.prazo)} (${atraso} ${atraso === 1 ? "dia" : "dias"} de atraso)` : "entrega planejada para hoje",
      acao: "Abrir projeto",
      href: `/app/projetos/${et.projeto_id}`,
      quando: et.prazo,
    });
  }

  // Despesas vencidas ou vencendo hoje.
  type Despesa = { id: string; descricao: string; fornecedor: string | null; valor: number; vencimento: string };
  const despesas = (despesasPendentes.data ?? []) as unknown as Despesa[];
  for (const d of despesas) {
    if (d.vencimento > hoje) continue;
    const atraso = diasEntre(d.vencimento, hoje);
    tarefas.push({
      chave: `despesa-${d.id}`,
      nivel: atraso > 0 ? "urgente" : "hoje",
      icone: Receipt,
      titulo: "Pagar despesa",
      quem: `${d.fornecedor || d.descricao} · ${reais(Number(d.valor))}`,
      detalhe: atraso > 0 ? `venceu há ${atraso} ${atraso === 1 ? "dia" : "dias"}` : "vence hoje",
      acao: "Ver despesa",
      href: "/app/financeiro",
      quando: d.vencimento,
    });
  }

  // Pendências do fluxo: contato → briefing → proposta → contrato → projeto.
  for (const c of contatos.data ?? []) {
    tarefas.push({
      chave: `contato-${c.id}`,
      nivel: "pendencia",
      icone: Inbox,
      titulo: "Responder pedido de orçamento",
      quem: c.nome,
      detalhe: `${c.visto_em ? "" : "novo · "}chegou ${haQuanto(c.reenviado_em ?? c.criado_em)}`,
      acao: "Ver pedido",
      href: "/app/contatos",
      quando: c.reenviado_em ?? c.criado_em,
    });
  }
  for (const b of (briefings.data ?? []) as unknown as (ComCliente & { id: string; respondido_em: string })[]) {
    tarefas.push({
      chave: `briefing-${b.id}`,
      nivel: "pendencia",
      icone: ClipboardList,
      titulo: "Revisar briefing respondido",
      quem: nomeCliente(b),
      detalhe: `respondido ${haQuanto(b.respondido_em)}`,
      acao: "Ver briefing",
      href: `/app/briefings/${b.id}`,
      quando: b.respondido_em,
    });
  }
  for (const c of (clientesSemProposta.data ?? []) as unknown as { id: string; nome: string; criado_em: string; propostas: { id: string }[] }[]) {
    if (c.propostas?.length) continue;
    tarefas.push({
      chave: `sem-proposta-${c.id}`,
      nivel: "pendencia",
      icone: FilePlus2,
      titulo: "Enviar proposta",
      quem: c.nome,
      detalhe: `cliente desde ${haQuanto(c.criado_em)}`,
      acao: "Abrir cliente",
      href: `/app/clientes/${c.id}`,
      quando: c.criado_em,
    });
  }
  for (const p of (ajustes.data ?? []) as unknown as (ComCliente & { id: string; atualizado_em: string; comentario_cliente: string | null })[]) {
    tarefas.push({
      chave: `ajuste-${p.id}`,
      nivel: "pendencia",
      icone: FileText,
      titulo: "Ajustar a proposta",
      quem: nomeCliente(p),
      detalhe: p.comentario_cliente ? `pediu: “${p.comentario_cliente.slice(0, 60)}${p.comentario_cliente.length > 60 ? "…" : ""}”` : `ajuste pedido ${haQuanto(p.atualizado_em)}`,
      acao: "Ajustar",
      href: `/app/propostas/${p.id}`,
      quando: p.atualizado_em,
    });
  }
  type Aprovada = ComCliente & { id: string; respondida_em: string; contratos: { status: string }[] | null };
  for (const p of (aprovadas.data ?? []) as unknown as Aprovada[]) {
    if ((p.contratos ?? []).some((c) => c.status !== "cancelado")) continue;
    tarefas.push({
      chave: `sem-contrato-${p.id}`,
      nivel: "pendencia",
      icone: FileSignature,
      titulo: "Gerar o contrato",
      quem: nomeCliente(p),
      detalhe: `aprovou a proposta ${haQuanto(p.respondida_em)}`,
      acao: "Gerar contrato",
      href: `/app/propostas/${p.id}`,
      quando: p.respondida_em,
    });
  }
  for (const c of (rascunhos.data ?? []) as unknown as (ComCliente & { id: string; criado_em: string })[]) {
    tarefas.push({
      chave: `rascunho-${c.id}`,
      nivel: "pendencia",
      icone: FileSignature,
      titulo: "Enviar o contrato para assinatura",
      quem: nomeCliente(c),
      detalhe: `rascunho criado ${haQuanto(c.criado_em)}`,
      acao: "Abrir contrato",
      href: `/app/contratos/${c.id}`,
      quando: c.criado_em,
    });
  }
  for (const et of (revisoes.data ?? []) as unknown as (ComProjeto & { id: string; nome: string; projeto_id: string; atualizado_em: string })[]) {
    tarefas.push({
      chave: `revisao-${et.id}`,
      nivel: "pendencia",
      icone: RotateCcw,
      titulo: `Fazer a revisão do ${et.nome}`,
      quem: doProjeto(et),
      detalhe: `pedida ${haQuanto(et.atualizado_em)}`,
      acao: "Abrir projeto",
      href: `/app/projetos/${et.projeto_id}`,
      quando: et.atualizado_em,
    });
  }
  // Revisões além do limite sem decisão (cortesia ou aditivo), contadas em ordem por projeto.
  type Revisao = {
    id: string;
    decidido_em: string;
    cortesia: boolean;
    aditivo_id: string | null;
    etapa: (ComProjeto & { nome: string; projeto_id: string; projeto: { revisoes_incluidas: number; nome: string | null; cliente?: { nome: string | null } | null } | null }) | null;
  };
  const usadas = new Map<string, number>();
  for (const r of (revisoesContadas.data ?? []) as unknown as Revisao[]) {
    if (!r.etapa || r.cortesia) continue;
    const n = (usadas.get(r.etapa.projeto_id) ?? 0) + 1;
    usadas.set(r.etapa.projeto_id, n);
    if (n > (r.etapa.projeto?.revisoes_incluidas ?? 0) && !r.aditivo_id) {
      tarefas.push({
        chave: `excedente-${r.id}`,
        nivel: "pendencia",
        icone: Scale,
        titulo: "Revisão além do limite: cortesia ou aditivo?",
        quem: doProjeto(r.etapa),
        detalhe: `${r.etapa.nome} · ${haQuanto(r.decidido_em)}`,
        acao: "Decidir",
        href: `/app/projetos/${r.etapa.projeto_id}`,
        quando: r.decidido_em,
      });
    }
  }

  // Urgentes e de hoje pela data; pendências da mais antiga para a mais nova (RN-00.6).
  tarefas.sort((a, b) => (a.quando ?? "").localeCompare(b.quando ?? ""));
  const urgentes = tarefas.filter((t) => t.nivel === "urgente").length;
  const deHoje = tarefas.filter((t) => t.nivel === "hoje").length;
  const pendencias = tarefas.length - urgentes - deHoje;

  // Esperando o cliente: o mais antigo primeiro; 7 dias ou mais pede um lembrete.
  const esperas: Espera[] = [
    ...((enviadas.data ?? []) as unknown as (ComCliente & { id: string; enviada_em: string })[]).map((p) => ({
      chave: `proposta-${p.id}`,
      titulo: "Resposta da proposta",
      quem: nomeCliente(p),
      quando: p.enviada_em,
      href: `/app/propostas/${p.id}`,
    })),
    ...((aguardandoAssinatura.data ?? []) as unknown as (ComCliente & { id: string; enviado_em: string })[]).map((c) => ({
      chave: `assinatura-${c.id}`,
      titulo: "Assinatura do contrato",
      quem: nomeCliente(c),
      quando: c.enviado_em,
      href: `/app/contratos/${c.id}`,
    })),
    ...((aguardandoAprovacao.data ?? []) as unknown as (ComProjeto & { id: string; nome: string; projeto_id: string; enviada_em: string })[]).map((et) => ({
      chave: `aprovacao-${et.id}`,
      titulo: `Aprovação do ${et.nome}`,
      quem: doProjeto(et),
      quando: et.enviada_em,
      href: `/app/projetos/${et.projeto_id}`,
    })),
    ...((aditivosCliente.data ?? []) as unknown as (ComProjeto & { id: string; projeto_id: string; criado_em: string })[]).map((a) => ({
      chave: `aditivo-${a.id}`,
      titulo: "Resposta do aditivo",
      quem: doProjeto(a),
      quando: a.criado_em,
      href: `/app/projetos/${a.projeto_id}#aditivos`,
    })),
  ].sort((a, b) => (a.quando ?? "").localeCompare(b.quando ?? ""));

  // Financeiro do mês (Dono e Administrador).
  const totalReceber = pendentes.reduce((s, p) => s + Number(p.valor), 0);
  const totalAtrasado = atrasadas.reduce((s, p) => s + Number(p.valor), 0);
  const recebidoContratos = ((recebidosMes.data ?? []) as { valor: number }[]).reduce((s, p) => s + Number(p.valor), 0);
  const recebidoOutras = ((entradasMes.data ?? []) as { valor: number }[]).reduce((s, p) => s + Number(p.valor), 0);
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const despesasHoje = despesas.filter((d) => d.vencimento <= hoje).length;
  const mostrarFinanceiro = verValores && (totalReceber > 0 || recebidoContratos + recebidoOutras > 0 || despesas.length > 0);

  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(agora));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(agora);
  const mesNome = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: "long" }).format(agora);
  const diaSemana = (iso: string) =>
    iso === hoje ? "hoje" : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(new Date(`${iso}T12:00:00Z`)).replace(".", "");

  return (
    <div className="pagina-app inicio">
      <header className="inicio-topo">
        <div>
          <p className="inicio-data">{dataExtenso}</p>
          <h1>
            {saudacao}, {sessao.membro.nome.split(" ")[0]}
          </h1>
        </div>
        <div className="inicio-atalhos">
          <Link href="/app/clientes/novo" className="botao botao-primario">
            Novo cliente
          </Link>
          {verValores && (
            <Link href="/app/financeiro" className="botao botao-secundario">
              Financeiro
            </Link>
          )}
        </div>
      </header>

      {(urgentes > 0 || deHoje > 0 || pendencias > 0 || esperas.length > 0) && (
        <p className="inicio-resumo">
          {urgentes > 0 && <span className="inicio-chip inicio-chip-urgente">{urgentes} {urgentes === 1 ? "urgente" : "urgentes"}</span>}
          {deHoje > 0 && <span className="inicio-chip inicio-chip-hoje">{deHoje} para hoje</span>}
          {pendencias > 0 && <span className="inicio-chip">{pendencias} {pendencias === 1 ? "pendência" : "pendências"}</span>}
          {esperas.length > 0 && <span className="inicio-chip">{esperas.length} esperando o cliente</span>}
        </p>
      )}

      {dias !== null && (
        <p className="muted inicio-aviso">
          {dias > 0
            ? `Você está no teste grátis: faltam ${dias} ${dias === 1 ? "dia" : "dias"}, com todos os recursos do plano Profissional.`
            : "Seu teste grátis terminou. Escolha um plano para continuar criando."}
        </p>
      )}
      {avisoLimite && (
        <p className="contato-alerta aviso-com-acao">
          <span>{avisoLimite}</span>
          {pode(papel, "gerir_assinatura") && (
            <Link className="botao botao-secundario botao-pequeno" href="/app/assinatura">
              Ver planos
            </Link>
          )}
        </p>
      )}
      {faltamPassos > 0 && (
        <section className="cartao painel-passos" aria-labelledby="primeiros-passos">
          <h2 id="primeiros-passos">
            Primeiros passos <small className="muted">{passos.length - faltamPassos} de {passos.length}</small>
          </h2>
          <ol>
            {passos.map((p) => (
              <li key={p.texto} className={p.feito ? "feito" : ""}>
                {p.feito ? <CircleCheck size={18} aria-hidden="true" /> : <span className="painel-passo-marca" aria-hidden="true" />}
                {p.feito ? <span>{p.texto}</span> : <Link href={p.href}>{p.texto}</Link>}
                <span className="sr-only">{p.feito ? " (feito)" : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="inicio-grade">
        <section className="cartao inicio-cartao" aria-labelledby="para-fazer">
          <h2 id="para-fazer">
            Para fazer {tarefas.length > 0 && <span className="inicio-contador">{tarefas.length}</span>}
          </h2>
          {tarefas.length ? (
            <>
              <p className="inicio-sub">Em ordem de prioridade. Cada botão leva direto para onde se resolve.</p>
              <ListaTarefas tarefas={tarefas} />
            </>
          ) : (
            <p className="painel-em-dia">
              <CircleCheck size={20} aria-hidden="true" />
              Tudo em dia. Nenhuma pendência sua agora.
            </p>
          )}
        </section>

        <div className="inicio-lateral">
          <section className="cartao inicio-cartao" aria-labelledby="esperando-cliente">
            <h2 id="esperando-cliente">
              Esperando o cliente {esperas.length > 0 && <span className="inicio-contador">{esperas.length}</span>}
            </h2>
            {esperas.length ? (
              <>
                <p className="inicio-sub">Já está com o cliente. Lembre quem passou de 7 dias.</p>
                <ul className="inicio-lista">
                  {esperas.slice(0, 6).map((s) => {
                    const d = diasDesde(s.quando) ?? 0;
                    return (
                      <li key={s.chave} className="inicio-espera">
                        <Link href={s.href} className="inicio-espera-texto">
                          <strong>{s.titulo}</strong>
                          <small>
                            {s.quem} · enviado {haQuanto(s.quando)}
                          </small>
                        </Link>
                        {d >= 7 && (
                          <Link href={s.href} className="inicio-lembrar">
                            Lembrar cliente
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {esperas.length > 6 && <p className="inicio-sub inicio-mais-texto">E mais {esperas.length - 6}.</p>}
              </>
            ) : (
              <p className="inicio-sub">Nada esperando resposta do cliente.</p>
            )}
          </section>

          <section className="cartao inicio-cartao" aria-labelledby="entregas">
            <h2 id="entregas">
              <CalendarDays size={18} aria-hidden="true" /> Entregas da semana
            </h2>
            {agenda.length === 0 ? (
              <p className="inicio-sub">
                Nenhuma entrega prevista nos próximos 7 dias. Para acompanhar as entregas aqui, defina o prazo das etapas
                em <Link href="/app/projetos">Projetos</Link> (botão &quot;Alterar prazo&quot; em cada etapa).
              </p>
            ) : (
              <>
              <p className="inicio-sub">Prazos das etapas nos projetos em andamento.</p>
              <ul className="inicio-lista">
                {agenda.slice(0, 6).map((et) => {
                  const classe = et.prazo < hoje ? "atrasada" : et.prazo === hoje ? "hoje" : "";
                  return (
                    <li key={et.id}>
                      <Link href={`/app/projetos/${et.projeto_id}`} className="inicio-dia">
                        <span className={`inicio-calendario ${classe ? `inicio-calendario-${classe}` : ""}`}>
                          <b>{et.prazo.slice(8, 10)}</b>
                          <small>{diaSemana(et.prazo)}</small>
                        </span>
                        <span className="inicio-espera-texto">
                          <strong>{et.nome}</strong>
                          <small>
                            {doProjeto(et)}
                            {classe === "atrasada" ? " · atrasada" : et.status === "aguardando_aprovacao" ? " · com o cliente" : ""}
                          </small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </section>
        </div>
      </div>

      {mostrarFinanceiro && (
        <FinanceiroMes
          mesNome={mesNome}
          recebidoContratos={recebidoContratos}
          recebidoOutras={recebidoOutras}
          totalReceber={totalReceber}
          parcelasPendentes={pendentes.length}
          totalAtrasado={totalAtrasado}
          parcelasAtrasadas={atrasadas.length}
          totalDespesas={totalDespesas}
          despesasPendentes={despesas.length}
          despesasHoje={despesasHoje}
        />
      )}

      <section className="cartao secao-config painel-link">
        <h2>Seu link para receber pedidos de orçamento</h2>
        <LinkDoEscritorio link={linkDoEscritorio(sessao.escritorio.slug)} nome={sessao.escritorio.nome} />
      </section>
    </div>
  );
}
