import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { sair } from "@/app/(auth)/acoes";
import { modulosLiberados, planoPorId, somarDias } from "@/lib/assinatura";
import { diasDeTeste, obterSessaoArquiteto, podeGerirAssinatura, podeVerFinanceiro } from "@/lib/escritorio";
import { MENU_ARQUITETO } from "@/lib/navegacao";
import { carregarNotificacoes } from "@/lib/notificacoes";
import { dataCurta } from "@/lib/propostas";
import { Notificacoes } from "@/components/notificacoes/Notificacoes";

// Layout do sistema do arquiteto.
// RN-00.3: sem a configuração inicial concluída, o arquiteto volta para o assistente.
// RG-1 a RG-5: menu conforme o plano, faixa de aviso da assinatura e conta suspensa só abre a assinatura.
export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !sessao.escritorio.onboarding_concluido_em) redirect("/app/onboarding");
  if (sessao?.situacao === "suspenso") redirect("/app/assinatura");

  const dias = sessao ? diasDeTeste(sessao.escritorio) : null;
  const notificacoes = sessao ? await carregarNotificacoes() : null;
  const liberados = sessao ? modulosLiberados(sessao.escritorio.plano) : null;
  // Perfil (0024): o colaborador não vê propostas, contratos nem configurações; assinatura é só do dono.
  const papel = sessao?.membro.papel ?? "dono";
  const ocultos = podeVerFinanceiro(papel) ? [] : ["/app/propostas", "/app/contratos", "/app/configuracoes"];
  const menu = MENU_ARQUITETO.filter(
    (item) => (!liberados || liberados.includes(item.modulo)) && !ocultos.includes(item.href),
  );
  const dono = podeGerirAssinatura(papel);

  const e = sessao?.escritorio;

  // Linha do plano no menu: no teste vale o Profissional (ou o plano já escolhido para depois do teste).
  const nomePlano =
    planoPorId(e?.plano === "trial" ? (e?.plano_escolhido ?? "profissional") : e?.plano)?.nome ?? "Profissional";
  const detalhePlano =
    sessao?.situacao === "teste"
      ? dias === 0
        ? "teste grátis termina hoje"
        : `teste grátis, ${dias} ${dias === 1 ? "dia" : "dias"}`
      : sessao?.situacao === "tolerancia"
        ? "pagamento em atraso"
        : sessao?.situacao === "leitura"
          ? "modo leitura"
          : null;
  const alertaPlano =
    sessao?.situacao === "tolerancia" || sessao?.situacao === "leitura" || (sessao?.situacao === "teste" && dias !== null && dias <= 3);
  const faixa =
    !sessao || !e
      ? null
      : sessao.situacao === "leitura"
        ? { tipo: "erro", texto: "Modo leitura: você vê tudo, mas não cria nada novo. Seus clientes continuam acessando os projetos." }
        : sessao.situacao === "tolerancia"
          ? {
              tipo: "alerta",
              texto: `O pagamento da assinatura está em atraso. Regularize até ${dataCurta(e.pago_ate ? somarDias(e.pago_ate, 7) : null)} para não entrar em modo leitura.`,
            }
          : sessao.situacao === "teste" && dias !== null && dias <= 3
            ? {
                tipo: "alerta",
                texto:
                  dias === 0
                    ? "Seu teste grátis termina hoje. Escolha um plano para continuar criando."
                    : `Seu teste grátis termina em ${dias} ${dias === 1 ? "dia" : "dias"}. Escolha um plano para não parar.`,
              }
            : null;

  return (
    <div className="app">
      <aside className="app-lateral">
        <Logo href="/app" />
        {sessao && (
          <div className="app-escritorio">
            <strong>{sessao.escritorio.nome}</strong>
            {/* Plano numa linha só, clicável; o alerta só aparece quando importa. */}
            {dono ? (
              <Link
                href="/app/assinatura"
                className={`app-plano ${alertaPlano ? "app-plano-alerta" : ""}`}
                title="Plano e assinatura"
              >
                <strong>{nomePlano}</strong>
                {detalhePlano && <span> · {detalhePlano}</span>}
              </Link>
            ) : (
              <span className="app-plano">
                <strong>{nomePlano}</strong>
                {papel === "colaborador" ? " · colaborador" : " · administrador"}
              </span>
            )}
          </div>
        )}
        {sessao && notificacoes && (
          <Notificacoes
            escritorioId={sessao.escritorio.id}
            iniciais={notificacoes.lista}
            naoLidasIniciais={notificacoes.naoLidas}
            naoVistasIniciais={notificacoes.naoVistas}
          />
        )}
        <nav>
          {menu.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.rotulo}
            </Link>
          ))}
          {dono && <Link href="/app/assinatura">Plano e assinatura</Link>}
        </nav>
        {sessao && (
          <form action={sair} className="app-usuario">
            <span title={sessao.email}>{sessao.membro.nome}</span>
            <button type="submit" className="app-sair">
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </form>
        )}
      </aside>
      <main className="app-conteudo">
        {faixa && (
          <div className={`faixa-assinatura faixa-${faixa.tipo}`} role="status">
            <span>{faixa.texto}</span>
            {dono ? (
              <Link href="/app/assinatura" className="botao botao-primario botao-pequeno">
                {sessao?.situacao === "teste" ? "Escolher plano" : "Resolver agora"}
              </Link>
            ) : (
              <span className="muted">Fale com o dono do escritório.</span>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
