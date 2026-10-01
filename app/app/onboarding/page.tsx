import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  FormBriefing,
  FormMarca,
  FormPrecoAgenda,
  FormServicos,
  LinkDoEscritorio,
} from "@/components/escritorio/FormulariosEscritorio";
import { linkDoEscritorio, listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";

export const metadata: Metadata = { title: "Configuração inicial" };

// Assistente logo após o cadastro (RN-00.3). Cada passo salva e leva ao seguinte.
const PASSOS = [
  { titulo: "Sua marca", descricao: "É o que seu cliente vê: o NorteArq fica nos bastidores." },
  { titulo: "Serviços", descricao: "Marque o que você oferece. Dá para renomear e criar outros." },
  { titulo: "Faixa de preço e agenda", descricao: "Para separar os pedidos que cabem no seu perfil." },
  { titulo: "Briefing", descricao: "Escolha em que momento o cliente responde o briefing completo." },
];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ passo?: string }> }) {
  const sessao = await obterSessaoArquiteto();
  const pedido = Number((await searchParams).passo);
  const passo = Number.isInteger(pedido) && pedido >= 1 && pedido <= 5 ? pedido : 1;

  if (!sessao) {
    return (
      <main className="assistente">
        <Logo href="/app" />
        <p className="muted">Ligue o Supabase no arquivo .env.local para usar a configuração inicial (veja o README).</p>
      </main>
    );
  }

  const { escritorio } = sessao;
  const site = urlDoSite();
  const voltar =
    passo > 1 ? (
      <Link className="botao botao-fantasma" href={`/app/onboarding?passo=${passo - 1}`}>
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar
      </Link>
    ) : undefined;
  const props = { proximo: `/app/onboarding?passo=${passo + 1}`, rotuloBotao: "Continuar", voltar };

  return (
    <main className="assistente">
      <header className="assistente-topo">
        <Logo href="/app" />
        {passo <= 4 && <span className="nota-app">Passo {passo} de 4</span>}
      </header>

      {passo <= 4 && (
        <ol className="assistente-passos" aria-label="Etapas da configuração">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className={i + 1 === passo ? "atual" : i + 1 < passo ? "feito" : ""}>
              <span>{i + 1}</span>
              {p.titulo}
            </li>
          ))}
        </ol>
      )}

      <section className="cartao assistente-cartao">
        {passo <= 4 ? (
          <>
            <h1>{passo === 1 ? `Bem-vindo(a), ${sessao.membro.nome.split(" ")[0]}!` : PASSOS[passo - 1].titulo}</h1>
            <p className="muted">{PASSOS[passo - 1].descricao}</p>
            {passo === 1 && <FormMarca escritorio={escritorio} site={site} {...props} />}
            {passo === 2 && <FormServicos servicos={await listarServicos()} {...props} />}
            {passo === 3 && <FormPrecoAgenda escritorio={escritorio} {...props} />}
            {passo === 4 && (
              <FormBriefing escritorio={escritorio} concluirOnboarding {...props} rotuloBotao="Concluir" />
            )}
          </>
        ) : (
          <div className="assistente-fim">
            <CircleCheck size={44} aria-hidden="true" />
            <h1>Tudo pronto!</h1>
            <p>
              Este é o link do <strong>{escritorio.nome}</strong>. Coloque na bio do Instagram e mande para quem pedir
              orçamento no WhatsApp: o cliente preenche sozinho e o pedido chega no seu painel.
            </p>
            <LinkDoEscritorio link={linkDoEscritorio(escritorio.slug)} nome={escritorio.nome} />
            <p className="muted">Você pode mudar tudo isso depois em Configurações.</p>
            <Link className="botao botao-primario" href="/app">
              Ir para o painel
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
