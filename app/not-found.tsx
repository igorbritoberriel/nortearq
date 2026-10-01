import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="auth">
      <div className="cartao" style={{ textAlign: "center" }}>
        <h1>Página não encontrada</h1>
        <p className="muted">Parece que você perdeu o norte.</p>
        <Link href="/" className="botao botao-primario">Voltar ao início</Link>
      </div>
    </main>
  );
}
