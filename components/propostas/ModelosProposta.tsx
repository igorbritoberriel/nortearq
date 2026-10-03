"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, LayoutTemplate } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { aplicarModelo, salvarComoModelo } from "@/app/app/(sistema)/propostas/modelos/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import { TIPOS_PRECO, type TipoPreco } from "@/lib/modelos-proposta";

export type ModeloResumoProposta = { id: string; nome: string; servicos: string[] };
type Servico = { id: string; nome: string };

const inicial: EstadoFormulario = { status: "inicial" };

// Topo do rascunho: de qual modelo a proposta começou e a troca por outro (ou em branco).
export function BarraModelo({
  propostaId,
  origem,
  modelos,
}: {
  propostaId: string;
  origem: string | null;
  modelos: ModeloResumoProposta[];
}) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="barra-modelo">
      <span>
        <LayoutTemplate size={16} aria-hidden="true" />
        {origem ? (
          <>
            Começou do modelo <strong>{origem}</strong>
          </>
        ) : (
          "Proposta em branco"
        )}
      </span>
      {modelos.length > 0 && (
        <span className="barra-modelo-trocar">
          <label htmlFor="trocar-modelo" className="sr-only">
            Trocar modelo
          </label>
          <select id="trocar-modelo" value={escolhido} onChange={(e) => setEscolhido(e.target.value)} disabled={pendente}>
            <option value="">Trocar modelo…</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
            <option value="branco">Em branco</option>
          </select>
          <button
            type="button"
            className="botao botao-secundario botao-pequeno"
            disabled={!escolhido || pendente}
            onClick={() => {
              if (!window.confirm("Trocar o modelo substitui o conteúdo desta proposta (o que não foi salvo se perde). Continuar?")) return;
              setErro(null);
              iniciar(async () => {
                const r = await aplicarModelo(propostaId, escolhido === "branco" ? null : escolhido);
                if ("erro" in r) setErro(r.erro);
                else {
                  setEscolhido("");
                  router.refresh();
                }
              });
            }}
          >
            {pendente ? "Aplicando..." : "Aplicar"}
          </button>
        </span>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </div>
  );
}

// "Salvar como modelo": salva o rascunho e guarda o conteúdo como modelo (novo ou substituindo um).
export function SalvarComoModelo({
  propostaId,
  servicos,
  servicosDaProposta,
  modelos,
  salvarAntes,
  aberto: abertoFora,
  aoMudar,
}: {
  propostaId: string;
  servicos: Servico[];
  servicosDaProposta: string[]; // nomes dos serviços nos itens da proposta
  modelos: ModeloResumoProposta[];
  salvarAntes: () => Promise<boolean>;
  // Controlado de fora (botão no rodapé da proposta): sem isso, o próprio componente mostra o botão.
  aberto?: boolean;
  aoMudar?: (aberto: boolean) => void;
}) {
  const [abertoDentro, setAbertoDentro] = useState(false);
  const controlado = abertoFora !== undefined;
  const aberto = controlado ? abertoFora : abertoDentro;
  const setAberto = (v: boolean) => (controlado ? aoMudar?.(v) : setAbertoDentro(v));
  const acao = useMemo(() => salvarComoModelo.bind(null, propostaId), [propostaId]);
  const [estado, enviar, enviando] = useActionState(acao, inicial);
  const [salvando, iniciar] = useTransition();
  const [tipo, setTipo] = useState<TipoPreco>("vazio");
  const erro = estado.erros ?? {};
  const v = estado.valores;
  const nomes = servicosDaProposta.map((n) => n.trim().toLowerCase());
  const marcadoPadrao = (s: Servico) => nomes.includes(s.nome.trim().toLowerCase());

  useEffect(() => {
    if (estado.status === "sucesso") setAberto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fecha só quando o estado da ação muda
  }, [estado]);

  if (!aberto) {
    if (controlado) {
      return estado.status === "sucesso" && estado.mensagem ? <Aviso tipo="sucesso">{estado.mensagem}</Aviso> : null;
    }
    return (
      <>
        {estado.status === "sucesso" && estado.mensagem && <Aviso tipo="sucesso">{estado.mensagem}</Aviso>}
        <button type="button" className="botao botao-fantasma" onClick={() => setAberto(true)}>
          <BookmarkPlus size={18} aria-hidden="true" />
          Salvar como modelo
        </button>
      </>
    );
  }

  return (
    <form
      id="salvar-modelo"
      className="pagamento-form salvar-modelo"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        // Primeiro salva o rascunho (o modelo copia o que está gravado).
        iniciar(async () => {
          if (await salvarAntes()) enviar(dados);
        });
      }}
    >
      <h3>Salvar como modelo</h3>
      <p className="campo-ajuda">
        Guarda serviços, escopo, entregáveis, o que não está incluído, prazos, revisões, visitas, deslocamento e pagamento. As
        próximas propostas desses serviços já começam com ele.
      </p>
      {estado.status === "erro" && estado.mensagem && <Aviso tipo="erro">{estado.mensagem}</Aviso>}

      {modelos.length > 0 && (
        <Campo id="modelo-substituir" rotulo="Salvar como">
          <select id="modelo-substituir" name="substituir" defaultValue={v?.substituir ?? ""}>
            <option value="">Um modelo novo</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                Substituir “{m.nome}”
              </option>
            ))}
          </select>
        </Campo>
      )}
      <Campo id="modelo-nome" rotulo="Nome do modelo" erro={erro.nome}>
        <input id="modelo-nome" name="nome" placeholder="Interiores completo" defaultValue={v?.nome} />
      </Campo>
      <div className={`campo ${erro.servicos ? "com-erro" : ""}`}>
        <span className="campo-rotulo" id="modelo-servicos">
          Usar automaticamente em propostas de
        </span>
        <div className="lista-marcar" role="group" aria-labelledby="modelo-servicos">
          {servicos.map((s) => (
            <label key={s.id} className="checagem">
              <input
                type="checkbox"
                name="servicos"
                value={s.id}
                defaultChecked={v ? v[`servico_${s.id}`] === "on" : marcadoPadrao(s)}
              />
              <span>{s.nome}</span>
            </label>
          ))}
        </div>
        {erro.servicos && <p className="campo-erro">{erro.servicos}</p>}
      </div>

      <fieldset className="opcoes">
        <legend>Valor no modelo</legend>
        {(Object.keys(TIPOS_PRECO) as TipoPreco[]).map((t) => (
          <label key={t} className="opcao">
            <input type="radio" name="preco_tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} />
            <span>
              <strong>{TIPOS_PRECO[t]}</strong>
              <small>
                {t === "vazio" && "Cada projeto é um preço."}
                {t === "fixo" && "Ex.: consultoria sempre R$ 2.500."}
                {t === "m2" && "Calculado com a área que o cliente informou no pedido de orçamento."}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      {tipo !== "vazio" && (
        <Campo id="modelo-valor" rotulo={tipo === "m2" ? "Valor por m² (R$)" : "Valor (R$)"} erro={erro.preco_valor}>
          <input id="modelo-valor" name="preco_valor" inputMode="decimal" placeholder={tipo === "m2" ? "80" : "2.500"} defaultValue={v?.preco_valor} />
        </Campo>
      )}

      <div className="form-rodape">
        <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario botao-pequeno" disabled={enviando || salvando}>
          {enviando || salvando ? "Salvando..." : "Salvar modelo"}
        </button>
      </div>
    </form>
  );
}
