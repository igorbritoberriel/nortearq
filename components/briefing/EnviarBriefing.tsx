"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { ajustarEscopoBriefing, gerarLink } from "@/app/app/(sistema)/clientes/acoes";
import { AMBIENTES, STATUS_BRIEFING, type Ambiente, type SecaoBriefing, type StatusBriefing } from "@/lib/briefing";
import { DESTINOS_LINK } from "@/lib/clientes";
import { linkWhatsapp } from "@/lib/contatos";

type Bloco = Exclude<SecaoBriefing, "comum">;
const BLOCOS: Bloco[] = ["arquitetura", "interiores", "reforma"];
const LABEL_BLOCO: Record<Bloco, string> = { arquitetura: "Arquitetura", interiores: "Interiores", reforma: "Reforma" };

type Servico = { id: string; tipo_briefing: Bloco | null; tem_briefing: boolean };
type BriefingAtual = { id: string; status: StatusBriefing; tipos: string[]; ambientes_definidos: string[] | null } | null;

// O arquiteto escolhe quais blocos (e, em interiores, quais ambientes) vão no briefing deste
// cliente, em vez do sistema decidir sozinho só pelos serviços contratados.
export function EnviarBriefing({
  clienteId,
  telefone,
  cliente,
  escritorio,
  servicosEscritorio,
  clienteServicos,
  briefing,
  temLinkAtivo,
  linkAtual,
}: {
  clienteId: string;
  telefone: string | null;
  cliente: string;
  escritorio: string;
  servicosEscritorio: Servico[];
  clienteServicos: string[];
  briefing: BriefingAtual;
  temLinkAtivo: boolean;
  linkAtual: string | null;
}) {
  const blocosDisponiveis = useMemo(
    () => BLOCOS.filter((b) => servicosEscritorio.some((s) => s.tem_briefing && s.tipo_briefing === b)),
    [servicosEscritorio],
  );
  const blocosDoContratado = useMemo(
    () =>
      BLOCOS.filter((b) =>
        servicosEscritorio.some((s) => s.tem_briefing && s.tipo_briefing === b && clienteServicos.includes(s.id)),
      ),
    [servicosEscritorio, clienteServicos],
  );
  const travado = briefing?.status === "respondido" || briefing?.status === "validado";
  const tiposIniciais = (briefing?.tipos as Bloco[] | undefined) ?? blocosDoContratado;
  const ambientesIniciais = (briefing?.ambientes_definidos as Ambiente[] | null | undefined) ?? (Object.keys(AMBIENTES) as Ambiente[]);
  const [ajustando, setAjustando] = useState(!briefing);
  const [tipos, setTipos] = useState<Bloco[]>(tiposIniciais);
  const [ambientes, setAmbientes] = useState<Ambiente[]>(ambientesIniciais);
  const [pendente, iniciar] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const primeiroNome = cliente.split(" ")[0];
  const mensagem = link ? DESTINOS_LINK.briefing.mensagem(primeiroNome, escritorio, link) : "";

  function alternarTipo(b: Bloco) {
    setTipos((t) => (t.includes(b) ? t.filter((x) => x !== b) : [...t, b]));
  }
  function alternarAmbiente(a: Ambiente) {
    setAmbientes((v) => (v.includes(a) ? v.filter((x) => x !== a) : [...v, a]));
  }

  function enviar() {
    setErro(null);
    const aba = telefone ? window.open("", "_blank") : null;
    iniciar(async () => {
      const resultado = await gerarLink(clienteId, "briefing", tipos, tipos.includes("interiores") ? ambientes : []);
      if ("erro" in resultado) {
        aba?.close();
        setErro(resultado.erro);
        return;
      }
      setLink(resultado.link);
      setAjustando(false);
      if (aba && telefone) aba.location.href = linkWhatsapp(telefone, DESTINOS_LINK.briefing.mensagem(primeiroNome, escritorio, resultado.link));
    });
  }

  function salvarAjuste() {
    if (!briefing) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await ajustarEscopoBriefing(briefing.id, clienteId, tipos, tipos.includes("interiores") ? ambientes : []);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      setAjustando(false);
    });
  }

  const seletor = (
    <div className="enviar-link">
      <fieldset className="campo lista-marcar">
        <legend className="campo-rotulo">O que vai neste briefing</legend>
        {(blocosDisponiveis.length ? blocosDisponiveis : BLOCOS).map((b) => (
          <label key={b} className="checagem">
            <input type="checkbox" checked={tipos.includes(b)} onChange={() => alternarTipo(b)} />
            <span>{LABEL_BLOCO[b]}</span>
          </label>
        ))}
      </fieldset>
      {tipos.includes("interiores") && (
        <fieldset className="campo lista-marcar">
          <legend className="campo-rotulo">Ambientes de interiores</legend>
          {(Object.keys(AMBIENTES) as Ambiente[]).map((a) => (
            <label key={a} className="checagem">
              <input type="checkbox" checked={ambientes.includes(a)} onChange={() => alternarAmbiente(a)} />
              <span>{AMBIENTES[a]}</span>
            </label>
          ))}
          <p className="campo-ajuda">O cliente ainda escolhe, entre estes, quais realmente entram no projeto dele.</p>
        </fieldset>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="form-rodape">
        {briefing && (
          <button
            type="button"
            className="botao botao-fantasma botao-pequeno"
            onClick={() => {
              setTipos(tiposIniciais);
              setAmbientes(ambientesIniciais);
              setErro(null);
              setAjustando(false);
            }}
            disabled={pendente}
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          className="botao botao-primario botao-pequeno"
          onClick={briefing ? salvarAjuste : enviar}
          disabled={pendente || tipos.length === 0}
        >
          {briefing ? (
            pendente ? "Salvando..." : "Salvar ajuste"
          ) : (
            <>
              <MessageCircle size={16} aria-hidden="true" />
              {pendente ? "Gerando link..." : telefone ? "Gerar link e enviar no WhatsApp" : "Gerar link"}
            </>
          )}
        </button>
      </div>
      {tipos.length === 0 && <p className="campo-erro">Escolha pelo menos um bloco.</p>}
    </div>
  );

  if (ajustando) return seletor;

  return (
    <div className="enviar-link">
      {briefing && (
        <p className="campo-ajuda">
          Enviado: {tiposIniciais.map((t) => LABEL_BLOCO[t]).join(", ") || "nada"}
          {tiposIniciais.includes("interiores") && ambientesIniciais.length < Object.keys(AMBIENTES).length
            ? ` (ambientes: ${ambientesIniciais.map((a) => AMBIENTES[a]).join(", ")})`
            : ""}
          . Situação: {STATUS_BRIEFING[briefing.status]}.{" "}
          {!travado && (
            <button type="button" className="botao-link tabela-link" onClick={() => setAjustando(true)}>
              Ajustar o que vai no briefing
            </button>
          )}
          {travado && "Para mudar, reabra o briefing primeiro."}
        </p>
      )}

      {linkAtual && !link ? (
        <>
          {telefone ? (
            <a
              className="botao botao-primario botao-pequeno"
              href={linkWhatsapp(telefone, DESTINOS_LINK.briefing.mensagem(primeiroNome, escritorio, linkAtual))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Reenviar o mesmo link
            </a>
          ) : null}
          <button
            type="button"
            className={`botao botao-pequeno ${telefone ? "botao-fantasma" : "botao-secundario"}`}
            onClick={async () => {
              const texto = DESTINOS_LINK.briefing.mensagem(primeiroNome, escritorio, linkAtual);
              try {
                await navigator.clipboard.writeText(texto);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              } catch {
                window.prompt("Copie a mensagem:", texto);
              }
            }}
          >
            {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copiado ? "Copiada" : "Copiar mensagem com o link"}
          </button>
        </>
      ) : (
        !link && (
          <button type="button" className="botao botao-primario botao-pequeno" onClick={enviar} disabled={pendente}>
            <MessageCircle size={16} aria-hidden="true" />
            {pendente ? "Gerando link..." : telefone ? "Gerar link e enviar no WhatsApp" : "Gerar link"}
          </button>
        )
      )}
      {temLinkAtivo && !link && !linkAtual && <p className="campo-ajuda">Gerar um link novo desativa o que você enviou antes.</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {link && (
        <div className="link-escritorio">
          <code>{link}</code>
          <div className="link-escritorio-acoes">
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(mensagem);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  window.prompt("Copie a mensagem:", mensagem);
                }
              }}
            >
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copiado ? "Copiada" : "Copiar mensagem com o link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
