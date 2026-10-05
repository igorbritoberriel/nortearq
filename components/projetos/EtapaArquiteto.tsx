"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, FilePlus, FileUp, Gift, Pencil, Trash2, X } from "lucide-react";
import { Confirmar } from "@/components/Confirmar";
import { Aviso } from "@/components/Campo";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { CartaoArquivo } from "@/components/arquivos/CartaoArquivo";
import {
  alternarVisibilidade,
  concederCortesia,
  enviarEtapa,
  espacoDoPlano,
  excluirArquivo,
  excluirEtapa,
  mudarCategoria,
  registrarArquivo,
  renomearEtapa,
} from "@/app/app/(sistema)/projetos/acoes";
import { CATEGORIAS, CATEGORIAS_ETAPA, formatarEspaco, sugerirCategoria, type ArquivoVisivel, type Categoria } from "@/lib/arquivos";
import { enviarDerivados, gerarDerivados } from "@/lib/miniaturas";
import { STATUS_ETAPA, TAMANHO_MAXIMO_ARQUIVO, nomeSeguro, rotuloVersao, versoesAtuais, type StatusEtapa } from "@/lib/projetos";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { useOrdemEtapas } from "./ListaEtapas";

export type DecisaoArquiteto = {
  id: string;
  decisao: "aprovada" | "revisao_pedida";
  comentario: string | null;
  decidido_em: string;
  ip: string | null;
  cortesia: boolean;
  excedente: boolean; // passou do limite contratado e ainda não virou cortesia
  aditivo_id: string | null; // cobrada por um aditivo (aguardando ou aprovado)
};

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function EtapaArquiteto({
  projetoId,
  etapa,
  arquivos,
  historico,
  cliente,
  podeCobrar = true,
}: {
  projetoId: string;
  etapa: { id: string; nome: string; ordem: number; status: StatusEtapa; enviada_em: string | null; aprovada_em: string | null };
  arquivos: ArquivoVisivel[];
  historico: DecisaoArquiteto[];
  cliente: { nome: string; telefone: string | null; escritorio: string };
  podeCobrar?: boolean; // dono ou administrador (lib/permissoes.ts)
}) {
  const [pendente, iniciar] = useTransition();
  const ordem = useOrdemEtapas();
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(etapa.nome);
  const [visivel, setVisivel] = useState(true);
  const [progresso, setProgresso] = useState<string | null>(null);

  // Mudanças aparecem na hora (useOptimistic) e voltam atrás sozinhas se o servidor recusar.
  const [otimista, aplicar] = useOptimistic(
    { arquivos, apagada: false },
    (
      estado,
      m:
        | { tipo: "visivel"; id: string; visivel: boolean }
        | { tipo: "categoria"; id: string; categoria: Categoria }
        | { tipo: "apagar"; id: string }
        | { tipo: "apagar-etapa" },
    ) => {
      if (m.tipo === "apagar-etapa") return { ...estado, apagada: true };
      if (m.tipo === "apagar") return { ...estado, arquivos: estado.arquivos.filter((a) => a.id !== m.id) };
      if (m.tipo === "categoria") {
        return { ...estado, arquivos: estado.arquivos.map((a) => (a.id === m.id ? { ...a, categoria: m.categoria } : a)) };
      }
      return { ...estado, arquivos: estado.arquivos.map((a) => (a.id === m.id ? { ...a, visivel: m.visivel } : a)) };
    },
  );
  const lista = otimista.arquivos;

  const aberta = etapa.status === "pendente" || etapa.status === "em_andamento" || etapa.status === "revisao";
  const atuais = versoesAtuais(lista);
  const anteriores = lista.filter((a) => !atuais.includes(a)).sort((x, y) => y.criado_em.localeCompare(x.criado_em));
  const temVisivel = lista.some((a) => a.visivel);

  function executar(
    acao: () => Promise<{ ok: true } | { erro: string } | void>,
    mudanca?: Parameters<typeof aplicar>[0],
  ) {
    setErro(null);
    iniciar(async () => {
      if (mudanca) aplicar(mudanca);
      const r = await acao();
      if (r && "erro" in r) setErro(r.erro);
    });
  }

  // Para cada arquivo: confere o espaço do plano, gera miniatura/prévia no navegador, sobe tudo e registra.
  async function enviarArquivos(lista: FileList | null) {
    const supabase = criarClienteNavegador();
    if (!lista?.length || !supabase) return;
    setErro(null);
    const todos = Array.from(lista);
    const espaco = await espacoDoPlano();
    let usado = espaco?.usado ?? 0;
    for (const [i, arquivo] of todos.entries()) {
      if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
        setErro(`${arquivo.name}: acima de 50 MB.`);
        continue;
      }
      if (espaco && usado + arquivo.size > espaco.limite) {
        setErro(
          `O espaço do seu plano acabou (${formatarEspaco(usado)} de ${formatarEspaco(espaco.limite)}). ` +
            "Apague arquivos que não usa ou mude de plano.",
        );
        break;
      }
      const passo = `${i + 1} de ${todos.length}: ${arquivo.name}`;
      setProgresso(`Preparando ${passo}`);
      const derivados = await gerarDerivados(arquivo, arquivo.name);
      setProgresso(`Enviando ${passo}`);
      const caminho = `${projetoId}/${etapa.id}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
      const { error } = await supabase.storage.from("projetos").upload(caminho, arquivo, {
        contentType: arquivo.type || "application/octet-stream",
      });
      if (error) {
        setErro(`${arquivo.name}: não foi possível enviar (${error.message}).`);
        continue;
      }
      const extras = derivados ? await enviarDerivados(supabase.storage, caminho, derivados) : null;
      const r = await registrarArquivo(projetoId, etapa.id, {
        nome: arquivo.name,
        caminho,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        visivel,
        categoria: sugerirCategoria(arquivo.name),
        miniatura: extras?.miniatura ?? null,
        previa: extras?.previa ?? null,
        derivadosBytes: extras?.bytes ?? 0,
      });
      if ("erro" in r) {
        setErro(`${arquivo.name}: ${r.erro}`);
        if (r.erro.includes("espaço")) break;
      } else {
        usado += arquivo.size + (extras?.bytes ?? 0);
      }
    }
    setProgresso(null);
  }

  const cartao = (a: ArquivoVisivel, grupo: ArquivoVisivel[]) => (
    <CartaoArquivo
      key={a.id}
      arquivo={a}
      lista={grupo}
      apagado={!a.visivel}
      selo={a.visivel ? undefined : "Interno"}
      detalhe={
        <>
          {" · "}
          {dataHora.format(new Date(a.criado_em))}
          {a.visivel && etapa.enviada_em && !a.enviado && <span className="arquivo-novo"> · vai no próximo envio</span>}
        </>
      }
      acoes={
        <>
          <select
            className="cartao-arquivo-tipo"
            aria-label={`Tipo de ${a.nome}`}
            value={a.categoria}
            disabled={pendente}
            onChange={(e) => {
              const categoria = e.target.value as Categoria;
              executar(() => mudarCategoria(projetoId, a.id, categoria), { tipo: "categoria", id: a.id, categoria });
            }}
          >
            {CATEGORIAS_ETAPA.map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="botao-icone"
            onClick={() =>
              executar(() => alternarVisibilidade(projetoId, a.id, !a.visivel), {
                tipo: "visivel",
                id: a.id,
                visivel: !a.visivel,
              })
            }
            aria-label={a.visivel ? `Esconder ${a.nome} do cliente` : `Mostrar ${a.nome} ao cliente`}
            title={a.visivel ? "Visível ao cliente" : "Só o escritório vê"}
          >
            {a.visivel ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
          </button>
          {aberta && (
            <button
              type="button"
              className="botao-icone"
              disabled={pendente}
              onClick={() => {
                if (confirm(`Apagar ${a.nome} (${rotuloVersao(a.versao)})?`)) {
                  executar(() => excluirArquivo(projetoId, a.id), { tipo: "apagar", id: a.id });
                }
              }}
              aria-label={`Apagar ${a.nome}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </>
      }
    />
  );

  if (otimista.apagada) return null;

  return (
    <section className={`cartao etapa etapa-${etapa.status}`} aria-labelledby={`etapa-${etapa.id}`}>
      <div className="etapa-topo">
        <span className="etapa-numero" aria-hidden="true">
          {etapa.status === "aprovada" ? <Check size={16} /> : etapa.ordem}
        </span>
        {editando ? (
          <form
            className="etapa-renomear"
            onSubmit={(e) => {
              e.preventDefault();
              executar(async () => {
                const r = await renomearEtapa(projetoId, etapa.id, nome);
                if ("ok" in r) setEditando(false);
                return r;
              });
            }}
          >
            <input aria-label="Nome da etapa" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} autoFocus />
            <button type="submit" className="botao-icone" aria-label="Salvar nome" disabled={pendente}>
              <Check size={16} aria-hidden="true" />
            </button>
            <button type="button" className="botao-icone" aria-label="Cancelar" onClick={() => setEditando(false)}>
              <X size={16} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <h2 id={`etapa-${etapa.id}`}>{etapa.nome}</h2>
        )}
        <span className={`selo-status selo-etapa-status-${etapa.status}`}>{STATUS_ETAPA[etapa.status]}</span>
        {aberta && !editando && (
          <span className="editor-botoes etapa-ferramentas">
            <button type="button" className="botao-icone" onClick={() => setEditando(true)} aria-label={`Renomear ${etapa.nome}`}>
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="botao-icone"
              disabled={!ordem?.podeSubir(etapa.id)}
              onClick={() => ordem?.mover(etapa.id, -1)}
              aria-label={`Subir ${etapa.nome}`}
            >
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="botao-icone"
              disabled={!ordem?.podeDescer(etapa.id)}
              onClick={() => ordem?.mover(etapa.id, 1)}
              aria-label={`Descer ${etapa.nome}`}
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
            {etapa.status === "pendente" && (
              <button
                type="button"
                className="botao-icone"
                disabled={pendente}
                onClick={() => {
                  if (confirm(`Apagar a etapa "${etapa.nome}"?`)) {
                    executar(() => excluirEtapa(projetoId, etapa.id), { tipo: "apagar-etapa" });
                  }
                }}
                aria-label={`Apagar ${etapa.nome}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </span>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {/* M6 da revisão de UX: em revisão, o pedido do cliente vem primeiro, não escondido no histórico. */}
      {etapa.status === "revisao" &&
        (() => {
          const pedido = [...historico].reverse().find((h) => h.decisao === "revisao_pedida");
          return pedido?.comentario ? (
            <div className="etapa-pedido-revisao">
              <strong>O cliente pediu:</strong>
              <p>“{pedido.comentario}”</p>
              <small className="muted">
                Envie a versão nova dos arquivos (mesmo nome) e mande a etapa de novo para aprovação.
              </small>
            </div>
          ) : null;
        })()}

      {atuais.length > 0 ? (
        <ul className="grade-arquivos">{atuais.map((a) => cartao(a, atuais))}</ul>
      ) : (
        <p className="muted">Nenhum arquivo ainda.</p>
      )}
      {anteriores.length > 0 && (
        <details className="arquivos-anteriores">
          <summary>Versões anteriores ({anteriores.length})</summary>
          <ul className="grade-arquivos grade-arquivos-pequena">{anteriores.map((a) => cartao(a, anteriores))}</ul>
        </details>
      )}

      {etapa.status !== "aprovada" && (
        <div className="etapa-envio">
          {/* M5 da revisão de UX: a escolha vale para os próximos arquivos, então vem antes do botão. */}
          <label className="checagem">
            <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
            <span>Os próximos arquivos ficam visíveis ao cliente</span>
          </label>
          <label className={`foto-enviar etapa-upload ${progresso ? "enviando" : ""}`}>
            <FileUp size={18} aria-hidden="true" />
            <span>{progresso ?? "Enviar arquivos (mesmo nome = nova versão)"}</span>
            <input
              type="file"
              multiple
              disabled={!!progresso}
              onChange={(e) => {
                void enviarArquivos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {(aberta || etapa.status === "aguardando_aprovacao") && (
        <div className="etapa-aprovacao">
          {!temVisivel ? (
            <p className="campo-ajuda">Para enviar ao cliente, a etapa precisa de pelo menos 1 arquivo visível.</p>
          ) : (
            <EnviarLinkAcao
              acao={enviarEtapa.bind(null, projetoId, etapa.id)}
              destino="projeto"
              telefone={cliente.telefone}
              cliente={cliente.nome}
              escritorio={cliente.escritorio}
              confirmar={
                etapa.status === "aguardando_aprovacao" ? undefined : (
                  <p>
                    <strong>
                      Enviar “{etapa.nome}” com {atuais.filter((a) => a.visivel).length}{" "}
                      {atuais.filter((a) => a.visivel).length === 1 ? "arquivo visível" : "arquivos visíveis"}?
                    </strong>{" "}
                    {cliente.nome.split(" ")[0]} recebe o link{cliente.telefone ? " no WhatsApp" : ""} e por e-mail. Depois
                    do envio, esses arquivos não podem mais ser apagados (só ganhar versão nova).
                  </p>
                )
              }
              rotulo={
                etapa.status === "aguardando_aprovacao"
                  ? cliente.telefone
                    ? "Lembrar o cliente no WhatsApp"
                    : "Gerar link novo"
                  : cliente.telefone
                    ? "Enviar para aprovação no WhatsApp"
                    : "Enviar para aprovação"
              }
            />
          )}
        </div>
      )}

      {historico.length > 0 && (
        <ol className="linha-tempo etapa-historico">
          {historico.map((h) => (
            <li key={h.id}>
              <time dateTime={h.decidido_em}>
                {dataHora.format(new Date(h.decidido_em))}
                {h.ip && ` · IP ${h.ip}`}
              </time>
              <span>
                <strong>{h.decisao === "aprovada" ? "Aprovada pelo cliente" : "Cliente pediu revisão"}</strong>
                {h.cortesia && " · cortesia"}
                {h.comentario && <span className="etapa-comentario">“{h.comentario}”</span>}
              </span>
              {h.excedente && h.aditivo_id && (
                <span className="etapa-excedente">
                  Passou do limite: cobrança enviada como aditivo.{" "}
                  <a className="tabela-link" href="#aditivos">
                    Ver aditivo
                  </a>
                </span>
              )}
              {h.excedente && !h.aditivo_id && !podeCobrar && (
                <span className="etapa-excedente">
                  Passou do limite de revisões. O dono ou um administrador decide se concede ou cobra.
                </span>
              )}
              {h.excedente && !h.aditivo_id && podeCobrar && (
                <span className="etapa-excedente">
                  Passou do limite de revisões.{" "}
                  <Confirmar
                    rotulo="Conceder como cortesia"
                    icone={<Gift size={14} aria-hidden="true" />}
                    classe="botao-link tabela-link"
                    aviso={
                      <p>
                        <strong>Conceder esta revisão como cortesia?</strong> Ela deixa de contar no limite e não poderá ser
                        cobrada depois.
                      </p>
                    }
                    confirmar="Conceder cortesia"
                    acao={() => concederCortesia(projetoId, h.id)}
                  />{" "}
                  ou{" "}
                  <a className="tabela-link" href={`/app/projetos/${projetoId}?cobrar=${h.id}#aditivos`}>
                    <FilePlus size={14} aria-hidden="true" /> Cobrar como aditivo
                  </a>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
