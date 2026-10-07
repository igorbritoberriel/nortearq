import { CriarAcessoPortal } from "@/components/portal/CriarAcessoPortal";
import { ProjetoCliente } from "@/components/projetos/ProjetoCliente";
import { exigirLink } from "@/lib/link-cliente";
import { criarClienteServidor } from "@/lib/supabase/server";

export const maxDuration = 120;

// Projeto do cliente pelo link do WhatsApp (módulo 03): etapas, arquivos visíveis e aprovação.
export default async function ProjetoClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await exigirLink(token, "projeto");
  if (link === undefined) {
    return (
      <div className="publico-sucesso">
        <h1>Seu projeto</h1>
        <p>Ligue o Supabase no .env.local para ver o projeto de verdade.</p>
      </div>
    );
  }
  if (!link.valido) return null; // o layout mostra o aviso de link vencido

  // Convite para o portal: aparece enquanto o cliente ainda não criou o acesso.
  const supabase = (await criarClienteServidor())!;
  const { data: cliente } = await supabase.rpc("cliente_do_link_portal", { p_token: token });
  const convite = cliente as { email: string | null; tem_acesso: boolean } | null;

  return (
    <>
      <ProjetoCliente token={token} clienteNome={link.cliente_nome} escritorioNome={link.escritorio.nome} />
      {convite && !convite.tem_acesso && (
        <CriarAcessoPortal token={token} email={convite.email} escritorio={link.escritorio.nome} recolhido />
      )}
    </>
  );
}
