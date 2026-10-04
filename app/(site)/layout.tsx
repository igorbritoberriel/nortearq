import Link from "next/link";
import { Instrument_Serif, Manrope } from "next/font/google";
import { Logo } from "@/components/Logo";
import { MotorAnimacao } from "@/components/site/MotorAnimacao";
import { PRE_LANCAMENTO, linkChamada } from "@/lib/site";

// Fontes só do site de vendas: texto moderno e itálico serifado nos destaques.
const fonteSite = Manrope({ subsets: ["latin"], variable: "--fonte-site", display: "swap" });
const fonteDestaque = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--fonte-destaque", display: "swap" });

// Layout do site de vendas (landing page, preços, termos).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${fonteSite.variable} ${fonteDestaque.variable}`}>
      <MotorAnimacao />
      <header className="site-topo">
        <div className="container">
          <Logo />
          <nav>
            <Link className="link" href="/#como-funciona">Como funciona</Link>
            <Link className="link" href="/#recursos">Recursos</Link>
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
