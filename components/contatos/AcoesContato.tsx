"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { Aviso } from "@/components/Campo";
import { converterContato } from "@/app/app/(sistema)/clientes/acoes";
import {
  encerrarContato,
  marcarVistos,
  reabrirContato,
  reclassificarContato,
} from "@/app/app/(sistema)/contatos/acoes";
import { MOTIVOS_ENCERRAMENTO, linkWhatsapp, type Contato } from "@/lib/contatos";
import type { EstadoFormulario } from "@/lib/formulario";

const inicial: EstadoFormulario = { status: "inicial" };

export function AcoesContato({ contato, escritorio }: { contato: Contato; escritorio: string }) {
  const [encerrando, setEncerrando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [estado, enviar, enviandoEncerrar] = useActionState(encerrarContato, inicial);
  const primeiroNome = contato.nome.split(" ")[0];

  if (contato.status === "convertido") {
    return contato.cliente_id ? (
      <div className="contato-acoes">
        <Link className="botao botao-secundario botao-pequeno" href={`/app/clientes/${contato.cliente_id}`}>
          <UserCheck size={16} aria-hidden="true" />
          Ver ficha do cliente
        </Link>
      </div>
    ) : null;
  }

  if (contato.status === "encerrado") {
    return (
      <div className="contato-acoes">
        <button
          type="button"
          className="botao botao-secundario botao-pequeno"
          disabled={pendente}
          onClick={() => iniciar(() => reabrirContato(contato.id, contato.compativel))}
        >
          Reabrir
        </button>
      </div>
    );
  }

  return (
    <div className="contato-acoes">
      <button
        type="button"
        className="botao botao-primario botao-pequeno"
        disabled={pendente}
        onClick={() => iniciar(() => converterContato(contato.id))}
      >
        <UserPlus size={16} aria-hidden="true" />
        {pendente ? "Aguarde..." : "Virar cliente"}
      </button>
      {contato.whatsapp && (
        <a
          className="botao botao-secundario botao-pequeno"
          href={linkWhatsapp(
            contato.whatsapp,
            `Olá, ${primeiroNome}! Aqui é do ${escritorio}. Recebi seu pedido de orçamento e gostaria de conversar sobre o seu projeto.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} aria-hidden="true" />
          Responder no WhatsApp
        </a>
      )}

      <label className="contato-classificar">
        <span className="sr-only">Classificação</span>
        <select
          value={contato.compativel === null ? "avaliar" : contato.compativel ? "sim" : "nao"}
          disabled={pendente}
          onChange={(e) => {
            const valor = e.target.value === "avaliar" ? null : e.target.value === "sim";
            iniciar(() => reclassificarContato(contato.id, valor));
          }}
        >
          <option value="sim">Compatível</option>
          <option value="nao">Fora do perfil</option>
          <option value="avaliar">A avaliar</option>
        </select>
      </label>

      {!encerrando ? (
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setEncerrando(true)}>
          Encerrar
        </button>
      ) : (
        <form action={enviar} className="contato-encerrar">
          <input type="hidden" name="id" value={contato.id} />
          {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
          <label htmlFor={`motivo-${contato.id}`}>Por que não vai seguir?</label>
          <select id={`motivo-${contato.id}`} name="motivo" required defaultValue="">
            <option value="" disabled>
              Escolha o motivo
            </option>
            {Object.entries(MOTIVOS_ENCERRAMENTO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <input name="observacao" placeholder="Observação (opcional)" maxLength={500} />
          <div className="contato-encerrar-botoes">
            <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setEncerrando(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviandoEncerrar}>
              {enviandoEncerrar ? "Encerrando..." : "Encerrar contato"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Ao abrir a lista, os contatos exibidos deixam de ser "novos" (o selo continua até recarregar).
export function MarcarVistos({ ids }: { ids: string[] }) {
  const chave = ids.join(",");
  useEffect(() => {
    if (chave) void marcarVistos(chave.split(","));
  }, [chave]);
  return null;
}
