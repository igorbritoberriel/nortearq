import { Check, Download, ExternalLink, Receipt } from "lucide-react";
import { RespostaAditivo } from "@/components/projetos/RespostaAditivo";
import { RespostaEtapa } from "@/components/projetos/RespostaEtapa";
import { SITUACOES_EXTERNAS, STATUS_ADITIVO, resumoAditivo } from "@/lib/aditivos";
import { exigirLink } from "@/lib/link-cliente";
import {
  STATUS_ETAPA,
  abreNaTela,
  formatarTamanho,
  rotuloVersao,
  versoesAtuais,
  type ArquivoProjeto,
  type ProjetoPublico,
} from "@/lib/projetos";
import { dataCurta, reais } from "@/lib/propostas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

// Projeto do cliente pelo link do WhatsApp (módulo 03): etapas, arquivos visíveis e aprovação.
export default async function ProjetoClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await exigirLink(token, "projeto");
  if (link === undefined) {
    return (
      <div className="publico-sucesso">
        <h1>Seu projeto</h1>
        <p>Ligue o Supabase no .env.local para ver o projeto de verdade.</p>
      </div>
    );
  }
  if (!link.valido) return null; // o layout mostra o aviso de link vencido

  const supabase = (await criarClienteServidor())!;
  const { data: bruto, error } = await supabase.rpc("projeto_publico", { p_token: token });
  if (error || !bruto) {
    console.error("[projeto] abrir", error?.message);
    return (
      <div className="publico-sucesso">
        <h1>Não foi possível abrir o projeto</h1>
        <p>Atualize a página em instantes. Se continuar, avise o {link.escritorio.nome}.</p>
      </div>
    );
  }
  const projeto = bruto as ProjetoPublico;

  // O banco só devolveu arquivos visíveis deste projeto: aqui só geramos os endereços temporários.
  const caminhos = projeto.etapas.flatMap((e) => e.arquivos.map((a) => a.caminho));
  const urls: Record<string, string> = {};
  const admin = criarClienteAdmin();
  if (admin && caminhos.length) {
    const { data: assinadas } = await admin.storage.from("projetos").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls[a.path] = a.signedUrl;
  }

  const aprovadas = projeto.etapas.filter((e) => e.status === "aprovada").length;
  const aguardando = projeto.etapas.filter((e) => e.status === "aguardando_aprovacao");

  const arquivo = (a: ArquivoProjeto) => (
    <li key={a.id}>
      {urls[a.caminho] ? (
        <a className="arquivo-link" href={urls[a.caminho]} target="_blank" rel="noopener noreferrer" download={abreNaTela(a.tipo) ? undefined : a.nome}>
          {abreNaTela(a.tipo) ? <ExternalLink size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {a.nome}
        </a>
      ) : (
        <span>{a.nome}</span>
      )}
      <small className="muted">
        {rotuloVersao(a.versao)} · {formatarTamanho(a.tamanho)}
      </small>
    </li>
  );

  return (
    <>
      <p className="muted">Olá, {link.cliente_nome}! Aqui você acompanha o seu projeto com o {link.escritorio.nome}.</p>
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

      {aguardando.length > 0 && (
        <p className="contato-alerta">
          {aguardando.length === 1
            ? `A etapa "${aguardando[0].nome}" está esperando a sua aprovação.`
            : `${aguardando.length} etapas estão esperando a sua aprovação.`}
        </p>
      )}

      <ol className="etapas-cliente">
        {projeto.etapas.map((e) => {
          const atuais = versoesAtuais(e.arquivos);
          const anteriores = e.arquivos.filter((a) => !atuais.includes(a));
          return (
            <li key={e.id} className={`publico-form etapa-cliente etapa-${e.status}`}>
              <div className="etapa-topo">
                <span className="etapa-numero" aria-hidden="true">
                  {e.status === "aprovada" ? <Check size={16} /> : e.ordem}
                </span>
                <h2>{e.nome}</h2>
                <span className={`selo-status selo-etapa-status-${e.status}`}>{STATUS_ETAPA[e.status]}</span>
              </div>
              {e.aprovada_em && <p className="campo-ajuda">Aprovada em {data.format(new Date(e.aprovada_em))}.</p>}

              {atuais.length > 0 && <ul className="arquivos arquivos-cliente">{atuais.map(arquivo)}</ul>}
              {anteriores.length > 0 && (
                <details className="arquivos-anteriores">
                  <summary>Versões anteriores ({anteriores.length})</summary>
                  <ul className="arquivos arquivos-cliente">{anteriores.map(arquivo)}</ul>
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
    </>
  );
}
