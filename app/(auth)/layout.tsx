import Image from "next/image";
import Link from "next/link";
import { VideoAcesso } from "@/components/auth/VideoAcesso";

// Layout das telas de login, cadastro e recuperação de senha:
// vídeo à esquerda (no celular vira uma faixa no topo) e logo + formulário à direita.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="acesso">
      <aside className="acesso-imagem">
        <VideoAcesso />
        <div className="acesso-frase">
          <span className="acesso-linha" aria-hidden="true" />
          <p>
            Mais clareza para criar.
            <br />
            Mais controle para gerir.
          </p>
        </div>
      </aside>

      <main className="acesso-lado">
        <Link href="/" className="acesso-logo" aria-label="NorteArq, página inicial">
          <Image src="/marca/nortearq-logo.png" alt="NorteArq" width={880} height={271} priority />
        </Link>
        <div className="acesso-conteudo">{children}</div>
        <p className="acesso-rodape">© NorteArq</p>
      </main>
    </div>
  );
}
