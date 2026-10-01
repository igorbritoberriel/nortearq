import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BriefingCliente } from "@/components/briefing/BriefingCliente";
import { Aviso } from "@/components/Campo";
import type { BriefingPublico, Estilo, PerguntaBriefing } from "@/lib/briefing";
import { textoSobre } from "@/lib/link-cliente";

// Demonstração do briefing do cliente, só em desenvolvimento: http://localhost:3000/c/exemplo/briefing
// Usa perguntas de exemplo e não grava nada no banco.

export const metadata: Metadata = { title: { absolute: "Briefing (exemplo)" }, robots: { index: false } };

// Ilustrações simples no lugar das fotos de estilo (o banco de imagens real ainda vai ser montado).
const PALETAS: Record<Estilo, [string, string, string, string]> = {
  contemporaneo: ["#e9e6e1", "#8c8279", "#2f2f2f", "#c9a46a"],
  minimalista: ["#f6f5f2", "#dcd8d0", "#ffffff", "#bdb7ac"],
  industrial: ["#5b5b5b", "#3a3330", "#9a6b4f", "#1e1e1e"],
  classico: ["#efe4d2", "#7a5c3e", "#b9935a", "#5b3d2b"],
  escandinavo: ["#f3f1ec", "#d9c7a7", "#9fb3a8", "#e7dccb"],
  rustico: ["#d8c3a5", "#6b4f35", "#a0522d", "#8b7355"],
  boho: ["#f1e3cf", "#c47a53", "#d9a05b", "#6b8f71"],
  japandi: ["#ece6dc", "#b8a690", "#3e3a36", "#a3a58b"],
};

function ilustracao([parede, piso, movel, detalhe]: [string, string, string, string], variante: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<rect width="400" height="300" fill="${parede}"/>
<rect y="210" width="400" height="90" fill="${piso}"/>
<rect x="${variante ? 40 : 200}" y="60" width="120" height="90" fill="${detalhe}" opacity="0.55"/>
<rect x="${variante ? 170 : 40}" y="160" width="190" height="60" rx="10" fill="${movel}"/>
<rect x="${variante ? 160 : 30}" y="150" width="210" height="22" rx="8" fill="${movel}" opacity="0.85"/>
<circle cx="${variante ? 380 : 350}" cy="180" r="${variante ? 26 : 18}" fill="${detalhe}"/>
<rect x="${variante ? 377 : 347}" y="196" width="6" height="18" fill="${piso}"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const estilos = (Object.keys(PALETAS) as Estilo[]).flatMap((estilo, i) =>
  [0, 1].map((v) => ({ id: `00000000-0000-4000-8000-${String(i * 2 + v).padStart(12, "0")}`, estilo, url: ilustracao(PALETAS[estilo], v) })),
);

let n = 0;
const p = (secao: PerguntaBriefing["secao"], texto: string, tipo: PerguntaBriefing["tipo"], extra: Partial<PerguntaBriefing> = {}): PerguntaBriefing => ({
  id: `10000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  secao,
  ambiente: null,
  texto,
  ajuda: null,
  tipo,
  opcoes: null,
  ...extra,
});

const perguntas: PerguntaBriefing[] = [
  p("interiores", "Quantas pessoas costumam ficar na sala ao mesmo tempo?", "numero", { ambiente: "sala" }),
  p("interiores", "O que a sala precisa ter?", "multipla", { ambiente: "sala", opcoes: ["Sofá grande", "TV", "Home theater", "Mesa de jantar", "Bar / aparador", "Canto de leitura"] }),
  p("interiores", "Que tipo de iluminação você prefere?", "escolha", { ambiente: "sala", opcoes: ["Direta", "Indireta", "As duas"] }),
  p("interiores", "De quem é o quarto?", "texto", { ambiente: "quarto", ajuda: "Se forem vários quartos, conte um pouco de cada um." }),
  p("interiores", "Tamanho da cama", "escolha", { ambiente: "quarto", opcoes: ["Solteiro", "Viúva", "Casal", "Queen", "King"] }),
  p("interiores", "O quarto precisa de…", "multipla", { ambiente: "quarto", opcoes: ["Espelho", "Penteadeira", "Escrivaninha", "Closet ou armário grande", "TV", "Poltrona"] }),
  p("interiores", "Como você usa a cozinha?", "escolha", { ambiente: "cozinha", opcoes: ["Cozinho todo dia", "Cozinho às vezes", "Quase não cozinho"] }),
  p("interiores", "Box ou banheira?", "escolha", { ambiente: "banheiro", opcoes: ["Box", "Banheira", "Os dois"] }),
  p("reforma", "O que você quer mudar?", "texto"),
  p("reforma", "O que é prioridade na reforma?", "multipla", { opcoes: ["Elétrica", "Hidráulica", "Piso", "Revestimentos", "Marcenaria", "Iluminação", "Pintura"] }),
  p("reforma", "Vai morar no imóvel durante a obra?", "sim_nao"),
  p("comum", "Como é a rotina de quem vai usar o espaço?", "texto", { ajuda: "Horários, hobbies, se recebe amigos, se tem crianças ou idosos." }),
  p("comum", "Tem animais de estimação?", "sim_nao"),
  p("comum", "Até quanto pretende investir na obra e nos móveis (R$)?", "numero", { ajuda: "Um valor aproximado ajuda a propor soluções possíveis." }),
  p("comum", "Fotos de referência", "foto", { ajuda: "Prints do Pinterest, do Instagram ou de lugares que você gostou. Até 20 fotos." }),
];

const briefing: BriefingPublico = {
  id: "exemplo",
  status: "pendente",
  tipos: ["interiores", "reforma"],
  ambientes: ["sala", "quarto"],
  perguntas,
  respostas: {},
  estilos,
  curtidos: [],
  rejeitados: [],
};

export default function BriefingExemploPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const cor = "#7a5c3e";
  const estilo = { "--cor-marca": cor, "--cor-marca-texto": textoSobre(cor) } as React.CSSProperties;

  return (
    <div className="publico" style={estilo}>
      <header className="publico-topo">
        <span className="publico-inicial" aria-hidden="true">
          S
        </span>
        <strong>Studio Ana Arquitetura</strong>
      </header>
      <main className="publico-conteudo">
        <Aviso tipo="sucesso">Página de exemplo: nada é salvo. As imagens do quiz são ilustrações provisórias.</Aviso>
        <BriefingCliente
          token="exemplo"
          briefing={briefing}
          miniaturas={{}}
          cliente="Mariana"
          escritorio="Studio Ana Arquitetura"
          fotosDisponiveis={false}
          demonstracao
        />
      </main>
      <footer className="publico-rodape">Link seguro e pessoal · NorteArq</footer>
    </div>
  );
}
