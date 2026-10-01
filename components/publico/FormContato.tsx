"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleCheck, MessageCircle } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { PRAZOS, linkWhatsapp } from "@/lib/contatos";
import type { EstadoFormulario } from "@/lib/formulario";
import { InputMascara } from "@/components/InputMascara";

type Acao = (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const inicial: EstadoFormulario = { status: "inicial" };

// Formulário público de pedido de orçamento (/e/[escritorio]). Sempre com a marca do escritório.
export function FormContato({
  acao,
  escritorio,
  servicos,
  whatsapp,
}: {
  acao: Acao;
  escritorio: string;
  servicos: { id: string; nome: string }[];
  whatsapp: string | null;
}) {
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  if (estado.status === "sucesso") {
    return (
      <div className="publico-sucesso" role="status">
        <CircleCheck size={44} aria-hidden="true" />
        <h2>Pedido enviado!</h2>
        <p>
          O {escritorio} recebeu suas respostas e vai falar com você pelo WhatsApp. Obrigado por explicar o seu
          projeto.
        </p>
        {whatsapp && (
          <a
            className="botao botao-marca"
            href={linkWhatsapp(whatsapp, `Olá! Acabei de enviar um pedido de orçamento pelo formulário.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Falar no WhatsApp agora
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={enviar} noValidate className="publico-form">
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}

      <fieldset>
        <legend>Sobre você</legend>
        <Campo id="nome" rotulo="Seu nome" erro={erro.nome}>
          <input id="nome" name="nome" required autoComplete="name" defaultValue={v.nome} />
        </Campo>
        <div className="form-linha">
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
          <Campo id="email" rotulo="E-mail" opcional erro={erro.email}>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Sobre o projeto</legend>
        {servicos.length > 0 && (
          <div className={`campo ${erro.servicos ? "com-erro" : ""}`}>
            <span className="campo-rotulo" id="servicos-rotulo">
              O que você precisa?
            </span>
            <div className="publico-servicos" role="group" aria-labelledby="servicos-rotulo">
              {servicos.map((s) => (
                <label key={s.id} className="publico-servico">
                  <input type="checkbox" name="servicos" value={s.id} defaultChecked={v[`servico_${s.id}`] === "on"} />
                  <span>{s.nome}</span>
                </label>
              ))}
            </div>
            {erro.servicos && <p className="campo-erro">{erro.servicos}</p>}
          </div>
        )}
        <div className="form-linha">
          <Campo id="area_m2" rotulo="Área aproximada (m²)" opcional erro={erro.area_m2}>
            <input id="area_m2" name="area_m2" inputMode="decimal" placeholder="80" defaultValue={v.area_m2} />
          </Campo>
          <Campo id="localizacao" rotulo="Cidade e bairro do imóvel" opcional erro={erro.localizacao}>
            <input
              id="localizacao"
              name="localizacao"
              autoComplete="address-level2"
              placeholder="Niterói, Icaraí"
              defaultValue={v.localizacao}
            />
          </Campo>
        </div>
        <div className="form-linha">
          <Campo
            id="orcamento"
            rotulo="Investimento no projeto (R$)"
            opcional
            ajuda="Só o projeto, sem a obra. Pode ser um valor aproximado."
            erro={erro.orcamento}
          >
            <input id="orcamento" name="orcamento" inputMode="decimal" placeholder="15.000" defaultValue={v.orcamento} />
          </Campo>
          <Campo id="prazo" rotulo="Quando quer começar?" erro={erro.prazo}>
            <select id="prazo" name="prazo" required defaultValue={v.prazo ?? ""} key={v.prazo}>
              <option value="" disabled>
                Escolha uma opção
              </option>
              {PRAZOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="mensagem" rotulo="Conte um pouco do que você imagina" opcional erro={erro.mensagem}>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={4}
            placeholder="Ex.: reforma do apartamento todo, quero integrar cozinha e sala."
            defaultValue={v.mensagem}
          />
        </Campo>
      </fieldset>

      {/* Armadilha para robôs: invisível para pessoas. */}
      <div className="lista-armadilha" aria-hidden="true">
        <label htmlFor="site">Não preencha</label>
        <input id="site" name="site" tabIndex={-1} autoComplete="off" />
      </div>

      <label className={`checagem ${erro.aceite ? "com-erro" : ""}`}>
        <input type="checkbox" name="aceite" defaultChecked={v.aceite === "on"} />
        <span>
          Autorizo o uso destes dados para receber o orçamento, conforme a{" "}
          <Link href="/privacidade" target="_blank">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {erro.aceite && <p className="campo-erro">{erro.aceite}</p>}

      <button className="botao botao-marca botao-bloco" type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Pedir orçamento"}
      </button>
    </form>
  );
}
