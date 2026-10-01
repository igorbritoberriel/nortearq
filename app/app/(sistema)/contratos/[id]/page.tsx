import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, ShieldCheck } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { EditorContrato } from "@/components/contratos/EditorContrato";
import { Pagamentos } from "@/components/contratos/Pagamentos";
import { EmConstrucao } from "@/components/EmConstrucao";
import { EnviarLinkAcao } from "@/components/EnviarLinkAcao";
import {
  COLUNAS_CONTRATO,
  STATUS_CONTRATO,
  formatarDocumento,
  type Contrato,
  type Pagamento,
} from "@/lib/contratos";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cancelarContrato, enviarContrato, salvarTextoContrato } from "../acoes";

export const metadata: Metadata = { title: "Contrato" };

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="01" titulo="Contrato" itens={["Ligue o Supabase no .env.local."]} />;
  }
  if (!UUID.test(id)) notFound();

  const { data } = await supabase.from("contratos").select(COLUNAS_CONTRATO).eq("id", id).maybeSingle();
  if (!data) notFound();
  const contrato = data as unknown as Contrato;

  const [{ data: cliente }, { data: previa }, { data: pagamentos }, { data: projeto }] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone").eq("id", contrato.cliente_id).maybeSingle(),
    supabase.rpc("previa_contrato", { p_contrato: id }),
    supabase.from("pagamentos").select("id, descricao, valor, vencimento, pago_em").eq("contrato_id", id).order("id"),
    supabase.from("projetos").select("id, nome").eq("contrato_id", id).maybeSingle(),
  ]);
  if (!cliente) notFound();

  const e = sessao.escritorio;
  const faltamDados = !e.documento || !e.endereco || !e.responsavel;
  const texto = (previa as string | null) ?? "";
  const aberto = contrato.status === "rascunho" || contrato.status === "aguardando_assinatura";

  return (
    <div className="pagina-app pagina-larga contrato-pagina">
      <div className="nao-imprimir">
        <Link href="/app/contratos" className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Contratos
        </Link>
        <div className="titulo-com-acao">
          <div>
            <h1>
              Contrato de{" "}
              <Link className="tabela-link" href={`/app/clientes/${cliente.id}`}>
                {cliente.nome}
              </Link>
            </h1>
            <p className="muted ficha-contato">
              <span className={`selo-status selo-contrato-${contrato.status}`}>{STATUS_CONTRATO[contrato.status]}</span>
              <Link className="tabela-link" href={`/app/propostas/${contrato.proposta_id}`}>
                Ver proposta
              </Link>
            </p>
          </div>
          <div className="perfil-acoes">
            {aberto && (
              <form action={cancelarContrato.bind(null, contrato.id)}>
                <button type="submit" className="botao botao-fantasma">
                  <Ban size={18} aria-hidden="true" /> Cancelar contrato
                </button>
              </form>
            )}
            {contrato.status === "assinado" && <BotaoImprimir />}
          </div>
        </div>

        {aberto && faltamDados && (
          <p className="contato-alerta">
            Faltam dados do escritório no contrato (aparecem como “[a preencher]”).{" "}
            <Link className="tabela-link" href="/app/contratos/modelo">
              Preencher agora
            </Link>
          </p>
        )}

        {aberto && (
          <section className="cartao secao-config">
            <h2>{contrato.status === "rascunho" ? "Enviar para o cliente" : "Aguardando o cliente"}</h2>
            <p className="muted">
              {contrato.status === "rascunho"
                ? "Ao enviar, o texto fica travado e vale como o seu aceite. O cliente confere o CPF e o endereço e aceita pelo link."
                : "Se o cliente perdeu a mensagem, gere um link novo (o anterior deixa de valer)."}
            </p>
            <EnviarLinkAcao
              acao={enviarContrato.bind(null, contrato.id)}
              destino="contrato"
              telefone={cliente.telefone}
              cliente={cliente.nome}
              escritorio={e.nome}
              rotulo={contrato.status === "rascunho" ? undefined : cliente.telefone ? "Reenviar no WhatsApp" : "Gerar link novo"}
              depois={contrato.status === "rascunho" ? "Contrato enviado. O texto não pode mais ser editado." : undefined}
            />
          </section>
        )}

        {contrato.status === "assinado" && (
          <div className="ficha contrato-ficha">
            <section className="cartao secao-config">
              <h2>Pagamentos</h2>
              <Pagamentos pagamentos={(pagamentos ?? []) as Pagamento[]} />
            </section>
            <section className="cartao secao-config">
              <h2>Projeto</h2>
              {projeto ? (
                <p>
                  <Link className="tabela-link" href={`/app/projetos/${projeto.id}`}>
                    {projeto.nome}
                  </Link>{" "}
                  foi criado com as etapas padrão. Envie os arquivos e as aprovações por lá.
                </p>
              ) : (
                <p className="muted">Nenhum projeto ligado a este contrato.</p>
              )}
            </section>
          </div>
        )}
      </div>

      {contrato.status === "rascunho" ? (
        <section className="cartao secao-config nao-imprimir">
          <h2>Texto deste contrato</h2>
          <EditorContrato
            texto={contrato.corpo}
            salvar={salvarTextoContrato.bind(null, contrato.id)}
            ajuda="Ajustes valem só para este cliente. Para mudar todos os próximos, edite o modelo."
          />
          <details className="contrato-previa-detalhes">
            <summary>Ver como o cliente vai ler</summary>
            <pre className="contrato-texto">{texto}</pre>
          </details>
        </section>
      ) : (
        <section className="cartao contrato-documento">
          <pre className="contrato-texto">{texto}</pre>
          {contrato.status === "assinado" && (
            <div className="contrato-aceite">
              <h2>
                <ShieldCheck size={20} aria-hidden="true" /> Registro do aceite eletrônico
              </h2>
              <dl>
                <div>
                  <dt>Contratado</dt>
                  <dd>
                    {e.nome}, ao enviar em {contrato.enviado_em && dataHora.format(new Date(contrato.enviado_em))}
                  </dd>
                </div>
                <div>
                  <dt>Contratante</dt>
                  <dd>
                    {contrato.aceite_nome}, {formatarDocumento(contrato.aceite_documento)}
                  </dd>
                </div>
                <div>
                  <dt>Aceito em</dt>
                  <dd>{contrato.assinado_em && dataHora.format(new Date(contrato.assinado_em))} (horário de Brasília)</dd>
                </div>
                <div>
                  <dt>IP</dt>
                  <dd>{contrato.aceite_ip ?? "—"}</dd>
                </div>
                <div>
                  <dt>Navegador</dt>
                  <dd className="contrato-navegador">{contrato.aceite_navegador ?? "—"}</dd>
                </div>
                <div>
                  <dt>Código de verificação (SHA-256 do texto)</dt>
                  <dd>
                    <code className="contrato-codigo">{contrato.codigo_verificacao}</code>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
