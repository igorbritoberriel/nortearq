import Image from "next/image";
import Link from "next/link";

// Layout das telas de login, cadastro e recuperação de senha:
// foto à esquerda (no celular vira uma faixa no topo) e logo + formulário à direita.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="acesso">
      <aside className="acesso-imagem">
        <Image
          src="/login/nortearq-login-arquiteta.jpg"
          alt="Arquiteta revisando um projeto no tablet, no escritório"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          className="acesso-foto"
        />
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
