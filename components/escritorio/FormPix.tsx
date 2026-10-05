"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo } from "@/components/Campo";
import { InputMascara } from "@/components/InputMascara";
import { salvarPix } from "@/app/app/(sistema)/configuracoes/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { TIPOS_PIX, type TipoPix } from "@/lib/pix";

const inicial: EstadoFormulario = { status: "inicial" };

// Exemplo no campo da chave, conforme o tipo.
const EXEMPLO: Record<TipoPix, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  email: "nome@exemplo.com",
  telefone: "(11) 91234-5678",
  aleatoria: "123e4567-e89b-12d3-a456-426614174000",
};

// Campo da chave com a máscara do tipo escolhido (CPF, CNPJ e celular formatam enquanto digita).
function CampoChave({ tipo, valor }: { tipo: TipoPix | ""; valor: string }) {
  const comum = { id: "pix_chave", name: "pix_chave", placeholder: tipo ? EXEMPLO[tipo] : "Escolha o tipo de chave", disabled: !tipo };
  if (tipo === "cpf" || tipo === "cnpj") {
    return <InputMascara mascara="documento" inputMode="numeric" maxLength={tipo === "cpf" ? 14 : 18} defaultValue={valor} {...comum} />;
  }
  // Guardado como +55DDDNÚMERO; na tela, só (DDD) número, como a pessoa digita.
  if (tipo === "telefone") return <InputMascara mascara="telefone" type="tel" inputMode="tel" defaultValue={valor.replace(/^\+55/, "")} {...comum} />;
  if (tipo === "email") return <input type="email" inputMode="email" autoComplete="off" autoCapitalize="off" defaultValue={valor} {...comum} />;
  return <input autoComplete="off" autoCapitalize="off" spellCheck={false} defaultValue={valor} {...comum} />;
}

// Chave Pix do escritório: cada parcela ganha Pix copia e cola e QR Code para o cliente pagar.
export function FormPix({
  tipo,
  chave,
  nome,
  cidade,
  sugestaoNome,
  souDono = true,
}: {
  tipo: TipoPix | null;
  chave: string | null;
  nome: string | null;
  cidade: string | null;
  sugestaoNome: string;
  souDono?: boolean; // só o dono muda a chave (migração 0041)
}) {
  const [estado, enviar, enviando] = useActionState(salvarPix, inicial);
  const v = estado.valores;
  const erro = estado.erros ?? {};
  const tipoSalvo = (v?.pix_tipo ?? tipo ?? "") as TipoPix | "";
  const [tipoEscolhido, setTipoEscolhido] = useState<TipoPix | "">(tipoSalvo);
  // Mesma chave só quando o tipo é o salvo; trocou o tipo, o campo começa vazio.
  const chaveInicial = tipoEscolhido === tipoSalvo ? (v?.pix_chave ?? chave ?? "") : "";
  return (
    <form action={enviar} className="form-config" noValidate>
      {!souDono && <p className="campo-ajuda">Só o dono do escritório pode mudar a chave Pix.</p>}
      <fieldset disabled={!souDono} className="campos-sem-borda">
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <div className="form-linha">
        <Campo id="pix_tipo" rotulo="Tipo de chave" erro={erro.pix_tipo}>
          <select id="pix_tipo" name="pix_tipo" value={tipoEscolhido} onChange={(e) => setTipoEscolhido(e.target.value as TipoPix | "")}>
            <option value="">Sem Pix (não mostrar)</option>
            {(Object.keys(TIPOS_PIX) as TipoPix[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_PIX[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pix_chave" rotulo="Chave Pix" erro={erro.pix_chave}>
          <CampoChave key={tipoEscolhido} tipo={tipoEscolhido} valor={chaveInicial} />
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
        O dinheiro cai direto na sua conta: o pagamento não passa pelo NorteArq. Quando o cliente pagar, confira no seu banco e use
        &quot;Registrar pagamento&quot; na parcela.
      </p>
      <div className="form-rodape">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar Pix"}
        </button>
      </div>
      </fieldset>
    </form>
  );
}
