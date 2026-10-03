import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidade" };

// Versão de pré-lançamento (RG-10): revisão por advogado antes do lançamento. Dados da empresa em lib/legal.ts.
// Cobre os três públicos: quem visita o site (lista de espera), o arquiteto (conta) e o cliente final do arquiteto.
export default function PrivacidadePage() {
  const contato = LEGAL.emailContato ? (
    <a href={`mailto:${LEGAL.emailContato}`}>{LEGAL.emailContato}</a>
  ) : (
    "responda qualquer e-mail que enviarmos"
  );
  return (
    <section className="zona">
      <div className="container estreito texto-legal">
        <h1 className="titulo-pagina">Política de privacidade</h1>
        <p className="muted">Versão {LEGAL.versao} · atualizada em {LEGAL.atualizadoEm}</p>

        <p>
          Esta política explica como o NorteArq
          {LEGAL.razaoSocial ? ` (${LEGAL.razaoSocial}${LEGAL.cnpj ? `, CNPJ ${LEGAL.cnpj}` : ""})` : ""} trata dados
          pessoais, seguindo a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Ela vale para três situações: quem
          entra na lista de espera, quem usa o sistema (arquitetos e equipes) e os clientes dos arquitetos. Veja também os{" "}
          <Link href="/termos">termos de uso</Link>.
        </p>

        <h2>1. Lista de espera</h2>
        <p>
          Guardamos o que você preencheu (nome, e-mail e, se informados, WhatsApp, cidade, como trabalha e o plano de
          interesse), a data, a hora e o endereço IP do aceite e a origem da visita. Usamos para avisar quando o NorteArq
          abrir, entender quem se interessa pelo produto e, se você marcou essa opção, convidar para uma conversa. Base
          legal: o seu consentimento, que pode ser retirado a qualquer momento.
        </p>

        <h2>2. Arquitetos e equipes (quem usa o sistema)</h2>
        <ul>
          <li>
            <strong>O que guardamos:</strong> nome, e-mail, WhatsApp, dados do escritório (nome, CPF/CNPJ, endereço,
            registro CAU, logo e cores), dados de quem paga a assinatura e registros de acesso (data, hora e IP).
          </li>
          <li>
            <strong>Para quê:</strong> criar e manter a conta, cobrar a assinatura, enviar avisos do sistema (por exemplo,
            "o cliente respondeu o briefing"), dar suporte e manter a segurança. Base legal: execução do contrato e
            cumprimento de obrigações legais.
          </li>
          <li>
            <strong>Aceites e assinaturas</strong> (cadastro, propostas, contratos, aprovações de etapa) ficam registrados
            com data, hora, IP e usuário, como prova para as duas partes.
          </li>
        </ul>

        <h2>3. Clientes dos arquitetos</h2>
        <p>
          Quando você preenche o formulário de um escritório, responde um briefing, aprova uma proposta, assina um
          contrato ou acompanha um projeto, quem decide sobre os seus dados é <strong>o escritório</strong> (controlador).
          O NorteArq apenas guarda e processa esses dados em nome dele (operador), para o sistema funcionar.
        </p>
        <ul>
          <li>
            <strong>O que é guardado:</strong> nome, contatos, cidade, endereço do imóvel, CPF/CNPJ (quando há contrato),
            respostas e fotos do briefing, aprovações e o registro técnico dos aceites (data, hora e IP).
          </li>
          <li>
            <strong>Seus pedidos</strong> (ver, corrigir, apagar ou anonimizar os dados) devem ser feitos ao escritório,
            que tem ferramentas no sistema para atendê-los. Se não conseguir falar com ele, fale com a gente: {contato}.
          </li>
          <li>Contratos e pagamentos podem ser mantidos pelo prazo que a lei exigir, mesmo depois de um pedido de exclusão.</li>
        </ul>

        <h2>4. Com quem compartilhamos</h2>
        <p>Não vendemos dados. Usamos fornecedores que tratam dados só para prestar o serviço ao NorteArq:</p>
        <ul>
          <li>Supabase: banco de dados, login e armazenamento de arquivos;</li>
          <li>Vercel: hospedagem do site e do sistema;</li>
          <li>Resend: envio de e-mails de aviso;</li>
          <li>Asaas: cobrança da assinatura dos arquitetos.</li>
        </ul>
        <p>Alguns desses fornecedores guardam dados fora do Brasil, com as garantias exigidas pela LGPD.</p>

        <h2>5. Segurança</h2>
        <p>
          Os dados ficam separados por escritório (cada um só acessa os seus), os arquivos dos projetos ficam em
          armazenamento privado com links temporários e os links enviados aos clientes usam códigos longos que expiram.
          Ações sem volta (como excluir um cliente) pedem a senha de quem está logado.
        </p>

        <h2>6. Por quanto tempo</h2>
        <ul>
          <li>Conta ativa: enquanto existir.</li>
          <li>
            Conta encerrada ou suspensa: os dados ficam guardados por 90 dias depois da suspensão e então podem ser
            apagados, exceto o que a lei obrigar a guardar.
          </li>
          <li>Registros de acesso: pelo menos 6 meses (Marco Civil da Internet).</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          Usamos apenas cookies necessários para manter você conectado e preferências guardadas no seu navegador (por
          exemplo, se quer ver avisos na tela). Não usamos cookies de publicidade.
        </p>

        <h2>8. Seus direitos</h2>
        <p>
          Você pode pedir para confirmar se tratamos seus dados, acessá-los, corrigi-los, levá-los para outro serviço,
          apagá-los ou retirar o consentimento, nos termos da LGPD. Fale com a gente: {contato}. Você também pode recorrer à
          Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </div>
    </section>
  );
}
