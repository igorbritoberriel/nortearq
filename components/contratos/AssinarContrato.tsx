"use client";

import { useState, useTransition } from "react";
import { CircleCheck, FileDown, PenLine } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { assinarContrato } from "@/app/c/[token]/contrato/acoes";
import { InputMascara } from "@/components/InputMascara";

// O cliente confere/completa os próprios dados (RN-01.13) e aceita o contrato.
export function AssinarContrato({
  token,
  escritorio,
  dados,
}: {
  token: string;
  escritorio: string;
  dados: { nome: string; documento: string | null; endereco: string | null };
}) {
  const [nome, setNome] = useState(dados.nome);
  const [documento, setDocumento] = useState(dados.documento ?? "");
  const [endereco, setEndereco] = useState(dados.endereco ?? "");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [assinado, setAssinado] = useState(false);
  const [pendente, iniciar] = useTransition();

  if (assinado) {
    return (
      <div className="publico-sucesso" role="status">
        <CircleCheck size={44} aria-hidden="true" />
        <h2>Contrato assinado!</h2>
        <p>
          O {escritorio} recebeu o seu aceite. Na próxima tela você vê o contrato final, com o código de verificação, salva em
          PDF, acessa o pagamento e pode criar o seu acesso ao portal do projeto.
        </p>
        <button type="button" className="botao botao-marca" onClick={() => window.location.reload()}>
          <FileDown size={18} aria-hidden="true" /> Ver contrato e ir para pagamento
        </button>
      </div>
    );
  }

  return (
    <form
      className="assinar-contrato"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await assinarContrato(token, { nome, documento, endereco, aceite });
          if ("erro" in r) setErro({ texto: r.erro, campo: r.campo });
          else {
            setAssinado(true);
            window.scrollTo({ top: 0 });
          }
        });
      }}
    >
      <h2>Confira seus dados e assine</h2>
      <p className="muted">Estes dados entram no contrato. Se algo estiver errado, corrija antes de assinar.</p>
      {erro && !erro.campo && <Aviso tipo="erro">{erro.texto}</Aviso>}

      <Campo id="nome" rotulo="Nome completo" erro={erro?.campo === "nome" ? erro.texto : undefined}>
        <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <Campo id="documento" rotulo="CPF ou CNPJ" erro={erro?.campo === "documento" ? erro.texto : undefined}>
        <InputMascara
          mascara="documento"
          id="documento"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
        />
      </Campo>
      <Campo id="endereco" rotulo="Endereço do imóvel do projeto" erro={erro?.campo === "endereco" ? erro.texto : undefined}>
        <input id="endereco" autoComplete="street-address" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      </Campo>

      <label className={`checagem ${erro?.campo === "aceite" ? "com-erro" : ""}`}>
        <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
        <span>
          Li o contrato acima e concordo com todas as cláusulas. Entendo que este aceite eletrônico tem valor de assinatura e
          fica registrado com data, hora e IP.
        </span>
      </label>
      {erro?.campo === "aceite" && <p className="campo-erro">{erro.texto}</p>}

      <button type="submit" className="botao botao-marca botao-bloco" disabled={pendente}>
        <PenLine size={18} aria-hidden="true" />
        {pendente ? "Registrando..." : "Assinar contrato"}
      </button>
    </form>
  );
}
