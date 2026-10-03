"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { enviarProposta, salvarProposta, type DadosProposta } from "@/app/app/(sistema)/propostas/acoes";
import { BarraModelo, SalvarComoModelo, type ModeloResumoProposta } from "@/components/propostas/ModelosProposta";
import { DESTINOS_LINK } from "@/lib/clientes";
import { linkWhatsapp } from "@/lib/contatos";
import {
  TIPOS_DESLOCAMENTO,
  lerReais,
  opcoesParcelamento, valorAvista,
  reais,
  textoDeslocamento,
  type ModoPagamento,
  type Proposta,
  type TipoDeslocamento,
} from "@/lib/propostas";

// Valores de dinheiro ficam como texto enquanto o arquiteto digita ("15.000,00").
type ItemForm = { servico: string; escopo: string; entregaveis: string };
type ParcelaForm = { descricao: string; valor: string };

const paraTexto = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function FormProposta({
  proposta,
  cliente,
  escritorio,
  servicos,
  modelos = [],
  servicosEscritorio = [],
}: {
  proposta: Proposta;
  cliente: { nome: string; telefone: string | null };
  escritorio: string;
  servicos: string[];
  modelos?: ModeloResumoProposta[];
  servicosEscritorio?: { id: string; nome: string }[];
}) {
  const [titulo, setTitulo] = useState(proposta.titulo);
  const [apresentacao, setApresentacao] = useState(proposta.escopo ?? "");
  const [itens, setItens] = useState<ItemForm[]>(
    proposta.itens.map((i) => ({ servico: i.servico, escopo: i.escopo, entregaveis: i.entregaveis.join("\n") })),
  );
  const [total, setTotal] = useState(paraTexto(proposta.valor_total));
  const [modo, setModo] = useState<ModoPagamento>(proposta.modo_pagamento);
  const [entradaPct, setEntradaPct] = useState(String(proposta.entrada_pct ?? 30));
  const [parcelasMax, setParcelasMax] = useState(String(proposta.parcelas_max ?? 12));
  const [descontoAvista, setDescontoAvista] = useState(
    proposta.desconto_avista_pct ? String(proposta.desconto_avista_pct).replace(".", ",") : "",
  );
  const [parcelas, setParcelas] = useState<ParcelaForm[]>(
    proposta.parcelas.map((p) => ({ descricao: p.descricao, valor: paraTexto(p.valor) })),
  );
  const [formaPagamento, setFormaPagamento] = useState(proposta.forma_pagamento ?? "");
  const [prazo, setPrazo] = useState(proposta.prazo ?? "");
  const [revisoes, setRevisoes] = useState(String(proposta.revisoes_incluidas));
  const [visitas, setVisitas] = useState(String(proposta.visitas_incluidas));
  const [naoIncluido, setNaoIncluido] = useState(proposta.nao_incluido ?? "");
  const [deslocamento, setDeslocamento] = useState<TipoDeslocamento>(proposta.deslocamento_tipo);
  const [deslocValor, setDeslocValor] = useState(paraTexto(proposta.deslocamento_valor));
  const [deslocCidade, setDeslocCidade] = useState(proposta.deslocamento_cidade ?? "");
  const [deslocObs, setDeslocObs] = useState(proposta.deslocamento_obs ?? "");
  const [validade, setValidade] = useState(String(proposta.validade_dias));

  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const valorTotal = lerReais(total);
  const soma = parcelas.reduce((s, p) => s + (lerReais(p.valor) ?? 0), 0);
  const diferenca =
    modo === "manual" && valorTotal !== null && parcelas.length ? Math.round((valorTotal - soma) * 100) / 100 : 0;
  const pctNumero = Number(entradaPct.replace(",", "."));
  const previaParcelado = valorTotal && Number.isFinite(pctNumero) ? opcoesParcelamento(valorTotal, pctNumero, Number(parcelasMax) || 1) : [];
  const primeiroNome = cliente.nome.split(" ")[0];
  const pctDesconto = Number(descontoAvista.replace(",", ".")) || 0;

  function dados(): DadosProposta {
    return {
      titulo,
      escopo: apresentacao,
      itens: itens.map((i) => ({
        servico: i.servico,
        escopo: i.escopo,
        entregaveis: i.entregaveis
          .split("\n")
          .map((e) => e.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean),
      })),
      valor_total: valorTotal ?? Number.NaN,
      parcelas: modo === "parcelado" ? [] : parcelas.map((p) => ({ descricao: p.descricao, valor: lerReais(p.valor) ?? Number.NaN })),
      modo_pagamento: modo,
      entrada_pct: modo === "parcelado" ? (Number.isFinite(pctNumero) && entradaPct.trim() !== "" ? pctNumero : null) : null,
      parcelas_max: modo === "parcelado" ? Number(parcelasMax) || null : null,
      desconto_avista_pct: modo === "parcelado" && pctDesconto > 0 ? pctDesconto : null,
      forma_pagamento: formaPagamento,
      prazo,
      revisoes_incluidas: Number.parseInt(revisoes, 10) || 0,
      visitas_incluidas: Number.parseInt(visitas, 10) || 0,
      nao_incluido: naoIncluido,
      deslocamento_tipo: deslocamento,
      deslocamento_valor: deslocamento === "fixo" || deslocamento === "km" ? (lerReais(deslocValor) ?? null) : null,
      deslocamento_cidade: deslocamento === "incluido" ? null : deslocCidade,
      deslocamento_obs: deslocObs,
      validade_dias: Number.parseInt(validade, 10) || 0,
    };
  }

  async function salvar() {
    setMensagem(null);
    const resultado = await salvarProposta(proposta.id, dados());
    if ("erro" in resultado) {
      setErros(resultado.erros ?? {});
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return false;
    }
    setErros({});
    return true;
  }

  function enviar() {
    if (Math.abs(diferenca) >= 0.01) {
      setMensagem({ tipo: "erro", texto: "A soma das parcelas está diferente do valor total." });
      return;
    }
    // Abre a aba já no clique: navegador de celular bloqueia janela aberta depois de esperar o servidor.
    const aba = cliente.telefone ? window.open("", "_blank") : null;
    iniciar(async () => {
      if (!(await salvar())) return void aba?.close();
      const resultado = await enviarProposta(proposta.id);
      if ("erro" in resultado) {
        aba?.close();
        setMensagem({ tipo: "erro", texto: resultado.erro });
        return;
      }
      setLink(resultado.link);
      if (aba && cliente.telefone) {
        aba.location.href = linkWhatsapp(cliente.telefone, DESTINOS_LINK.proposta.mensagem(primeiroNome, escritorio, resultado.link));
      }
    });
  }

  // Depois de enviada, a página recarrega no modo leitura; aqui só fica o link para copiar.
  if (link) {
    const texto = DESTINOS_LINK.proposta.mensagem(primeiroNome, escritorio, link);
    return (
      <div className="cartao link-escritorio">
        <Aviso tipo="sucesso">Proposta enviada. Ela não pode mais ser editada; para mudar, crie uma nova versão.</Aviso>
        <code>{link}</code>
        <div className="link-escritorio-acoes">
          <button
            type="button"
            className="botao botao-secundario botao-pequeno"
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
          <a className="botao botao-primario botao-pequeno" href={`/app/propostas/${proposta.id}`}>
            Ver proposta enviada
          </a>
        </div>
      </div>
    );
  }

  const mudarItem = (i: number, campo: keyof ItemForm, valor: string) =>
    setItens(itens.map((item, n) => (n === i ? { ...item, [campo]: valor } : item)));
  const mudarParcela = (i: number, campo: keyof ParcelaForm, valor: string) =>
    setParcelas(parcelas.map((p, n) => (n === i ? { ...p, [campo]: valor } : p)));

  // Sugestão comum: 30% de entrada e o saldo na entrega.
  function sugerirParcelas() {
    if (!valorTotal) return setErros({ ...erros, valor_total: "Informe o valor total primeiro." });
    const entrada = Math.round(valorTotal * 0.3 * 100) / 100;
    setParcelas([
      { descricao: "Entrada, na assinatura do contrato", valor: paraTexto(entrada) },
      { descricao: "Saldo, na entrega do projeto", valor: paraTexto(Math.round((valorTotal - entrada) * 100) / 100) },
    ]);
  }

  return (
    <>
    <form
      className="form-proposta"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          if (await salvar()) setMensagem({ tipo: "sucesso", texto: "Rascunho salvo." });
        });
      }}
    >
      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
      <BarraModelo propostaId={proposta.id} origem={proposta.modelo_origem ?? null} modelos={modelos} />

      <section className="cartao secao-config">
        <h2>Apresentação</h2>
        <Campo id="titulo" rotulo="Título" erro={erros.titulo}>
          <input id="titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo id="apresentacao" rotulo="Mensagem de abertura" opcional ajuda="Um parágrafo curto sobre o projeto do cliente." erro={erros.escopo}>
          <textarea id="apresentacao" rows={3} value={apresentacao} onChange={(e) => setApresentacao(e.target.value)} />
        </Campo>
      </section>

      <section className="cartao secao-config">
        <h2>Serviços e entregáveis</h2>
        {erros.itens && <p className="campo-erro">{erros.itens}</p>}
        {itens.map((item, i) => (
          <fieldset key={i} className="proposta-item">
            <legend className="sr-only">Serviço {i + 1}</legend>
            <div className="proposta-item-topo">
              <Campo id={`servico-${i}`} rotulo="Serviço" erro={erros[`itens.${i}.servico`]}>
                <input
                  id={`servico-${i}`}
                  list="servicos-escritorio"
                  value={item.servico}
                  onChange={(e) => mudarItem(i, "servico", e.target.value)}
                />
              </Campo>
              {itens.length > 1 && (
                <button
                  type="button"
                  className="botao-icone"
                  onClick={() => setItens(itens.filter((_, n) => n !== i))}
                  aria-label={`Remover serviço ${item.servico || i + 1}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <Campo id={`escopo-${i}`} rotulo="Escopo" opcional ajuda="O que você vai fazer neste serviço." erro={erros[`itens.${i}.escopo`]}>
              <textarea id={`escopo-${i}`} rows={3} value={item.escopo} onChange={(e) => mudarItem(i, "escopo", e.target.value)} />
            </Campo>
            <Campo id={`entregaveis-${i}`} rotulo="Entregáveis" opcional ajuda="Um por linha. Ex.: Planta de layout, Projeto 3D, Detalhamento de marcenaria.">
              <textarea
                id={`entregaveis-${i}`}
                rows={4}
                value={item.entregaveis}
                onChange={(e) => mudarItem(i, "entregaveis", e.target.value)}
              />
            </Campo>
          </fieldset>
        ))}
        <datalist id="servicos-escritorio">
          {servicos.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="button" className="botao botao-fantasma" onClick={() => setItens([...itens, { servico: "", escopo: "", entregaveis: "" }])}>
          <Plus size={16} aria-hidden="true" /> Adicionar serviço
        </button>
      </section>

      <section className="cartao secao-config">
        <h2>Honorários e pagamento</h2>
        <Campo id="valor_total" rotulo="Valor total (R$)" erro={erros.valor_total}>
          <input id="valor_total" inputMode="decimal" placeholder="15.000,00" value={total} onChange={(e) => setTotal(e.target.value)} />
        </Campo>

        <div className="campo">
          <span className="campo-rotulo" id="modo-pagamento">
            Parcelamento
          </span>
          <div className="lista-marcar" role="radiogroup" aria-labelledby="modo-pagamento">
            <label className="checagem">
              <input type="radio" name="modo_pagamento" checked={modo === "parcelado"} onChange={() => setModo("parcelado")} />
              <span>O cliente escolhe as parcelas</span>
            </label>
            <label className="checagem">
              <input type="radio" name="modo_pagamento" checked={modo === "manual"} onChange={() => setModo("manual")} />
              <span>Parcelas manuais (por etapa, datas específicas…)</span>
            </label>
          </div>
        </div>

        {modo === "parcelado" ? (
          <>
            <div className="form-linha">
              <Campo id="entrada_pct" rotulo="Entrada (%)" ajuda="Use 0 para sem entrada." erro={erros.entrada_pct}>
                <input id="entrada_pct" inputMode="decimal" value={entradaPct} onChange={(e) => setEntradaPct(e.target.value)} />
              </Campo>
              <Campo id="parcelas_max" rotulo="Saldo em até">
                <select id="parcelas_max" value={parcelasMax} onChange={(e) => setParcelasMax(e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? "1x (à vista)" : `${n}x`}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo
              id="desconto_avista_pct"
              rotulo="Desconto para pagamento à vista (%)"
              opcional
              ajuda="Valor todo na assinatura do contrato. Em branco, sem a opção à vista com desconto."
              erro={erros.desconto_avista_pct}
            >
              <input
                id="desconto_avista_pct"
                inputMode="decimal"
                placeholder="5"
                value={descontoAvista}
                onChange={(e) => setDescontoAvista(e.target.value)}
              />
            </Campo>
            {previaParcelado.length > 0 ? (
              <div className="proposta-deslocamento-previa campo-ajuda">
                <strong>O cliente vai escolher entre:</strong>{" "}
                {pctDesconto > 0 && pctDesconto <= 30 && valorTotal
                  ? `à vista ${reais(valorAvista(valorTotal, pctDesconto))} (economia de ${reais(valorTotal - valorAvista(valorTotal, pctDesconto))}) · ou `
                  : ""}
                {previaParcelado[0].entrada > 0 && `entrada de ${reais(previaParcelado[0].entrada)} + `}
                {previaParcelado
                  .map((o) => (o.n === 1 ? `à vista ${reais(Math.round((valorTotal! - o.entrada) * 100) / 100)}` : `${o.n}x de ${reais(o.parcela)}`))
                  .join(" · ")}
                . As parcelas são geradas sozinhas quando ele aprovar.
              </div>
            ) : (
              <p className="campo-ajuda">Informe o valor total para ver as opções do cliente.</p>
            )}
          </>
        ) : (
        <div className="campo">
          <span className="campo-rotulo">Parcelas</span>
          <p className="campo-ajuda">Entrada, parcelas por etapa e saldo. Pode deixar sem parcelas se for à vista.</p>
          {parcelas.map((p, i) => (
            <div key={i} className="proposta-parcela">
              <input
                aria-label={`Descrição da parcela ${i + 1}`}
                placeholder="Ex.: Entrada, na assinatura"
                value={p.descricao}
                onChange={(e) => mudarParcela(i, "descricao", e.target.value)}
                className={erros[`parcelas.${i}.descricao`] ? "com-erro" : ""}
              />
              <input
                aria-label={`Valor da parcela ${i + 1}`}
                inputMode="decimal"
                placeholder="R$"
                value={p.valor}
                onChange={(e) => mudarParcela(i, "valor", e.target.value)}
                className={erros[`parcelas.${i}.valor`] ? "com-erro" : ""}
              />
              <button
                type="button"
                className="botao-icone"
                onClick={() => setParcelas(parcelas.filter((_, n) => n !== i))}
                aria-label={`Remover parcela ${i + 1}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {parcelas.length > 0 && (
            <p className={Math.abs(diferenca) >= 0.01 ? "campo-erro" : "campo-ajuda"}>
              Soma das parcelas: {reais(soma)}
              {Math.abs(diferenca) >= 0.01 && ` · falta ${diferenca > 0 ? "distribuir" : "tirar"} ${reais(Math.abs(diferenca))}`}
            </p>
          )}
          <div className="proposta-parcela-acoes">
            <button type="button" className="botao botao-fantasma" onClick={() => setParcelas([...parcelas, { descricao: "", valor: "" }])}>
              <Plus size={16} aria-hidden="true" /> Adicionar parcela
            </button>
            {parcelas.length === 0 && (
              <button type="button" className="botao botao-fantasma" onClick={sugerirParcelas}>
                Sugerir 30% de entrada + saldo
              </button>
            )}
          </div>
        </div>
        )}

        <Campo id="forma_pagamento" rotulo="Observações de pagamento" opcional erro={erros.forma_pagamento}>
          <textarea id="forma_pagamento" rows={2} value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />
        </Campo>
      </section>

      <section className="cartao secao-config">
        <h2>Prazo e o que está incluído</h2>
        <Campo id="prazo" rotulo="Prazo" opcional ajuda="Ex.: 60 dias úteis após a validação do briefing." erro={erros.prazo}>
          <input id="prazo" value={prazo} maxLength={300} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
        <div className="form-linha">
          <Campo id="revisoes" rotulo="Revisões incluídas" ajuda="No total do projeto. Depois disso, viram aditivo." erro={erros.revisoes_incluidas}>
            <input id="revisoes" type="number" min={0} max={50} value={revisoes} onChange={(e) => setRevisoes(e.target.value)} />
          </Campo>
          <Campo id="visitas" rotulo="Visitas à obra incluídas" erro={erros.visitas_incluidas}>
            <input id="visitas" type="number" min={0} max={200} value={visitas} onChange={(e) => setVisitas(e.target.value)} />
          </Campo>
        </div>
        <div className="campo">
          <span className="campo-rotulo" id="deslocamento-rotulo">
            Deslocamento para visitas fora da cidade
          </span>
          <p className="campo-ajuda">O cliente vê esta regra na proposta e ela vira cláusula do contrato.</p>
          <div className="lista-marcar" role="radiogroup" aria-labelledby="deslocamento-rotulo">
            {(Object.keys(TIPOS_DESLOCAMENTO) as TipoDeslocamento[]).map((t) => (
              <label key={t} className="checagem">
                <input type="radio" name="deslocamento_tipo" checked={deslocamento === t} onChange={() => setDeslocamento(t)} />
                <span>{TIPOS_DESLOCAMENTO[t]}</span>
              </label>
            ))}
          </div>
        </div>
        {deslocamento !== "incluido" && (
          <div className="form-linha">
            <Campo
              id="deslocamento_cidade"
              rotulo="Cidade-sede"
              opcional
              ajuda="Dentro dela, o deslocamento é incluído."
              erro={erros.deslocamento_cidade}
            >
              <input id="deslocamento_cidade" maxLength={80} placeholder="Niterói" value={deslocCidade} onChange={(e) => setDeslocCidade(e.target.value)} />
            </Campo>
            {(deslocamento === "fixo" || deslocamento === "km") && (
              <Campo
                id="deslocamento_valor"
                rotulo={deslocamento === "fixo" ? "Valor por visita (R$)" : "Valor por km rodado (R$)"}
                erro={erros.deslocamento_valor}
              >
                <input
                  id="deslocamento_valor"
                  inputMode="decimal"
                  placeholder={deslocamento === "fixo" ? "150,00" : "1,50"}
                  value={deslocValor}
                  onChange={(e) => setDeslocValor(e.target.value)}
                />
              </Campo>
            )}
          </div>
        )}
        <Campo id="deslocamento_obs" rotulo="Observação sobre o deslocamento" opcional ajuda="Ex.: Pedágios à parte. Acima de 300 km, hospedagem por conta do cliente." erro={erros.deslocamento_obs}>
          <input id="deslocamento_obs" maxLength={500} value={deslocObs} onChange={(e) => setDeslocObs(e.target.value)} />
        </Campo>
        <p className="campo-ajuda proposta-deslocamento-previa">
          <strong>Como o cliente vai ler:</strong>{" "}
          {textoDeslocamento({
            deslocamento_tipo: deslocamento,
            deslocamento_valor: lerReais(deslocValor),
            deslocamento_cidade: deslocCidade,
            deslocamento_obs: deslocObs,
          })}
        </p>
        <Campo id="nao_incluido" rotulo="Não está incluído" opcional ajuda="Ex.: Projeto elétrico, aprovação na prefeitura, compra de móveis." erro={erros.nao_incluido}>
          <textarea id="nao_incluido" rows={3} value={naoIncluido} onChange={(e) => setNaoIncluido(e.target.value)} />
        </Campo>
        <Campo id="validade" rotulo="Validade (dias)" ajuda="Contados a partir do envio." erro={erros.validade_dias}>
          <input id="validade" type="number" min={1} max={90} value={validade} onChange={(e) => setValidade(e.target.value)} className="campo-curto" />
        </Campo>
      </section>

      <div className="form-rodape proposta-rodape">
        <button className="botao botao-secundario" type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button className="botao botao-primario" type="button" onClick={enviar} disabled={pendente}>
          <MessageCircle size={18} aria-hidden="true" />
          {cliente.telefone ? "Enviar no WhatsApp" : "Enviar e gerar link"}
        </button>
      </div>
    </form>
    <div className="proposta-salvar-modelo">
      <SalvarComoModelo
        propostaId={proposta.id}
        servicos={servicosEscritorio}
        servicosDaProposta={itens.map((i) => i.servico)}
        modelos={modelos}
        salvarAntes={salvar}
      />
    </div>
    </>
  );
}
