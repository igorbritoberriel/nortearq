import Link from "next/link";
import { Check } from "lucide-react";
import { PLANOS } from "@/lib/modulos";
import { PRE_LANCAMENTO, linkChamada } from "@/lib/site";

export function Planos() {
  return (
    <div className="grade grade-3 planos">
      {PLANOS.map((plano) => (
        <div key={plano.id} className={`cartao plano ${plano.destaque ? "plano-destaque" : ""}`}>
          {plano.destaque && <span className="plano-faixa">Recomendado</span>}
          <h3>{plano.nome}</h3>
          <p className="plano-descricao muted">{plano.descricao}</p>
          <p className="preco">
            R$ {plano.preco}
            <small>/mês</small>
          </p>
          <p className="preco-anual">ou R$ {(plano.preco * 10).toLocaleString("pt-BR")}/ano (2 meses grátis)</p>
          <ul className="lista-icones">
            {plano.itens.map((item) => (
              <li key={item}><Check size={18} aria-hidden="true" /> {item}</li>
            ))}
          </ul>
          <Link
            href={linkChamada(plano.id)}
            className={`botao botao-bloco ${plano.destaque ? "botao-primario" : "botao-secundario"}`}
          >
            {PRE_LANCAMENTO ? "Quero este plano" : "Testar 14 dias grátis"}
          </Link>
        </div>
      ))}
    </div>
  );
}
