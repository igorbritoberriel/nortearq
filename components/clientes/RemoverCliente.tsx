"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, ShieldOff, Trash2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { anonimizarCliente, arquivarCliente, excluirCliente } from "@/app/app/(sistema)/clientes/acoes";

// Ficha do cliente: arquivar (reversível), excluir (sem contrato assinado nem pagamento) e,
// para o dono, anonimizar a pedido do titular (LGPD, RG-9). Migração 0026.
export function RemoverCliente({
  clienteId,
  nome,
  arquivado,
  anonimizado,
  temRegistroLegal,
  podeExcluir,
  dono,
}: {
  clienteId: string;
  nome: string;
  arquivado: boolean;
  anonimizado: boolean;
  temRegistroLegal: boolean;
  podeExcluir: boolean; // dono ou administrador
  dono: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [modo, setModo] = useState<"nada" | "excluir" | "anonimizar">("nada");
  const [senha, setSenha] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  return (
    <div className="remover-cliente">
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const ok = await arquivarCliente(clienteId, !arquivado);
            setAviso(ok ? null : { tipo: "erro", texto: "Não foi possível concluir. Tente de novo." });
          })
        }
      >
        {arquivado ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
        {arquivado ? "Desarquivar" : "Arquivar"}
      </button>
      <p className="campo-ajuda">
        {arquivado
          ? "Arquivado: não aparece na lista de clientes. Desarquivar traz de volta."
          : "Arquivar tira o cliente da lista sem apagar nada. Dá para desarquivar depois."}
      </p>

      {podeExcluir && !anonimizado && (
        <>
          {temRegistroLegal ? (
            <p className="campo-ajuda">
              Este cliente tem contrato assinado ou pagamento registrado: esses documentos ficam guardados (valor legal e
              fiscal). Por isso ele pode ser arquivado, mas não excluído.
            </p>
          ) : modo === "excluir" ? (
            <div className="pagamento-form pagamento-form-estorno">
              <p>
                <strong>Excluir de vez?</strong> Apaga o cliente, propostas, briefing, fotos e links. Não dá para desfazer.
              </p>
              <Campo id="confirmar-exclusao" rotulo="Para confirmar, digite a sua senha do NorteArq">
                <input
                  id="confirmar-exclusao"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
              </Campo>
              <div className="form-rodape">
                <button
                  type="button"
                  className="botao botao-fantasma botao-pequeno"
                  onClick={() => {
                    setModo("nada");
                    setSenha("");
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="botao botao-primario botao-pequeno botao-perigo"
                  disabled={pendente || senha.length < 6}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await excluirCliente(clienteId, senha);
                      if (r?.erro) setAviso({ tipo: "erro", texto: r.erro });
                    })
                  }
                >
                  {pendente ? "Excluindo..." : "Excluir de vez"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="botao botao-fantasma botao-pequeno botao-texto-perigo" onClick={() => setModo("excluir")}>
              <Trash2 size={16} aria-hidden="true" /> Excluir cliente
            </button>
          )}
        </>
      )}

      {dono && !anonimizado && (
        modo === "anonimizar" ? (
          <div className="pagamento-form pagamento-form-estorno">
            <p>
              <strong>Anonimizar a pedido do cliente (LGPD)?</strong> Nome, CPF/CNPJ, telefone, e-mail, endereço, respostas e
              fotos do briefing são apagados, e o acesso ao portal é removido. Contrato assinado, valores e datas ficam guardados
              por obrigação legal. Não dá para desfazer.
            </p>
            <Campo id="confirmar-anonimizar" rotulo="Para confirmar, digite a sua senha do NorteArq">
              <input
                id="confirmar-anonimizar"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </Campo>
            <div className="form-rodape">
              <button
                type="button"
                className="botao botao-fantasma botao-pequeno"
                onClick={() => {
                  setModo("nada");
                  setSenha("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao botao-primario botao-pequeno botao-perigo"
                disabled={pendente || senha.length < 6}
                onClick={() =>
                  iniciar(async () => {
                    const r = await anonimizarCliente(clienteId, senha);
                    if ("erro" in r) {
                      setAviso({ tipo: "erro", texto: r.erro });
                      return;
                    }
                    setAviso({ tipo: "sucesso", texto: "Dados pessoais removidos." });
                    setModo("nada");
                    setSenha("");
                  })
                }
              >
                {pendente ? "Anonimizando..." : "Anonimizar"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setModo("anonimizar")}>
            <ShieldOff size={16} aria-hidden="true" /> Anonimizar a pedido do cliente (LGPD)
          </button>
        )
      )}
      {anonimizado && <p className="campo-ajuda">Dados pessoais removidos a pedido do titular (LGPD).</p>}
    </div>
  );
}
