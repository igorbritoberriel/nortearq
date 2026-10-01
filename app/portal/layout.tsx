import { sair } from "@/app/(auth)/acoes";

// Portal do cliente final (com login), sempre com a marca do escritório.
// O proxy.ts já exige login aqui.
// TODO: carregar logo/cores do escritório do cliente.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cliente">
      <header className="cliente-topo">
        <strong>{/* TODO: logo do escritório */}Logo do escritório</strong>
        <form action={sair}>
          <button type="submit" className="botao-link muted">Sair</button>
        </form>
      </header>
      {children}
    </div>
  );
}
