"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Mail } from "lucide-react";
import { marcarErroResolvido, mudarSituacaoRelato } from "@/app/app/relatos";

// Botões do painel interno: marcar relato como visto/resolvido e erro como resolvido.
export function AcoesRelato({ id, situacao, email }: { id: string; situacao: "novo" | "visto"; email: string | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const mudar = (s: "visto" | "resolvido") =>
    iniciar(async () => {
      if (await mudarSituacaoRelato(id, s)) router.refresh();
    });
  return (
    <div className="interno-acoes">
      {email && (
        <a className="botao botao-secundario botao-pequeno" href={`mailto:${email}?subject=${encodeURIComponent("Sobre o que você relatou no NorteArq")}`}>
          <Mail size={14} aria-hidden="true" /> Responder
        </a>
      )}
      {situacao === "novo" && (
        <button type="button" className="botao botao-secundario botao-pequeno" disabled={pendente} onClick={() => mudar("visto")}>
          <Eye size={14} aria-hidden="true" /> Marcar como visto
        </button>
      )}
      <button type="button" className="botao botao-primario botao-pequeno" disabled={pendente} onClick={() => mudar("resolvido")}>
        <Check size={14} aria-hidden="true" /> Resolvido
      </button>
    </div>
  );
}

export function AcoesErro({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="interno-acoes">
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            if (await marcarErroResolvido(id)) router.refresh();
          })
        }
      >
        <Check size={14} aria-hidden="true" /> Marcar como resolvido
      </button>
    </div>
  );
}
