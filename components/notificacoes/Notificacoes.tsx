"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleCheck, ClipboardList, CreditCard, FilePlus, FileText, Inbox, PenLine, Trash2, X } from "lucide-react";
import {
  buscarNotificacoesDesde,
  dispensarNotificacoes,
  lerNotificacoesDoLink,
  marcarNotificacoesLidas,
  marcarNotificacoesVistas,
  marcarTodasLidas,
} from "@/app/app/notificacoes";
import { agrupar, type GrupoNotificacao, type Notificacao, type TipoNotificacao } from "@/lib/notificacoes";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Sininho do menu + aviso discreto no canto da tela quando o cliente faz algo. Como GitHub, Linear e Slack:
// * número vermelho = novidades ainda não vistas: zera ao abrir o sininho;
// * "Não lidas" (padrão) e "Todas": abrir a notificação, ou a página daquele item, marca como lida;
// * X dispensa (sai da lista); "Limpar lidas" dispensa todas as lidas;
// * novidades do mesmo item viram um grupo ("3 novidades");
// * leitura por pessoa: o que um membro da equipe lê não some para os outros.
// Aviso na tela: sem som; some sozinho em 8 s (pausa com o mouse em cima); várias juntas viram um aviso só;
// nada aparece com a lista aberta; dá para desligar (fica só o sininho).

const ICONES: Record<TipoNotificacao, typeof Bell> = {
  contato: Inbox,
  briefing: ClipboardList,
  proposta: FileText,
  contrato: PenLine,
  etapa: CircleCheck,
  aditivo: FilePlus,
  assinatura: CreditCard,
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
  naoVistasIniciais,
}: {
  escritorioId: string;
  iniciais: Notificacao[];
  naoLidasIniciais: number;
  naoVistasIniciais: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [lista, setLista] = useState(iniciais);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);
  const [naoVistas, setNaoVistas] = useState(naoVistasIniciais);
  const [aba, setAba] = useState<"nao_lidas" | "todas">("nao_lidas");
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<Notificacao[]>([]);
  const [avisosNaTela, setAvisosNaTela] = useState(true);
  const [, setRelogio] = useState(0); // atualiza o "há 5 min"

  const vistos = useRef(new Set(iniciais.map((n) => n.id)));
  const maisRecente = useRef(iniciais[0]?.criada_em ?? new Date().toISOString());
  const painel = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estado = useRef({ aberto, avisosNaTela, pathname, lista });
  estado.current = { aberto, avisosNaTela, pathname, lista };

  useEffect(() => setAvisosNaTela(lerPreferencia()), []);

  const fecharAviso = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAviso([]);
  }, []);

  const agendarFechamento = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso([]), DURACAO_AVISO);
  }, []);

  // Marca como lidas na tela (na hora) e no banco (por trás).
  const marcarLidasLocal = useCallback((ids: string[]) => {
    const alvo = new Set(ids);
    const novas = estado.current.lista.filter((n) => alvo.has(n.id) && !n.lida).length;
    if (!novas) return;
    setLista((atual) => atual.map((n) => (alvo.has(n.id) ? { ...n, lida: true } : n)));
    setNaoLidas((q) => Math.max(0, q - novas));
  }, []);

  // Chegou novidade (pelo tempo real ou ao voltar para a aba).
  const receber = useCallback(
    (novas: Notificacao[]) => {
      const ineditas = novas.filter((n) => !vistos.current.has(n.id));
      if (!ineditas.length) return;
      ineditas.forEach((n) => vistos.current.add(n.id));
      const ordenadas = [...ineditas].sort((a, b) => b.criada_em.localeCompare(a.criada_em));
      if (ordenadas[0].criada_em > maisRecente.current) maisRecente.current = ordenadas[0].criada_em;

      setLista((atual) => [...ordenadas, ...atual].slice(0, 80));
      setNaoLidas((n) => n + ordenadas.length);

      const { aberto: listaAberta, avisosNaTela: mostrar, pathname: caminho } = estado.current;
      if (listaAberta) {
        void marcarNotificacoesVistas(); // já está vendo: não acende o número
      } else {
        setNaoVistas((n) => n + ordenadas.length);
        if (mostrar) {
          setAviso((atual) => [...ordenadas, ...atual]);
          agendarFechamento();
        }
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
          (mudanca) => receber([{ ...(mudanca.new as Notificacao), lida: false }]),
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

  // Entrou na página de um item com notificação não lida (pelo menu, por um link, por onde for): fica lida.
  useEffect(() => {
    const temAqui = estado.current.lista.some((n) => !n.lida && n.link === pathname);
    if (!temAqui) return;
    void lerNotificacoesDoLink(pathname).then((ids) => ids.length && marcarLidasLocal(ids));
  }, [pathname, marcarLidasLocal]);

  // "(2) Contatos · NorteArq" na aba do navegador. Observa o <title> porque o Next troca a cada página.
  useEffect(() => {
    const aplicar = () => {
      const base = document.title.replace(/^\(\d+\) /, "");
      const desejado = naoVistas > 0 ? `(${naoVistas}) ${base}` : base;
      if (document.title !== desejado) document.title = desejado;
    };
    aplicar();
    const observador = new MutationObserver(aplicar);
    observador.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observador.disconnect();
  }, [naoVistas]);

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

  function abrirPainel() {
    const abrir = !aberto;
    setAberto(abrir);
    fecharAviso();
    if (abrir && naoVistas > 0) {
      setNaoVistas(0);
      void marcarNotificacoesVistas();
    }
  }

  function abrirGrupo(ids: string[], link: string | null) {
    const naoLidasDoGrupo = lista.filter((n) => ids.includes(n.id) && !n.lida).map((n) => n.id);
    if (naoLidasDoGrupo.length) {
      marcarLidasLocal(naoLidasDoGrupo);
      void marcarNotificacoesLidas(naoLidasDoGrupo);
    }
    setAberto(false);
    fecharAviso();
    if (link) router.push(link);
  }

  function dispensar(g: GrupoNotificacao) {
    const alvo = new Set(g.ids);
    const naoLidasDoGrupo = lista.filter((n) => alvo.has(n.id) && !n.lida).length;
    setLista((atual) => atual.filter((n) => !alvo.has(n.id)));
    if (naoLidasDoGrupo) setNaoLidas((q) => Math.max(0, q - naoLidasDoGrupo));
    void dispensarNotificacoes(g.ids);
  }

  function lerTodas() {
    setLista((atual) => atual.map((n) => (n.lida ? n : { ...n, lida: true })));
    setNaoLidas(0);
    void marcarTodasLidas();
  }

  function limparLidas() {
    setLista((atual) => atual.filter((n) => !n.lida));
    void dispensarNotificacoes(null);
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

  const visiveis = aba === "nao_lidas" ? lista.filter((n) => !n.lida) : lista;
  const grupos = agrupar(visiveis);
  const temLidas = lista.some((n) => n.lida);

  return (
    <>
      <div className="notif">
        <button
          ref={botao}
          type="button"
          className="notif-botao"
          aria-expanded={aberto}
          aria-controls="notif-painel"
          onClick={abrirPainel}
        >
          <Bell size={18} aria-hidden="true" />
          <span>Notificações</span>
          {naoVistas > 0 && (
            <span className="notif-contador">
              {naoVistas > 99 ? "99+" : naoVistas}
              <span className="sr-only"> novas</span>
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
            <div className="notif-abas" role="tablist" aria-label="Filtrar notificações">
              <button type="button" role="tab" aria-selected={aba === "nao_lidas"} className="notif-aba" onClick={() => setAba("nao_lidas")}>
                Não lidas{naoLidas > 0 ? ` (${naoLidas > 99 ? "99+" : naoLidas})` : ""}
              </button>
              <button type="button" role="tab" aria-selected={aba === "todas"} className="notif-aba" onClick={() => setAba("todas")}>
                Todas
              </button>
              {aba === "todas" && temLidas && (
                <button type="button" className="botao-link notif-limpar" onClick={limparLidas}>
                  <Trash2 size={14} aria-hidden="true" />
                  Limpar lidas
                </button>
              )}
            </div>
            {grupos.length === 0 ? (
              aba === "nao_lidas" ? (
                <p className="notif-vazio">
                  <CheckCheck size={22} aria-hidden="true" />
                  Tudo em dia. Nenhuma notificação não lida.
                  {lista.length > 0 && (
                    <button type="button" className="botao-link" onClick={() => setAba("todas")}>
                      Ver todas
                    </button>
                  )}
                </p>
              ) : (
                <p className="notif-vazio">
                  Nada por aqui ainda. Quando um cliente pedir orçamento, responder o briefing, aprovar uma proposta,
                  assinar o contrato ou responder uma etapa, aparece aqui. As lidas saem sozinhas depois de 30 dias.
                </p>
              )
            ) : (
              <ul className="notif-lista">
                {grupos.map((g) => {
                  const n = g.principal;
                  const Icone = ICONES[n.tipo] ?? Bell;
                  return (
                    <li key={g.chave} className="notif-linha">
                      <button
                        type="button"
                        className={`notif-item ${g.lida ? "" : "notif-nova"}`}
                        onClick={() => abrirGrupo(g.ids, n.link)}
                      >
                        <Icone size={18} aria-hidden="true" className="notif-icone" />
                        <span className="notif-textos">
                          <strong>{n.titulo}</strong>
                          {n.texto && <span>{n.texto}</span>}
                          <time dateTime={n.criada_em}>
                            {quando(n.criada_em)}
                            {g.quantidade > 1 && ` · +${g.quantidade - 1} ${g.quantidade === 2 ? "novidade" : "novidades"} aqui`}
                          </time>
                        </span>
                        {!g.lida && <span className="notif-ponto" aria-label="não lida" />}
                      </button>
                      <button
                        type="button"
                        className="notif-dispensar"
                        onClick={() => dispensar(g)}
                        aria-label={`Dispensar: ${n.titulo}`}
                        title="Dispensar"
                      >
                        <X size={14} aria-hidden="true" />
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
              <button type="button" className="notif-aviso-corpo" onClick={() => abrirGrupo([aviso[0].id], aviso[0].link)}>
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
                  abrirPainel();
                }}
              >
                <Bell size={20} aria-hidden="true" className="notif-icone" />
                <span className="notif-textos">
                  <strong>{aviso.length} novidades dos seus clientes</strong>
                  <span>
                    {aviso[0].titulo} e mais {aviso.length - 1}
                  </span>
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
