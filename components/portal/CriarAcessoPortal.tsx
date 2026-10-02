"use client";

import { useActionState, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { criarAcessoPortal } from "@/app/portal/acoes";
import type { EstadoFormulario } from "@/lib/formulario";

// Convite para o portal do cliente: com o link seguro que ele já tem, cria e-mail + senha
// e entra direto no portal (um lugar fixo com todos os projetos, documentos e recibos).

const inicial: EstadoFormulario = { status: "inicial" };

export function CriarAcessoPortal({
  token,
  email,
  escritorio,
  recolhido,
}: {
  token: string;
  email: string | null;
  escritorio: string;
  recolhido?: boolean; // começa só com o convite; o formulário abre no clique
}) {
  const [aberto, setAberto] = useState(!recolhido);
  const acao = useMemo(() => criarAcessoPortal.bind(null, token), [token]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <section className="cartao portal-convite" id="portal">
      <div className="portal-convite-topo">
        <KeyRound size={22} aria-hidden="true" />
        <div>
          <h2>Crie seu acesso ao portal</h2>
          <p className="muted">
            Um endereço fixo para acompanhar o projeto com o {escritorio}: etapas, arquivos, contrato, pagamentos e recibos,
            sem procurar links no WhatsApp.
          </p>
        </div>
      </div>
      {!aberto ? (
        <button type="button" className="botao botao-marca" onClick={() => setAberto(true)}>
          Criar meu acesso
        </button>
      ) : (
        <form action={enviar} noValidate className="portal-convite-form">
          {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
          <Campo id="portal-email" rotulo="Seu e-mail" erro={erro.email}>
            <input id="portal-email" name="email" type="email" autoComplete="email" defaultValue={v.email ?? email ?? ""} />
          </Campo>
          <div className="form-linha">
            <Campo id="portal-senha" rotulo="Crie uma senha" ajuda="Pelo menos 8 caracteres." erro={erro.senha}>
              <input id="portal-senha" name="senha" type="password" autoComplete="new-password" minLength={8} />
            </Campo>
            <Campo id="portal-senha2" rotulo="Repita a senha" erro={erro.senha_confirmacao}>
              <input id="portal-senha2" name="senha_confirmacao" type="password" autoComplete="new-password" minLength={8} />
            </Campo>
          </div>
          <button type="submit" className="botao botao-marca" disabled={enviando}>
            {enviando ? "Criando acesso..." : "Criar acesso e entrar"}
          </button>
          <p className="campo-ajuda">Depois é só entrar com este e-mail e senha. Os links do WhatsApp continuam valendo.</p>
        </form>
      )}
    </section>
  );
}
