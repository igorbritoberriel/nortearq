"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

// Portal do cliente: criar o acesso a partir de um link seguro que ele já recebeu.
// O link prova quem ele é, então a conta nasce com o e-mail confirmado (sem e-mail de confirmação).

const esquema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
    senha: z.string().min(8, "Use pelo menos 8 caracteres.").max(72, "Use até 72 caracteres."),
    senha_confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.senha_confirmacao, { message: "As senhas não são iguais.", path: ["senha_confirmacao"] });

type ClienteDoLink = { cliente_id: string; nome: string; email: string | null; tem_acesso: boolean };

export async function criarAcessoPortal(token: string, _anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { status: "erro", mensagem: "Este link não vale mais.", valores };

  const supabase = await criarClienteServidor();
  const admin = criarClienteAdmin();
  if (!supabase || !admin) return { status: "erro", mensagem: "O portal ainda não está disponível. Tente mais tarde.", valores };

  const { data } = await supabase.rpc("cliente_do_link_portal", { p_token: token });
  const cliente = data as ClienteDoLink | null;
  if (!cliente) return { status: "erro", mensagem: "Este link não vale mais. Peça um link novo ao escritório.", valores };
  if (cliente.tem_acesso) {
    return { status: "erro", mensagem: "Você já tem acesso ao portal. Use “Entrar” com o seu e-mail e senha.", valores };
  }

  const { email, senha } = resultado.data;
  let usuarioId: string | null = null;

  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { tipo: "cliente", nome: cliente.nome },
  });

  if (criado?.user) {
    usuarioId = criado.user.id;
  } else if (erroCriar && /already|registered|exists/i.test(`${erroCriar.code} ${erroCriar.message}`)) {
    // E-mail que já tem conta: só liga se a senha conferir e se não for conta de arquiteto.
    const { data: login } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (!login?.user) {
      return {
        status: "erro",
        mensagem: "Já existe uma conta com este e-mail. Digite a senha dela ou use outro e-mail.",
        erros: { senha: "Senha da conta existente." },
        valores,
      };
    }
    const { data: membro } = await admin.from("membros").select("id").eq("id", login.user.id).maybeSingle();
    if (membro) {
      await supabase.auth.signOut();
      return { status: "erro", mensagem: "Este e-mail é de uma conta de escritório. Use outro e-mail.", valores };
    }
    usuarioId = login.user.id;
  } else {
    console.error("[portal] criar conta", erroCriar?.code, erroCriar?.message);
    return { status: "erro", mensagem: "Não foi possível criar o acesso agora. Tente de novo.", valores };
  }

  // Liga a conta ao cliente (o banco impede que um login fique ligado a dois clientes).
  const { error: erroLigar } = await admin
    .from("clientes")
    .update({ usuario_id: usuarioId, email: cliente.email ?? email })
    .eq("id", cliente.cliente_id)
    .is("usuario_id", null);
  if (erroLigar) {
    console.error("[portal] ligar cliente", erroLigar.message);
    return { status: "erro", mensagem: "Este e-mail já está ligado a outro cadastro. Use outro e-mail.", valores };
  }

  // Já entra logado.
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) await supabase.auth.signInWithPassword({ email, password: senha });
  redirect("/portal");
}
