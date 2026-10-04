import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { PRE_LANCAMENTO, TEXTO_CHAMADA, linkChamada } from "@/lib/site";
import { Planos } from "@/components/site/Planos";
import { ListaEspera } from "@/components/site/ListaEspera";
import { VideoSistema } from "@/components/site/VideoSistema";

// Landing page. Textos: docs/especificacao-v1.md (seções 1 e 8).
// Visual "escuro premium" (aprovado em imagem: referencias do projeto/landing-mockups/opcao-b-*).
// data-animacao define a entrada de cada seção; .a-item são os elementos que entram em cascata (MotorAnimacao).
// Os prints e o vídeo em public/landing/ vêm de um escritório de demonstração (nunca de dados reais).

const DORES = [
  "O briefing vira horas de reunião e áudios soltos no WhatsApp.",
  "Proposta e contrato feitos à mão, para quem nem ia fechar.",
  "Arquivos espalhados e nenhuma prova do que o cliente aprovou.",
  "Revisão e visita sem limite: você trabalha de graça.",
];

const PASSOS = [
  { titulo: "Pedido filtrado", texto: "O formulário do seu escritório classifica cada pedido pela sua faixa de preço e prazo." },
  { titulo: "Briefing sozinho", texto: "Perguntas por ambiente e quiz visual de estilo. O Perfil do Cliente chega pronto, em PDF." },
  { titulo: "Proposta e contrato", texto: "Montados dos seus modelos, sem redigitar. O cliente aprova e assina pelo link." },
  { titulo: "Etapas aprovadas", texto: "Arquivos, revisões e aditivos visíveis aos dois lados, com data, hora e registro." },
];

const NUMEROS = [
  { valor: 14, sufixo: "dias", rotulo: "de teste grátis, sem cartão" },
  { valor: 0, sufixo: "contratos", rotulo: "redigitados à mão" },
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

// Telas de celular que se revezam na vitrine (cada aparelho começa numa diferente).
const TELAS = [
  { src: "/landing/cel-briefing.webp", alt: "Briefing do cliente no celular" },
  { src: "/landing/cel-proposta.webp", alt: "Proposta aberta pelo cliente no celular" },
  { src: "/landing/cel-projeto.webp", alt: "Acompanhamento do projeto pelo cliente" },
];

function Celular({ classe, inicio }: { classe: string; inicio: number }) {
  return (
    <div className={`ln-fone ${classe}`} aria-hidden="true">
      <div className="ln-fone-tela">
        {TELAS.map((t, i) => (
          <img key={t.src} src={t.src} alt="" width={390} height={844} style={{ "--i": (i - inicio + 3) % 3 } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* 1. Hero: título central, vídeo do sistema e celulares flutuando */}
      <section className="ln-hero">
        <div className="ln-planta" aria-hidden="true" />
        <div className="ln-brilho" aria-hidden="true" />
        <div className="container ln-hero-conteudo">
          {PRE_LANCAMENTO && (
            <p className="ln-selo carga" style={{ "--d": 0 } as React.CSSProperties}>
              <b>Novo</b> Acesso antecipado · 14 dias grátis · sem cartão
            </p>
          )}
          <h1 className="carga" style={{ "--d": 1 } as React.CSSProperties}>
            Seu cliente explica o que quer <em>sozinho.</em> Você só projeta.
          </h1>
          <p className="ln-sub carga" style={{ "--d": 2 } as React.CSSProperties}>
            Briefing visual, proposta e contrato automáticos, aprovações registradas e pagamentos organizados. Tudo por
            link no WhatsApp, com a marca do seu escritório.
          </p>
          <div className="ln-acoes carga" style={{ "--d": 3 } as React.CSSProperties}>
            <Link href={linkChamada()} className="botao botao-primario botao-grande">
              {TEXTO_CHAMADA} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/#como-funciona" className="botao botao-vidro botao-grande">
              Ver como funciona
            </Link>
          </div>
          <div className="ln-vitrine carga" style={{ "--d": 4 } as React.CSSProperties}>
            <div className="ln-janela">
              <div className="ln-janela-barra" aria-hidden="true"><i /><i /><i /></div>
              <VideoSistema />
            </div>
            <Celular classe="ln-fone-1" inicio={0} />
            <Celular classe="ln-fone-2" inicio={1} />
          </div>
        </div>
      </section>

      {/* 2. Frase e dores */}
      <section className="ln-frase" data-animacao="fade-up">
        <div className="container">
          <p className="ln-frase-texto a-item">
            Feito para arquitetos e designers de interiores que querem <em>tirar o cliente das costas</em> e voltar a
            projetar.
          </p>
          <ul className="ln-dores">
            {DORES.map((dor) => (
              <li key={dor} className="a-item">
                <X size={16} aria-hidden="true" /> {dor}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Como funciona */}
      <section id="como-funciona" className="ln-secao" data-animacao="stagger-up">
        <div className="container">
          <div className="ln-cabeca">
            <span className="ln-rotulo a-item">Como funciona</span>
            <h2 className="a-item">
              Do primeiro contato à entrega, <em>sem perder o fio.</em>
            </h2>
          </div>
          <ol className="ln-trilha">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="a-item">
                <b>{String(i + 1).padStart(2, "0")}</b>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="ln-numeros">
            {NUMEROS.map((n) => (
              <div key={n.rotulo} className="a-item">
                <span className="ln-numero-valor">
                  <span className="numero" data-valor={n.valor}>{n.valor}</span>
                  <small>{n.sufixo}</small>
                </span>
                <span className="ln-numero-rotulo">{n.rotulo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Recursos em mosaico */}
      <section id="recursos" className="ln-secao ln-secao-colada" data-animacao="scale-up">
        <div className="container">
          <div className="ln-cabeca">
            <span className="ln-rotulo a-item">Recursos</span>
            <h2 className="a-item">
              Cada parte resolve <em>uma dor</em> do escritório.
            </h2>
          </div>
          <div className="ln-bento">
            <article className="ln-caixa ln-g4 ln-com-tela a-item">
              <span className="ln-rotulo">Briefing visual</span>
              <h3>O cliente não sabe explicar? Ele mostra.</h3>
              <p>
                Quiz de estilo com imagens, perguntas por ambiente e fotos de referência. Salva sozinho: dá para parar e
                continuar depois. Você recebe o Perfil do Cliente em PDF, pronto para a reunião.
              </p>
              <div className="ln-pilulas">
                <span>Arquitetura</span><span>Interiores por ambiente</span><span>Reforma</span><span>Perfil em PDF</span>
              </div>
              <img className="ln-tela-mini" src="/landing/cel-briefing.webp" alt="" width={390} height={844} loading="lazy" />
            </article>
            <article className="ln-caixa ln-g2 ln-ouro a-item">
              <span className="ln-rotulo">Controle do contratado</span>
              <h3>Revisões contadas, para os dois lados.</h3>
              <p className="ln-grande">
                <span className="numero" data-valor={2}>2</span>/3
              </p>
              <div className="ln-barra" aria-hidden="true"><span /></div>
              <p>revisões usadas. Passou do limite? Você dá de cortesia ou gera um aditivo.</p>
            </article>
            <article className="ln-caixa ln-g3 a-item">
              <span className="ln-rotulo">Pagamentos</span>
              <h3>Receba em dia, sem constrangimento.</h3>
              <p>
                Vencimentos, lembretes ao cliente e Pix em cada parcela. Opcional: boleto e cartão com baixa automática,
                direto na sua conta.
              </p>
              <div className="ln-pagto" aria-hidden="true">
                <div>Entrada, na assinatura <em>Pago · Pix</em></div>
                <div>Anteprojeto <em className="ln-aviso">Vence em 3 dias</em></div>
              </div>
            </article>
            <article className="ln-caixa ln-g3 a-item">
              <span className="ln-rotulo">Proposta e contrato</span>
              <h3>Do briefing ao contrato, sem redigitar.</h3>
              <p>
                Modelos por serviço, parcelamento à escolha do cliente e aceite eletrônico. Cada resposta fica
                registrada com data, hora e IP.
              </p>
              <div className="ln-pilulas">
                <span>Versões</span><span>Desconto à vista</span><span>Aceite com data e IP</span>
              </div>
            </article>
            <article className="ln-caixa ln-g6 a-item">
              <span className="ln-rotulo">WhatsApp e a sua marca</span>
              <h3>Seu cliente vê o seu escritório. Não a gente.</h3>
              <p>
                Briefing, proposta e contrato chegam por link no WhatsApp, com a mensagem pronta. Nada para instalar.
                Nome, logo e cores são os seus, até nos e-mails; o NorteArq fica nos bastidores.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 5. Planos e dúvidas: zona clara */}
      <section id="planos" className="ln-clara" data-animacao="fade-up">
        <div className="container">
          <div className="ln-cabeca">
            <span className="ln-rotulo a-item">Planos</span>
            <h2 className="a-item">
              Um plano para cada <em>tamanho de escritório.</em>
            </h2>
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

          <div id="perguntas" className="ln-faq">
            <div className="ln-cabeca">
              <span className="ln-rotulo a-item">Dúvidas</span>
              <h2 className="a-item">Perguntas frequentes.</h2>
            </div>
            <div className="ln-faq-lista a-item">
              {FAQ.map((item) => (
                <details key={item.pergunta}>
                  <summary>{item.pergunta}</summary>
                  <p>{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Lista de espera: sempre visível depois de aparecer */}
      <section id="lista-espera" className="ln-chamada" data-animacao="fade-up">
        <div className="ln-planta" aria-hidden="true" />
        <div className="container dividido">
          <div>
            <span className="ln-rotulo a-item">Lista de espera</span>
            <h2 className="a-item">
              Seja um dos primeiros escritórios no <em>NorteArq.</em>
            </h2>
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
          <div className="lista-cartao a-item">
            <ListaEspera />
          </div>
        </div>
      </section>
    </>
  );
}
