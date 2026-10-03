import type { Metadata } from "next";
import { EmConstrucao } from "@/components/EmConstrucao";
import {
  FormBriefing,
  FormMarca,
  FormPrecoAgenda,
  FormServicos,
  LinkDoEscritorio,
} from "@/components/escritorio/FormulariosEscritorio";
import { FormParcelamento } from "@/components/escritorio/FormParcelamento";
import { Equipe } from "@/components/equipe/Equipe";
import { criarClienteServidor } from "@/lib/supabase/server";
import { linkDoEscritorio, listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const sessao = await obterSessaoArquiteto();
  const pendentes = [
    "Modelo de contrato",
    "Avisos por WhatsApp e e-mail",
    "Plano e pagamento da assinatura",
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
  const dono = sessao.membro.papel === "dono";
  const supabase = await criarClienteServidor();
  const [servicos, equipe] = await Promise.all([
    listarServicos(),
    dono && supabase
      ? Promise.all([
          supabase.from("membros").select("id, nome, email, papel, ultimo_acesso").order("criado_em"),
          supabase
            .from("convites")
            .select("id, nome, email, papel, expira_em")
            .is("aceito_em", null)
            .is("cancelado_em", null)
            .gt("expira_em", new Date().toISOString())
            .order("criado_em"),
          supabase.rpc("equipe_liberada", { p_escritorio: escritorio.id }),
          supabase.rpc("convites_bloqueados"),
        ])
      : Promise.resolve(null),
  ]);

  return (
    <div className="pagina-app">
      <h1>Configurações</h1>

      <section className="cartao secao-config">
        <h2>Link do seu formulário</h2>
        <p className="muted">Coloque na bio do Instagram e mande para quem pedir orçamento.</p>
        <LinkDoEscritorio link={linkDoEscritorio(escritorio.slug)} nome={escritorio.nome} />
      </section>

      {dono && equipe && (
        <section className="cartao secao-config" id="equipe">
          <h2>Equipe</h2>
          <Equipe
            membros={(equipe[0].data ?? []) as Parameters<typeof Equipe>[0]["membros"]}
            convites={(equipe[1].data ?? []) as Parameters<typeof Equipe>[0]["convites"]}
            liberada={!!equipe[2].data}
            bloqueados={((equipe[3].data ?? []) as unknown as (string | { convites_bloqueados: string })[]).map((x) =>
              typeof x === "string" ? x : x.convites_bloqueados,
            )}
            euId={sessao.membro.id}
          />
        </section>
      )}

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

      <section className="cartao secao-config" id="parcelamento">
        <h2>Parcelamento</h2>
        <p className="muted">
          Na proposta, o cliente escolhe em quantas vezes quer pagar o saldo, até o máximo que você aceita. As parcelas são
          calculadas sozinhas.
        </p>
        <FormParcelamento entradaPct={escritorio.parcelamento_entrada_pct} maximo={escritorio.parcelamento_max}
          descontoAvista={Number(escritorio.desconto_avista_pct ?? 0)}
        />
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
