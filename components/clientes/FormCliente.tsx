"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { gerarLink } from "@/app/app/(sistema)/clientes/acoes";
import { DESTINOS_LINK, ETAPAS_CLIENTE, type Cliente, type DestinoLink } from "@/lib/clientes";
import { linkWhatsapp } from "@/lib/contatos";
import type { EstadoFormulario } from "@/lib/formulario";
import { InputMascara } from "@/components/InputMascara";

type Acao = (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const inicial: EstadoFormulario = { status: "inicial" };

// Cadastro e edição do cliente. Sem `cliente`, é o cadastro manual (botão "Novo cliente").
export function FormCliente({
  acao,
  cliente,
  servicos,
}: {
  acao: Acao;
  cliente?: Cliente;
  servicos: { id: string; nome: string; ativo: boolean }[];
}) {
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  const valor = (campo: keyof Cliente) => v[campo] ?? (cliente?.[campo] as string | null | undefined) ?? "";
  const marcado = (id: string) => (v.servicos_enviados ? v[`servico_${id}`] === "on" : !!cliente?.servicos.includes(id));
  // Serviço desativado continua aparecendo se o cliente já tem.
  const visiveis = servicos.filter((s) => s.ativo || cliente?.servicos.includes(s.id));

  return (
    <form action={enviar} noValidate>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
      {!!estado.duplicados?.length && (
        <div className="duplicados">
          <ul>
            {estado.duplicados.map((d) => (
              <li key={d.id}>
                <Link className="tabela-link" href={`/app/clientes/${d.id}`}>
                  {d.nome}
                </Link>{" "}
                <span className="muted">· mesmo {d.motivo}</span>
              </li>
            ))}
          </ul>
          {!estado.duplicados.some((d) => d.motivo === "CPF/CNPJ") && (
            <label className="checagem">
              <input type="checkbox" name="mesmo_assim" />
              <span>Não é a mesma pessoa: cadastrar mesmo assim</span>
            </label>
          )}
        </div>
      )}

      <Campo id="nome" rotulo="Nome" erro={erro.nome}>
        <input id="nome" name="nome" required autoComplete="off" defaultValue={valor("nome")} />
      </Campo>
      <div className="form-linha">
        <Campo id="telefone" rotulo="WhatsApp" opcional erro={erro.telefone}>
          <InputMascara
            mascara="telefone"
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 91234-5678"
            defaultValue={valor("telefone")}
          />
        </Campo>
        <Campo id="email" rotulo="E-mail" opcional erro={erro.email}>
          <input id="email" name="email" type="email" defaultValue={valor("email")} />
        </Campo>
      </div>
      <div className="form-linha">
        <Campo id="documento" rotulo="CPF ou CNPJ" opcional ajuda="Necessário para o contrato." erro={erro.documento}>
          <InputMascara
            mascara="documento"
            id="documento"
            name="documento"
            inputMode="numeric"
            placeholder="000.000.000-00"
            defaultValue={valor("documento")}
          />
        </Campo>
        {cliente && (
          <Campo id="etapa" rotulo="Etapa" erro={erro.etapa}>
            <select id="etapa" name="etapa" defaultValue={valor("etapa")}>
              {Object.entries(ETAPAS_CLIENTE).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>
      <Campo id="endereco_imovel" rotulo="Endereço do imóvel" opcional erro={erro.endereco_imovel}>
        <input id="endereco_imovel" name="endereco_imovel" defaultValue={valor("endereco_imovel")} />
      </Campo>

      {visiveis.length > 0 && (
        <div className="campo">
          <span className="campo-rotulo" id="servicos-cliente">
            Serviços
          </span>
          <div className="lista-marcar" role="group" aria-labelledby="servicos-cliente">
            {visiveis.map((s) => (
              <label key={s.id} className="checagem">
                <input type="checkbox" name="servicos" value={s.id} defaultChecked={marcado(s.id)} />
                <span>{s.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Campo id="observacoes" rotulo="Observações internas" opcional ajuda="Só você vê." erro={erro.observacoes}>
        <textarea id="observacoes" name="observacoes" rows={3} defaultValue={valor("observacoes")} />
      </Campo>

      <div className="form-rodape">
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : cliente ? "Salvar" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}

// Gera o link sem login e abre o WhatsApp com a mensagem pronta (RG-7, RN-02.4).
export function EnviarLink({
  clienteId,
  destino,
  telefone,
  cliente,
  escritorio,
  temLinkAtivo,
  linkAtual = null,
}: {
  clienteId: string;
  destino: DestinoLink;
  telefone: string | null;
  cliente: string;
  escritorio: string;
  temLinkAtivo: boolean;
  linkAtual?: string | null; // endereço do link que ainda vale (reenviar sem gerar outro)
}) {
  const [pendente, iniciar] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const primeiroNome = cliente.split(" ")[0];
  const mensagem = link ? DESTINOS_LINK[destino].mensagem(primeiroNome, escritorio, link) : "";

  function gerar() {
    setErro(null);
    // Abre a aba já no clique: navegador de celular bloqueia janela aberta depois de esperar o servidor.
    const aba = telefone ? window.open("", "_blank") : null;
    iniciar(async () => {
      const resultado = await gerarLink(clienteId, destino);
      if ("erro" in resultado) {
        aba?.close();
        setErro(resultado.erro);
        return;
      }
      setLink(resultado.link);
      if (aba && telefone) {
        aba.location.href = linkWhatsapp(
          telefone,
          DESTINOS_LINK[destino].mensagem(primeiroNome, escritorio, resultado.link),
        );
      }
    });
  }

  // M4 da revisão de UX: com um link ainda valendo, reenviar o mesmo; gerar outro só se precisar.
  if (linkAtual && !link) {
    const texto = DESTINOS_LINK[destino].mensagem(primeiroNome, escritorio, linkAtual);
    return (
      <div className="enviar-link">
        {telefone ? (
          <a
            className="botao botao-primario botao-pequeno"
            href={linkWhatsapp(telefone, texto)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Reenviar o mesmo link
          </a>
        ) : null}
        <button
          type="button"
          className={`botao botao-pequeno ${telefone ? "botao-fantasma" : "botao-secundario"}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              window.prompt("Copie a mensagem:", texto);
            }
          }}
        >
          {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copiado ? "Copiada" : "Copiar mensagem com o link"}
        </button>
        <button
          type="button"
          className="botao-link tabela-link campo-ajuda"
          disabled={pendente}
          onClick={() => {
            if (window.confirm("Gerar um link novo? O link enviado antes deixa de funcionar.")) gerar();
          }}
        >
          {pendente ? "Gerando..." : "Gerar link novo (desliga o anterior)"}
        </button>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </div>
    );
  }

  return (
    <div className="enviar-link">
      <button type="button" className="botao botao-primario botao-pequeno" onClick={gerar} disabled={pendente}>
        <MessageCircle size={16} aria-hidden="true" />
        {pendente ? "Gerando link..." : telefone ? "Gerar link e enviar no WhatsApp" : "Gerar link"}
      </button>
      {temLinkAtivo && !link && (
        <p className="campo-ajuda">Gerar um link novo desativa o que você enviou antes.</p>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {link && (
        <div className="link-escritorio">
          <code>{link}</code>
          <div className="link-escritorio-acoes">
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(mensagem);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  window.prompt("Copie a mensagem:", mensagem);
                }
              }}
            >
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copiado ? "Copiada" : "Copiar mensagem com o link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
