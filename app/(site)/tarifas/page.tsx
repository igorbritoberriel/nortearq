import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tarifas",
  description: "Quanto custa receber dos seus clientes pelo NorteArq: Pix direto sem taxa ou cobrança automática por R$ 0,99 por parcela paga.",
};

export default function TarifasPage() {
  return (
    <>
      <section className="zona">
        <div className="container estreito">
          <span className="rotulo">Tarifas</span>
          <h1 className="titulo-pagina">Quanto custa receber dos seus clientes</h1>
          <p className="zona-sub">
            A assinatura do NorteArq é o preço do seu plano (veja os <Link href="/precos">preços</Link>). Para receber
            dos seus clientes, você escolhe um destes dois jeitos, e pode usar os dois.
          </p>
          <ul className="adicionais">
            <li>
              <span>
                <strong>Pix direto na sua chave.</strong> O cliente paga na chave Pix que você cadastra; você registra o
                pagamento e o recibo sai sozinho.
              </span>
              <strong>Sem taxa do NorteArq</strong>
            </li>
            <li>
              <span>
                <strong>Cobrança automática (Pix, boleto ou cartão).</strong> Cada parcela vira uma cobrança na sua conta do
                Asaas, com baixa e recibo automáticos.
              </span>
              <strong>R$ 0,99 por parcela paga</strong>
            </li>
            <li>
              <span>Parcela não paga, vencida ou cancelada</span>
              <strong>Sem taxa</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className="zona zona-clara">
        <div className="container estreito">
          <h2>Como funciona a cobrança automática</h2>
          <ul className="lista-tarifas">
            <li>
              A conta do Asaas é <strong>sua</strong>: aberta e mantida por você, numa instituição de pagamento autorizada pelo
              Banco Central. O dinheiro cai na sua conta Asaas.
            </li>
            <li>
              O NorteArq <strong>não recebe, não guarda e não repassa</strong> os pagamentos dos seus clientes. A taxa de R$
              0,99 é descontada automaticamente no momento em que a parcela é paga.
            </li>
            <li>
              Além dela, o Asaas cobra as tarifas dele (Pix, boleto ou cartão), conforme a tabela da sua conta Asaas. Elas
              aparecem no seu extrato do Asaas e no Financeiro do NorteArq.
            </li>
            <li>A chave que você conecta não permite saques. Você desativa a cobrança automática quando quiser.</li>
          </ul>

          <h2>Exemplo</h2>
          <p>
            Um contrato de R$ 18.000,00 com entrada e mais 3 parcelas tem 4 parcelas. Se as 4 forem pagas pela cobrança
            automática, a taxa do NorteArq soma <strong>R$ 3,96</strong> no projeto inteiro, mais as tarifas do Asaas. Se o
            cliente pagar tudo no Pix direto na sua chave, a taxa do NorteArq é <strong>zero</strong>.
          </p>
          <p className="zona-sub">
            As regras completas estão nos <Link href="/termos">Termos de uso</Link> (seção 6).
          </p>
        </div>
      </section>
    </>
  );
}
