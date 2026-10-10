"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Aviso, Campo } from "@/components/Campo";
import { ETAPAS_CLIENTE, type Cliente } from "@/lib/clientes";
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
