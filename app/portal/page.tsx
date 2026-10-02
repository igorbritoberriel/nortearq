import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleCheck, FileText, Hourglass, Wallet } from "lucide-react";
import { carregarPortal } from "@/lib/portal";
import { reais } from "@/lib/propostas";

// Tela inicial do portal: primeiro o que precisa do cliente, depois os projetos.
// Com um projeto só, já abre direto nele (as pendências aparecem lá também).
export default async function PortalPage() {
  const portal = await carregarPortal();
  if (!portal) return null; // o layout trata os casos sem banco ou sem cliente

  const { projetos, escritorio } = portal;
  if (projetos.length === 1) redirect(`/portal/projetos/${projetos[0].id}`);

  const pendencias = projetos.flatMap((p) => [
    ...(p.etapas_aguardando
      ? [{ chave: `${p.id}-etapa`, icone: Hourglass, texto: `${p.etapas_aguardando === 1 ? "1 etapa esperando" : `${p.etapas_aguardando} etapas esperando`} a sua aprovação`, projeto: p }]
      : []),
    ...(p.aditivos_pendentes
      ? [{ chave: `${p.id}-aditivo`, icone: FileText, texto: `${p.aditivos_pendentes === 1 ? "1 aditivo" : `${p.aditivos_pendentes} aditivos`} para responder`, projeto: p }]
      : []),
    ...(p.parcelas_pendentes
      ? [{ chave: `${p.id}-pagamento`, icone: Wallet, texto: `${reais(Number(p.valor_pendente))} em ${p.parcelas_pendentes === 1 ? "1 parcela pendente" : `${p.parcelas_pendentes} parcelas pendentes`}`, projeto: p }]
      : []),
  ]);

  return (
    <>
      <p className="muted">Olá, {portal.cliente.nome.split(" ")[0]}!</p>
      <h1>Seus projetos com o {escritorio.nome}</h1>

      {projetos.length === 0 ? (
        <div className="publico-sucesso">
          <p>Seu projeto aparece aqui assim que o contrato for assinado.</p>
        </div>
      ) : (
        <>
          <section className="portal-secao" aria-labelledby="precisa-de-voce">
            <h2 id="precisa-de-voce">O que precisa de você</h2>
            {pendencias.length ? (
              <ul className="portal-pendencias">
                {pendencias.map(({ chave, icone: Icone, texto, projeto }) => (
                  <li key={chave}>
                    <Link href={`/portal/projetos/${projeto.id}`} className="cartao portal-pendencia">
                      <Icone size={20} aria-hidden="true" />
                      <span>
                        <strong>{texto}</strong>
                        <small className="muted">{projeto.nome}</small>
                      </span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="painel-em-dia">
                <CircleCheck size={20} aria-hidden="true" />
                Nada pendente com você agora.
              </p>
            )}
          </section>

          <section className="portal-secao" aria-labelledby="projetos">
            <h2 id="projetos">Projetos</h2>
            <ul className="portal-projetos">
              {projetos.map((p) => (
                <li key={p.id}>
                  <Link href={`/portal/projetos/${p.id}`} className="cartao portal-projeto">
                    <strong>{p.nome}</strong>
                    <span className="muted">
                      {p.etapas_aprovadas} de {p.etapas_total} etapas aprovadas
                      {p.status !== "ativo" ? ` · ${p.status === "entregue" ? "entregue" : "encerrado"}` : ""}
                    </span>
                    <span className="portal-barra" aria-hidden="true">
                      <span style={{ width: `${p.etapas_total ? (p.etapas_aprovadas / p.etapas_total) * 100 : 0}%` }} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
