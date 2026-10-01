"use client";

import { useId, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";
import { confirmarFoto, pedirEnvioFoto, removerFoto } from "@/app/c/[token]/briefing/acoes";
import { MAXIMO_FOTOS, ehPdf, type PerguntaBriefing, type Resposta } from "@/lib/briefing";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Uma pergunta do briefing, no formato pedido pelo arquiteto (RN-02.10).
export function CampoPergunta({
  pergunta,
  valor,
  aoMudar,
}: {
  pergunta: PerguntaBriefing;
  valor: Resposta | undefined;
  aoMudar: (valor: Resposta) => void;
}) {
  const id = `p-${pergunta.id}`;
  const ajuda = pergunta.ajuda && <p className="campo-ajuda">{pergunta.ajuda}</p>;

  if (pergunta.tipo === "texto" || pergunta.tipo === "numero") {
    return (
      <div className="campo pergunta">
        <label htmlFor={id}>{pergunta.texto}</label>
        {ajuda}
        {pergunta.tipo === "texto" ? (
          <textarea id={id} rows={3} maxLength={4000} value={(valor as string) ?? ""} onChange={(e) => aoMudar(e.target.value)} />
        ) : (
          <input
            id={id}
            inputMode="decimal"
            maxLength={30}
            className="pergunta-numero"
            value={(valor as string) ?? ""}
            onChange={(e) => aoMudar(e.target.value.replace(/[^\d.,\s]/g, ""))}
          />
        )}
      </div>
    );
  }

  const multipla = pergunta.tipo === "multipla";
  const opcoes =
    pergunta.tipo === "sim_nao"
      ? [
          { valor: "sim", rotulo: "Sim" },
          { valor: "nao", rotulo: "Não" },
        ]
      : (pergunta.opcoes ?? []).map((o) => ({ valor: o, rotulo: o }));
  const marcados = multipla ? ((valor as string[] | undefined) ?? []) : [];

  return (
    <fieldset className="campo pergunta">
      <legend>{pergunta.texto}</legend>
      {multipla && <p className="campo-ajuda">Pode marcar mais de uma.</p>}
      {ajuda}
      <div className="publico-servicos">
        {opcoes.map((o) => (
          <label key={o.valor} className="publico-servico">
            <input
              type={multipla ? "checkbox" : "radio"}
              name={id}
              value={o.valor}
              checked={multipla ? marcados.includes(o.valor) : valor === o.valor}
              onChange={(e) =>
                aoMudar(
                  multipla
                    ? e.target.checked
                      ? [...marcados, o.valor]
                      : marcados.filter((m) => m !== o.valor)
                    : o.valor,
                )
              }
            />
            <span>{o.rotulo}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Fotos e documentos (RN-02.6). O arquivo sobe direto do celular para o Storage com uma URL
// assinada pelo servidor, e só depois é registrado no briefing.
export function EnvioFotos({
  token,
  pergunta,
  caminhos,
  miniaturas,
  disponivel,
  aoAdicionar,
  aoRemover,
}: {
  token: string;
  pergunta: PerguntaBriefing;
  caminhos: string[];
  miniaturas: Record<string, string>;
  disponivel: boolean;
  aoAdicionar: (caminho: string, url: string) => void;
  aoRemover: (caminho: string) => void;
}) {
  const id = useId();
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(lista: FileList | null) {
    const supabase = criarClienteNavegador();
    if (!lista?.length || !supabase) return;
    setErro(null);
    const arquivos = Array.from(lista);
    let total = caminhos.length;

    for (const [i, arquivo] of arquivos.entries()) {
      if (total >= MAXIMO_FOTOS) {
        setErro(`Cada pergunta aceita até ${MAXIMO_FOTOS} arquivos.`);
        break;
      }
      setProgresso(`Enviando ${i + 1} de ${arquivos.length}…`);
      const pedido = await pedirEnvioFoto(token, pergunta.id, { tipo: arquivo.type, tamanho: arquivo.size });
      if ("erro" in pedido) {
        setErro(`${arquivo.name}: ${pedido.erro}`);
        continue;
      }
      const { error } = await supabase.storage
        .from("briefings")
        .uploadToSignedUrl(pedido.caminho, pedido.tokenEnvio, arquivo, { contentType: arquivo.type });
      if (error) {
        setErro(`${arquivo.name}: não foi possível enviar. Confira a internet e tente de novo.`);
        continue;
      }
      const confirmado = await confirmarFoto(token, pergunta.id, pedido.caminho);
      if ("erro" in confirmado) {
        setErro(confirmado.erro);
        continue;
      }
      total += 1;
      aoAdicionar(pedido.caminho, confirmado.url ?? URL.createObjectURL(arquivo));
    }
    setProgresso(null);
  }

  async function remover(caminho: string) {
    setErro(null);
    const resultado = await removerFoto(token, pergunta.id, caminho);
    if ("erro" in resultado) setErro(resultado.erro);
    else aoRemover(caminho);
  }

  return (
    <div className="campo pergunta">
      <span className="campo-rotulo" id={`${id}-rotulo`}>
        {pergunta.texto}
      </span>
      {pergunta.ajuda && <p className="campo-ajuda">{pergunta.ajuda}</p>}

      {caminhos.length > 0 && (
        <ul className="fotos" aria-labelledby={`${id}-rotulo`}>
          {caminhos.map((caminho, i) => (
            <li key={caminho} className="foto">
              {ehPdf(caminho) || !miniaturas[caminho] ? (
                <span className="foto-arquivo">
                  <FileText size={28} aria-hidden="true" />
                  {ehPdf(caminho) ? "PDF" : "Foto"} {i + 1}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={miniaturas[caminho]} alt={`Arquivo ${i + 1} enviado`} />
              )}
              <button type="button" className="foto-remover" onClick={() => remover(caminho)} aria-label={`Remover arquivo ${i + 1}`}>
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {disponivel ? (
        caminhos.length < MAXIMO_FOTOS && (
          <label className={`foto-enviar ${progresso ? "enviando" : ""}`}>
            <ImagePlus size={20} aria-hidden="true" />
            <span>{progresso ?? (caminhos.length ? "Adicionar mais" : "Escolher fotos ou PDF")}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              disabled={!!progresso}
              onChange={(e) => {
                void enviar(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )
      ) : (
        <p className="campo-ajuda">O envio de arquivos ainda não está ligado. Você pode mandar as fotos pelo WhatsApp.</p>
      )}
      <p className="campo-ajuda">
        {caminhos.length} de {MAXIMO_FOTOS} · até 10 MB cada
      </p>
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
