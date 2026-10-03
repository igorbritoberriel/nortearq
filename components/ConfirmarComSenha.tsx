"use client";

import { useId, useState, useTransition } from "react";
import { Aviso, Campo } from "@/components/Campo";

// Ações que não têm volta pedem a senha de quem está logado (o servidor confere: lib/confirmar-senha.ts).
// Um clique abre o campo; confirmar chama a ação com a senha.
export function ConfirmarComSenha({
  rotulo,
  aviso,
  confirmar,
  acao,
  icone,
  classe = "botao botao-fantasma botao-pequeno botao-texto-perigo",
}: {
  rotulo: string; // texto do botão que abre
  aviso: React.ReactNode; // o que vai acontecer
  confirmar: string; // texto do botão final
  acao: (senha: string) => Promise<{ erro: string } | { ok: true } | void>;
  icone?: React.ReactNode;
  classe?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const id = useId();
  const fechar = () => {
    setAberto(false);
    setSenha("");
    setErro(null);
  };

  if (!aberto) {
    return (
      <button type="button" className={classe} onClick={() => setAberto(true)}>
        {icone}
        {rotulo}
      </button>
    );
  }

  return (
    <div className="pagamento-form pagamento-form-estorno confirmar-senha">
      <div>{aviso}</div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Campo id={id} rotulo="Para confirmar, digite a sua senha do NorteArq">
        <input
          id={id}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          autoFocus
        />
      </Campo>
      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={fechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao botao-primario botao-pequeno botao-perigo"
          disabled={pendente || senha.length < 6}
          onClick={() =>
            iniciar(async () => {
              setErro(null);
              const r = await acao(senha);
              if (r && "erro" in r) setErro(r.erro);
              else fechar();
            })
          }
        >
          {pendente ? "Confirmando..." : confirmar}
        </button>
      </div>
    </div>
  );
}
