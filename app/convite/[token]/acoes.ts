"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

// Aceitar convite da equipe (0024). O link do e-mail prova que a pessoa é dona do endereço,
// então a conta nasce com o e-mail confirmado.

const ERROS: Record<string, string> = {
  convite_invalido: "Este convite venceu ou foi cancelado. Peça um novo ao dono do escritório.",
  email_diferente: "Você entrou com outro e-mail. Saia e entre com o e-mail que recebeu o convite.",
  ja_tem_escritorio: "Esta conta já faz parte de um escritório no NorteArq.",
  conta_de_cliente: "Este e-mail é de uma conta de cliente. Use outro e-mail.",
};
const erroDe = (m: string) =>
  ERROS[Object.keys(ERROS).find((c) => m.includes(c)) ?? ""] ?? "Não foi possível aceitar agora. Tente de novo.";

type ConvitePublico = { email: string; nome: string; valido: boolean };

export async function aceitarConvite(token: string): Promise<{ erro: string }> {
  const supabase = await criarClienteServidor();
  if (!supabase) return { erro: "O sistema não está configurado." };
  const { error } = await supabase.rpc("aceitar_convite", { p_token: token });
  if (error) return { erro: erroDe(error.message) };
  redirect("/app");
}

const esquema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome.").max(120),
    senha: z.string().min(8, "Use pelo menos 8 caracteres.").max(72),
    senha_confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.senha_confirmacao, { message: "As senhas não são iguais.", path: ["senha_confirmacao"] });

export async function criarContaEAceitar(
  token: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { status: "erro", mensagem: "O sistema não está configurado.", valores };

  const { data } = await supabase.rpc("convite_publico", { p_token: token });
  const convite = data as ConvitePublico | null;
  if (!convite?.valido) return { status: "erro", mensagem: ERROS.convite_invalido, valores };

  const { nome, senha } = resultado.data;
  const { error: erroCriar } = await admin.auth.admin.createUser({
    email: convite.email,
    password: senha,
    email_confirm: true,
    user_metadata: { tipo: "membro", nome },
  });
  if (erroCriar) {
    if (/already|registered|exists/i.test(`${erroCriar.code} ${erroCriar.message}`)) {
      return {
        status: "erro",
        mensagem: "Já existe uma conta com este e-mail. Use “Já tenho conta” e entre com a sua senha.",
        valores,
      };
    }
    console.error("[convite] criar conta", erroCriar.message);
    return { status: "erro", mensagem: "Não foi possível criar a conta agora. Tente de novo.", valores };
  }

  await supabase.auth.signInWithPassword({ email: convite.email, password: senha });
  const { error } = await supabase.rpc("aceitar_convite", { p_token: token });
  if (error) return { status: "erro", mensagem: erroDe(error.message), valores };
  // O nome que a pessoa escolheu (o do convite foi o que o dono digitou).
  const { data: usuario } = await supabase.auth.getUser();
  if (usuario.user) await supabase.from("membros").update({ nome }).eq("id", usuario.user.id);
  redirect("/app");
}
