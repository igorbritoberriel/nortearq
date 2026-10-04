import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { MODULOS } from "@/lib/modulos";
import { PRE_LANCAMENTO, TEXTO_CHAMADA, linkChamada } from "@/lib/site";
import { Planos } from "@/components/site/Planos";
import { ListaEspera } from "@/components/site/ListaEspera";
import { PlantaBaixa, SetaNorte } from "@/components/site/PlantaBaixa";

// Landing page. Textos: docs/especificacao-v1.md (seções 1 e 8).
// Estrutura e animações: skills video-to-website + frontend-design (pasta skills/).
// data-animacao define a entrada de cada seção (nunca a mesma em seções seguidas); .a-item são os
// elementos que entram em cascata; data-lado diz para onde a cena se afasta.

const DORES = [
  "O briefing vira horas de reunião e áudios soltos no WhatsApp.",
  "Proposta e contrato feitos à mão, para quem nem ia fechar.",
  "Arquivos espalhados e nenhuma prova do que o cliente aprovou.",
  "Revisão e visita sem limite: você trabalha de graça.",
];

const NUMEROS = [
  { valor: 14, sufixo: "dias", rotulo: "de teste grátis, sem cartão" },
  { valor: 4, sufixo: "módulos", rotulo: "na primeira versão" },
  { valor: 5, sufixo: "etapas", rotulo: "de projeto prontas para usar" },
  { valor: 100, sufixo: "%", rotulo: "das aprovações com data e hora" },
];

const FAQ = [
  {
    pergunta: "Quando o NorteArq abre?",
    resposta:
      "Estamos construindo a primeira versão junto com arquitetos. Quem está na lista de espera é avisado primeiro e testa antes de todo mundo.",
  },
  {
    pergunta: "Meu cliente precisa instalar alguma coisa?",
    resposta: "Não. Ele recebe links pelo WhatsApp e abre no celular. Só cria senha se quiser acompanhar o projeto no portal.",
  },
  {
    pergunta: "Meu cliente vai ver a marca NorteArq?",
    resposta: "Não. Formulário, briefing, proposta e portal aparecem com o nome, o logo e as cores do seu escritório.",
  },
  {
    pergunta: "Posso usar minhas próprias perguntas e imagens no briefing?",
    resposta:
      "Sim. Você parte de um modelo pronto (arquitetura, interiores por ambiente e reforma) e liga, desliga ou cria perguntas e imagens de estilo.",
  },
  {
    pergunta: "Como funciona o limite de revisões?",
    resposta:
      "Você define na proposta quantas revisões e visitas estão incluídas. O contador fica visível para você e para o cliente. Passou do limite, você escolhe: dar de cortesia ou gerar um aditivo.",
  },
  {
    pergunta: "Meus arquivos ficam seguros?",
    resposta: "Sim. Cada cliente só vê os arquivos do próprio projeto que você marcou como visíveis. Versões antigas nunca são apagadas.",
  },
  {
    pergunta: "O NorteArq fica com o dinheiro dos meus clientes?",
    resposta:
      "Não. Você combina as parcelas na proposta e o cliente paga direto para você, por Pix ou como preferir: o pagamento não passa pelo NorteArq. O sistema controla vencimentos, lembra o cliente e emite os recibos.",
  },
  {
    pergunta: "Meu cliente pode pagar por Pix, boleto ou cartão?",
    resposta:
      "Pode. Cadastrando sua chave Pix, cada parcela já mostra o QR Code para o cliente, sem custo. Se quiser também boleto e cartão com baixa automática, ative a cobrança automática com a sua conta do Asaas (opcional; R$ 0,99 por parcela paga, além das tarifas do Asaas).",
  },
  {
    pergunta: "Vou poder cancelar quando quiser?",
    resposta: "Sim, sem multa. Os planos terão 14 dias grátis, sem cartão, e no anual você ganha 2 meses.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* 1. Hero: tela cheia, tipografia enorme, palavras entrando em cascata */}
      <section className="hero">
        <div className="container hero-conteudo">
          <p className="rotulo carga" style={{ "--d": 0 } as React.CSSProperties}>
            Nº 001 — Para arquitetos e designers de interiores
          </p>
          <h1>
            <span className="hero-linha-1 carga" style={{ "--d": 1 } as React.CSSProperties}>
              Seu cliente explica o que quer sozinho.
            </span>
            <span className="hero-linha-2">
              {["Você", "só", "projeta."].map((palavra, i) => (
                <span key={palavra} className="palavra carga" style={{ "--d": i + 2 } as React.CSSProperties}>
                  {palavra === "projeta." ? <em>{palavra}</em> : palavra}
                </span>
              ))}
            </span>
          </h1>
          <div className="hero-rodape carga" style={{ "--d": 5 } as React.CSSProperties}>
            <p className="hero-lead">
              Briefing visual, proposta, contrato e aprovações num só lugar. Tudo chega ao cliente por link no
              WhatsApp, com a marca do seu escritório.
            </p>
            <div className="acoes">
              <Link href={linkChamada()} className="botao botao-primario botao-grande">
                {TEXTO_CHAMADA} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              {PRE_LANCAMENTO && <span className="hero-nota">Acesso antecipado · 14 dias grátis · sem cartão</span>}
            </div>
          </div>
        </div>
        <SetaNorte className="seta-norte" />
        <a href="#como-funciona" className="hero-rolar">
          Role e veja o projeto nascer <ArrowDown size={16} aria-hidden="true" />
        </a>
      </section>

      {/* 2. Experiência: cena fixa (planta que se desenha; depois, o vídeo) + seções nas laterais */}
      <section id="como-funciona" className="experiencia" aria-label="Como o NorteArq funciona">
        <div className="palco">
          <div className="letreiro" aria-hidden="true">
            <span className="letreiro-texto">Briefing · Proposta · Contrato · Aprovação · Briefing · Proposta ·</span>
          </div>
          <div className="cena">
            <PlantaBaixa />
          </div>
          <div className="palco-escuro" aria-hidden="true" />
        </div>

        <article className="passo-rolagem lado-esquerda" style={{ top: "11%" }} data-lado="esquerda" data-animacao="slide-left">
          <span className="rotulo a-item">001 / O problema</span>
          <h2 className="a-item">O cliente não sabe explicar o que quer.</h2>
          <ul className="lista-tracos a-item">
            {DORES.map((dor) => (
              <li key={dor}>{dor}</li>
            ))}
          </ul>
        </article>

        <article className="passo-rolagem lado-direita" style={{ top: "26%" }} data-lado="direita" data-animacao="slide-right">
          <span className="rotulo a-item">002 / Briefing visual</span>
          <h2 className="a-item">Ele responde sozinho, pelo celular.</h2>
          <p className="a-item">
            Perguntas por ambiente e um quiz de estilo com imagens: ele marca “gosto” ou “não gosto” e o sistema
            descobre o estilo principal. Você recebe o <strong>Perfil do Cliente em PDF</strong>, pronto para a reunião.
          </p>
          <p className="nota a-item">Arquitetura · Interiores por ambiente · Reforma</p>
        </article>

        <article className="passo-rolagem lado-esquerda" style={{ top: "41%" }} data-lado="esquerda" data-animacao="clip-reveal">
          <span className="rotulo a-item">003 / Proposta e contrato</span>
          <h2 className="a-item">Do briefing ao contrato, sem redigitar.</h2>
          <p className="a-item">
            O contato já chega filtrado pela sua faixa de preço. Os dados viram proposta, e a proposta aprovada vira
            contrato com assinatura digital. Cada resposta fica registrada com data, hora e IP.
          </p>
        </article>

        <article className="passo-rolagem lado-centro secao-numeros" style={{ top: "57%" }} data-lado="centro" data-animacao="stagger-up">
          <span className="rotulo a-item">004 / Em números</span>
          <div className="numeros">
            {NUMEROS.map((n) => (
              <div key={n.rotulo} className="numero-bloco a-item">
                <span className="numero-valor">
                  <span className="numero" data-valor={n.valor}>{n.valor}</span>
                  <small>{n.sufixo}</small>
                </span>
                <span className="numero-rotulo">{n.rotulo}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="passo-rolagem lado-direita" style={{ top: "73%" }} data-lado="direita" data-animacao="scale-up">
          <span className="rotulo a-item">005 / Controle do contratado</span>
          <h2 className="a-item">O combinado fica à vista. Para os dois lados.</h2>
          <p className="destaque-contador a-item">
            2 <span>de</span> 3 <small>revisões usadas</small>
          </p>
          <p className="a-item">
            Revisões, visitas e aditivos contados no portal do cliente. Passou do limite? Você dá de cortesia ou gera
            um aditivo. Etapa aprovada não volta atrás.
          </p>
        </article>

        <article className="passo-rolagem lado-esquerda" style={{ top: "89%" }} data-lado="esquerda" data-animacao="rotate-in">
          <span className="rotulo a-item">006 / WhatsApp e a sua marca</span>
          <h2 className="a-item">Seu cliente vê o seu escritório. Não a gente.</h2>
          <p className="a-item">
            Briefing, proposta e contrato chegam por link no WhatsApp, com a mensagem pronta. Nada para instalar. Nome,
            logo e cores são os seus; o NorteArq fica nos bastidores.
          </p>
          <Link href={linkChamada()} className="botao botao-primario a-item">
            {TEXTO_CHAMADA} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </article>
      </section>

      {/* 3. Módulos: zona escura, lista editorial */}
      <section id="modulos" className="zona" data-animacao="slide-right">
        <div className="container">
          <div className="zona-cabeca">
            <span className="rotulo a-item">007 / Módulos</span>
            <h2 className="a-item">Cada módulo resolve uma dor.</h2>
          </div>
          <ol className="modulos-lista">
            {MODULOS.filter((m) => m.fase < 3).map((modulo) => (
              <li key={modulo.id} className="a-item">
                <span className="modulos-id">{modulo.id}</span>
                <span className="modulos-nome">{modulo.nome}</span>
                <span className="modulos-resumo">{modulo.resumo}</span>
                <span className="modulos-fase">{modulo.fase === 1 ? "Primeira versão" : "Em breve"}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Planos */}
      <section id="planos" className="zona zona-clara" data-animacao="scale-up">
        <div className="container">
          <div className="zona-cabeca">
            <span className="rotulo a-item">008 / Planos</span>
            <h2 className="a-item">Um plano para cada tamanho de escritório.</h2>
            <p className="a-item">14 dias grátis em qualquer plano, sem cartão. No anual, 2 meses grátis.</p>
          </div>
          <div className="a-item">
            <Planos />
          </div>
          <p className="nota-centro a-item">
            <Link className="link-seta" href="/precos">
              Comparar planos e adicionais <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>

      {/* 5. Lista de espera: zona de destaque, sempre visível depois de aparecer */}
      <section id="lista-espera" className="zona zona-escura" data-animacao="clip-reveal" data-persiste="true">
        <div className="container dividido">
          <div>
            <span className="rotulo a-item">009 / Lista de espera</span>
            <h2 className="a-item">Seja um dos primeiros escritórios no NorteArq.</h2>
            <p className="a-item">
              Estamos construindo a primeira versão ao lado de arquitetos de verdade. Entre na lista e acompanhe de
              perto.
            </p>
            <ul className="lista-tracos a-item">
              <li>Acesso antes da abertura ao público.</li>
              <li>Sua rotina ajudando a definir o produto.</li>
              <li>Sem compromisso e sem cartão.</li>
            </ul>
          </div>
          <div className="lista-cartao">
            <ListaEspera />
          </div>
        </div>
      </section>

      {/* 6. Perguntas frequentes */}
      <section id="perguntas" className="zona faq" data-animacao="fade-up">
        <div className="container estreito">
          <span className="rotulo a-item">010 / Dúvidas</span>
          <h2 className="a-item">Perguntas frequentes.</h2>
          <div className="a-item">
            {FAQ.map((item) => (
              <details key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Chamada final */}
      <section className="zona zona-areia chamada-final" data-animacao="rotate-in" data-persiste="true">
        <div className="container">
          <p className="rotulo a-item">O norte do seu projeto</p>
          <h2 className="a-item">
            Menos burocracia. <em>Mais prancheta.</em>
          </h2>
          <Link href={linkChamada()} className="botao botao-primario botao-grande a-item">
            {TEXTO_CHAMADA} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
