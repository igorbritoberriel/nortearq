import type { Metadata } from "next";
import { EmConstrucao } from "@/components/EmConstrucao";
import {
  FormBriefing,
  FormMarca,
  FormPrecoAgenda,
  FormServicos,
  LinkDoEscritorio,
} from "@/components/escritorio/FormulariosEscritorio";
import { linkDoEscritorio, listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const sessao = await obterSessaoArquiteto();
  const pendentes = [
    "Modelo de contrato",
    "Avisos por WhatsApp e e-mail",
    "Plano e pagamento da assinatura",
    "Usuários da equipe (plano Escritório)",
  ];

  if (!sessao) {
    return (
      <EmConstrucao
        modulo="00"
        titulo="Configurações"
        descricao="Ligue o Supabase no .env.local para editar as configurações."
        itens={["Minha marca", "Serviços oferecidos", "Faixa de preço e agenda", "Briefing", ...pendentes]}
      />
    );
  }

  const { escritorio } = sessao;
  const servicos = await listarServicos();

  return (
    <div className="pagina-app">
      <span className="selo">Módulo 00</span>
      <h1>Configurações</h1>

      <section className="cartao secao-config">
        <h2>Link do seu formulário</h2>
        <p className="muted">Coloque na bio do Instagram e mande para quem pedir orçamento.</p>
        <LinkDoEscritorio link={linkDoEscritorio(escritorio.slug)} nome={escritorio.nome} />
      </section>

      <section className="cartao secao-config" id="marca">
        <h2>Minha marca</h2>
        <FormMarca escritorio={escritorio} site={urlDoSite()} />
      </section>

      <section className="cartao secao-config" id="servicos">
        <h2>Serviços oferecidos</h2>
        <FormServicos servicos={servicos} />
      </section>

      <section className="cartao secao-config" id="preco">
        <h2>Faixa de preço e agenda</h2>
        <FormPrecoAgenda escritorio={escritorio} />
      </section>

      <section className="cartao secao-config" id="briefing">
        <h2>Briefing</h2>
        <FormBriefing escritorio={escritorio} />
      </section>

      <section className="cartao secao-config">
        <h2>Em breve nesta tela</h2>
        <ul className="checklist">
          {pendentes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
