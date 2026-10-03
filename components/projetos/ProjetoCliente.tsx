import { Check, Receipt } from "lucide-react";
import { baixarArquivoCliente } from "@/app/c/[token]/projeto/acoes";
import { CartaoArquivo } from "@/components/arquivos/CartaoArquivo";
import { CapaProjeto, GaleriaRenders } from "@/components/arquivos/GaleriaRenders";
import { ProvedorArquivos } from "@/components/arquivos/ProvedorArquivos";
import { RespostaAditivo } from "@/components/projetos/RespostaAditivo";
import { RespostaEtapa } from "@/components/projetos/RespostaEtapa";
import { SITUACOES_EXTERNAS, STATUS_ADITIVO, resumoAditivo } from "@/lib/aditivos";
import { assinarCaminhos, rendersAtuais, type ArquivoVisivel } from "@/lib/arquivos";
import { STATUS_ETAPA, versoesAtuais, type ProjetoPublico } from "@/lib/projetos";
import { dataCurta, reais } from "@/lib/propostas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

// Conteúdo do projeto para o cliente: etapas, arquivos visíveis, aprovação, aditivos, aprovações externas
// e pagamentos. Usado pelo link do WhatsApp (/c/[token]/projeto) e pelo portal (/portal/projetos/[id]).
export async function ProjetoCliente({
  token,
  clienteNome,
  escritorioNome,
}: {
  token: string;
  clienteNome: string;
  escritorioNome: string;
}) {
  const supabase = (await criarClienteServidor())!;
  const { data: bruto, error } = await supabase.rpc("projeto_publico", { p_token: token });
  if (error || !bruto) {
    console.error("[projeto] abrir", error?.message);
    return (
      <div className="publico-sucesso">
        <h1>Não foi possível abrir o projeto</h1>
        <p>Atualize a página em instantes. Se continuar, avise o {escritorioNome}.</p>
      </div>
    );
  }
  const projeto = bruto as ProjetoPublico;

  // O banco só devolveu os arquivos já enviados a ele (visíveis, até o último envio de cada etapa):
  // aqui só geramos os endereços temporários do original, da miniatura e da prévia.
  const admin = criarClienteAdmin();
  const urls = admin
    ? await assinarCaminhos(
        admin.storage.from("projetos"),
        projeto.etapas.flatMap((e) => e.arquivos.flatMap((a) => [a.caminho, a.miniatura, a.previa])),
      )
    : {};
  const todos: ArquivoVisivel[] = projeto.etapas.flatMap((e) =>
    e.arquivos.map((a) => ({
      id: a.id,
      nome: a.nome,
      versao: a.versao,
      tipo: a.tipo,
      tamanho: a.tamanho,
      criado_em: a.criado_em,
      categoria: a.categoria ?? "outro",
      etapa_id: e.id,
      etapa: e.nome,
      url: urls[a.caminho] ?? null,
      miniatura: a.miniatura ? (urls[a.miniatura] ?? null) : null,
      previa: a.previa ? (urls[a.previa] ?? null) : null,
    })),
  );
  const renders = rendersAtuais(todos);
  const capa = (projeto.capa && todos.find((a) => a.id === projeto.capa!.id)) || null;

  const aprovadas = projeto.etapas.filter((e) => e.status === "aprovada").length;
  const aguardando = projeto.etapas.filter((e) => e.status === "aguardando_aprovacao");
  const aditivosPendentes = (projeto.aditivos ?? []).filter((a) => a.status === "enviado").length;

  return (
    <ProvedorArquivos todos={todos} baixar={baixarArquivoCliente.bind(null, token)}>
      {capa && <CapaProjeto nome={projeto.nome} capa={capa} lista={renders.length ? renders : [capa]} />}
      <p className="muted">Olá, {clienteNome}! Aqui você acompanha o seu projeto com o {escritorioNome}.</p>
      <h1>{projeto.nome}</h1>

      <div className="projeto-resumo projeto-resumo-cliente">
        <div className="cartao">
          <span className="muted">Etapas aprovadas</span>
          <strong>
            {aprovadas} de {projeto.etapas.length}
          </strong>
        </div>
        <div className="cartao">
          <span className="muted">Revisões usadas</span>
          <strong>
            {projeto.revisoes_usadas} de {projeto.revisoes_incluidas}
          </strong>
        </div>
      </div>

      {/* M8 da revisão de UX: o aviso leva direto ao que precisa de resposta. */}
      {aguardando.length > 0 && (
        <p className="contato-alerta aviso-com-acao">
          <span>
            {aguardando.length === 1
              ? `A etapa "${aguardando[0].nome}" está esperando a sua aprovação.`
              : `${aguardando.length} etapas estão esperando a sua aprovação.`}
          </span>
          <a className="botao botao-marca botao-pequeno" href={`#etapa-${aguardando[0].id}`}>
            Ver e responder
          </a>
        </p>
      )}
      {aditivosPendentes > 0 && (
        <p className="contato-alerta aviso-com-acao">
          <span>
            {aditivosPendentes === 1 ? "Um aditivo está esperando a sua resposta." : `${aditivosPendentes} aditivos estão esperando a sua resposta.`}
          </span>
          <a className="botao botao-marca botao-pequeno" href="#aditivos">
            Ver aditivo{aditivosPendentes === 1 ? "" : "s"}
          </a>
        </p>
      )}

      <GaleriaRenders renders={renders} capaId={capa?.id ?? null} />

      <ol className="etapas-cliente">
        {projeto.etapas.map((e) => {
          const daEtapa = todos.filter((a) => a.etapa_id === e.id);
          const atuais = versoesAtuais(daEtapa);
          const anteriores = daEtapa.filter((a) => !atuais.includes(a));
          return (
            <li key={e.id} id={`etapa-${e.id}`} className={`publico-form etapa-cliente etapa-${e.status}`}>
              <div className="etapa-topo">
                <span className="etapa-numero" aria-hidden="true">
                  {e.status === "aprovada" ? <Check size={16} /> : e.ordem}
                </span>
                <h2>{e.nome}</h2>
                <span className={`selo-status selo-etapa-status-${e.status}`}>{STATUS_ETAPA[e.status]}</span>
              </div>
              {e.aprovada_em && <p className="campo-ajuda">Aprovada em {data.format(new Date(e.aprovada_em))}.</p>}

              {atuais.length > 0 && (
                <ul className="grade-arquivos">
                  {atuais.map((a) => (
                    <CartaoArquivo key={a.id} arquivo={a} lista={atuais} />
                  ))}
                </ul>
              )}
              {anteriores.length > 0 && (
                <details className="arquivos-anteriores">
                  <summary>Versões anteriores ({anteriores.length})</summary>
                  <ul className="grade-arquivos grade-arquivos-pequena">
                    {anteriores.map((a) => (
                      <CartaoArquivo key={a.id} arquivo={a} lista={anteriores} />
                    ))}
                  </ul>
                </details>
              )}

              {e.historico.length > 0 && (
                <ul className="etapa-historico-cliente">
                  {e.historico.map((h, i) => (
                    <li key={i}>
                      <small className="muted">{data.format(new Date(h.em))}</small>{" "}
                      {h.decisao === "aprovada" ? "Você aprovou" : "Você pediu revisão"}
                      {h.comentario && <span className="etapa-comentario">“{h.comentario}”</span>}
                    </li>
                  ))}
                </ul>
              )}

              {e.status === "aguardando_aprovacao" && (
                <RespostaEtapa
                  token={token}
                  etapaId={e.id}
                  etapa={e.nome}
                  revisoesUsadas={projeto.revisoes_usadas}
                  revisoesIncluidas={projeto.revisoes_incluidas}
                />
              )}
            </li>
          );
        })}
      </ol>

      {!!projeto.aditivos?.length && (
        <section className="cartao projeto-pagamentos" id="aditivos">
          <h2>Aditivos</h2>
          <p className="muted">Serviços além do contratado. Nada é cobrado sem a sua aprovação.</p>
          <ul className="aditivos">
            {projeto.aditivos.map((a) => (
              <li key={a.id} className={`aditivo aditivo-${a.status}`}>
                <div className="aditivo-linha">
                  <span className="aditivo-descricao">
                    <strong>
                      Aditivo {a.numero}: {a.descricao}
                    </strong>
                    <small className="muted">{resumoAditivo(a)}</small>
                  </span>
                  <span className="aditivo-valor">
                    <strong>{reais(Number(a.valor))}</strong>
                    <span className={`selo-status selo-aditivo-${a.status}`}>
                      {a.status === "enviado" ? "Aguardando você" : STATUS_ADITIVO[a.status]}
                    </span>
                  </span>
                </div>
                {a.status === "enviado" && <RespostaAditivo token={token} aditivoId={a.id} valor={Number(a.valor)} />}
                {a.status === "recusado" && a.motivo_recusa && <p className="campo-ajuda">Motivo: {a.motivo_recusa}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!projeto.aprovacoes_externas?.length && (
        <section className="cartao projeto-pagamentos">
          <h2>Aprovações externas</h2>
          <ul className="externas">
            {projeto.aprovacoes_externas.map((x, i) => (
              <li key={i} className={`externa externa-${x.situacao}`}>
                <span className="externa-dados">
                  <strong>{x.orgao}</strong>
                  <small className="muted">
                    {[x.protocolo && `Protocolo ${x.protocolo}`, x.entrada_em && `entrada em ${dataCurta(x.entrada_em)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <span className={`selo-status selo-externa-${x.situacao}`}>{SITUACOES_EXTERNAS[x.situacao]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!projeto.pagamentos?.length && (
        <section className="cartao projeto-pagamentos">
          <h2>Pagamentos</h2>
          <ul className="pagamentos">
            {projeto.pagamentos.map((p, i) => (
              <li key={i}>
                <span className="pagamento-descricao">
                  {p.descricao}
                  <small className="muted">
                    {p.pago_em
                      ? `Pago em ${dataCurta(p.pago_em)}`
                      : `Pendente${p.vencimento ? ` · vence em ${dataCurta(p.vencimento)}` : ""}`}
                  </small>
                </span>
                <span className="projeto-pagamento-valor">
                  <strong>{reais(Number(p.valor))}</strong>
                  {p.pago_em && p.recibo_codigo && (
                    <a href={`/r/${p.recibo_codigo}`} target="_blank" rel="noopener noreferrer" className="link-recibo">
                      <Receipt size={14} aria-hidden="true" />
                      Recibo
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="campo-ajuda">
            Pago {reais(projeto.pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + Number(p.valor), 0))} de{" "}
            {reais(projeto.pagamentos.reduce((s, p) => s + Number(p.valor), 0))}
          </p>
        </section>
      )}
    </ProvedorArquivos>
  );
}
