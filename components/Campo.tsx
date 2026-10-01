// Campo de formulário do sistema: rótulo, controle e mensagem de erro.
export function Campo({
  id,
  rotulo,
  opcional,
  ajuda,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  ajuda?: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`campo ${erro ? "com-erro" : ""}`}>
      <label htmlFor={id}>
        {rotulo} {opcional && <small className="muted">(opcional)</small>}
      </label>
      {children}
      {ajuda && !erro && <p className="campo-ajuda">{ajuda}</p>}
      {erro && <p className="campo-erro">{erro}</p>}
    </div>
  );
}

// Mensagem geral do formulário (erro ou sucesso).
export function Aviso({ tipo, children }: { tipo: "erro" | "sucesso"; children: React.ReactNode }) {
  return (
    <p className={`aviso aviso-${tipo}`} role={tipo === "erro" ? "alert" : "status"}>
      {children}
    </p>
  );
}
