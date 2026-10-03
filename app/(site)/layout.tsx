import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MotorAnimacao } from "@/components/site/MotorAnimacao";
import { PRE_LANCAMENTO, linkChamada } from "@/lib/site";

// Layout do site de vendas (landing page, preços, blog).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <MotorAnimacao />
      <header className="site-topo">
        <div className="container">
          <Logo />
          <nav>
            <Link className="link" href="/#como-funciona">Como funciona</Link>
            <Link className="link" href="/#modulos">Módulos</Link>
            <Link className="link" href="/precos">Preços</Link>
            <Link className="link" href="/#perguntas">Dúvidas</Link>
            {!PRE_LANCAMENTO && <Link className="link" href="/entrar">Entrar</Link>}
            <Link className="botao botao-primario botao-pequeno" href={linkChamada()}>
              {PRE_LANCAMENTO ? "Lista de espera" : "Teste grátis"}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-rodape">
        <div className="container">
          <div>
            <Logo />
            <p>O norte do seu projeto.</p>
          </div>
          <nav aria-label="Rodapé">
            <Link href="/#como-funciona">Como funciona</Link>
            <Link href="/precos">Preços</Link>
            <Link href="/#lista-espera">Lista de espera</Link>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
          </nav>
          <span className="site-rodape-direitos">© {new Date().getFullYear()} NorteArq</span>
        </div>
      </footer>
    </div>
  );
}
