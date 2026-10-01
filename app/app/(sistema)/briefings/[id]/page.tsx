import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, FileText, Heart, RotateCcw } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { EmConstrucao } from "@/components/EmConstrucao";
import {
  AMBIENTES,
  ESTILOS,
  ORDEM_SECOES,
  SECOES,
  STATUS_BRIEFING,
  ehPdf,
  formatarResposta,
  type Ambiente,
  type Estilo,
  type ImagemEstilo,
  type PerguntaBriefing,
  type Respostas,
  type StatusBriefing,
} from "@/lib/briefing";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { reabrirBriefing, validarBriefing } from "../acoes";

export const metadata: Metadata = { title: "Perfil do Cliente" };

const dataLonga = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Briefing = {
  id: string;
  status: StatusBriefing;
  tipos: string[];
  ambientes: Ambiente[];
  perguntas: PerguntaBriefing[];
  respostas: Respostas;
  estilos: ImagemEstilo[];
  estilos_curtidos: string[];
  estilos_principais: Estilo[];
  estilos_secundarios: Estilo[] | null;
  estilos_pontuacao: Record<Estilo, number> | null;
  respondido_em: string | null;
  validado_em: string | null;
  criado_em: string;
  cliente: { id: string; nome: string } | null;
};

// Perfil do Cliente (RN-02.8): estilo, ambientes, necessidades e referências, com a marca do escritório.
export default async function PerfilClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="02" titulo="Perfil do Cliente" itens={["Ligue o Supabase no .env.local."]} />;
  }
  if (!UUID.test(id)) notFound();

  const { data } = await supabase
    .from("briefings")
    .select(
      "id, status, tipos, ambientes, perguntas, respostas, estilos, estilos_curtidos, estilos_principais, estilos_secundarios, estilos_pontuacao, respondido_em, validado_em, criado_em, cliente:clientes(id, nome)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const b = data as unknown as Briefing;
  const { escritorio } = sessao;

  // Seções na ordem do cliente; em interiores, só os ambientes que ele escolheu.
  const secoes = ORDEM_SECOES.flatMap((secao) => {
    const daSecao = b.perguntas.filter((p) => p.secao === secao);
    if (secao !== "interiores") return daSecao.length ? [{ titulo: SECOES[secao].titulo, perguntas: daSecao }] : [];
    const gerais = daSecao.filter((p) => !p.ambiente);
    return [
      ...(gerais.length ? [{ titulo: SECOES.interiores.titulo, perguntas: gerais }] : []),
      ...(Object.keys(AMBIENTES) as Ambiente[])
        .filter((a) => b.ambientes.includes(a))
        .map((a) => ({ titulo: AMBIENTES[a], perguntas: daSecao.filter((p) => p.ambiente === a) }))
        .filter((s) => s.perguntas.length),
    ];
  });

  // Fotos: endereços temporários (o bucket é privado).
  const caminhos = b.perguntas
    .filter((p) => p.tipo === "foto")
    .flatMap((p) => (Array.isArray(b.respostas[p.id]) ? (b.respostas[p.id] as string[]) : []));
  const urls: Record<string, string> = {};
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("briefings").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls[a.path] = a.signedUrl;
  }

  const curtidas = b.estilos.filter((e) => b.estilos_curtidos.includes(e.id));
  const pontuacao = Object.entries(b.estilos_pontuacao ?? {})
    .map(([estilo, pct]) => ({ estilo: estilo as Estilo, pct: Number(pct) }))
    .sort((x, y) => y.pct - x.pct);
  const aberto = b.status === "pendente" || b.status === "em_andamento";

  return (
    <div className="pagina-app pagina-larga perfil">
      <div className="nao-imprimir">
        <Link href="/app/briefings" className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Briefings
        </Link>
        <div className="perfil-acoes">
          <span className={`selo-status selo-briefing-${b.status}`}>{STATUS_BRIEFING[b.status]}</span>
          {b.status === "respondido" && (
            <form action={validarBriefing.bind(null, b.id)}>
              <button type="submit" className="botao botao-secundario">
                <BadgeCheck size={18} aria-hidden="true" />
                Validar com o cliente
              </button>
            </form>
          )}
          {(b.status === "respondido" || b.status === "validado") && (
            <form action={reabrirBriefing.bind(null, b.id)}>
              <button type="submit" className="botao botao-fantasma" title="O cliente volta a editar pelo mesmo link">
                <RotateCcw size={18} aria-hidden="true" />
                Reabrir para o cliente
              </button>
            </form>
          )}
          <BotaoImprimir />
        </div>
        {aberto && (
          <p className="contato-alerta">O cliente ainda está respondendo. Você está vendo o que já foi salvo.</p>
        )}
        {b.status === "respondido" && (
          <p className="campo-ajuda">
            Depois da reunião com o cliente, valide o briefing: ele vira o programa de necessidades oficial do projeto.
          </p>
        )}
      </div>

      <header className="perfil-topo">
        <div className="perfil-marca">
          {escritorio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={escritorio.logo_url} alt={escritorio.nome} />
          ) : (
            <strong>{escritorio.nome}</strong>
          )}
        </div>
        <p className="perfil-rotulo">Perfil do Cliente</p>
        <h1>{b.cliente?.nome ?? "Cliente"}</h1>
        <p className="muted">
          {b.respondido_em ? `Respondido em ${dataLonga.format(new Date(b.respondido_em))}` : "Ainda não enviado"}
          {b.validado_em && ` · validado em ${dataLonga.format(new Date(b.validado_em))}`}
        </p>
      </header>

      {b.estilos.length > 0 && (
        <section className="cartao perfil-secao">
          <h2>Estilo</h2>
          {b.estilos_principais.length ? (
            <p className="perfil-estilo">
              <strong>{b.estilos_principais.map((e) => ESTILOS[e] ?? e).join(" e ")}</strong>
              {b.estilos_secundarios?.length ? (
                <span className="muted"> com toques de {b.estilos_secundarios.map((e) => ESTILOS[e] ?? e).join(" e ")}</span>
              ) : null}
            </p>
          ) : (
            <p className="muted">{aberto ? "Calculado quando o cliente enviar." : "O cliente não marcou nenhuma imagem."}</p>
          )}
          {pontuacao.length > 0 && (
            <ul className="perfil-barras">
              {pontuacao.map(({ estilo, pct }) => (
                <li key={estilo}>
                  <span>{ESTILOS[estilo] ?? estilo}</span>
                  <span className="perfil-barra" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span>{pct}%</span>
                </li>
              ))}
            </ul>
          )}
          {curtidas.length > 0 && (
            <>
              <h3 className="perfil-sub">
                <Heart size={16} aria-hidden="true" /> Imagens que o cliente gostou
              </h3>
              <ul className="fotos">
                {curtidas.map((img) => (
                  <li key={img.id} className="foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Referência de estilo ${ESTILOS[img.estilo] ?? img.estilo}`} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {secoes.map((secao) => (
        <section key={secao.titulo} className="cartao perfil-secao">
          <h2>{secao.titulo}</h2>
          <dl className="perfil-respostas">
            {secao.perguntas.map((p) => {
              const valor = b.respostas[p.id];
              if (p.tipo === "foto") {
                const lista = Array.isArray(valor) ? valor : [];
                return (
                  <div key={p.id}>
                    <dt>{p.texto}</dt>
                    <dd>
                      {lista.length ? (
                        <ul className="fotos">
                          {lista.map((c, i) => (
                            <li key={c} className="foto">
                              <a href={urls[c]} target="_blank" rel="noopener noreferrer">
                                {ehPdf(c) || !urls[c] ? (
                                  <span className="foto-arquivo">
                                    <FileText size={28} aria-hidden="true" />
                                    {ehPdf(c) ? "PDF" : "Foto"} {i + 1}
                                  </span>
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={urls[c]} alt={`${p.texto}, arquivo ${i + 1}`} />
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="muted">Nenhum arquivo</span>
                      )}
                    </dd>
                  </div>
                );
              }
              const texto = formatarResposta(p, valor);
              return (
                <div key={p.id}>
                  <dt>{p.texto}</dt>
                  <dd className={texto ? "" : "muted"}>{texto ?? "Não respondeu"}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      {b.cliente && (
        <p className="nao-imprimir">
          <Link className="tabela-link" href={`/app/clientes/${b.cliente.id}`}>
            Abrir a ficha do cliente
          </Link>
        </p>
      )}
    </div>
  );
}
