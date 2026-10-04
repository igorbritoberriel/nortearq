"use client";

import { useActionState } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { salvarPix } from "@/app/app/(sistema)/configuracoes/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { TIPOS_PIX, type TipoPix } from "@/lib/pix";

const inicial: EstadoFormulario = { status: "inicial" };

// Chave Pix do escritório: cada parcela ganha Pix copia e cola e QR Code para o cliente pagar.
export function FormPix({
  tipo,
  chave,
  nome,
  cidade,
  sugestaoNome,
}: {
  tipo: TipoPix | null;
  chave: string | null;
  nome: string | null;
  cidade: string | null;
  sugestaoNome: string;
}) {
  const [estado, enviar, enviando] = useActionState(salvarPix, inicial);
  const v = estado.valores;
  const erro = estado.erros ?? {};
  return (
    <form action={enviar} className="form-config" noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="pix_tipo" rotulo="Tipo de chave" erro={erro.pix_tipo}>
          <select id="pix_tipo" name="pix_tipo" defaultValue={v?.pix_tipo ?? tipo ?? ""}>
            <option value="">Sem Pix (não mostrar)</option>
            {(Object.keys(TIPOS_PIX) as TipoPix[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_PIX[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pix_chave" rotulo="Chave Pix" erro={erro.pix_chave}>
          <input id="pix_chave" name="pix_chave" defaultValue={v?.pix_chave ?? chave ?? ""} autoComplete="off" />
        </Campo>
      </div>
      <div className="form-linha">
        <Campo id="pix_nome" rotulo="Nome de quem recebe" ajuda="Como aparece no banco do cliente (até 25 letras)." erro={erro.pix_nome}>
          <input id="pix_nome" name="pix_nome" maxLength={25} defaultValue={v?.pix_nome ?? nome ?? sugestaoNome.slice(0, 25)} />
        </Campo>
        <Campo id="pix_cidade" rotulo="Cidade" ajuda="Até 15 letras." erro={erro.pix_cidade}>
          <input id="pix_cidade" name="pix_cidade" maxLength={15} defaultValue={v?.pix_cidade ?? cidade ?? ""} />
        </Campo>
      </div>
      <p className="campo-ajuda">
        O dinheiro cai direto na sua conta: o NorteArq não intermedeia nada. Quando o cliente pagar, confira no seu banco e use
        &quot;Registrar pagamento&quot; na parcela.
      </p>
      <div className="form-rodape">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar Pix"}
        </button>
      </div>
    </form>
  );
}
