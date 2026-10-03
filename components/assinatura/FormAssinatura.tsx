"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { ConfirmarComSenha } from "@/components/ConfirmarComSenha";
import { InputMascara } from "@/components/InputMascara";
import { assinar, cancelarAssinatura } from "@/app/app/assinatura/acoes";
import { precoDo, type Periodo } from "@/lib/assinatura";
import type { EstadoFormulario } from "@/lib/formulario";
import { PLANOS } from "@/lib/modulos";
import { reais } from "@/lib/propostas";

const inicial: EstadoFormulario = { status: "inicial" };

// Escolha do plano e do período. Ao assinar, o arquiteto vai para a página de pagamento do Asaas.
export function FormAssinatura({
  planoAtual,
  periodoAtual,
  temAssinatura,
  documentoAtual,
}: {
  planoAtual: string | null;
  periodoAtual: Periodo | null;
  temAssinatura: boolean;
  documentoAtual: string | null; // CPF/CNPJ já cadastrado no escritório
}) {
  const [estado, enviar, enviando] = useActionState(assinar, inicial);
  const v = estado.valores ?? {};
  const [periodo, setPeriodo] = useState<Periodo>((v.periodo as Periodo) ?? periodoAtual ?? "mensal");
  const [plano, setPlano] = useState(v.plano ?? planoAtual ?? "profissional");
  const mudou = plano !== planoAtual || periodo !== periodoAtual;

  return (
    <form action={enviar} noValidate className="assinatura-form">
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}

      <div className="assinatura-periodo" role="radiogroup" aria-label="Período">
        {(["mensal", "anual"] as Periodo[]).map((p) => (
          <label key={p} className={periodo === p ? "ativo" : ""}>
            <input type="radio" name="periodo" value={p} checked={periodo === p} onChange={() => setPeriodo(p)} />
            {p === "mensal" ? "Mensal" : "Anual · 2 meses grátis"}
          </label>
        ))}
      </div>

      <div className="assinatura-planos" role="radiogroup" aria-label="Plano">
        {PLANOS.map((p) => (
          <label key={p.id} className={`assinatura-plano ${plano === p.id ? "ativo" : ""}`}>
            <input type="radio" name="plano" value={p.id} checked={plano === p.id} onChange={() => setPlano(p.id)} />
            <span className="assinatura-plano-topo">
              <strong>{p.nome}</strong>
              {planoAtual === p.id && <span className="selo-status">Seu plano</span>}
              {p.destaque && planoAtual !== p.id && <span className="selo-status selo-etapa-projeto">Mais escolhido</span>}
            </span>
            <span className="assinatura-preco">
              {reais(precoDo(p, periodo))}
              <small>/{periodo === "anual" ? "ano" : "mês"}</small>
            </span>
            <small className="muted">{p.descricao}</small>
            <ul>
              {p.itens.map((item) => (
                <li key={item}>
                  <Check size={14} aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </label>
        ))}
      </div>

      {!documentoAtual && (
        <Campo
          id="assinatura-documento"
          rotulo="CPF ou CNPJ de quem paga"
          ajuda="O sistema de pagamento exige para emitir a cobrança."
          erro={estado.erros?.documento}
        >
          <InputMascara mascara="documento" id="assinatura-documento" name="documento" inputMode="numeric" defaultValue={v.documento} />
        </Campo>
      )}
      {documentoAtual && <input type="hidden" name="documento" value={documentoAtual} />}

      <div className="form-rodape">
        <p className="campo-ajuda">Pague com Pix, boleto ou cartão na página segura do Asaas. O NorteArq não vê dados de cartão.</p>
        <button type="submit" className="botao botao-primario" disabled={enviando || (temAssinatura && !mudou)}>
          {enviando
            ? "Abrindo o pagamento..."
            : temAssinatura
              ? mudou
                ? "Trocar para este plano"
                : "Este já é o seu plano"
              : "Assinar e ir para o pagamento"}
        </button>
      </div>
    </form>
  );
}

export function CancelarAssinatura({ ate }: { ate: string | null }) {
  return (
    <ConfirmarComSenha
      rotulo="Cancelar assinatura"
      aviso={
        <p>
          <strong>Cancelar a assinatura?</strong> Não há multa.{" "}
          {ate ? `Você continua usando até ${ate}; depois o sistema entra em modo leitura.` : "O sistema entra em modo leitura."}
        </p>
      }
      confirmar="Cancelar assinatura"
      acao={cancelarAssinatura}
    />
  );
}
