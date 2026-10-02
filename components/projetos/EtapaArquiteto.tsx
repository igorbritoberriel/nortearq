"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, FileUp, Gift, Pencil, Trash2, X } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import {
  alternarVisibilidade,
  concederCortesia,
  enviarEtapa,
  excluirArquivo,
  excluirEtapa,
  registrarArquivo,
  renomearEtapa,
} from "@/app/app/(sistema)/projetos/acoes";
import {
  STATUS_ETAPA,
  TAMANHO_MAXIMO_ARQUIVO,
  formatarTamanho,
  nomeSeguro,
  rotuloVersao,
  versoesAtuais,
  type StatusEtapa,
} from "@/lib/projetos";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { useOrdemEtapas } from "./ListaEtapas";

export type ArquivoArquiteto = {
  id: string;
  nome: string;
  versao: number;
  tamanho_bytes: number | null;
  visivel_cliente: boolean;
  criado_em: string;
  url: string | null;
};

export type DecisaoArquiteto = {
  id: string;
  decisao: "aprovada" | "revisao_pedida";
  comentario: string | null;
  decidido_em: string;
  ip: string | null;
  cortesia: boolean;
  excedente: boolean; // passou do limite contratado e ainda não virou cortesia
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
}: {
  projetoId: string;
  etapa: { id: string; nome: string; ordem: number; status: StatusEtapa; enviada_em: string | null; aprovada_em: string | null };
  arquivos: ArquivoArquiteto[];
  historico: DecisaoArquiteto[];
  cliente: { nome: string; telefone: string | null; escritorio: string };
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
    (estado, m: { tipo: "visivel"; id: string; visivel: boolean } | { tipo: "apagar"; id: string } | { tipo: "apagar-etapa" }) => {
      if (m.tipo === "apagar-etapa") return { ...estado, apagada: true };
      if (m.tipo === "apagar") return { ...estado, arquivos: estado.arquivos.filter((a) => a.id !== m.id) };
      return { ...estado, arquivos: estado.arquivos.map((a) => (a.id === m.id ? { ...a, visivel_cliente: m.visivel } : a)) };
    },
  );
  const lista = otimista.arquivos;

  const aberta = etapa.status === "pendente" || etapa.status === "em_andamento" || etapa.status === "revisao";
  const atuais = versoesAtuais(lista);
  const anteriores = lista.filter((a) => !atuais.includes(a)).sort((x, y) => y.criado_em.localeCompare(x.criado_em));
  const temVisivel = lista.some((a) => a.visivel_cliente);

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

  async function enviarArquivos(lista: FileList | null) {
    const supabase = criarClienteNavegador();
    if (!lista?.length || !supabase) return;
    setErro(null);
    const todos = Array.from(lista);
    for (const [i, arquivo] of todos.entries()) {
      if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
        setErro(`${arquivo.name}: acima de 50 MB.`);
        continue;
      }
      setProgresso(`Enviando ${i + 1} de ${todos.length}: ${arquivo.name}`);
      const caminho = `${projetoId}/${etapa.id}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
      const { error } = await supabase.storage.from("projetos").upload(caminho, arquivo, {
        contentType: arquivo.type || "application/octet-stream",
      });
      if (error) {
        setErro(`${arquivo.name}: não foi possível enviar (${error.message}).`);
        continue;
      }
      const r = await registrarArquivo(projetoId, etapa.id, {
        nome: arquivo.name,
        caminho,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        visivel,
      });
      if ("erro" in r) setErro(`${arquivo.name}: ${r.erro}`);
    }
    setProgresso(null);
  }

  const linhaArquivo = (a: ArquivoArquiteto) => (
    <li key={a.id} className={a.visivel_cliente ? "" : "arquivo-interno"}>
      <span className="arquivo-nome">
        {a.url ? (
          <a className="tabela-link" href={a.url} target="_blank" rel="noopener noreferrer">
            {a.nome}
          </a>
        ) : (
          a.nome
        )}
        <small className="muted">
          {rotuloVersao(a.versao)} · {formatarTamanho(a.tamanho_bytes)} · {dataHora.format(new Date(a.criado_em))}
          {!a.visivel_cliente && " · interno"}
        </small>
      </span>
      <span className="editor-botoes">
        <button
          type="button"
          className="botao-icone"
          onClick={() =>
            executar(() => alternarVisibilidade(projetoId, a.id, !a.visivel_cliente), {
              tipo: "visivel",
              id: a.id,
              visivel: !a.visivel_cliente,
            })
          }
          aria-label={a.visivel_cliente ? `Esconder ${a.nome} do cliente` : `Mostrar ${a.nome} ao cliente`}
          title={a.visivel_cliente ? "Visível ao cliente" : "Só você vê"}
        >
          {a.visivel_cliente ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
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
      </span>
    </li>
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

      {atuais.length > 0 ? (
        <ul className="arquivos">{atuais.map(linhaArquivo)}</ul>
      ) : (
        <p className="muted">Nenhum arquivo ainda.</p>
      )}
      {anteriores.length > 0 && (
        <details className="arquivos-anteriores">
          <summary>Versões anteriores ({anteriores.length})</summary>
          <ul className="arquivos">{anteriores.map(linhaArquivo)}</ul>
        </details>
      )}

      {etapa.status !== "aprovada" && (
        <div className="etapa-envio">
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
          <label className="checagem">
            <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
            <span>Visível ao cliente</span>
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
              {h.excedente && (
                <span className="etapa-excedente">
                  Passou do limite de revisões.{" "}
                  <button
                    type="button"
                    className="botao-link tabela-link"
                    disabled={pendente}
                    onClick={() => executar(() => concederCortesia(projetoId, h.id))}
                  >
                    <Gift size={14} aria-hidden="true" /> Conceder como cortesia
                  </button>{" "}
                  ou cobre como aditivo (em breve).
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
