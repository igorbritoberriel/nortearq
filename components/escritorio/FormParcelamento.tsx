"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { salvarParcelamento } from "@/app/app/(sistema)/configuracoes/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { opcoesParcelamento, reais } from "@/lib/propostas";

const inicial: EstadoFormulario = { status: "inicial" };

// Entrada padrão e até quantas vezes o escritório aceita parcelar. O cliente escolhe ao aprovar a proposta.
export function FormParcelamento({ entradaPct, maximo }: { entradaPct: number; maximo: number }) {
  const [estado, enviar, enviando] = useActionState(salvarParcelamento, inicial);
  const erro = estado.erros ?? {};
  const [pct, setPct] = useState(String(entradaPct));
  const [max, setMax] = useState(String(maximo));
  const exemplo = opcoesParcelamento(10000, Number(pct.replace(",", ".")) || 0, Number(max) || 1);
  const ultima = exemplo[exemplo.length - 1];

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="parcelamento_entrada_pct" rotulo="Entrada (%)" ajuda="Use 0 para sem entrada." erro={erro.parcelamento_entrada_pct}>
          <input
            id="parcelamento_entrada_pct"
            name="parcelamento_entrada_pct"
            inputMode="decimal"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </Campo>
        <Campo id="parcelamento_max" rotulo="Aceito parcelar o saldo em até" erro={erro.parcelamento_max}>
          <select id="parcelamento_max" name="parcelamento_max" value={max} onChange={(e) => setMax(e.target.value)}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1x (à vista)" : `${n}x`}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <p className="campo-ajuda proposta-deslocamento-previa">
        <strong>Exemplo numa proposta de R$ 10.000:</strong> entrada de {reais(ultima.entrada)} e o saldo de 1x até{" "}
        {ultima.n}x{ultima.n > 1 ? ` (${ultima.n}x de ${reais(ultima.parcela)})` : ""}. O cliente escolhe ao aprovar.
      </p>
      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
