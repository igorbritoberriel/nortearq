"use client";
export default function ErroFinanceiro({ reset }: { reset: () => void }) {
  return <div className="pagina-app"><h1>Financeiro</h1><div className="cartao"><h2>Não foi possível carregar os dados</h2><p>Seus registros foram preservados. Tente novamente em instantes.</p><button className="botao botao-primario" onClick={reset}>Tentar novamente</button></div></div>;
}
