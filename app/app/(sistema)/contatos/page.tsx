import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Inbox } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { AcoesContato, MarcarVistos } from "@/components/contatos/AcoesContato";
import { LinkDoEscritorio } from "@/components/escritorio/FormulariosEscritorio";
import {
  MOTIVOS_ENCERRAMENTO,
  STATUS_CONTATO,
  formatarReais,
  formatarWhatsapp,
  type Contato,
} from "@/lib/contatos";
import { linkDoEscritorio, listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contatos" };

const FILTROS = [
  { valor: "abertos", rotulo: "Em aberto", status: ["compativel", "a_avaliar", "fora_do_perfil", "novo"] },
  { valor: "compativel", rotulo: "Compatíveis", status: ["compativel"] },
  { valor: "a_avaliar", rotulo: "A avaliar", status: ["a_avaliar", "novo"] },
  { valor: "fora_do_perfil", rotulo: "Fora do perfil", status: ["fora_do_perfil"] },
  { valor: "encerrados", rotulo: "Encerrados", status: ["encerrado", "convertido"] },
] as const;

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function ContatosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();

  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="01"
        titulo="Contatos"
        descricao="Ligue o Supabase no .env.local para ver os pedidos de orçamento."
        itens={["Lista de contatos com status", "Selo de compatibilidade", "Responder no WhatsApp", "Encerrar com motivo"]}
      />
    );
  }

  const pedido = (await searchParams).filtro;
  const filtro = FILTROS.find((f) => f.valor === pedido) ?? FILTROS[0];

  const [{ data, error }, servicos, { data: todos }] = await Promise.all([
    supabase
      .from("contatos")
      .select(
        "id, nome, whatsapp, email, servicos, area_m2, localizacao, orcamento_disponivel, prazo_desejado, inicio_desejado, mensagem, status, compativel, prazo_apertado, motivo_encerramento, observacao_encerramento, visto_em, cliente_id, criado_em",
      )
      .in("status", [...filtro.status])
      .order("criado_em", { ascending: false })
      .limit(200),
    listarServicos(),
    supabase.from("contatos").select("status"),
  ]);
  if (error) console.error("[contatos]", error.message);

  const contatos = (data ?? []) as Contato[];
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));
  const contagem = (status: readonly string[]) => (todos ?? []).filter((c) => status.includes(c.status)).length;

  return (
    <div className="pagina-app pagina-larga">
      <span className="selo">Módulo 01</span>
      <h1>Contatos</h1>
      <p className="muted">Pedidos de orçamento que chegaram pelo seu formulário. O filtro só sinaliza: quem decide é você.</p>

      <nav className="abas" aria-label="Filtrar contatos">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "abertos" ? "/app/contatos" : `/app/contatos?filtro=${f.valor}`}
            className={f.valor === filtro.valor ? "ativa" : ""}
            aria-current={f.valor === filtro.valor ? "page" : undefined}
          >
            {f.rotulo} <small>{contagem(f.status)}</small>
          </Link>
        ))}
      </nav>

      {contatos.length === 0 ? (
        <div className="cartao vazio">
          <Inbox size={36} aria-hidden="true" />
          {filtro.valor === "abertos" ? (
            <>
              <h2>Nenhum pedido em aberto</h2>
              <p className="muted">Divulgue o link do seu formulário: os pedidos aparecem aqui na hora.</p>
              <LinkDoEscritorio link={linkDoEscritorio(sessao.escritorio.slug)} nome={sessao.escritorio.nome} />
            </>
          ) : (
            <p className="muted">Nenhum contato aqui.</p>
          )}
        </div>
      ) : (
        <ul className="contatos">
          {contatos.map((c) => {
            const servicosDoContato = c.servicos.map((id) => nomeServico.get(id)).filter(Boolean);
            return (
              <li key={c.id} className="cartao contato">
                <div className="contato-topo">
                  <div>
                    <h2>
                      {c.nome}
                      {!c.visto_em && <span className="selo-novo">Novo</span>}
                    </h2>
                    <p className="muted contato-meio">
                      {[formatarWhatsapp(c.whatsapp), c.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="contato-selos">
                    <span className={`selo-status selo-${c.status}`}>{STATUS_CONTATO[c.status]}</span>
                    <time dateTime={c.criado_em}>{dataHora.format(new Date(c.criado_em))}</time>
                  </div>
                </div>

                {c.prazo_apertado && c.status !== "encerrado" && (
                  <p className="contato-alerta">
                    <AlertTriangle size={16} aria-hidden="true" />
                    Prazo apertado: quer começar antes da sua próxima data livre.
                  </p>
                )}

                <dl className="contato-dados">
                  <div>
                    <dt>Serviços</dt>
                    <dd>{servicosDoContato.length ? servicosDoContato.join(", ") : "—"}</dd>
                  </div>
                  <div>
                    <dt>Orçamento</dt>
                    <dd>{formatarReais(c.orcamento_disponivel) ?? "Não informou"}</dd>
                  </div>
                  <div>
                    <dt>Começar</dt>
                    <dd>{c.prazo_desejado ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Área</dt>
                    <dd>{c.area_m2 ? `${c.area_m2.toLocaleString("pt-BR")} m²` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Local</dt>
                    <dd>{c.localizacao ?? "—"}</dd>
                  </div>
                </dl>

                {c.mensagem && <blockquote className="contato-mensagem">{c.mensagem}</blockquote>}

                {c.status === "encerrado" && c.motivo_encerramento && (
                  <p className="muted contato-motivo">
                    Encerrado por: {MOTIVOS_ENCERRAMENTO[c.motivo_encerramento]}
                    {c.observacao_encerramento ? ` · ${c.observacao_encerramento}` : ""}
                  </p>
                )}

                <AcoesContato contato={c} escritorio={sessao.escritorio.nome} />
              </li>
            );
          })}
        </ul>
      )}

      <MarcarVistos ids={contatos.filter((c) => !c.visto_em).map((c) => c.id)} />
    </div>
  );
}
