import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CopyPlus, FileSignature, MessageCircle, Trash2 } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { Confirmar } from "@/components/Confirmar";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import { FormProposta } from "@/components/propostas/FormProposta";
import { SalvarComoModelo, type ModeloResumoProposta } from "@/components/propostas/ModelosProposta";
import { VisualizacaoProposta } from "@/components/propostas/VisualizacaoProposta";
import { listarServicos, obterSessaoArquiteto } from "@/lib/escritorio";
import {
  COLUNAS_PROPOSTA,
  MOTIVOS_RECUSA,
  STATUS_PROPOSTA,
  statusVisivel,
  type Proposta,
} from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarContrato } from "../../contratos/acoes";
import { enviarProposta, excluirRascunho, novaVersao } from "../acoes";

export const metadata: Metadata = { title: "Proposta" };

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PropostaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="01" titulo="Proposta" itens={["Ligue o Supabase no .env.local."]} />;
  }
  if (!UUID.test(id)) notFound();

  const { data } = await supabase.from("propostas").select(COLUNAS_PROPOSTA).eq("id", id).maybeSingle();
  if (!data) notFound();
  const proposta = data as unknown as Proposta;

  const [{ data: cliente }, { data: versoes }, servicos, { data: contrato }, { data: modelos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone").eq("id", proposta.cliente_id).maybeSingle(),
    supabase
      .from("propostas")
      .select("id, versao, status, validade_ate, enviada_em")
      .eq("grupo_id", proposta.grupo_id)
      .order("versao", { ascending: false }),
    listarServicos(),
    supabase.from("contratos").select("id, status").eq("proposta_id", id).neq("status", "cancelado").maybeSingle(),
    supabase.from("modelos_proposta").select("id, nome, servicos").order("criado_em"),
  ]);
  if (!cliente) notFound();

  // Com equipe: quem enviou a proposta (0025).
  const { data: remetente } = proposta.enviada_por
    ? await supabase.from("membros").select("nome").eq("id", proposta.enviada_por).maybeSingle()
    : { data: null };
  const enviadaPor = remetente?.nome ?? null;

  const status = statusVisivel(proposta);
  const rascunho = proposta.status === "rascunho";
  const respondida = ["aprovada", "ajuste_pedido", "recusada"].includes(proposta.status);
  const podeNovaVersao = proposta.status !== "aprovada" && !rascunho;

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/propostas" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Propostas
      </Link>
      <div className="titulo-com-acao">
        <div>
          <h1>
            Proposta para{" "}
            <Link className="tabela-link" href={`/app/clientes/${cliente.id}`}>
              {cliente.nome}
            </Link>
          </h1>
          <p className="muted ficha-contato">
            <span className={`selo-status selo-proposta-${status}`}>{STATUS_PROPOSTA[status]}</span>
            Versão {proposta.versao}
            {proposta.enviada_em && ` · enviada em ${dataHora.format(new Date(proposta.enviada_em))}`}
            {enviadaPor && ` por ${enviadaPor}`}
          </p>
        </div>
        <div className="perfil-acoes">
          {podeNovaVersao && (
            <form action={novaVersao.bind(null, proposta.id)}>
              <button type="submit" className="botao botao-secundario">
                <CopyPlus size={18} aria-hidden="true" />
                Criar nova versão
              </button>
            </form>
          )}
          {rascunho && (
            <Confirmar
              rotulo="Apagar rascunho"
              icone={<Trash2 size={18} aria-hidden="true" />}
              classe="botao botao-fantasma"
              aviso={
                <p>
                  <strong>Apagar este rascunho?</strong> Tudo o que foi preenchido nesta proposta se perde. Não dá para desfazer.
                </p>
              }
              confirmar="Apagar rascunho"
              acao={excluirRascunho.bind(null, proposta.id)}
            />
          )}
        </div>
      </div>

      {erro && (
        <Aviso tipo="erro">
          {erro === "limite_projetos" ? (
            <>
              Você chegou a 15 projetos em andamento, o limite do plano Profissional. Um projeto libera a vaga quando todas
              as etapas são aprovadas. Para mais projetos ao mesmo tempo,{" "}
              <Link className="tabela-link" href="/app/assinatura">
                mude para o plano Escritório
              </Link>
              .
            </>
          ) : erro === "contrato" ? (
            "Não foi possível gerar o contrato agora. Tente de novo em instantes."
          ) : (
            "Não foi possível criar a nova versão agora. Tente de novo em instantes."
          )}
        </Aviso>
      )}
      {respondida && (
        <section className={`cartao resposta-cliente resposta-${proposta.status}`}>
          <h2>
            {proposta.status === "aprovada"
              ? "O cliente aprovou"
              : proposta.status === "ajuste_pedido"
                ? "O cliente pediu ajustes"
                : "O cliente recusou"}
          </h2>
          {proposta.parcelas_escolhidas && (
            <p>
              <strong>Pagamento escolhido:</strong>{" "}
              {proposta.avista
                ? `à vista, com ${String(proposta.desconto_avista_pct ?? 0).replace(".", ",")}% de desconto`
                : `${proposta.parcelas_escolhidas === 1 ? "saldo em parcela única" : `saldo em ${proposta.parcelas_escolhidas}x`}${proposta.entrada_pct ? `, com entrada de ${proposta.entrada_pct}%` : ""}`}
              .
            </p>
          )}
          {proposta.motivo_recusa && (
            <p>
              <strong>Motivo:</strong> {MOTIVOS_RECUSA[proposta.motivo_recusa]}
            </p>
          )}
          {proposta.comentario_cliente && <blockquote className="contato-mensagem">{proposta.comentario_cliente}</blockquote>}
          {/* RN-01.10: prova da resposta. */}
          <p className="campo-ajuda">
            Respondido em {proposta.respondida_em && dataHora.format(new Date(proposta.respondida_em))}
            {proposta.resposta_ip && ` · IP ${proposta.resposta_ip}`}
          </p>
          {proposta.status === "ajuste_pedido" && (
            <p className="muted">Crie uma nova versão com os ajustes: o mesmo link passa a mostrar a versão nova.</p>
          )}
          {proposta.status === "aprovada" &&
            (contrato ? (
              <p>
                <Link className="botao botao-primario" href={`/app/contratos/${contrato.id}`}>
                  <FileSignature size={18} aria-hidden="true" /> Abrir o contrato
                </Link>
              </p>
            ) : (
              <form action={gerarContrato.bind(null, proposta.id)}>
                <p className="muted">Próximo passo: o contrato, preenchido com os dados desta proposta.</p>
                <button type="submit" className="botao botao-primario">
                  <FileSignature size={18} aria-hidden="true" /> Gerar contrato
                </button>
              </form>
            ))}
        </section>
      )}

      {status === "expirada" && (
        <p className="contato-alerta">
          A validade acabou e o cliente não consegue mais responder. Crie uma nova versão para enviar de novo.
        </p>
      )}

      {proposta.status === "enviada" && status !== "expirada" && (
        <section className="cartao secao-config">
          <h2>Aguardando o cliente</h2>
          <p className="muted">Se o cliente perdeu a mensagem, gere um link novo (o anterior deixa de valer).</p>
          <EnviarLinkAcao
            acao={enviarProposta.bind(null, proposta.id)}
            destino="proposta"
            telefone={cliente.telefone}
            cliente={cliente.nome}
            escritorio={sessao.escritorio.nome}
            rotulo={cliente.telefone ? "Reenviar no WhatsApp" : "Gerar link novo"}
          />
        </section>
      )}

      {rascunho ? (
        <FormProposta
          key={proposta.modelo_aplicado_em ?? "inicial"}
          modelos={(modelos ?? []) as ModeloResumoProposta[]}
          servicosEscritorio={servicos.filter((s) => s.ativo).map((s) => ({ id: s.id, nome: s.nome }))}
          proposta={proposta}
          cliente={{ nome: cliente.nome, telefone: cliente.telefone }}
          escritorio={sessao.escritorio.nome}
          servicos={servicos.filter((s) => s.ativo).map((s) => s.nome)}
        />
      ) : (
        <>
          <div className="cartao proposta-previa">
            <VisualizacaoProposta proposta={proposta} />
          </div>
          {/* Proposta enviada ou aprovada também vira modelo (ex.: a que o cliente aprovou). */}
          <div className="proposta-salvar-modelo">
            <SalvarComoModelo
              propostaId={proposta.id}
              servicos={servicos.filter((s) => s.ativo).map((s) => ({ id: s.id, nome: s.nome }))}
              servicosDaProposta={proposta.itens.map((i) => i.servico)}
              modelos={(modelos ?? []) as ModeloResumoProposta[]}
            />
          </div>
        </>
      )}

      {(versoes ?? []).length > 1 && (
        <section className="cartao secao-config">
          <h2>Versões</h2>
          <ul className="linha-tempo">
            {(versoes ?? []).map((v) => (
              <li key={v.id}>
                <span>
                  {v.id === proposta.id ? (
                    <strong>Versão {v.versao} (esta)</strong>
                  ) : (
                    <Link className="tabela-link" href={`/app/propostas/${v.id}`}>
                      Versão {v.versao}
                    </Link>
                  )}{" "}
                  · {STATUS_PROPOSTA[statusVisivel(v as Pick<Proposta, "status" | "validade_ate">)]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!cliente.telefone && !rascunho && (
        <p className="campo-ajuda">
          <MessageCircle size={14} aria-hidden="true" /> Cadastre o WhatsApp do cliente para enviar com um clique.
        </p>
      )}
    </div>
  );
}
