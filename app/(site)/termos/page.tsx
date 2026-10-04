import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de uso" };

// Versão de pré-lançamento (RG-10): revisão por advogado antes do lançamento. Dados da empresa em lib/legal.ts.
export default function TermosPage() {
  const empresa = LEGAL.razaoSocial ? ` (${LEGAL.razaoSocial}${LEGAL.cnpj ? `, CNPJ ${LEGAL.cnpj}` : ""})` : "";
  return (
    <section className="zona">
      <div className="container estreito texto-legal">
        <h1 className="titulo-pagina">Termos de uso</h1>
        <p className="muted">Versão {LEGAL.versao} · atualizada em {LEGAL.atualizadoEm}</p>

        <p>
          Estes termos valem para quem usa o NorteArq{empresa}, sistema on-line para arquitetos e designers de
          interiores organizarem contatos, briefings, propostas, contratos, projetos e a comunicação com os seus clientes.
          Ao criar a conta, você declara que leu e concorda com estes termos e com a{" "}
          <Link href="/privacidade">política de privacidade</Link>.
        </p>

        <h2>1. Quem pode usar</h2>
        <ul>
          <li>Profissionais e escritórios maiores de 18 anos, que informem dados verdadeiros no cadastro.</li>
          <li>
            Cada pessoa tem o próprio login. Quem convida a equipe (perfil Dono) responde pelo que os membros fazem na conta
            do escritório.
          </li>
          <li>Você guarda a sua senha em sigilo e nos avisa se suspeitar de uso indevido.</li>
        </ul>

        <h2>2. O que o NorteArq oferece</h2>
        <p>
          Formulário de contato com filtro, briefing com quiz de estilo, propostas, contratos com aceite eletrônico,
          etapas de projeto com aprovação do cliente, controle de revisões, aditivos e armazenamento de arquivos, conforme
          o plano contratado (veja os <Link href="/precos">planos</Link>). Novos recursos podem ser incluídos e recursos
          em teste podem mudar.
        </p>

        <h2>3. Teste grátis, planos e pagamento</h2>
        <ul>
          <li>O teste grátis dura 14 dias, com os recursos do plano Profissional, sem cartão.</li>
          <li>
            Sem pagamento ao fim do teste, a conta fica em <strong>modo leitura por 30 dias</strong> (você vê tudo, mas não
            cria nada novo). Depois disso, a conta é suspensa e os dados ficam guardados por mais 90 dias; passado esse
            prazo, podem ser apagados.
          </li>
          <li>
            A assinatura é cobrada por mês ou por ano, por Pix, boleto ou cartão, por meio de um parceiro de pagamentos
            (Asaas). Em caso de atraso, há 7 dias de tolerância antes do modo leitura.
          </li>
          <li>
            Você cancela quando quiser, sem multa. O acesso continua até o fim do período já pago. Valores pagos não são
            devolvidos proporcionalmente, salvo quando a lei exigir.
          </li>
          <li>
            Cada plano tem limites (usuários, briefings, projetos e espaço para arquivos). Ao mudar para um plano menor,
            nada é apagado, mas novos itens só podem ser criados quando a conta voltar a caber no limite.
          </li>
          <li>Os preços podem mudar com aviso de pelo menos 30 dias, valendo a partir da renovação seguinte.</li>
        </ul>

        <h2>4. O seu conteúdo é seu</h2>
        <p>
          Projetos, arquivos, textos, imagens, modelos de proposta e de contrato que você cadastra continuam sendo seus.
          Você nos autoriza apenas a guardá-los, processá-los (por exemplo, gerar miniaturas) e mostrá-los a quem você
          escolher, como os seus clientes, para que o sistema funcione. Você garante que tem o direito de usar o que envia,
          inclusive imagens de referência e renders.
        </p>

        <h2>5. Dados dos seus clientes (LGPD)</h2>
        <p>
          Sobre os dados dos seus clientes e contatos, <strong>você é o controlador</strong> e o NorteArq é o{" "}
          <strong>operador</strong>: tratamos esses dados só para prestar o serviço, conforme as suas instruções. Cabe a
          você ter uma base legal para tratá-los e atender aos pedidos dos seus clientes. O sistema oferece ferramentas
          para isso, como arquivar, excluir e anonimizar um cliente.
        </p>

        <h2>6. Propostas, contratos e aceite eletrônico</h2>
        <ul>
          <li>
            Os modelos de proposta e de contrato são pontos de partida. O conteúdo final, os valores e as cláusulas são
            responsabilidade sua; recomendamos revisão por um advogado de sua confiança.
          </li>
          <li>
            O aceite e a assinatura feitos pelo sistema ficam registrados com data, hora, endereço IP e identificação de
            quem assinou, e o documento final recebe um código de verificação. É uma assinatura eletrônica válida entre as
            partes que a aceitam; para exigências específicas (como certificado ICP-Brasil), use o meio adequado.
          </li>
          <li>O NorteArq não faz parte dos contratos entre você e os seus clientes.</li>
          <li>
            Os pagamentos dos seus clientes não passam pelo NorteArq: eles pagam diretamente a você (por exemplo, pela chave
            Pix que você cadastra). O NorteArq não recebe, não guarda e não repassa esses valores, e não responde por
            cobranças, atrasos ou inadimplência; o sistema apenas organiza parcelas, vencimentos, lembretes e recibos. Se no
            futuro for oferecida a cobrança integrada por uma instituição de pagamento parceira, ela será opcional, feita em
            conta no seu nome, com termos e tarifas próprios informados antes da ativação.
          </li>
        </ul>

        <h2>7. Uso aceitável</h2>
        <p>Não é permitido usar o NorteArq para:</p>
        <ul>
          <li>enviar conteúdo ilegal, ofensivo ou que viole direitos de terceiros;</li>
          <li>enviar mensagens em massa não solicitadas;</li>
          <li>tentar acessar dados de outros escritórios ou burlar limites e travas do sistema;</li>
          <li>copiar, revender ou fazer engenharia reversa do sistema.</li>
        </ul>
        <p>Nesses casos, podemos suspender a conta, avisando sempre que possível.</p>

        <h2>8. Disponibilidade e responsabilidade</h2>
        <ul>
          <li>
            Trabalhamos para manter o sistema no ar e os dados protegidos e com cópia de segurança, mas podem ocorrer
            interrupções para manutenção ou por falhas de fornecedores (hospedagem, banco de dados, e-mail).
          </li>
          <li>
            Recomendamos manter cópia dos seus arquivos principais. Na medida permitida pela lei, a nossa responsabilidade
            fica limitada ao valor pago nos 12 meses anteriores ao fato, e não respondemos por lucros cessantes ou por
            decisões tomadas com base no conteúdo cadastrado por você.
          </li>
        </ul>

        <h2>9. Encerramento da conta</h2>
        <p>
          Você pode pedir o encerramento a qualquer momento. Antes, pode baixar os seus arquivos. Depois do encerramento,
          os dados são apagados nos prazos acima, exceto o que a lei nos obrigar a guardar (por exemplo, registros fiscais
          e de acesso).
        </p>

        <h2>10. Mudanças nestes termos</h2>
        <p>
          Se mudarmos estes termos, avisaremos dentro do sistema ou por e-mail com pelo menos 30 dias de antecedência.
          Continuar usando depois disso significa concordar com a nova versão.
        </p>

        <h2>11. Contato e lei aplicável</h2>
        <p>
          {LEGAL.emailContato ? (
            <>
              Dúvidas sobre estes termos: <a href={`mailto:${LEGAL.emailContato}`}>{LEGAL.emailContato}</a>.{" "}
            </>
          ) : (
            "Dúvidas sobre estes termos: responda qualquer e-mail que enviarmos. "
          )}
          Estes termos seguem as leis do Brasil.
        </p>
      </div>
    </section>
  );
}
