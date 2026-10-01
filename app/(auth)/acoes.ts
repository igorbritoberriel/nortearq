"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro, errosDe, SEM_SUPABASE, valoresDe, type EstadoFormulario } from "@/lib/formulario";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const senha = z.string().min(8, "Use pelo menos 8 caracteres.").max(72, "Use até 72 caracteres.");
const email = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));

// Traduz os erros do Supabase Auth que o arquiteto pode encontrar.
function traduzir(codigo: string | undefined, mensagem: string) {
  switch (codigo) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. O link de confirmação está na sua caixa de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
    case "weak_password":
      return "Senha fraca demais. Misture letras e números.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    case "session_not_found":
    case "session_expired":
      return "Seu link expirou. Peça um link novo em \"Esqueci minha senha\".";
    case "same_password":
      return "A nova senha precisa ser diferente da anterior.";
    default:
      console.error("[auth]", codigo, mensagem);
      return "Algo deu errado. Tente de novo em instantes.";
  }
}

// ---------- Cadastro (só arquiteto; o cliente final nunca se cadastra aqui) ----------

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  escritorio: z.string().trim().min(2, "Informe o nome do escritório.").max(120),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe o WhatsApp com DDD."),
  email,
  senha,
  aceite: z.literal("on", "É preciso aceitar os termos e a política de privacidade."),
});

export async function cadastrar(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const supabase = await criarClienteServidor();
  if (!supabase) return { ...SEM_SUPABASE, valores };

  const { nome, escritorio, whatsapp, email: emailCadastro, senha: senhaCadastro } = resultado.data;
  const { data, error } = await supabase.auth.signUp({
    email: emailCadastro,
    password: senhaCadastro,
    options: {
      // O gatilho do banco lê estes dados e cria o escritório (migração 0003).
      data: { tipo: "arquiteto", nome, escritorio, whatsapp },
      emailRedirectTo: `${site()}/auth/confirmar?proximo=/app/onboarding`,
    },
  });

  if (error) return { status: "erro", mensagem: traduzir(error.code, error.message), valores };

  // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem identidades (e sem erro).
  if (data.user && data.user.identities?.length === 0) {
    return { status: "erro", mensagem: traduzir("user_already_exists", ""), valores };
  }

  if (data.session) redirect("/app/onboarding");

  return {
    status: "sucesso",
    mensagem: `Enviamos um link de confirmação para ${emailCadastro}. Abra o e-mail para ativar sua conta.`,
  };
}

// ---------- Entrar ----------

const esquemaEntrar = z.object({ email, senha: z.string().min(1, "Informe sua senha.") });

export async function entrar(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = esquemaEntrar.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues), valores };
  }

  const supabase = await criarClienteServidor();
  if (!supabase) return { ...SEM_SUPABASE, valores };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  });
  if (error) return { status: "erro", mensagem: traduzir(error.code, error.message), valores };

  // Arquiteto vai para o sistema; cliente final vai para o portal.
  const { data: membro } = await supabase.from("membros").select("id").eq("id", data.user.id).maybeSingle();
  const padrao = membro ? "/app" : "/portal";
  redirect(destinoSeguro(valores.proximo, padrao));
}

// ---------- Recuperar e redefinir senha ----------

export async function recuperarSenha(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  const resultado = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira o e-mail.", erros: errosDe(resultado.error.issues), valores };
  }

  const supabase = await criarClienteServidor();
  if (!supabase) return { ...SEM_SUPABASE, valores };

  const { error } = await supabase.auth.resetPasswordForEmail(resultado.data.email, {
    redirectTo: `${site()}/auth/confirmar?proximo=/redefinir-senha`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { status: "erro", mensagem: traduzir(error.code, error.message), valores };
  }

  // Mesma resposta com ou sem conta: não revela quem é cliente do NorteArq.
  return {
    status: "sucesso",
    mensagem: `Se houver uma conta com ${resultado.data.email}, você vai receber um link para criar uma nova senha.`,
  };
}

const esquemaNovaSenha = z
  .object({ senha, senha_confirmacao: z.string() })
  .refine((d) => d.senha === d.senha_confirmacao, { message: "As senhas não são iguais.", path: ["senha_confirmacao"] });

export async function redefinirSenha(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const resultado = esquemaNovaSenha.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { status: "erro", mensagem: "Confira os campos destacados.", erros: errosDe(resultado.error.issues) };
  }

  const supabase = await criarClienteServidor();
  if (!supabase) return SEM_SUPABASE;

  const { error } = await supabase.auth.updateUser({ password: resultado.data.senha });
  if (error) {
    const semSessao = error.name === "AuthSessionMissingError";
    return { status: "erro", mensagem: traduzir(semSessao ? "session_not_found" : error.code, error.message) };
  }

  redirect("/app");
}

// ---------- Sair ----------

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase?.auth.signOut();
  redirect("/entrar");
}
