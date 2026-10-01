import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmConstrucao } from "@/components/EmConstrucao";
import { LinkDoEscritorio } from "@/components/escritorio/FormulariosEscritorio";
import { diasDeTeste, linkDoEscritorio, obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PainelPage() {
  const sessao = await obterSessaoArquiteto();
  const dias = sessao ? diasDeTeste(sessao.escritorio) : null;

  // RN-00.6: só pendências acionáveis. Por enquanto, pedidos de orçamento ainda não vistos.
  const supabase = sessao ? await criarClienteServidor() : null;
  const { count: novos } = supabase
    ? await supabase
        .from("contatos")
        .select("id", { count: "exact", head: true })
        .is("visto_em", null)
        .in("status", ["compativel", "a_avaliar", "fora_do_perfil", "novo"])
    : { count: 0 };

  return (
    <>
      {sessao && (
        <section className="pagina-app">
          <h1>Olá, {sessao.membro.nome.split(" ")[0]}!</h1>
          {dias !== null && (
            <p className="muted">
              {dias > 0
                ? `Você está no teste grátis: faltam ${dias} ${dias === 1 ? "dia" : "dias"}, com todos os recursos do plano Profissional.`
                : "Seu teste grátis terminou. Escolha um plano para continuar criando."}
            </p>
          )}
          {!!novos && (
            <Link href="/app/contatos" className="cartao pendencia">
              <strong>{novos}</strong>
              <span>{novos === 1 ? "pedido de orçamento novo" : "pedidos de orçamento novos"}</span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          )}
          <div className="cartao secao-config">
            <h2>Seu link para receber pedidos de orçamento</h2>
            <LinkDoEscritorio link={linkDoEscritorio(sessao.escritorio.slug)} nome={sessao.escritorio.nome} />
          </div>
        </section>
      )}
      <EmConstrucao
        modulo="00"
        titulo="Painel inicial"
        descricao="Resumo do que precisa da atenção do arquiteto hoje."
        itens={[
          "Briefings respondidos aguardando leitura",
          "Propostas aguardando resposta do cliente",
          "Etapas aguardando aprovação do cliente",
          "Visitas do mês e visitas extras",
        ]}
      />
    </>
  );
}
