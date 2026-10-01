import { CircleCheck, Clock, MessageCircle } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { RespostaProposta } from "@/components/propostas/RespostaProposta";
import { VisualizacaoProposta } from "@/components/propostas/VisualizacaoProposta";
import { linkWhatsapp } from "@/lib/contatos";
import { exigirLink } from "@/lib/link-cliente";
import { type PropostaPublica } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Proposta enviada ao cliente por WhatsApp (módulo 01). Sempre mostra a versão mais recente (RN-01.7).
export default async function PropostaClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await exigirLink(token, "proposta");

  if (link === undefined) {
    return (
      <EmConstrucao
        modulo="01"
        titulo="Sua proposta"
        descricao="Ligue o Supabase no .env.local para ver a proposta de verdade."
        itens={["Escopo, entregáveis, prazos e honorários", "Aprovar · Pedir ajuste · Recusar"]}
      />
    );
  }
  if (!link.valido) return null; // o layout mostra o aviso de link vencido

  const supabase = (await criarClienteServidor())!;
  const { data, error } = await supabase.rpc("proposta_publica", { p_token: token });
  if (error || !data) {
    console.error("[proposta] abrir", error?.message);
    return (
      <div className="publico-sucesso">
        <h1>Não foi possível abrir a proposta</h1>
        <p>Atualize a página em instantes. Se continuar, avise o {link.escritorio.nome}.</p>
      </div>
    );
  }
  const proposta = data as PropostaPublica;
  const { escritorio } = link;

  const aviso = (() => {
    if (proposta.expirada) {
      return {
        icone: <Clock size={36} aria-hidden="true" className="icone-aviso" />,
        titulo: "Esta proposta expirou",
        texto: `A validade acabou. Fale com o ${escritorio.nome} para receber uma proposta atualizada.`,
      };
    }
    if (proposta.status === "aprovada") {
      return { icone: <CircleCheck size={36} aria-hidden="true" />, titulo: "Você aprovou esta proposta", texto: "O contrato vem em seguida." };
    }
    if (proposta.status === "ajuste_pedido") {
      return {
        icone: <Clock size={36} aria-hidden="true" className="icone-aviso" />,
        titulo: "Você pediu ajustes",
        texto: `O ${escritorio.nome} está preparando uma versão nova. Ela aparece neste mesmo link.`,
      };
    }
    if (proposta.status === "recusada") {
      return { icone: <CircleCheck size={36} aria-hidden="true" />, titulo: "Você recusou esta proposta", texto: "Obrigado por responder." };
    }
    return null;
  })();

  return (
    <>
      <p className="muted">Olá, {link.cliente_nome}! Esta é a proposta do {escritorio.nome} para o seu projeto.</p>
      {aviso && (
        <div className="publico-sucesso proposta-aviso" role="status">
          {aviso.icone}
          <h2>{aviso.titulo}</h2>
          <p>{aviso.texto}</p>
          {proposta.expirada && escritorio.whatsapp && (
            <a
              className="botao botao-marca"
              href={linkWhatsapp(escritorio.whatsapp, "Olá! A proposta que recebi expirou, pode me mandar uma atualizada?")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" /> Falar no WhatsApp
            </a>
          )}
        </div>
      )}

      <div className="publico-form proposta-cliente">
        <VisualizacaoProposta proposta={proposta} />
      </div>

      {proposta.status === "enviada" && !proposta.expirada && (
        <div className="publico-form">
          <RespostaProposta
            token={token}
            escritorio={escritorio.nome}
            parcelamento={
              proposta.modo_pagamento === "parcelado" && proposta.valor_total
                ? { total: proposta.valor_total, entradaPct: proposta.entrada_pct ?? 0, maximo: proposta.parcelas_max ?? 1 }
                : null
            }
          />
        </div>
      )}
    </>
  );
}
