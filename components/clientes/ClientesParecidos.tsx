"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Combine } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { juntarClientes } from "@/app/app/(sistema)/clientes/acoes";

// Ficha do cliente: outros cadastros com o mesmo CPF/CNPJ, e-mail ou WhatsApp. "Juntar" traz tudo do outro
// cadastro (propostas, contratos, briefings, projetos, links) para este e apaga o outro. Pede a senha.
export function ClientesParecidos({
  clienteId,
  nome,
  parecidos,
}: {
  clienteId: string;
  nome: string;
  parecidos: { id: string; nome: string; motivo: string }[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="duplicados duplicados-ficha" role="status">
      <strong>Possível cadastro repetido</strong>
      <ul>
        {parecidos.map((p) => (
          <li key={p.id}>
            <Link className="tabela-link" href={`/app/clientes/${p.id}`}>
              {p.nome}
            </Link>{" "}
            <span className="muted">· mesmo {p.motivo}</span>{" "}
            <button
              type="button"
              className="botao-link"
              onClick={() => {
                setAlvo(p);
                setErro(null);
                setSenha("");
              }}
            >
              <Combine size={14} aria-hidden="true" /> Juntar com este
            </button>
          </li>
        ))}
      </ul>

      {alvo && (
        <form
          className="duplicados-juntar"
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            iniciar(async () => {
              const r = await juntarClientes(clienteId, alvo.id, senha);
              if ("erro" in r) {
                setErro(r.erro);
                return;
              }
              setAlvo(null);
              router.refresh();
            });
          }}
        >
          <p>
            Tudo de <strong>{alvo.nome}</strong> (propostas, contratos, briefings, projetos e links) passa para{" "}
            <strong>{nome}</strong>. Dados que faltam aqui são completados com os de lá. O cadastro de {alvo.nome} deixa de
            existir. Não dá para desfazer.
          </p>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Campo id="senha-juntar" rotulo="Sua senha para confirmar">
            <input
              id="senha-juntar"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </Campo>
          <div className="form-rodape">
            <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setAlvo(null)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao-primario botao-pequeno" disabled={pendente || !senha}>
              {pendente ? "Juntando..." : "Juntar cadastros"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
