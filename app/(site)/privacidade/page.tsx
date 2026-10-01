import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

// Versão de pré-lançamento: cobre só a lista de espera do site.
// TODO (RG-10): revisão por advogado e versão completa (sistema, clientes finais) antes do lançamento;
//       incluir razão social/CNPJ e um e-mail de contato do encarregado (DPO).
export default function PrivacidadePage() {
  return (
    <section className="zona">
      <div className="container estreito texto-legal">
        <h1 className="titulo-pagina">Política de privacidade</h1>
        <p className="muted">Lista de espera do NorteArq · atualizada em 30/09/2026</p>

        <h2>Quais dados coletamos</h2>
        <p>
          Quando você entra na lista de espera, guardamos o que você preencheu: nome, e-mail e, se informados,
          WhatsApp, cidade, como você trabalha, o que mais toma seu tempo e o plano de interesse. Para registrar
          o seu aceite, guardamos também a data, a hora e o endereço IP do envio, e a origem da visita (por
          exemplo, um anúncio ou uma publicação no Instagram).
        </p>

        <h2>Para que usamos</h2>
        <ul>
          <li>Avisar você quando o NorteArq abrir e liberar o acesso antecipado.</li>
          <li>Entender o perfil de quem se interessa pelo produto e decidir o que construir primeiro.</li>
          <li>Convidar para uma conversa sobre a sua rotina, só se você marcou essa opção.</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados para publicidade de terceiros.</p>

        <h2>Onde ficam guardados</h2>
        <p>
          Em um banco de dados na nuvem (Supabase), com acesso restrito à equipe do NorteArq. Mantemos os dados
          enquanto a lista de espera existir ou até você pedir a exclusão.
        </p>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar os seus dados, ou para sair da lista.
          Basta responder qualquer e-mail que enviarmos.
        </p>
      </div>
    </section>
  );
}
