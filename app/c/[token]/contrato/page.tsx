import { Ban, ShieldCheck } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { AssinarContrato } from "@/components/contratos/AssinarContrato";
import { CriarAcessoPortal } from "@/components/portal/CriarAcessoPortal";
import { EmConstrucao } from "@/components/EmConstrucao";
import type { ContratoPublico } from "@/lib/contratos";
import { exigirLink } from "@/lib/link-cliente";
import { criarClienteServidor } from "@/lib/supabase/server";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Contrato enviado ao cliente por WhatsApp: leitura, conferência dos dados e aceite eletrônico.
export default async function ContratoClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await exigirLink(token, "contrato");

  if (link === undefined) {
    return (
      <EmConstrucao
        modulo="01"
        titulo="Seu contrato"
        descricao="Ligue o Supabase no .env.local para ver o contrato de verdade."
        itens={["Leitura do contrato preenchido", "Conferência de CPF e endereço", "Aceite eletrônico"]}
      />
    );
  }
  if (!link.valido) return null; // o layout mostra o aviso de link vencido

  const supabase = (await criarClienteServidor())!;
  const { data, error } = await supabase.rpc("contrato_publico", { p_token: token });
  if (error || !data) {
    console.error("[contrato] abrir", error?.message);
    return (
      <div className="publico-sucesso">
        <h1>Não foi possível abrir o contrato</h1>
        <p>Atualize a página em instantes. Se continuar, avise o {link.escritorio.nome}.</p>
      </div>
    );
  }
  const contrato = data as ContratoPublico;

  if (contrato.status === "cancelado") {
    return (
      <div className="publico-sucesso">
        <Ban size={40} aria-hidden="true" className="icone-aviso" />
        <h1>Este contrato foi cancelado</h1>
        <p>Fale com o {link.escritorio.nome} se tiver alguma dúvida.</p>
      </div>
    );
  }

  const assinado = contrato.status === "assinado";
  // Contrato assinado: convite para o portal (RN-01.15), enquanto o cliente não criou o acesso.
  const { data: cliente } = assinado ? await supabase.rpc("cliente_do_link_portal", { p_token: token }) : { data: null };
  const convite = cliente as { email: string | null; tem_acesso: boolean } | null;
  return (
    <>
      <p className="muted nao-imprimir">
        {assinado
          ? `Este é o seu contrato com o ${link.escritorio.nome}, já assinado.`
          : `Olá, ${link.cliente_nome}! Leia o contrato com calma. A assinatura fica no final da página.`}
      </p>
      {assinado && (
        <p className="nao-imprimir">
          <BotaoImprimir />
        </p>
      )}
      {convite && !convite.tem_acesso && (
        <div className="nao-imprimir">
          <CriarAcessoPortal token={token} email={convite.email} escritorio={link.escritorio.nome} />
        </div>
      )}

      <div className="publico-form contrato-documento">
        <pre className="contrato-texto">{contrato.texto}</pre>
        {assinado && (
          <div className="contrato-aceite">
            <h2>
              <ShieldCheck size={20} aria-hidden="true" /> Aceite eletrônico
            </h2>
            <p>
              Aceito por {contrato.aceite_nome} em {contrato.assinado_em && dataHora.format(new Date(contrato.assinado_em))}{" "}
              (horário de Brasília).
            </p>
            <p className="campo-ajuda">
              Código de verificação: <code className="contrato-codigo">{contrato.codigo_verificacao}</code>
            </p>
          </div>
        )}
      </div>

      {!assinado && (
        <div className="publico-form">
          <AssinarContrato
            token={token}
            escritorio={link.escritorio.nome}
            dados={{ nome: contrato.nome, documento: contrato.documento, endereco: contrato.endereco }}
          />
        </div>
      )}
    </>
  );
}
