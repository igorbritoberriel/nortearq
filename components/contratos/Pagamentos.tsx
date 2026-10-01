"use client";

import { useTransition } from "react";
import { marcarPagamento } from "@/app/app/(sistema)/contratos/acoes";
import type { Pagamento } from "@/lib/contratos";
import { dataCurta, reais } from "@/lib/propostas";

// RN-01.16: o arquiteto marca cada parcela como paga ou pendente. O NorteArq não cobra o cliente.
export function Pagamentos({ pagamentos }: { pagamentos: Pagamento[] }) {
  const [pendente, iniciar] = useTransition();
  const pago = pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + Number(p.valor), 0);
  const total = pagamentos.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <>
      <ul className="pagamentos" aria-busy={pendente}>
        {pagamentos.map((p) => (
          <li key={p.id}>
            <label className="checagem">
              <input
                type="checkbox"
                checked={!!p.pago_em}
                disabled={pendente}
                onChange={(e) => iniciar(() => marcarPagamento(p.id, e.target.checked))}
              />
              <span>
                {p.descricao}
                {p.pago_em && <small className="muted"> · pago em {dataCurta(p.pago_em)}</small>}
              </span>
            </label>
            <strong>{reais(Number(p.valor))}</strong>
          </li>
        ))}
      </ul>
      <p className="campo-ajuda">
        Recebido {reais(pago)} de {reais(total)}
      </p>
    </>
  );
}
