import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { sair } from "@/app/(auth)/acoes";
import { diasDeTeste, obterSessaoArquiteto } from "@/lib/escritorio";
import { MENU_ARQUITETO } from "@/lib/navegacao";
import { carregarNotificacoes } from "@/lib/notificacoes";
import { Notificacoes } from "@/components/notificacoes/Notificacoes";

// Layout do sistema do arquiteto.
// RN-00.3: sem a configuração inicial concluída, o arquiteto volta para o assistente.
// TODO: esconder itens de módulos fora do plano contratado.
export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoArquiteto();
  if (sessao && !sessao.escritorio.onboarding_concluido_em) redirect("/app/onboarding");

  const dias = sessao ? diasDeTeste(sessao.escritorio) : null;
  const notificacoes = sessao ? await carregarNotificacoes() : null;

  return (
    <div className="app">
      <aside className="app-lateral">
        <Logo href="/app" />
        {sessao && (
          <div className="app-escritorio">
            <strong>{sessao.escritorio.nome}</strong>
            {dias !== null && (
              <span className={`app-teste ${dias <= 3 ? "app-teste-fim" : ""}`}>
                {dias === 0
                  ? "Teste grátis encerrado"
                  : `Teste grátis: ${dias} ${dias === 1 ? "dia" : "dias"}`}
              </span>
            )}
          </div>
        )}
        {sessao && notificacoes && (
          <Notificacoes
            escritorioId={sessao.escritorio.id}
            iniciais={notificacoes.lista}
            naoLidasIniciais={notificacoes.naoLidas}
          />
        )}
        <nav>
          {MENU_ARQUITETO.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.rotulo}
            </Link>
          ))}
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
      <main className="app-conteudo">{children}</main>
    </div>
  );
}
