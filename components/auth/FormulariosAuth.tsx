"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MailCheck } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { cadastrar, entrar, recuperarSenha, redefinirSenha } from "@/app/(auth)/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { InputMascara } from "@/components/InputMascara";

const inicial: EstadoFormulario = { status: "inicial" };

export function FormEntrar({
  proximo,
  erroLink,
  confirmado,
}: {
  proximo?: string;
  erroLink?: boolean;
  confirmado?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(entrar, inicial);
  const [verSenha, setVerSenha] = useState(false);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form action={enviar} noValidate className="login" aria-busy={enviando}>
      <h1 className="login-titulo">Bem-vindo de volta</h1>
      <p className="login-subtitulo">Seu escritório, projetos e ideias em um só lugar.</p>

      {confirmado && estado.status === "inicial" && (
        <Aviso tipo="sucesso">E-mail confirmado! Entre com seu e-mail e senha para continuar.</Aviso>
      )}
      {erroLink && estado.status === "inicial" && (
        <Aviso tipo="erro">Esse link expirou ou já foi usado. Entre com sua senha ou peça um link novo.</Aviso>
      )}
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {proximo && <input type="hidden" name="proximo" value={proximo} />}

      <div className={`login-campo ${erro.email ? "com-erro" : ""}`}>
        <label htmlFor="email">E-mail</label>
        <div className="login-entrada">
          <Mail size={18} aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            placeholder="Digite seu e-mail"
            defaultValue={v.email}
            aria-invalid={!!erro.email}
            aria-describedby={erro.email ? "email-erro" : undefined}
          />
        </div>
        {erro.email && (
          <p id="email-erro" className="campo-erro">
            {erro.email}
          </p>
        )}
      </div>

      <div className={`login-campo ${erro.senha ? "com-erro" : ""}`}>
        <label htmlFor="senha">Senha</label>
        <div className="login-entrada">
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Digite sua senha"
            aria-invalid={!!erro.senha}
            aria-describedby={erro.senha ? "senha-erro" : undefined}
          />
          <button
            type="button"
            className="login-olho"
            onClick={() => setVerSenha(!verSenha)}
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={verSenha}
            aria-controls="senha"
          >
            {verSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {erro.senha && (
          <p id="senha-erro" className="campo-erro">
            {erro.senha}
          </p>
        )}
      </div>

      <p className="login-esqueci">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </p>

      <button className="login-botao" type="submit" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
        {!enviando && <ArrowRight size={18} aria-hidden="true" />}
      </button>

      <p className="login-cadastro">
        Ainda não tem uma conta? <Link href="/cadastro">Comece seu teste grátis</Link>
      </p>
    </form>
  );
}

export function FormCadastro() {
  const [estado, enviar, enviando] = useActionState(cadastrar, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  if (estado.status === "sucesso") {
    return (
      <div className="auth-sucesso" role="status">
        <MailCheck size={40} aria-hidden="true" />
        <h1 className="auth-titulo">Confira seu e-mail</h1>
        <p>{estado.mensagem}</p>
        <p className="muted">Não chegou? Olhe a caixa de spam ou promoções.</p>
      </div>
    );
  }

  return (
    <form action={enviar} noValidate>
      <h1 className="auth-titulo">Teste grátis por 14 dias</h1>
      <p className="muted">Sem cartão de crédito.</p>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id="nome" rotulo="Seu nome" erro={erro.nome}>
        <input id="nome" name="nome" required autoComplete="name" defaultValue={v.nome} />
      </Campo>
      <Campo id="escritorio" rotulo="Nome do escritório" erro={erro.escritorio}>
        <input id="escritorio" name="escritorio" required autoComplete="organization" defaultValue={v.escritorio} />
      </Campo>
      <Campo id="whatsapp" rotulo="WhatsApp" erro={erro.whatsapp}>
        <InputMascara
            mascara="telefone"
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          defaultValue={v.whatsapp}
        />
      </Campo>
      <Campo id="email" rotulo="E-mail" erro={erro.email}>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={v.email} />
      </Campo>
      <Campo id="senha" rotulo="Senha" ajuda="Pelo menos 8 caracteres." erro={erro.senha}>
        <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" />
      </Campo>
      <label className={`checagem ${erro.aceite ? "com-erro" : ""}`}>
        <input type="checkbox" name="aceite" defaultChecked={v.aceite === "on"} />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {erro.aceite && <p className="campo-erro">{erro.aceite}</p>}
      <button className="botao botao-primario botao-bloco" type="submit" disabled={enviando}>
        {enviando ? "Criando conta..." : "Criar conta"}
      </button>
      <p className="muted auth-rodape">
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}

export function FormRecuperarSenha({ outroNavegador }: { outroNavegador?: boolean }) {
  const [estado, enviar, enviando] = useActionState(recuperarSenha, inicial);
  const erro = estado.erros ?? {};

  if (estado.status === "sucesso") {
    return (
      <div className="auth-sucesso" role="status">
        <MailCheck size={40} aria-hidden="true" />
        <h1 className="auth-titulo">Confira seu e-mail</h1>
        <p>{estado.mensagem}</p>
        <p className="muted auth-rodape">
          <Link href="/entrar">Voltar para o login</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} noValidate>
      <h1 className="auth-titulo">Recuperar senha</h1>
      <p className="muted">Enviaremos um link para você criar uma senha nova.</p>
      {outroNavegador && estado.status === "inicial" && (
        <Aviso tipo="erro">
          O link abriu em um navegador diferente do que você usou para pedir. Peça um link novo e abra o e-mail
          neste mesmo navegador.
        </Aviso>
      )}
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id="email" rotulo="E-mail" erro={erro.email}>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={estado.valores?.email} />
      </Campo>
      <button className="botao botao-primario botao-bloco" type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar link"}
      </button>
      <p className="muted auth-rodape">
        <Link href="/entrar">Voltar para o login</Link>
      </p>
    </form>
  );
}

export function FormRedefinirSenha() {
  const [estado, enviar, enviando] = useActionState(redefinirSenha, inicial);
  const erro = estado.erros ?? {};

  return (
    <form action={enviar} noValidate>
      <h1 className="auth-titulo">Criar senha nova</h1>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      <Campo id="senha" rotulo="Senha nova" ajuda="Pelo menos 8 caracteres." erro={erro.senha}>
        <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" />
      </Campo>
      <Campo id="senha_confirmacao" rotulo="Repita a senha nova" erro={erro.senha_confirmacao}>
        <input
          id="senha_confirmacao"
          name="senha_confirmacao"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Campo>
      <button className="botao botao-primario botao-bloco" type="submit" disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar senha"}
      </button>
    </form>
  );
}
