import { notFound, redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

// Quem administra o NorteArq (não confundir com o "Administrador" de um escritório).
// Vê o painel de administrador (/admin) e recebe os avisos de erro e os relatos dos usuários.
// Configurável na Vercel: NORTEARQ_ADMINS="email1,email2".

export function adminsNorteArq(): string[] {
  return (process.env.NORTEARQ_ADMINS ?? "igorbritoberriel@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const ehAdminNorteArq = (email: string | null | undefined) => !!email && adminsNorteArq().includes(email.toLowerCase());

// Sessão do /admin: uma conta sem escritório (não é membro de nenhum), só com o e-mail liberado em
// NORTEARQ_ADMINS. Diferente do arquiteto (obterSessaoArquiteto), não depende da tabela membros.
export async function obterSessaoAdmin(): Promise<{ email: string }> {
  const supabase = await criarClienteServidor();
  if (!supabase) redirect("/entrar");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!ehAdminNorteArq(user.email)) notFound();
  return { email: user.email! };
}
