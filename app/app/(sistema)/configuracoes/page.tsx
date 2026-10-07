import type { Metadata } from "next";
import Link from "next/link";
import { EmConstrucao } from "@/components/EmConstrucao";
import {
  FormBriefing,
  FormMarca,
  FormPrecoAgenda,
  FormServicos,
  LinkDoEscritorio,
} from "@/components/escritorio/FormulariosEscritorio";
import { FormParcelamento } from "@/components/escritorio/FormParcelamento";
import { FormPix } from "@/components/escritorio/FormPix";
import { FormCobranca } from "@/components/escritorio/FormCobranca";
import { Equipe } from "@/components/equipe/Equipe";
import { pode } from "@/lib/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { linkDoEscritorio, listarServicos, obterSessaoArquiteto, urlDoSite } from "@/lib/escritorio";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const sessao = await obterSessaoArquiteto();

  if (!sessao) {
    return (
      <EmConstrucao
        modulo="00"
        titulo="Configurações"
        descricao="Ligue o Supabase no .env.local para editar as configurações."
        itens={["Minha marca", "Serviços oferecidos", "Faixa de preço e agenda", "Briefing", "Atalhos para os modelos"]}
      />
    );
  }

  const { escritorio } = sessao;
  const dono = sessao.membro.papel === "dono";
  const verValores = pode(sessao.membro.papel, "ver_valores");
  const atalhos = [
    { href: "/app/briefings/editor", rotulo: "Editor de briefing", descricao: "Perguntas e imagens do quiz de estilo." },
    ...(verValores
      ? [
          { href: "/app/propostas/modelos", rotulo: "Modelos de proposta", descricao: "Escopo, valores e condições que se repetem." },
          { href: "/app/contratos/modelo", rotulo: "Modelos de contrato", descricao: "Texto do contrato e dados do escritório que entram nele." },
        ]
      : []),
    ...(dono ? [{ href: "/app/assinatura", rotulo: "Plano e assinatura", descricao: "Seu plano, pagamento e histórico." }] : []),
  ];
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
        <h2>Entrada e parcelas para Pix/boleto</h2>
        <p className="muted">
          No Pix ou boleto, o cliente escolhe as parcelas do saldo dentro do limite que você aceita. No cartão, paga o valor total e escolhe o parcelamento disponível no Asaas.
        </p>
        <FormParcelamento entradaPct={escritorio.parcelamento_entrada_pct} maximo={escritorio.parcelamento_max}
          descontoAvista={Number(escritorio.desconto_avista_pct ?? 0)}
        />
      </section>

      <section className="cartao secao-config" id="pix">
        <h2>Recebimento por Pix</h2>
        <p className="muted">
          Com a sua chave aqui, cada parcela ganha Pix copia e cola e QR Code para o cliente pagar, no portal, nos lembretes por
          e-mail e no botão &quot;Cobrar no WhatsApp&quot;.
        </p>
        <FormPix
          tipo={escritorio.pix_tipo}
          chave={escritorio.pix_chave}
          nome={escritorio.pix_nome}
          cidade={escritorio.pix_cidade}
          sugestaoNome={escritorio.nome}
          souDono={dono}
        />
      </section>

      {verValores && (
        <section className="cartao secao-config" id="cobranca">
          <h2>Cobrança automática (Pix, boleto e cartão)</h2>
          <p className="muted">
            Conecte a sua conta Asaas para receber pelo contrato. Pix e boleto seguem a entrada e as parcelas da proposta; no cartão, o cliente paga o valor total e escolhe as parcelas no Asaas. Sem ativar, o Pix direto ao escritório usa registro manual.
          </p>
          <FormCobranca
            ativa={escritorio.cobranca_ativa}
            conta={escritorio.cobranca_conta_nome}
            ambiente={escritorio.cobranca_ambiente}
            aceiteEm={escritorio.cobranca_aceite_em}
            souDono={dono}
            linkAsaas={process.env.NEXT_PUBLIC_ASAAS_INDICACAO || "https://www.asaas.com/"}
            siteEmProducao={process.env.ASAAS_AMBIENTE === "producao"}
          />
        </section>
      )}

      <section className="cartao secao-config" id="briefing">
        <h2>Briefing</h2>
        <FormBriefing escritorio={escritorio} />
      </section>

      <section className="cartao secao-config" id="modelos">
        <h2>Modelos e textos prontos</h2>
        <p className="muted">Ficam junto de cada área, mas dá para chegar por aqui.</p>
        <ul className="config-atalhos">
          {atalhos.map((a) => (
            <li key={a.href}>
              <Link className="tabela-link" href={a.href}>
                {a.rotulo}
              </Link>
              <small className="muted">{a.descricao}</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
