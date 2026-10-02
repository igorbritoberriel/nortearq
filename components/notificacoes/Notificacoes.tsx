"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleCheck, ClipboardList, FileText, Inbox, PenLine, X } from "lucide-react";
import { buscarNotificacoesDesde, marcarNotificacaoLida, marcarTodasLidas } from "@/app/app/notificacoes";
import type { Notificacao, TipoNotificacao } from "@/lib/notificacoes";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Sininho do menu + aviso discreto no canto da tela quando o cliente faz algo.
// Regras para não incomodar: sem som; some sozinho em 8 s (pausa com o mouse em cima);
// várias novidades juntas viram um aviso só; nada aparece com a lista aberta;
// o arquiteto pode desligar os avisos na tela (fica só o sininho).

const ICONES: Record<TipoNotificacao, typeof Bell> = {
  contato: Inbox,
  briefing: ClipboardList,
  proposta: FileText,
  contrato: PenLine,
  etapa: CircleCheck,
};

const CHAVE_AVISOS = "nortearq:avisos-na-tela";
const DURACAO_AVISO = 8000;

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE_AVISOS) !== "nao";
  } catch {
    return true;
  }
}

function quando(data: string) {
  const minutos = Math.round((Date.now() - new Date(data).getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return "ontem";
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function Notificacoes({
  escritorioId,
  iniciais,
  naoLidasIniciais,
}: {
  escritorioId: string;
  iniciais: Notificacao[];
  naoLidasIniciais: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [lista, setLista] = useState(iniciais);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<Notificacao[]>([]);
  const [avisosNaTela, setAvisosNaTela] = useState(true);
  const [, setRelogio] = useState(0); // atualiza o "há 5 min"

  const vistos = useRef(new Set(iniciais.map((n) => n.id)));
  const maisRecente = useRef(iniciais[0]?.criada_em ?? new Date().toISOString());
  const painel = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estado = useRef({ aberto, avisosNaTela, pathname });
  estado.current = { aberto, avisosNaTela, pathname };

  useEffect(() => setAvisosNaTela(lerPreferencia()), []);

  const fecharAviso = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAviso([]);
  }, []);

  const agendarFechamento = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso([]), DURACAO_AVISO);
  }, []);

  // Chegou novidade (pelo tempo real ou ao voltar para a aba).
  const receber = useCallback(
    (novas: Notificacao[]) => {
      const ineditas = novas.filter((n) => !vistos.current.has(n.id));
      if (!ineditas.length) return;
      ineditas.forEach((n) => vistos.current.add(n.id));
      const ordenadas = [...ineditas].sort((a, b) => b.criada_em.localeCompare(a.criada_em));
      if (ordenadas[0].criada_em > maisRecente.current) maisRecente.current = ordenadas[0].criada_em;

      setLista((atual) => [...ordenadas, ...atual].slice(0, 30));
      setNaoLidas((n) => n + ordenadas.filter((x) => !x.lida_em).length);

      const { aberto: listaAberta, avisosNaTela: mostrar, pathname: caminho } = estado.current;
      if (mostrar && !listaAberta) {
        setAviso((atual) => [...ordenadas, ...atual]);
        agendarFechamento();
      }
      // Se o arquiteto está justamente na tela daquela novidade, atualiza os dados dela.
      if (ordenadas.some((n) => n.link && caminho.startsWith(n.link))) router.refresh();
    },
    [agendarFechamento, router],
  );

  // Tempo real (Supabase Realtime, respeita o RLS).
  useEffect(() => {
    const supabase = criarClienteNavegador();
    if (!supabase) return;
    let ativo = true;
    const canal = supabase.channel(`notificacoes-${escritorioId}`);

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      canal
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificacoes", filter: `escritorio_id=eq.${escritorioId}` },
          (mudanca) => receber([mudanca.new as Notificacao]),
        )
        .subscribe();
    })();

    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [escritorioId, receber]);

  // Reserva: ao voltar para a aba, busca o que chegou enquanto o tempo real estava desligado.
  useEffect(() => {
    const aoVoltar = async () => {
      if (document.visibilityState !== "visible") return;
      receber(await buscarNotificacoesDesde(maisRecente.current));
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [receber]);

  // "(2) Contatos · NorteArq" na aba do navegador. Observa o <title> porque o Next troca a cada página.
  useEffect(() => {
    const aplicar = () => {
      const base = document.title.replace(/^\(\d+\) /, "");
      const desejado = naoLidas > 0 ? `(${naoLidas}) ${base}` : base;
      if (document.title !== desejado) document.title = desejado;
    };
    aplicar();
    const observador = new MutationObserver(aplicar);
    observador.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observador.disconnect();
  }, [naoLidas]);

  // Fecha a lista com Esc ou clique fora.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  useEffect(() => {
    const intervalo = setInterval(() => setRelogio((n) => n + 1), 60000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function abrirNotificacao(n: Notificacao) {
    if (!n.lida_em) {
      setLista((atual) => atual.map((x) => (x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x)));
      setNaoLidas((q) => Math.max(0, q - 1));
      void marcarNotificacaoLida(n.id);
    }
    setAberto(false);
    fecharAviso();
    if (n.link) router.push(n.link);
  }

  function lerTodas() {
    const agora = new Date().toISOString();
    setLista((atual) => atual.map((x) => (x.lida_em ? x : { ...x, lida_em: agora })));
    setNaoLidas(0);
    void marcarTodasLidas();
  }

  function alternarAvisos() {
    const novo = !avisosNaTela;
    setAvisosNaTela(novo);
    try {
      localStorage.setItem(CHAVE_AVISOS, novo ? "sim" : "nao");
    } catch {
      // navegador sem armazenamento: vale só nesta visita
    }
  }

  return (
    <>
      <div className="notif">
        <button
          ref={botao}
          type="button"
          className="notif-botao"
          aria-expanded={aberto}
          aria-controls="notif-painel"
          onClick={() => {
            setAberto((a) => !a);
            fecharAviso();
          }}
        >
          <Bell size={18} aria-hidden="true" />
          <span>Notificações</span>
          {naoLidas > 0 && (
            <span className="notif-contador">
              {naoLidas > 99 ? "99+" : naoLidas}
              <span className="sr-only"> não lidas</span>
            </span>
          )}
        </button>

        {aberto && (
          <div ref={painel} id="notif-painel" className="notif-painel" role="dialog" aria-label="Notificações">
            <div className="notif-cabeca">
              <strong>Notificações</strong>
              {naoLidas > 0 && (
                <button type="button" className="botao-link notif-ler" onClick={lerTodas}>
                  <CheckCheck size={16} aria-hidden="true" />
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {lista.length === 0 ? (
              <p className="notif-vazio">
                Nada por aqui ainda. Quando um cliente pedir orçamento, responder o briefing, aprovar uma proposta, assinar o
                contrato ou responder uma etapa, aparece aqui.
              </p>
            ) : (
              <ul className="notif-lista">
                {lista.map((n) => {
                  const Icone = ICONES[n.tipo] ?? Bell;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`notif-item ${n.lida_em ? "" : "notif-nova"}`}
                        onClick={() => abrirNotificacao(n)}
                      >
                        <Icone size={18} aria-hidden="true" className="notif-icone" />
                        <span className="notif-textos">
                          <strong>{n.titulo}</strong>
                          {n.texto && <span>{n.texto}</span>}
                          <time dateTime={n.criada_em}>{quando(n.criada_em)}</time>
                        </span>
                        {!n.lida_em && <span className="notif-ponto" aria-label="não lida" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <label className="notif-preferencia">
              <input type="checkbox" checked={avisosNaTela} onChange={alternarAvisos} />
              <span>Mostrar aviso no canto da tela quando chegar novidade</span>
            </label>
          </div>
        )}
      </div>

      <div className="notif-avisos" aria-live="polite">
        {aviso.length > 0 && (
          <div className="notif-aviso" onMouseEnter={() => timer.current && clearTimeout(timer.current)} onMouseLeave={agendarFechamento}>
            {aviso.length === 1 ? (
              <button type="button" className="notif-aviso-corpo" onClick={() => abrirNotificacao(aviso[0])}>
                {(() => {
                  const Icone = ICONES[aviso[0].tipo] ?? Bell;
                  return <Icone size={20} aria-hidden="true" className="notif-icone" />;
                })()}
                <span className="notif-textos">
                  <strong>{aviso[0].titulo}</strong>
                  {aviso[0].texto && <span>{aviso[0].texto}</span>}
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="notif-aviso-corpo"
                onClick={() => {
                  fecharAviso();
                  setAberto(true);
                }}
              >
                <Bell size={20} aria-hidden="true" className="notif-icone" />
                <span className="notif-textos">
                  <strong>{aviso.length} novidades dos seus clientes</strong>
                  <span>{aviso[0].titulo} e mais {aviso.length - 1}</span>
                </span>
              </button>
            )}
            <button type="button" className="notif-aviso-fechar" onClick={fecharAviso} aria-label="Fechar aviso">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
