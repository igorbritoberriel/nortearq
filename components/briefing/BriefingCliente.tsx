"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, Cloud, CloudOff, Send } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { CampoPergunta, EnvioFotos } from "@/components/briefing/CampoPergunta";
import { QuizEstilo } from "@/components/briefing/QuizEstilo";
import { enviarBriefing, salvarBriefing } from "@/app/c/[token]/briefing/acoes";
import {
  AMBIENTES,
  MINIMO_IMAGENS_QUIZ,
  ORDEM_SECOES,
  SECOES,
  respondida,
  type Ambiente,
  type BriefingPublico,
  type PerguntaBriefing,
  type Resposta,
  type Respostas,
} from "@/lib/briefing";

type Passo = {
  id: string;
  tipo: "inicio" | "quiz" | "ambientes" | "perguntas" | "revisao";
  titulo: string;
  descricao?: string;
  perguntas: PerguntaBriefing[];
};

type Dados = { respostas: Respostas; ambientes: Ambiente[]; curtidos: string[]; rejeitados: string[] };
type EstadoSalvo = "salvo" | "pendente" | "salvando" | "erro";

// Passos do briefing: só os blocos dos serviços do cliente (RN-02.1) e, em interiores,
// um passo por ambiente escolhido.
function montarPassos(briefing: BriefingPublico, ambientes: Ambiente[]): Passo[] {
  const passos: Passo[] = [{ id: "inicio", tipo: "inicio", titulo: "Boas-vindas", perguntas: [] }];
  if (briefing.estilos.length >= MINIMO_IMAGENS_QUIZ) {
    passos.push({
      id: "quiz",
      tipo: "quiz",
      titulo: "Seu estilo",
      descricao: "Sem pensar muito: você gosta deste ambiente?",
      perguntas: [],
    });
  }

  for (const secao of ORDEM_SECOES) {
    const daSecao = briefing.perguntas.filter((p) => p.secao === secao);
    if (!daSecao.length) continue;

    if (secao === "interiores") {
      const disponiveis = (Object.keys(AMBIENTES) as Ambiente[]).filter((a) => daSecao.some((p) => p.ambiente === a));
      const gerais = daSecao.filter((p) => !p.ambiente);
      if (disponiveis.length || gerais.length) {
        passos.push({
          id: "ambientes",
          tipo: disponiveis.length ? "ambientes" : "perguntas",
          titulo: SECOES.interiores.titulo,
          descricao: SECOES.interiores.descricao,
          perguntas: gerais,
        });
      }
      for (const a of disponiveis.filter((a) => ambientes.includes(a))) {
        passos.push({ id: `ambiente-${a}`, tipo: "perguntas", titulo: AMBIENTES[a], perguntas: daSecao.filter((p) => p.ambiente === a) });
      }
      continue;
    }

    passos.push({ id: secao, tipo: "perguntas", titulo: SECOES[secao].titulo, descricao: SECOES[secao].descricao, perguntas: daSecao });
  }

  passos.push({ id: "revisao", tipo: "revisao", titulo: "Revisar e enviar", perguntas: [] });
  return passos;
}

export function BriefingCliente({
  token,
  briefing,
  miniaturas: miniaturasIniciais,
  cliente,
  escritorio,
  fotosDisponiveis,
  demonstracao = false,
}: {
  token: string;
  briefing: BriefingPublico;
  miniaturas: Record<string, string>;
  cliente: string;
  escritorio: string;
  fotosDisponiveis: boolean;
  demonstracao?: boolean; // pré-visualização: nada é gravado
}) {
  const [dados, setDados] = useState<Dados>({
    respostas: briefing.respostas,
    ambientes: briefing.ambientes,
    curtidos: briefing.curtidos,
    rejeitados: briefing.rejeitados,
  });
  const [miniaturas, setMiniaturas] = useState(miniaturasIniciais);
  const [indice, setIndice] = useState(0);
  const [salvo, setSalvo] = useState<EstadoSalvo>("salvo");
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const passos = useMemo(() => montarPassos(briefing, dados.ambientes), [briefing, dados.ambientes]);
  const atual = Math.min(indice, passos.length - 1);
  const passo = passos[atual];
  const comecou = briefing.status === "em_andamento";
  const titulo = useRef<HTMLHeadingElement>(null);

  // ---------- Salvamento automático (RN-02.3) ----------
  // Uma gravação por vez, sempre com o estado mais recente.
  const aSalvar = useRef<Dados | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fila = useRef<Promise<void>>(Promise.resolve());

  function gravar() {
    clearTimeout(espera.current);
    fila.current = fila.current.then(async () => {
      const d = aSalvar.current;
      if (!d) return;
      aSalvar.current = null;
      setSalvo("salvando");
      const resultado = demonstracao
        ? ({ ok: true } as const)
        : await salvarBriefing(token, d).catch(() => ({ erro: "Sem conexão. Tentando de novo…" }));
      if ("erro" in resultado) {
        aSalvar.current ??= d; // tenta de novo daqui a pouco
        setSalvo("erro");
        setErroSalvar(resultado.erro);
        espera.current = setTimeout(gravar, 8000);
        return;
      }
      setErroSalvar(null);
      if (!aSalvar.current) setSalvo("salvo");
    });
    return fila.current;
  }

  function atualizar(novo: Dados) {
    setDados(novo);
    aSalvar.current = novo;
    setSalvo("pendente");
    clearTimeout(espera.current);
    espera.current = setTimeout(gravar, 1200);
  }

  // Avisa antes de fechar a aba com alteração ainda não gravada.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (aSalvar.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  // Volta para o passo onde o cliente parou (fica só neste aparelho).
  const chavePasso = `nortearq-briefing-${briefing.id}`;
  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem(chavePasso));
      if (guardado > 0) setIndice(guardado);
    } catch {}
  }, [chavePasso]);

  function irPara(novo: number) {
    void gravar();
    const destino = Math.max(0, Math.min(novo, passos.length - 1));
    setIndice(destino);
    try {
      localStorage.setItem(chavePasso, String(destino));
    } catch {}
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  }

  // ---------- Respostas ----------
  const responder = (id: string, valor: Resposta) => atualizar({ ...dados, respostas: { ...dados.respostas, [id]: valor } });

  const alternarAmbiente = (a: Ambiente) =>
    atualizar({
      ...dados,
      ambientes: dados.ambientes.includes(a) ? dados.ambientes.filter((x) => x !== a) : [...dados.ambientes, a],
    });

  const avaliarImagem = (id: string, gostou: boolean) => {
    const curtidos = dados.curtidos.filter((x) => x !== id);
    const rejeitados = dados.rejeitados.filter((x) => x !== id);
    atualizar({ ...dados, curtidos: gostou ? [...curtidos, id] : curtidos, rejeitados: gostou ? rejeitados : [...rejeitados, id] });
  };

  // Fotos já são gravadas no envio; aqui só atualiza a tela.
  const fotosDe = (id: string) => (Array.isArray(dados.respostas[id]) ? (dados.respostas[id] as string[]) : []);
  const mudarFotos = (id: string, caminhos: string[]) =>
    setDados((d) => ({ ...d, respostas: { ...d.respostas, [id]: caminhos } }));

  async function enviar() {
    setEnviando(true);
    setErroEnvio(null);
    aSalvar.current ??= dados;
    await gravar();
    if (aSalvar.current) {
      setEnviando(false);
      setErroEnvio("Não conseguimos salvar suas últimas respostas. Confira a internet e tente de novo.");
      return;
    }
    const resultado = demonstracao
      ? ({ ok: true } as const)
      : await enviarBriefing(token).catch(() => ({ erro: "Sem conexão. Tente de novo." }));
    setEnviando(false);
    if ("erro" in resultado) return setErroEnvio(resultado.erro);
    try {
      localStorage.removeItem(chavePasso);
    } catch {}
    setEnviado(true);
    window.scrollTo({ top: 0 });
  }

  if (enviado) {
    return (
      <div className="publico-sucesso" role="status">
        <CircleCheck size={44} aria-hidden="true" />
        <h1>Pronto, {cliente}!</h1>
        <p>O {escritorio} recebeu o seu briefing e vai usar as respostas para preparar o seu projeto. Obrigado!</p>
      </div>
    );
  }

  // Perguntas visíveis (para a revisão): só dos passos que existem.
  const visiveis = passos.flatMap((p) => p.perguntas);
  const respondidas = visiveis.filter((p) => respondida(dados.respostas[p.id])).length;

  return (
    <div className="briefing">
      <div className="briefing-topo">
        <div
          className="briefing-barra"
          role="progressbar"
          aria-label="Progresso do briefing"
          aria-valuemin={1}
          aria-valuemax={passos.length}
          aria-valuenow={atual + 1}
        >
          <span style={{ width: `${((atual + 1) / passos.length) * 100}%` }} />
        </div>
        <div className="briefing-status">
          <span>
            Passo {atual + 1} de {passos.length}
          </span>
          <span className={`briefing-salvo briefing-salvo-${salvo}`} aria-live="polite">
            {salvo === "erro" ? <CloudOff size={14} aria-hidden="true" /> : <Cloud size={14} aria-hidden="true" />}
            {salvo === "salvo" ? "Salvo" : salvo === "erro" ? "Não salvo" : "Salvando…"}
          </span>
        </div>
      </div>

      {erroSalvar && <Aviso tipo="erro">{erroSalvar}</Aviso>}

      <section className="briefing-passo" aria-labelledby="briefing-titulo">
        <h1 id="briefing-titulo" ref={titulo} tabIndex={-1}>
          {passo.tipo === "inicio" ? `Olá, ${cliente}!` : passo.titulo}
        </h1>
        {passo.descricao && <p className="muted">{passo.descricao}</p>}

        {passo.tipo === "inicio" && (
          <div className="briefing-inicio">
            <p>
              O {escritorio} preparou algumas perguntas para entender o seu projeto. Responda do seu jeito: não existe
              resposta certa, e pode deixar em branco o que não souber.
            </p>
            <ul className="lista-icones">
              <li>
                <CircleCheck size={18} aria-hidden="true" /> Leva uns 15 minutos.
              </li>
              <li>
                <CircleCheck size={18} aria-hidden="true" /> Tudo é salvo sozinho: pode parar e continuar depois por este
                mesmo link.
              </li>
              <li>
                <CircleCheck size={18} aria-hidden="true" /> Tenha à mão fotos do imóvel e prints de ambientes que você
                gosta.
              </li>
            </ul>
          </div>
        )}

        {passo.tipo === "quiz" && (
          <QuizEstilo imagens={briefing.estilos} curtidos={dados.curtidos} rejeitados={dados.rejeitados} aoResponder={avaliarImagem} />
        )}

        {passo.tipo === "ambientes" && (
          <fieldset className="campo pergunta">
            <legend>Quais ambientes entram no projeto?</legend>
            <p className="campo-ajuda">Cada ambiente escolhido ganha perguntas próprias nos próximos passos.</p>
            <div className="publico-servicos">
              {(Object.keys(AMBIENTES) as Ambiente[])
                .filter((a) => briefing.perguntas.some((p) => p.ambiente === a))
                .map((a) => (
                  <label key={a} className="publico-servico">
                    <input type="checkbox" checked={dados.ambientes.includes(a)} onChange={() => alternarAmbiente(a)} />
                    <span>{AMBIENTES[a]}</span>
                  </label>
                ))}
            </div>
          </fieldset>
        )}

        {passo.perguntas.map((p) =>
          p.tipo === "foto" ? (
            <EnvioFotos
              key={p.id}
              token={token}
              pergunta={p}
              caminhos={fotosDe(p.id)}
              miniaturas={miniaturas}
              disponivel={fotosDisponiveis}
              aoAdicionar={(caminho, url) => {
                setMiniaturas((m) => ({ ...m, [caminho]: url }));
                mudarFotos(p.id, [...fotosDe(p.id), caminho]);
              }}
              aoRemover={(caminho) => mudarFotos(p.id, fotosDe(p.id).filter((c) => c !== caminho))}
            />
          ) : (
            <CampoPergunta key={p.id} pergunta={p} valor={dados.respostas[p.id]} aoMudar={(v) => responder(p.id, v)} />
          ),
        )}

        {passo.tipo === "revisao" && (
          <div className="briefing-revisao">
            <p>
              Você respondeu <strong>{respondidas}</strong> de {visiveis.length} perguntas
              {briefing.estilos.length >= MINIMO_IMAGENS_QUIZ &&
                ` e avaliou ${dados.curtidos.length + dados.rejeitados.length} de ${briefing.estilos.length} imagens`}
              .
            </p>
            <ul className="briefing-resumo">
              {passos
                .filter((p) => p.perguntas.length)
                .map((p) => {
                  const feitas = p.perguntas.filter((q) => respondida(dados.respostas[q.id])).length;
                  return (
                    <li key={p.id}>
                      <button type="button" className="botao-link" onClick={() => irPara(passos.indexOf(p))}>
                        {p.titulo}
                      </button>
                      <span className="muted">
                        {feitas} de {p.perguntas.length}
                      </span>
                    </li>
                  );
                })}
            </ul>
            <p className="muted">Depois de enviar, as respostas não podem mais ser alteradas por aqui.</p>
            {erroEnvio && <Aviso tipo="erro">{erroEnvio}</Aviso>}
            <button type="button" className="botao botao-marca botao-bloco" onClick={enviar} disabled={enviando}>
              <Send size={18} aria-hidden="true" />
              {enviando ? "Enviando…" : `Enviar para o ${escritorio}`}
            </button>
          </div>
        )}
      </section>

      <nav className="briefing-navegacao" aria-label="Navegar no briefing">
        {atual > 0 ? (
          <button type="button" className="botao botao-fantasma" onClick={() => irPara(atual - 1)}>
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar
          </button>
        ) : (
          <span />
        )}
        {passo.tipo !== "revisao" && (
          <button type="button" className="botao botao-marca" onClick={() => irPara(atual + 1)}>
            {passo.tipo === "inicio" ? (comecou ? "Continuar" : "Começar") : "Próximo"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </nav>
    </div>
  );
}
