"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Check, Copy, Mail, RotateCw, UserMinus, UserPlus, X } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { ConfirmarComSenha } from "@/components/ConfirmarComSenha";
import {
  cancelarConvite,
  convidar,
  mudarPapel,
  reenviarConvite,
  removerMembro,
  type EstadoConvite,
} from "@/app/app/(sistema)/configuracoes/equipe";
import type { Papel } from "@/lib/escritorio";

// Painel da equipe (Configurações, só o dono). Até 5 pessoas contando o dono; convite vale 7 dias.

type Membro = { id: string; nome: string; email: string | null; papel: Papel; ultimo_acesso: string | null };
type Convite = { id: string; nome: string; email: string; papel: "administrador" | "colaborador"; expira_em: string };

const NOME_PAPEL: Record<Papel, string> = { dono: "Dono", administrador: "Administrador", colaborador: "Colaborador" };
const DESCRICAO_PAPEL = {
  administrador: "Tudo, menos plano e assinatura.",
  colaborador: "Clientes, briefings, projetos e arquivos. Não vê valores nem financeiro.",
};
const LIMITE = 5;

function quando(iso: string | null) {
  if (!iso) return "nunca entrou";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "entrou hoje";
  if (dias === 1) return "entrou ontem";
  return `entrou há ${dias} dias`;
}

const inicial: EstadoConvite = { status: "inicial" };

export function Equipe({
  membros,
  convites,
  liberada,
  euId,
}: {
  membros: Membro[];
  convites: Convite[];
  liberada: boolean;
  euId: string;
}) {
  const [estado, enviar, enviando] = useActionState(convidar, inicial);
  const [abrindo, setAbrindo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "erro" | "sucesso"; texto: string; link?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Mudar perfil aparece na hora; volta sozinho se o servidor recusar.
  const [lista, aplicarPapel] = useOptimistic(membros, (atual, m: { id: string; papel: Papel }) =>
    atual.map((x) => (x.id === m.id ? { ...x, papel: m.papel } : x)),
  );
  const usadas = membros.length + convites.length;
  const linkConvite = aviso?.link ?? (estado.status === "sucesso" ? estado.link : undefined);

  if (!liberada) {
    return (
      <div className="equipe-bloqueada">
        <p>
          A equipe é do <strong>plano Escritório</strong>: até 5 pessoas, cada uma com o próprio acesso. Dá para esconder
          valores e financeiro de quem não deve ver.
        </p>
        <a className="botao botao-secundario" href="/app/assinatura">
          Ver o plano Escritório
        </a>
      </div>
    );
  }

  return (
    <div className="equipe">
      <p className="equipe-vagas">
        <strong>
          {usadas} de {LIMITE}
        </strong>{" "}
        vagas usadas (contando convites pendentes)
      </p>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <ul className="equipe-lista">
        {lista.map((m) => (
          <li key={m.id}>
            <span className="equipe-pessoa">
              <strong>
                {m.nome}
                {m.id === euId && <span className="muted"> (você)</span>}
              </strong>
              <small className="muted">
                {m.email ?? "—"} · {quando(m.ultimo_acesso)}
              </small>
            </span>
            {m.papel === "dono" ? (
              <span className="selo-status">Dono</span>
            ) : (
              <>
                <label>
                  <span className="sr-only">Perfil de {m.nome}</span>
                  <select
                    value={m.papel}
                    onChange={(e) => {
                      const papel = e.target.value as "administrador" | "colaborador";
                      iniciar(async () => {
                        aplicarPapel({ id: m.id, papel });
                        if (!(await mudarPapel(m.id, papel))) setAviso({ tipo: "erro", texto: "Não foi possível mudar o perfil." });
                      });
                    }}
                  >
                    <option value="administrador">Administrador</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                </label>
                <ConfirmarComSenha
                  rotulo="Remover"
                  icone={<UserMinus size={16} aria-hidden="true" />}
                  aviso={
                    <p>
                      <strong>Remover {m.nome} da equipe?</strong> A pessoa perde o acesso na hora; o que ela fez continua
                      registrado.
                    </p>
                  }
                  confirmar="Remover da equipe"
                  acao={removerMembro.bind(null, m.id)}
                />
              </>
            )}
          </li>
        ))}
        {convites.map((c) => (
          <li key={c.id} className="equipe-convite">
            <span className="equipe-pessoa">
              <strong>{c.nome}</strong>
              <small className="muted">
                {c.email} · convite pendente, vence em {new Date(c.expira_em).toLocaleDateString("pt-BR")}
              </small>
            </span>
            <span className="selo-status">{NOME_PAPEL[c.papel]}</span>
            <button
              type="button"
              className="botao-icone"
              aria-label={`Reenviar convite para ${c.email}`}
              title="Reenviar (validade recomeça)"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await reenviarConvite(c.id);
                  setAviso("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "sucesso", texto: `Convite reenviado para ${c.email}.`, link: r.link });
                })
              }
            >
              <RotateCw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="botao-icone"
              aria-label={`Cancelar convite de ${c.email}`}
              disabled={pendente}
              onClick={() => {
                if (window.confirm(`Cancelar o convite de ${c.email}?`)) iniciar(() => cancelarConvite(c.id));
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {linkConvite && (
        <div className="link-escritorio">
          <p className="campo-ajuda">
            <Mail size={14} aria-hidden="true" /> O convite foi por e-mail. Se preferir, mande este link também:
          </p>
          <code>{linkConvite}</code>
          <div className="link-escritorio-acoes">
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(linkConvite);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  window.prompt("Copie o link:", linkConvite);
                }
              }}
            >
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copiado ? "Copiado" : "Copiar link do convite"}
            </button>
          </div>
        </div>
      )}

      {usadas < LIMITE &&
        (abrindo ? (
          <form action={enviar} noValidate className="pagamento-form">
            {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
            <div className="form-linha">
              <Campo id="convite-nome" rotulo="Nome" erro={estado.erros?.nome}>
                <input id="convite-nome" name="nome" defaultValue={estado.valores?.nome} />
              </Campo>
              <Campo id="convite-email" rotulo="E-mail" erro={estado.erros?.email}>
                <input id="convite-email" name="email" type="email" defaultValue={estado.valores?.email} />
              </Campo>
            </div>
            <fieldset className="opcoes">
              <legend>Perfil</legend>
              {(["colaborador", "administrador"] as const).map((p) => (
                <label key={p} className="opcao">
                  <input type="radio" name="papel" value={p} defaultChecked={(estado.valores?.papel ?? "colaborador") === p} />
                  <span>
                    <strong>{NOME_PAPEL[p]}</strong>
                    <small>{DESCRICAO_PAPEL[p]}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="form-rodape">
              <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setAbrindo(false)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar convite"}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="botao botao-secundario" onClick={() => setAbrindo(true)}>
            <UserPlus size={18} aria-hidden="true" /> Convidar pessoa
          </button>
        ))}
    </div>
  );
}
