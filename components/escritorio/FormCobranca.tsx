"use client";

import { useActionState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { ConfirmarComSenha } from "@/components/ConfirmarComSenha";
import { ativarCobranca, desativarCobranca } from "@/app/app/(sistema)/configuracoes/cobranca";
import type { EstadoFormulario } from "@/lib/formulario";

const inicial: EstadoFormulario = { status: "inicial" };

// Cobrança automática (nível 3): conectar a conta Asaas do escritório e aceitar a taxa de serviço.
export function FormCobranca({
  ativa,
  conta,
  ambiente,
  aceiteEm,
  souDono,
  linkAsaas,
  siteEmProducao = false,
}: {
  ativa: boolean;
  conta: string | null;
  ambiente: "producao" | "teste" | null;
  aceiteEm: string | null;
  souDono: boolean;
  linkAsaas: string;
  siteEmProducao?: boolean; // site de verdade: conta de teste não gera cobrança
}) {
  const [estado, enviar, enviando] = useActionState(ativarCobranca, inicial);
  const erro = estado.erros ?? {};

  if (ativa) {
    return (
      <div className="cobranca-ativa">
        <p className="cobranca-status">
          <ShieldCheck size={18} aria-hidden="true" /> Ativa na conta <strong>{conta}</strong>
          {ambiente === "teste" && <span className="selo-status"> conta de teste</span>}
        </p>
        {ambiente === "teste" && siteEmProducao && (
          <div className="cobranca-aviso-teste" role="note">
            <p>
              <strong>Esta conta é do ambiente de testes do Asaas</strong> (sandbox.asaas.com): nenhum pagamento é real, e por isso
              o sistema não gera cobrança para os seus clientes. Até trocar, eles continuam vendo o Pix cadastrado acima.
            </p>
            <p>Para cobrar de verdade:</p>
            <ol>
              <li>
                Entre na sua conta em <strong>www.asaas.com</strong> (a conta real, já aprovada pelo Asaas).
              </li>
              <li>
                Vá em <strong>Integrações &gt; Chaves de API</strong> e gere uma chave. A chave real começa com <code>$aact_prod</code>.
              </li>
              <li>
                Aqui, toque em <strong>Desativar cobrança automática</strong> e depois conecte de novo com a chave nova.
              </li>
            </ol>
          </div>
        )}
        <p className="muted">
          Cada parcela vira uma cobrança na sua conta Asaas: o cliente paga por Pix, boleto ou cartão e o NorteArq registra o
          pagamento sozinho, com recibo. Taxa de serviço aceita em {aceiteEm ? new Date(aceiteEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}.
        </p>
        {souDono && (
          <ConfirmarComSenha
            rotulo="Desativar cobrança automática"
            aviso={
              <p>
                <strong>Desativar?</strong> Novas parcelas deixam de gerar cobrança no Asaas. As cobranças já geradas continuam
                valendo no Asaas, e você pode registrar os pagamentos à mão.
              </p>
            }
            confirmar="Desativar"
            acao={desativarCobranca}
          />
        )}
      </div>
    );
  }

  if (!souDono) return <p className="muted">Só o dono do escritório pode ativar a cobrança automática.</p>;

  return (
    <form action={enviar} className="form-config" noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      <ol className="cobranca-passos">
        <li>
          Abra a sua conta grátis no Asaas, no seu nome ou do escritório:{" "}
          <a className="tabela-link" href={linkAsaas} target="_blank" rel="noopener noreferrer">
            criar conta no Asaas <ExternalLink size={13} aria-hidden="true" />
          </a>
          . O Asaas é uma instituição de pagamento autorizada pelo Banco Central.
        </li>
        <li>
          No Asaas, vá em <strong>Integrações → Chave de API</strong>, gere uma chave <strong>sem permissão de saque</strong> e
          cole aqui. Assim o NorteArq só cria cobranças: saques continuam só com você, no app do Asaas.
        </li>
      </ol>
      <Campo id="chave" rotulo="Chave de API do Asaas" erro={erro.chave}>
        <input id="chave" name="chave" type="password" autoComplete="off" placeholder="$aact_..." />
      </Campo>
      <div className="cobranca-tarifas">
        <strong>Tarifas</strong>
        <ul>
          <li>
            <strong>Tarifa de processamento, cobrada pelo Asaas</strong> (Pix, boleto ou cartão), conforme a tabela da sua conta
            Asaas.
          </li>
          <li>
            <strong>Taxa de serviço NorteArq: R$ 0,99 por parcela paga</strong>, descontada automaticamente no momento do
            pagamento. Parcela não paga não tem taxa.
          </li>
        </ul>
        <p className="campo-ajuda">O dinheiro cai na sua conta Asaas: o NorteArq não recebe nem guarda os pagamentos dos seus clientes.</p>
      </div>
      <label className={`checagem ${erro.aceite ? "com-erro" : ""}`}>
        <input type="checkbox" name="aceite" />
        <span>Concordo com a taxa de serviço de R$ 0,99 por parcela paga pela cobrança automática.</span>
      </label>
      <div className="form-rodape">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? "Conectando..." : "Ativar cobrança automática"}
        </button>
      </div>
    </form>
  );
}
