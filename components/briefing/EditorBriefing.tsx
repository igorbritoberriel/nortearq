"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import {
  alternarPergunta,
  criarPergunta,
  excluirPergunta,
  moverPergunta,
  registrarImagemEstilo,
  removerImagemEstilo,
} from "@/app/app/(sistema)/briefings/acoes";
import {
  AMBIENTES,
  ESTILOS,
  ORDEM_SECOES,
  SECOES,
  TIPOS_RESPOSTA,
  type Ambiente,
  type Estilo,
  type PerguntaModelo,
  type SecaoBriefing,
} from "@/lib/briefing";
import type { EstadoFormulario } from "@/lib/formulario";
import { criarClienteNavegador } from "@/lib/supabase/client";

const NOMES_BLOCOS: Record<SecaoBriefing, string> = {
  arquitetura: "Arquitetura",
  interiores: "Interiores",
  reforma: "Reforma",
  comum: "Comum a todos",
};

// Perguntas agrupadas como o cliente vê: bloco e, em interiores, ambiente.
function agrupar(perguntas: PerguntaModelo[]) {
  return ORDEM_SECOES.flatMap((secao) => {
    const daSecao = perguntas.filter((p) => p.tipo_briefing === secao);
    if (secao !== "interiores") return [{ chave: secao, titulo: NOMES_BLOCOS[secao], perguntas: daSecao }];
    return [
      { chave: "interiores", titulo: "Interiores · geral", perguntas: daSecao.filter((p) => !p.ambiente) },
      ...(Object.keys(AMBIENTES) as Ambiente[]).map((a) => ({
        chave: `interiores-${a}`,
        titulo: `Interiores · ${AMBIENTES[a]}`,
        perguntas: daSecao.filter((p) => p.ambiente === a),
      })),
    ];
  }).filter((g) => g.perguntas.length || g.chave === "comum");
}

export function EditorPerguntas({ perguntas }: { perguntas: PerguntaModelo[] }) {
  const [pendente, iniciar] = useTransition();
  const grupos = agrupar(perguntas);

  return (
    <>
      {grupos.map((g) => (
        <section key={g.chave} className="cartao secao-config">
          <h2>{g.titulo}</h2>
          {g.chave === "comum" && <p className="muted">{SECOES.comum.descricao}</p>}
          <ol className="editor-perguntas" aria-busy={pendente}>
            {g.perguntas.map((p, i) => (
              <li key={p.id} className={p.ativa ? "" : "desativada"}>
                <label className="editor-ativa" title={p.ativa ? "Desativar" : "Ativar"}>
                  <input
                    type="checkbox"
                    checked={p.ativa}
                    disabled={pendente}
                    onChange={(e) => iniciar(() => alternarPergunta(p.id, e.target.checked))}
                  />
                  <span className="sr-only">Pergunta ativa</span>
                </label>
                <div className="editor-texto">
                  <strong>{p.texto}</strong>
                  <small className="muted">
                    {TIPOS_RESPOSTA[p.tipo_resposta]}
                    {p.opcoes?.length ? `: ${p.opcoes.join(", ")}` : ""}
                    {p.padrao ? "" : " · sua pergunta"}
                  </small>
                </div>
                <div className="editor-botoes">
                  <button
                    type="button"
                    className="botao-icone"
                    disabled={pendente || i === 0}
                    onClick={() => iniciar(() => moverPergunta(p.id, "subir"))}
                    aria-label={`Subir: ${p.texto}`}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    disabled={pendente || i === g.perguntas.length - 1}
                    onClick={() => iniciar(() => moverPergunta(p.id, "descer"))}
                    aria-label={`Descer: ${p.texto}`}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  {/* RN-02.11: perguntas padrão só desativam. */}
                  {!p.padrao && (
                    <button
                      type="button"
                      className="botao-icone"
                      disabled={pendente}
                      onClick={() => {
                        if (confirm(`Apagar a pergunta "${p.texto}"?`)) iniciar(() => excluirPergunta(p.id));
                      }}
                      aria-label={`Apagar: ${p.texto}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="cartao secao-config">
        <h2>Nova pergunta</h2>
        <NovaPergunta />
      </section>
    </>
  );
}

const inicial: EstadoFormulario = { status: "inicial" };

function NovaPergunta() {
  const [estado, enviar, enviando] = useActionState(criarPergunta, inicial);
  const [bloco, setBloco] = useState<SecaoBriefing>("comum");
  const [tipo, setTipo] = useState("texto");
  const erro = estado.erros ?? {};
  const v = estado.status === "erro" ? (estado.valores ?? {}) : {};

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="tipo_briefing" rotulo="Bloco" erro={erro.tipo_briefing}>
          <select
            id="tipo_briefing"
            name="tipo_briefing"
            defaultValue={v.tipo_briefing ?? bloco}
            onChange={(e) => setBloco(e.target.value as SecaoBriefing)}
          >
            {ORDEM_SECOES.map((s) => (
              <option key={s} value={s}>
                {NOMES_BLOCOS[s]}
              </option>
            ))}
          </select>
        </Campo>
        {bloco === "interiores" ? (
          <Campo id="ambiente" rotulo="Ambiente" erro={erro.ambiente}>
            <select id="ambiente" name="ambiente" defaultValue={v.ambiente ?? ""}>
              <option value="">Geral (todos os ambientes)</option>
              {(Object.keys(AMBIENTES) as Ambiente[]).map((a) => (
                <option key={a} value={a}>
                  {AMBIENTES[a]}
                </option>
              ))}
            </select>
          </Campo>
        ) : (
          <input type="hidden" name="ambiente" value="" />
        )}
      </div>
      <Campo id="texto" rotulo="Pergunta" erro={erro.texto}>
        <input id="texto" name="texto" maxLength={300} defaultValue={v.texto} placeholder="Ex.: Você tem plantas em casa?" />
      </Campo>
      <Campo id="ajuda" rotulo="Explicação para o cliente" opcional erro={erro.ajuda}>
        <input id="ajuda" name="ajuda" maxLength={300} defaultValue={v.ajuda} />
      </Campo>
      <Campo id="tipo_resposta" rotulo="Tipo de resposta" erro={erro.tipo_resposta}>
        <select id="tipo_resposta" name="tipo_resposta" defaultValue={v.tipo_resposta ?? tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(TIPOS_RESPOSTA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Campo>
      {(tipo === "escolha" || tipo === "multipla") && (
        <Campo id="opcoes" rotulo="Opções" ajuda="Uma por linha." erro={erro.opcoes}>
          <textarea id="opcoes" name="opcoes" rows={4} defaultValue={v.opcoes} />
        </Campo>
      )}
      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Adicionar pergunta"}
        </button>
      </div>
    </form>
  );
}

// Banco de imagens do quiz. O arquivo sobe do navegador para a pasta do escritório no bucket
// "estilos" (o banco só deixa gravar na própria pasta) e depois é registrado.
export function ImagensEstilo({
  escritorioId,
  imagens,
}: {
  escritorioId: string;
  imagens: { id: string; estilo: Estilo; url: string }[];
}) {
  const [estilo, setEstilo] = useState<Estilo | "">("");
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function enviar(lista: FileList | null) {
    const supabase = criarClienteNavegador();
    if (!lista?.length || !supabase) return;
    if (!estilo) return setErro("Escolha o estilo antes de enviar as imagens.");
    setErro(null);
    const arquivos = Array.from(lista);
    for (const [i, arquivo] of arquivos.entries()) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
        setErro(`${arquivo.name}: use JPG, PNG ou WEBP.`);
        continue;
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        setErro(`${arquivo.name}: até 5 MB por imagem.`);
        continue;
      }
      setProgresso(`Enviando ${i + 1} de ${arquivos.length}…`);
      const extensao = arquivo.type.split("/")[1].replace("jpeg", "jpg");
      const caminho = `${escritorioId}/${crypto.randomUUID()}.${extensao}`;
      const { error } = await supabase.storage.from("estilos").upload(caminho, arquivo, { contentType: arquivo.type });
      if (error) {
        setErro(`${arquivo.name}: não foi possível enviar.`);
        continue;
      }
      const resultado = await registrarImagemEstilo(caminho, estilo);
      if (resultado.erro) setErro(resultado.erro);
    }
    setProgresso(null);
  }

  return (
    <div className="estilos-editor">
      <div className="form-linha">
        <Campo id="estilo-imagem" rotulo="Estilo das imagens">
          <select id="estilo-imagem" value={estilo} onChange={(e) => setEstilo(e.target.value as Estilo)}>
            <option value="" disabled>
              Escolha o estilo
            </option>
            {Object.entries(ESTILOS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <div className="campo">
          <span className="campo-rotulo">Imagens</span>
          <label className={`foto-enviar estilos-enviar ${progresso ? "enviando" : ""}`}>
            <ImagePlus size={20} aria-hidden="true" />
            <span>{progresso ?? "Enviar imagens"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={!!progresso}
              onChange={(e) => {
                void enviar(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {imagens.length > 0 && (
        <ul className="fotos estilos-grade" aria-busy={pendente}>
          {imagens.map((img) => (
            <li key={img.id} className="foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Imagem de estilo ${ESTILOS[img.estilo]}`} loading="lazy" />
              <span className="estilos-rotulo">{ESTILOS[img.estilo]}</span>
              <button
                type="button"
                className="foto-remover"
                disabled={pendente}
                onClick={() => iniciar(() => removerImagemEstilo(img.id))}
                aria-label={`Remover imagem de estilo ${ESTILOS[img.estilo]}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
