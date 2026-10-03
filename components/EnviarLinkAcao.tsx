"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { DESTINOS_LINK, type DestinoLink } from "@/lib/clientes";
import { linkWhatsapp } from "@/lib/contatos";

// Botão "gerar link e enviar no WhatsApp" para uma ação do servidor que devolve o link
// (enviar proposta, enviar contrato...). Abre a aba já no clique: navegador de celular bloqueia
// janela aberta depois de esperar o servidor.
export function EnviarLinkAcao({
  acao,
  destino,
  telefone,
  cliente,
  escritorio,
  rotulo,
  depois,
  mensagemEspecial,
  bloqueado = false,
  confirmar,
}: {
  acao: () => Promise<{ link: string } | { erro: string }>;
  destino: DestinoLink;
  telefone: string | null;
  cliente: string;
  escritorio: string;
  rotulo?: string;
  depois?: string; // aviso mostrado com o link gerado
  mensagemEspecial?: "aditivo" | "portal"; // texto próprio do WhatsApp (pedir resposta de aditivo, convidar ao portal)
  bloqueado?: boolean; // falta algo antes de enviar (o motivo aparece fora do botão)
  confirmar?: React.ReactNode; // pede confirmação antes (o que vai e o que acontece), M7 da revisão de UX
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const mensagem = (l: string) =>
    mensagemEspecial === "aditivo"
      ? `Olá, ${cliente.split(" ")[0]}! Aqui é do ${escritorio}. Enviei um aditivo do seu projeto para você ver e aprovar ou recusar: ${l}`
      : mensagemEspecial === "portal"
        ? `Olá, ${cliente.split(" ")[0]}! Aqui é do ${escritorio}. Agora você pode acompanhar o seu projeto pelo portal: etapas, arquivos, contrato e recibos num lugar só. Abra o link e toque em "Criar meu acesso": ${l}#portal`
        : DESTINOS_LINK[destino].mensagem(cliente.split(" ")[0], escritorio, l);

  function gerar() {
    setErro(null);
    const aba = telefone ? window.open("", "_blank") : null;
    iniciar(async () => {
      const resultado = await acao();
      if ("erro" in resultado) {
        aba?.close();
        setErro(resultado.erro);
        return;
      }
      setLink(resultado.link);
      if (aba && telefone) aba.location.href = linkWhatsapp(telefone, mensagem(resultado.link));
    });
  }

  if (confirmar && confirmando && !link) {
    return (
      <div className="pagamento-form confirmar-senha" role="alertdialog">
        <div>{confirmar}</div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="form-rodape">
          <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setConfirmando(false)} disabled={pendente}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao-primario botao-pequeno"
            onClick={() => {
              gerar();
            }}
            disabled={pendente}
            autoFocus
          >
            <MessageCircle size={16} aria-hidden="true" />
            {pendente ? "Enviando..." : (rotulo ?? (telefone ? "Enviar no WhatsApp" : "Gerar link"))}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="enviar-link">
      <button
        type="button"
        className="botao botao-primario"
        onClick={confirmar && !link ? () => setConfirmando(true) : gerar}
        disabled={pendente || bloqueado}
      >
        <MessageCircle size={18} aria-hidden="true" />
        {pendente ? "Gerando link..." : (rotulo ?? (telefone ? "Enviar no WhatsApp" : "Gerar link"))}
      </button>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {link && (
        <div className="link-escritorio">
          {depois && <Aviso tipo="sucesso">{depois}</Aviso>}
          <code>{link}</code>
          <div className="link-escritorio-acoes">
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(mensagem(link));
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  window.prompt("Copie a mensagem:", mensagem(link));
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
