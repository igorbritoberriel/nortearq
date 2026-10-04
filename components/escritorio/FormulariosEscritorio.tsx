"use client";

import { useActionState, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Aviso, Campo } from "@/components/Campo";
import { salvarBriefing, salvarMarca, salvarPrecoAgenda, salvarServicos } from "@/app/app/acoes";
import type { EstadoFormulario } from "@/lib/formulario";
import type { Escritorio, Servico } from "@/lib/escritorio";
import { InputMascara } from "@/components/InputMascara";

// Formulários de configuração do escritório. No assistente inicial recebem "proximo"
// (vão para o passo seguinte ao salvar); na tela de Configurações ficam na mesma página.

const inicial: EstadoFormulario = { status: "inicial" };

type Props = { proximo?: string; rotuloBotao?: string; voltar?: React.ReactNode };

function Rodape({ enviando, rotulo, voltar }: { enviando: boolean; rotulo: string; voltar?: React.ReactNode }) {
  return (
    <div className="form-rodape">
      {voltar}
      <button className="botao botao-primario" type="submit" disabled={enviando}>
        {enviando ? "Salvando..." : rotulo}
      </button>
    </div>
  );
}

function Mensagem({ estado }: { estado: EstadoFormulario }) {
  if (estado.status === "erro" && estado.mensagem) return <Aviso tipo="erro">{estado.mensagem}</Aviso>;
  if (estado.status === "sucesso" && estado.mensagem) return <Aviso tipo="sucesso">{estado.mensagem}</Aviso>;
  return null;
}

// ---------- Marca ----------

export function FormMarca({
  escritorio,
  site,
  proximo,
  rotuloBotao = "Salvar",
  voltar,
}: Props & { escritorio: Escritorio; site: string }) {
  const [estado, enviar, enviando] = useActionState(salvarMarca, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};
  const [cor, setCor] = useState(v.cor_primaria ?? escritorio.cor_primaria ?? "#1f3a5f");
  const [previa, setPrevia] = useState<string | null>(null);
  const logoAtual = previa ?? escritorio.logo_url;
  const campoEndereco = (ajuda: string) => (
    <Campo id="slug" rotulo="Endereço do seu formulário" ajuda={ajuda} erro={erro.slug}>
      <div className="campo-prefixo">
        <span>{site.replace(/^https?:\/\//, "")}/e/</span>
        <input id="slug" name="slug" required defaultValue={v.slug ?? escritorio.slug} autoCapitalize="off" />
      </div>
    </Campo>
  );

  return (
    <form action={enviar} noValidate>
      <Mensagem estado={estado} />
      {proximo && <input type="hidden" name="proximo" value={proximo} />}
      <Campo id="nome" rotulo="Nome do escritório" erro={erro.nome}>
        <input id="nome" name="nome" required defaultValue={v.nome ?? escritorio.nome} />
      </Campo>
      {/* No assistente o endereço aparece aberto; em Configurações o link já está no cartão
          "Link do seu formulário", então aqui fica recolhido (os campos recolhidos também são enviados). */}
      {proximo ? (
        campoEndereco("É o link que você vai colocar no Instagram e mandar no WhatsApp.")
      ) : (
        <details className="mudar-endereco" open={!!erro.slug}>
          <summary>Mudar o endereço do formulário</summary>
          {campoEndereco("Atenção: o endereço antigo para de funcionar. Depois de mudar, atualize a bio do Instagram e os links que você já mandou.")}
        </details>
      )}
      <Campo id="whatsapp" rotulo="WhatsApp do escritório" opcional erro={erro.whatsapp}>
        <InputMascara
            mascara="telefone"
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="(11) 91234-5678"
          defaultValue={v.whatsapp ?? escritorio.whatsapp ?? ""}
        />
      </Campo>

      <div className="marca-linha">
        <Campo id="logo" rotulo="Logo" opcional ajuda="PNG, JPG ou WEBP, até 2 MB." erro={erro.logo}>
          <div className="marca-logo">
            <div className="marca-logo-previa" style={{ borderColor: cor }}>
              {logoAtual ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoAtual} alt="Logo do escritório" />
              ) : (
                <span style={{ color: cor }}>{(v.nome ?? escritorio.nome).slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
              }}
            />
          </div>
          {escritorio.logo_url && !previa && (
            <label className="checagem">
              <input type="checkbox" name="remover_logo" /> <span>Remover a logo atual</span>
            </label>
          )}
        </Campo>
        <Campo id="cor_primaria" rotulo="Cor principal" erro={erro.cor_primaria}>
          <div className="marca-cor">
            <input
              id="cor_primaria"
              name="cor_primaria"
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
            />
            <code>{cor}</code>
          </div>
        </Campo>
      </div>
      <p className="campo-ajuda">Seu cliente vê essa logo e essa cor no formulário, nos links e no portal.</p>

      <Rodape enviando={enviando} rotulo={rotuloBotao} voltar={voltar} />
    </form>
  );
}

// ---------- Serviços ----------

export function FormServicos({ servicos, proximo, rotuloBotao = "Salvar", voltar }: Props & { servicos: Servico[] }) {
  const [estado, enviar, enviando] = useActionState(salvarServicos, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores;
  // Depois de um erro, a tela mostra o que foi enviado (checkbox desmarcado não vem no formulário).
  const marcado = (chave: string, padrao: boolean) => (v ? v[chave] === "on" : padrao);

  return (
    <form action={enviar} noValidate key={servicos.length}>
      <Mensagem estado={estado} />
      {proximo && <input type="hidden" name="proximo" value={proximo} />}
      <div className="tabela-rolagem-app">
        <table className="tabela-servicos">
          <thead>
            <tr>
              <th scope="col">Oferece</th>
              <th scope="col">Serviço</th>
              <th scope="col">Tem briefing</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((s) => (
              <tr key={s.id}>
                <td>
                  <input type="hidden" name="servico_id" value={s.id} />
                  <input
                    type="checkbox"
                    name={`ativo_${s.id}`}
                    aria-label={`Oferece ${s.nome}`}
                    defaultChecked={marcado(`ativo_${s.id}`, s.ativo)}
                  />
                </td>
                <td>
                  <input
                    name={`nome_${s.id}`}
                    aria-label="Nome do serviço"
                    defaultValue={v?.[`nome_${s.id}`] ?? s.nome}
                    className={erro[`nome_${s.id}`] ? "com-erro" : ""}
                  />
                  {erro[`nome_${s.id}`] && <p className="campo-erro">{erro[`nome_${s.id}`]}</p>}
                </td>
                <td>
                  <input
                    type="checkbox"
                    name={`briefing_${s.id}`}
                    aria-label={`${s.nome} tem briefing`}
                    defaultChecked={marcado(`briefing_${s.id}`, s.tem_briefing)}
                  />
                </td>
              </tr>
            ))}
            <tr className="tabela-servicos-novo">
              <td />
              <td>
                <input
                  name="novo_nome"
                  placeholder="Adicionar outro serviço (opcional)"
                  aria-label="Novo serviço"
                  defaultValue={v?.novo_nome ?? ""}
                  className={erro.novo_nome ? "com-erro" : ""}
                />
                {erro.novo_nome && <p className="campo-erro">{erro.novo_nome}</p>}
              </td>
              <td>
                <input
                  type="checkbox"
                  name="novo_briefing"
                  aria-label="Novo serviço tem briefing"
                  defaultChecked={marcado("novo_briefing", true)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="campo-ajuda">
        Serviço desmarcado some do formulário do cliente, mas continua no histórico. &quot;Tem briefing&quot; define
        se o cliente responde perguntas sobre ele (Legalização normalmente não tem).
      </p>
      <Rodape enviando={enviando} rotulo={rotuloBotao} voltar={voltar} />
    </form>
  );
}

// ---------- Faixa de preço e agenda ----------

const reais = (valor: number | null) =>
  valor === null ? "" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function FormPrecoAgenda({
  escritorio,
  proximo,
  rotuloBotao = "Salvar",
  voltar,
}: Props & { escritorio: Escritorio }) {
  const [estado, enviar, enviando] = useActionState(salvarPrecoAgenda, inicial);
  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form action={enviar} noValidate>
      <Mensagem estado={estado} />
      {proximo && <input type="hidden" name="proximo" value={proximo} />}
      <p className="muted">
        Os dois valores são opcionais e não aparecem para o cliente. Servem só para sinalizar cada pedido de orçamento:
        nada é bloqueado, quem decide é você.
      </p>
      <div className="form-linha">
        <Campo
          id="faixa_preco_min"
          rotulo="Valor mínimo (R$)"
          opcional
          ajuda="Abaixo dele, o pedido chega como “fora do perfil”. Em branco, todos chegam como “a avaliar”."
          erro={erro.faixa_preco_min}
        >
          <input
            id="faixa_preco_min"
            name="faixa_preco_min"
            inputMode="decimal"
            placeholder="8.000"
            defaultValue={v.faixa_preco_min ?? reais(escritorio.faixa_preco_min)}
          />
        </Campo>
        <Campo
          id="faixa_preco_max"
          rotulo="Valor máximo (R$)"
          opcional
          ajuda="Acima dele, o pedido chega com o aviso “acima da sua faixa” (continua compatível)."
          erro={erro.faixa_preco_max}
        >
          <input
            id="faixa_preco_max"
            name="faixa_preco_max"
            inputMode="decimal"
            placeholder="60.000"
            defaultValue={v.faixa_preco_max ?? reais(escritorio.faixa_preco_max)}
          />
        </Campo>
      </div>
      <Campo
        id="proxima_data_livre"
        rotulo="Quando você consegue começar um projeto novo?"
        opcional
        ajuda="Se o cliente pedir um prazo antes dessa data, o pedido vem com o alerta “prazo apertado”."
        erro={erro.proxima_data_livre}
      >
        <input
          id="proxima_data_livre"
          name="proxima_data_livre"
          type="date"
          defaultValue={v.proxima_data_livre ?? escritorio.proxima_data_livre ?? ""}
        />
      </Campo>
      <Rodape enviando={enviando} rotulo={rotuloBotao} voltar={voltar} />
    </form>
  );
}

// ---------- Briefing ----------

export function FormBriefing({
  escritorio,
  proximo,
  concluirOnboarding,
  rotuloBotao = "Salvar",
  voltar,
}: Props & { escritorio: Escritorio; concluirOnboarding?: boolean }) {
  const [estado, enviar, enviando] = useActionState(salvarBriefing, inicial);
  const escolhido = estado.valores?.momento_briefing ?? (escritorio.briefing_antes_proposta ? "antes_proposta" : "depois_contrato");

  return (
    <form action={enviar} noValidate>
      <Mensagem estado={estado} />
      {proximo && <input type="hidden" name="proximo" value={proximo} />}
      {concluirOnboarding && <input type="hidden" name="concluir_onboarding" value="on" />}
      <fieldset className="opcoes">
        <legend>Quando o cliente responde o briefing detalhado?</legend>
        <label className="opcao">
          <input type="radio" name="momento_briefing" value="depois_contrato" defaultChecked={escolhido === "depois_contrato"} />
          <span>
            <strong>Depois do contrato assinado</strong> (recomendado)
            <small>O pedido de orçamento já filtra o básico. O briefing completo fica para quem fechou.</small>
          </span>
        </label>
        <label className="opcao">
          <input type="radio" name="momento_briefing" value="antes_proposta" defaultChecked={escolhido === "antes_proposta"} />
          <span>
            <strong>Antes da proposta</strong>
            <small>Bom quando você precisa entender o projeto a fundo para dar o preço.</small>
          </span>
        </label>
      </fieldset>
      <p className="campo-ajuda">
        Você começa com o briefing padrão do NorteArq: perguntas de arquitetura, de interiores por ambiente e o quiz
        visual de estilo. Dá para personalizar depois em Briefings.
      </p>
      <Rodape enviando={enviando} rotulo={rotuloBotao} voltar={voltar} />
    </form>
  );
}

// ---------- Link do escritório ----------

export function LinkDoEscritorio({ link, nome }: { link: string; nome: string }) {
  const [copiado, setCopiado] = useState(false);
  const mensagem = encodeURIComponent(
    `Olá! Para pedir um orçamento para o ${nome}, preencha este formulário rapidinho: ${link}`,
  );

  return (
    <div className="link-escritorio">
      <code>{link}</code>
      <div className="link-escritorio-acoes">
        <button
          type="button"
          className="botao botao-secundario"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              window.prompt("Copie o link:", link);
            }
          }}
        >
          {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <a
          className="botao botao-secundario"
          href={`https://wa.me/?text=${mensagem}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" />
          Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}
