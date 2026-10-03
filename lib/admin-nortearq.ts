// Quem administra o NorteArq (não confundir com o "Administrador" de um escritório).
// Vê o painel interno (/app/interno) e recebe os avisos de erro e os relatos dos usuários.
// Configurável na Vercel: NORTEARQ_ADMINS="email1,email2".

export function adminsNorteArq(): string[] {
  return (process.env.NORTEARQ_ADMINS ?? "igorbritoberriel@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const ehAdminNorteArq = (email: string | null | undefined) => !!email && adminsNorteArq().includes(email.toLowerCase());
