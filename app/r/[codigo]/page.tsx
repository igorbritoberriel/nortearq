import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Ban } from "lucide-react";
import { BotaoImprimir } from "@/components/briefing/BotaoImprimir";
import { formatarDocumento } from "@/lib/contratos";
import { textoSobre } from "@/lib/link-cliente";
import { rotuloForma, valorPorExtenso, type FormaPagamento } from "@/lib/pagamentos";
import { dataCurta, reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Recibo de pagamento (/r/[codigo]): link pessoal do cliente, com a marca do escritório.
// O código é longo e aleatório (migração 0015). Recibo de pagamento estornado aparece como cancelado.

type Recibo = {
  numero: number;
  pago_em: string;
  forma: FormaPagamento | null;
  observacao: string | null;
  emitido_em: string;
  cancelado_em: string | null;
  descricao: string;
  valor: number;
  contrato_codigo: string | null;
  cliente: { nome: string; documento: string | null };
  escritorio: {
    nome: string;
    documento: string | null;
    endereco: string | null;
    responsavel: string | null;
    registro: string | null;
    logo_url: string | null;
    cor_primaria: string | null;
    whatsapp: string | null;
  };
};

const carregar = cache(async (codigo: string): Promise<Recibo | null> => {
  if (!/^[0-9a-f]{32,64}$/.test(codigo)) return null;
  const supabase = await criarClienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("recibo_publico", { p_codigo: codigo });
  if (error) console.error("[recibo]", error.message);
  return (data as Recibo | null) ?? null;
});

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const recibo = await carregar((await params).codigo);
  return {
    title: { absolute: recibo ? `Recibo nº ${recibo.numero} · ${recibo.escritorio.nome}` : "Recibo" },
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ReciboPage({ params }: { params: Promise<{ codigo: string }> }) {
  const recibo = await carregar((await params).codigo);
  if (!recibo) notFound();

  const { escritorio: e, cliente } = recibo;
  const valor = Number(recibo.valor);
  const cor = e.cor_primaria ?? "#1f3a5f";
  const estilo = { "--cor-marca": cor, "--cor-marca-texto": textoSobre(cor) } as React.CSSProperties;
  const docCliente = formatarDocumento(cliente.documento);
  const docEscritorio = formatarDocumento(e.documento);

  return (
    <div className="publico recibo-pagina" style={estilo}>
      <header className="publico-topo">
        {e.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.logo_url} alt={e.nome} className="publico-logo" />
        ) : (
          <span className="publico-inicial" aria-hidden="true">
            {e.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <strong>{e.nome}</strong>
      </header>

      <main className="publico-conteudo">
        {recibo.cancelado_em && (
          <p className="recibo-cancelado" role="alert">
            <Ban size={18} aria-hidden="true" />
            Recibo cancelado em {dataHora.format(new Date(recibo.cancelado_em))}: o pagamento foi estornado pelo escritório.
          </p>
        )}

        <article className={`recibo ${recibo.cancelado_em ? "recibo-invalido" : ""}`}>
          <div className="recibo-cabeca">
            <h1>Recibo</h1>
            <div>
              <span className="recibo-numero">Nº {String(recibo.numero).padStart(4, "0")}</span>
              <strong className="recibo-valor">{reais(valor)}</strong>
            </div>
          </div>

          <p className="recibo-texto">
            Recebi(emos) de <strong>{cliente.nome}</strong>
            {docCliente && (
              <>
                , CPF/CNPJ <span className="sem-quebra">{docCliente}</span>,
              </>
            )}{" "}
            a importância de <strong>{reais(valor)}</strong> (
            {valorPorExtenso(valor)}), referente a <strong>{recibo.descricao}</strong> do contrato de prestação de serviços
            firmado com {e.nome}.
          </p>

          <dl className="recibo-dados">
            <div>
              <dt>Data do pagamento</dt>
              <dd>{dataCurta(recibo.pago_em)}</dd>
            </div>
            <div>
              <dt>Forma de pagamento</dt>
              <dd className="primeira-maiuscula">{rotuloForma(recibo.forma)}</dd>
            </div>
            {recibo.observacao && (
              <div>
                <dt>Observação</dt>
                <dd>{recibo.observacao}</dd>
              </div>
            )}
          </dl>

          <div className="recibo-emitente">
            <strong>{e.nome}</strong>
            {docEscritorio && (
              <span>
                CPF/CNPJ <span className="sem-quebra">{docEscritorio}</span>
              </span>
            )}
            {e.endereco && <span>{e.endereco}</span>}
            {e.responsavel && (
              <span>
                {e.responsavel}
                {e.registro ? ` · ${e.registro}` : ""}
              </span>
            )}
          </div>

          <p className="recibo-rodape">
            Recibo emitido eletronicamente em {dataHora.format(new Date(recibo.emitido_em))}.
            {recibo.contrato_codigo && <> Código do contrato: {recibo.contrato_codigo.slice(0, 16)}.</>}
          </p>
        </article>

        <div className="recibo-acoes nao-imprimir">
          <BotaoImprimir />
        </div>
      </main>

      <footer className="publico-rodape nao-imprimir">Recibo gerado pela plataforma NorteArq</footer>
    </div>
  );
}
