"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import {
  esconderImagemPadrao,
  registrarImagemEstilo,
  removerImagemEstilo,
  restaurarEstiloPadrao,
  usarSoAsMinhas,
} from "@/app/app/(sistema)/briefings/acoes";
import { Visualizador, type ImagemGaleria } from "@/components/briefing/GaleriaEstilos";
import { RecortarImagem, recortarCentro } from "@/components/briefing/RecortarImagem";
import { ESTILOS, MINIMO_IMAGENS_QUIZ, type Estilo } from "@/lib/briefing";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Banco de imagens do quiz, por estilo. As padrão do NorteArq aparecem para o arquiteto ver o que o
// cliente vai ver; ele pode esconder, pôr as suas no lugar e voltar ao padrão quando quiser.
// As suas passam pelo enquadramento (4:3, 1600×1200) e sobem do navegador para a pasta do escritório.

export type ImagemEstiloEditor = { id: string; estilo: Estilo; url: string; padrao: boolean; oculta: boolean };

const LIMITE_POR_ESTILO = 20;
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // antes do enquadramento; depois fica bem menor

type Mudanca =
  | { tipo: "esconder"; id: string; oculta: boolean }
  | { tipo: "remover"; id: string }
  | { tipo: "so-minhas"; estilo: Estilo }
  | { tipo: "restaurar"; estilo: Estilo };

export function ImagensEstilo({ escritorioId, imagens }: { escritorioId: string; imagens: ImagemEstiloEditor[] }) {
  const [estilo, setEstilo] = useState<Estilo>("contemporaneo");
  const [fila, setFila] = useState<File[]>([]);
  const [indice, setIndice] = useState(0);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [, iniciar] = useTransition();
  // Tudo muda na hora; volta sozinho se o servidor recusar.
  const [lista, aplicar] = useOptimistic(imagens, (atual, m: Mudanca) => {
    switch (m.tipo) {
      case "esconder":
        return atual.map((i) => (i.id === m.id ? { ...i, oculta: m.oculta } : i));
      case "remover":
        return atual.filter((i) => i.id !== m.id);
      case "so-minhas":
        return atual.map((i) => (i.padrao && i.estilo === m.estilo ? { ...i, oculta: true } : i));
      case "restaurar":
        return atual
          .filter((i) => i.padrao || i.estilo !== m.estilo)
          .map((i) => (i.estilo === m.estilo ? { ...i, oculta: false } : i));
    }
  });

  const noQuiz = (i: ImagemEstiloEditor) => !i.padrao || !i.oculta;
  const totalQuiz = lista.filter(noQuiz).length;
  const doEstilo = lista.filter((i) => i.estilo === estilo);
  const minhas = doEstilo.filter((i) => !i.padrao);
  const padrao = doEstilo.filter((i) => i.padrao);
  const mexido = minhas.length > 0 || padrao.some((i) => i.oculta);
  const visiveis = doEstilo.filter(noQuiz);
  const nome = ESTILOS[estilo];

  function mudar(m: Mudanca, gravar: () => Promise<boolean>) {
    iniciar(async () => {
      aplicar(m);
      if (!(await gravar())) setErro("Não foi possível salvar. Tente de novo.");
    });
  }

  function escolherArquivos(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(null);
    const vagas = LIMITE_POR_ESTILO - minhas.length;
    const validos: File[] = [];
    for (const a of Array.from(arquivos)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(a.type)) setErro(`${a.name}: use JPG, PNG ou WEBP.`);
      else if (a.size > TAMANHO_MAXIMO) setErro(`${a.name}: até 20 MB por imagem.`);
      else validos.push(a);
    }
    if (validos.length > vagas) {
      setErro(`${nome} aceita até ${LIMITE_POR_ESTILO} imagens suas: ${vagas === 0 ? "nenhuma vaga" : `só ${vagas} vaga(s)`} agora.`);
    }
    const usar = validos.slice(0, Math.max(0, vagas));
    setFila(usar);
    setIndice(0);
  }

  async function subir(blob: Blob, n: number, total: number) {
    const supabase = criarClienteNavegador();
    if (!supabase) return;
    setProgresso(`Enviando ${n} de ${total}…`);
    const caminho = `${escritorioId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("estilos").upload(caminho, blob, { contentType: "image/jpeg" });
    if (error) return setErro("Não foi possível enviar uma das imagens. Tente de novo.");
    const r = await registrarImagemEstilo(caminho, estilo);
    if (r.erro) setErro(r.erro);
  }

  // Próxima da fila (ou fim).
  function avancar() {
    if (indice + 1 < fila.length) setIndice(indice + 1);
    else {
      setFila([]);
      setProgresso(null);
    }
  }

  async function enquadrarRestantes() {
    const restantes = fila.slice(indice);
    setFila([]);
    for (const [i, arquivo] of restantes.entries()) {
      try {
        await subir(await recortarCentro(arquivo), i + 1, restantes.length);
      } catch {
        setErro(`${arquivo.name}: não foi possível abrir esta imagem.`);
      }
    }
    setProgresso(null);
  }

  return (
    <div className="estilos-editor">
      <p className="campo-ajuda">
        No quiz o cliente vê {totalQuiz === 1 ? "1 imagem" : `${totalQuiz} imagens`} ao todo
        {totalQuiz < MINIMO_IMAGENS_QUIZ
          ? `: com menos de ${MINIMO_IMAGENS_QUIZ}, o quiz não aparece.`
          : " (no máximo 24 por briefing, as suas primeiro)."}
      </p>

      <div className="estilos-abas" role="tablist" aria-label="Estilos">
        {(Object.keys(ESTILOS) as Estilo[]).map((e) => {
          const n = lista.filter((i) => i.estilo === e && noQuiz(i)).length;
          return (
            <button
              key={e}
              type="button"
              role="tab"
              aria-selected={e === estilo}
              className={`estilos-aba ${e === estilo ? "ativa" : ""}`}
              onClick={() => {
                setEstilo(e);
                setFila([]);
              }}
            >
              {ESTILOS[e]} <span className={n === 0 ? "texto-alerta" : "muted"}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="estilos-painel" role="tabpanel" aria-label={nome}>
        {fila.length > 0 ? (
          <RecortarImagem
            arquivo={fila[indice]}
            posicao={indice + 1}
            total={fila.length}
            pular={avancar}
            enquadrarTodas={() => void enquadrarRestantes()}
            concluir={(blob) => {
              const n = indice + 1;
              const total = fila.length;
              avancar();
              void subir(blob, n, total).then(() => n === total && setProgresso(null));
            }}
          />
        ) : (
          <div className="estilos-acoes">
            <label className={`foto-enviar estilos-enviar ${progresso ? "enviando" : ""}`}>
              <ImagePlus size={20} aria-hidden="true" />
              <span>{progresso ?? `Adicionar imagens de ${nome}`}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={!!progresso || minhas.length >= LIMITE_POR_ESTILO}
                onChange={(e) => {
                  escolherArquivos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {minhas.length > 0 && padrao.some((i) => !i.oculta) && (
              <button
                type="button"
                className="botao botao-secundario botao-pequeno"
                onClick={() => mudar({ tipo: "so-minhas", estilo }, () => usarSoAsMinhas(estilo))}
              >
                <EyeOff size={16} aria-hidden="true" /> Usar só as minhas
              </button>
            )}
            {mexido && (
              <button
                type="button"
                className="botao botao-fantasma botao-pequeno"
                onClick={() => {
                  const aviso =
                    minhas.length > 0
                      ? `Voltar ${nome} ao padrão do NorteArq? As ${padrao.length} imagens padrão voltam ao quiz e as suas ${minhas.length} deste estilo são removidas. Briefings já enviados não mudam.`
                      : `Voltar ${nome} ao padrão do NorteArq? As ${padrao.length} imagens padrão voltam ao quiz.`;
                  if (window.confirm(aviso)) mudar({ tipo: "restaurar", estilo }, () => restaurarEstiloPadrao(estilo));
                }}
              >
                <RotateCcw size={16} aria-hidden="true" /> Voltar ao padrão do NorteArq
              </button>
            )}
          </div>
        )}

        {erro && (
          <p className="campo-erro" role="alert">
            {erro}
          </p>
        )}

        <p className="campo-ajuda">
          Formato do quiz: 4:3 (deitada). Fotos em outro formato passam pelo enquadramento antes de enviar. Até{" "}
          {LIMITE_POR_ESTILO} suas por estilo ({minhas.length} usadas). Use fotos suas ou com licença de uso.
        </p>

        <ul className="fotos estilos-grade">
          {doEstilo.map((img) => (
            <li key={img.id} className={`foto ${img.padrao && img.oculta ? "estilos-oculta" : ""}`}>
              <button
                type="button"
                className="estilos-ampliar"
                onClick={() => setAmpliada(visiveis.indexOf(img) >= 0 ? visiveis.indexOf(img) : null)}
                aria-label={`Ampliar imagem de ${nome}`}
                disabled={img.padrao && img.oculta}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" loading="lazy" />
              </button>
              <span className="estilos-rotulo">
                {img.padrao ? (img.oculta ? "Padrão · escondida" : "Padrão NorteArq") : "Sua"}
              </span>
              {img.padrao ? (
                <button
                  type="button"
                  className="foto-remover"
                  title={img.oculta ? "Mostrar no quiz" : "Esconder do quiz"}
                  aria-label={img.oculta ? "Mostrar no quiz" : "Esconder do quiz"}
                  onClick={() =>
                    mudar({ tipo: "esconder", id: img.id, oculta: !img.oculta }, () =>
                      esconderImagemPadrao(img.id, !img.oculta),
                    )
                  }
                >
                  {img.oculta ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                </button>
              ) : (
                <button
                  type="button"
                  className="foto-remover"
                  title="Remover"
                  aria-label={`Remover imagem de ${nome}`}
                  onClick={() =>
                    mudar({ tipo: "remover", id: img.id }, async () => {
                      await removerImagemEstilo(img.id);
                      return true;
                    })
                  }
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {ampliada !== null && visiveis[ampliada] && (
        <Visualizador
          lista={visiveis.map((i): ImagemGaleria => ({ id: i.id, url: i.url, estilo: nome }))}
          indice={ampliada}
          mudar={setAmpliada}
          fechar={() => setAmpliada(null)}
        />
      )}
    </div>
  );
}
