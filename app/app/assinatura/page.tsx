import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Aviso } from "@/components/Campo";
import { CancelarAssinatura, FormAssinatura } from "@/components/assinatura/FormAssinatura";
import { sair } from "@/app/(auth)/acoes";
import { asaasConfigurado, cobrancaEmAberto } from "@/lib/asaas";
import { NOME_SITUACAO, planoPorId, somarDias, type Periodo } from "@/lib/assinatura";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { dataCurta, reais } from "@/lib/propostas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { pagarAgora } from "./acoes";

export const metadata: Metadata = { title: "Plano e assinatura" };

const NOME_EVENTO: Record<string, string> = {
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_OVERDUE: "Pagamento em atraso",
  PAYMENT_REFUNDED: "Pagamento estornado",
};

// Fora do layout do sistema de propósito: precisa abrir mesmo com a conta suspensa.
export default async function AssinaturaPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return (
      <main className="assistente">
        <Logo href="/app" />
        <p className="muted">Ligue o Supabase no .env.local para ver a assinatura.</p>
      </main>
    );
  }

  const { escritorio: e, situacao } = sessao;
  const dono = sessao.membro.papel === "dono";
  const plano = planoPorId(e.plano === "trial" ? e.plano_escolhido : e.plano);
  const cancelada = !!e.assinatura_cancelada_em;
  const temAssinatura = !!e.asaas_assinatura_id && !cancelada;

  const [{ data: eventos }, cobranca] = await Promise.all([
    supabase.from("assinatura_eventos").select("id, tipo, valor, vencimento, criado_em").order("criado_em", { ascending: false }).limit(12),
    temAssinatura && asaasConfigurado() ? cobrancaEmAberto(e.asaas_assinatura_id!).catch(() => null) : Promise.resolve(null),
  ]);

  const detalhe = {
    teste: `Você está no teste grátis até ${dataCurta(e.trial_ate)}, com tudo do plano Profissional.`,
    ativo: `${plano ? `Plano ${plano.nome}` : "Assinatura"}${e.periodo ? ` (${e.periodo})` : ""} em dia até ${dataCurta(e.pago_ate)}.${cancelada ? " A assinatura foi cancelada e não renova." : ""}`,
    tolerancia: `O pagamento venceu em ${dataCurta(e.pago_ate)}. Regularize até ${dataCurta(e.pago_ate ? somarDias(e.pago_ate, 7) : null)} para não entrar em modo leitura.`,
    leitura: "Você vê tudo, mas não cria nada novo. Escolha um plano ou regularize o pagamento para voltar ao normal. Seus clientes continuam acessando os projetos.",
    suspenso: "A conta está suspensa. Seus dados estão guardados: escolha um plano para reativar. Seus clientes continuam acessando os projetos.",
  }[situacao];

  return (
    <main className="assistente assinatura">
      <header className="assistente-topo">
        <Logo href="/app" />
        <form action={sair}>
          <button type="submit" className="botao botao-fantasma botao-pequeno">
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </form>
      </header>
      {situacao !== "suspenso" && (
        <Link href="/app" className="voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao sistema
        </Link>
      )}
      <h1>Plano e assinatura</h1>

      <section className={`cartao secao-config assinatura-situacao situacao-${situacao}`}>
        <span className="selo-status">{NOME_SITUACAO[situacao]}</span>
        <p>{detalhe}</p>
        {cobranca && (
          <div className="assinatura-cobranca">
            <span>
              Próxima cobrança: <strong>{reais(cobranca.value)}</strong> com vencimento em {dataCurta(cobranca.dueDate)}
              {cobranca.status === "OVERDUE" ? " (em atraso)" : ""}
            </span>
            <form action={pagarAgora}>
              <button type="submit" className="botao botao-primario botao-pequeno">
                <CreditCard size={16} aria-hidden="true" /> Pagar agora
              </button>
            </form>
          </div>
        )}
      </section>

      {!asaasConfigurado() && (
        <Aviso tipo="erro">A cobrança está sendo configurada. Em breve você poderá assinar por aqui.</Aviso>
      )}

      <section className="cartao secao-config">
        <h2>{temAssinatura ? "Trocar de plano" : "Escolha seu plano"}</h2>
        {dono ? (
          <FormAssinatura
            planoAtual={temAssinatura ? (e.plano_escolhido ?? null) : null}
            periodoAtual={temAssinatura ? ((e.periodo as Periodo | null) ?? null) : null}
            temAssinatura={temAssinatura}
            documentoAtual={e.documento}
          />
        ) : (
          <p className="muted">Só o dono do escritório pode assinar ou trocar de plano.</p>
        )}
        {temAssinatura && dono && (
          <div className="assinatura-cancelar">
            <CancelarAssinatura ate={e.pago_ate ? dataCurta(e.pago_ate) : null} />
          </div>
        )}
      </section>

      {!!eventos?.length && (
        <section className="cartao secao-config">
          <h2>Histórico</h2>
          <ul className="linha-tempo">
            {eventos.map((ev) => (
              <li key={ev.id}>
                <time dateTime={ev.criado_em}>{dataCurta(ev.criado_em)}</time>
                <span>
                  {NOME_EVENTO[ev.tipo] ?? ev.tipo}
                  {ev.valor ? ` · ${reais(Number(ev.valor))}` : ""}
                  {ev.vencimento ? ` · vencimento ${dataCurta(ev.vencimento)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
