// Cena central da landing: planta baixa de um apartamento de 96 m² que se desenha com a rolagem
// (paredes → móveis → cotas → cores dos ambientes). O MotorAnimacao anima as classes pb-*.
// Sem JavaScript (ou com movimento reduzido), aparece já pronta.
// Quando o vídeo do site chegar, ele substitui esta cena (quadros em canvas, skill video-to-website).

const PAREDES = [
  "M300 520 H40 V40 H760 V520 H360", // contorno, com a porta de entrada entre 300 e 360
  "M470 40 V150",
  "M470 210 V380",
  "M470 440 V520",
  "M470 280 H760",
  "M630 380 H760",
  "M630 380 V430",
  "M630 480 V520",
];

const JANELAS = [
  { x: 110, y: 36, w: 150, h: 8 },
  { x: 560, y: 36, w: 120, h: 8 },
  { x: 756, y: 320, w: 8, h: 110 },
  { x: 36, y: 180, w: 8, h: 140 },
];

const AMBIENTES = [
  { d: "M40 40 H470 V520 H40 Z", cor: "var(--pb-sala)", rotulo: "ESTAR · JANTAR", area: "38 m²", x: 255, y: 214 },
  { d: "M470 40 H760 V280 H470 Z", cor: "var(--pb-cozinha)", rotulo: "COZINHA", area: "17 m²", x: 615, y: 250 },
  { d: "M470 280 H760 V380 H630 V520 H470 Z", cor: "var(--pb-quarto)", rotulo: "SUÍTE", area: "21 m²", x: 555, y: 490 },
  { d: "M630 380 H760 V520 H630 Z", cor: "var(--pb-banho)", rotulo: "BANHO", area: "5 m²", x: 668, y: 400 },
];

export function PlantaBaixa() {
  return (
    <svg className="planta" viewBox="0 0 800 560" role="img" aria-label="Planta baixa de um apartamento sendo desenhada">
      <g className="pb-ambientes">
        {AMBIENTES.map((a) => (
          <path key={a.rotulo} className="pb-ambiente" d={a.d} fill={a.cor} />
        ))}
      </g>

      <g className="pb-moveis" fill="var(--pb-papel)" stroke="var(--pb-traco)" strokeWidth="1.5">
        {/* Jantar */}
        <g className="pb-movel">
          <rect x="120" y="92" width="170" height="66" rx="6" />
          {[150, 205, 260].flatMap((cx) => [
            <circle key={`a${cx}`} cx={cx} cy="78" r="10" />,
            <circle key={`b${cx}`} cx={cx} cy="172" r="10" />,
          ])}
        </g>
        {/* Estar */}
        <g className="pb-movel">
          <rect x="105" y="248" width="200" height="104" rx="4" strokeDasharray="4 4" fill="none" />
          <circle cx="205" cy="300" r="22" />
        </g>
        <g className="pb-movel">
          <rect x="90" y="380" width="230" height="56" rx="10" />
          <rect x="90" y="420" width="230" height="16" rx="4" />
          <rect x="350" y="260" width="66" height="66" rx="10" />
        </g>
        <g className="pb-movel">
          <circle cx="420" cy="470" r="18" fill="var(--pb-planta)" stroke="none" />
          <circle cx="80" cy="80" r="16" fill="var(--pb-planta)" stroke="none" />
        </g>
        {/* Cozinha */}
        <g className="pb-movel">
          <path d="M478 48 H752 V232 H712 V88 H478 Z" />
          <rect x="545" y="54" width="54" height="28" rx="8" />
          {[640, 664].flatMap((cx) => [
            <circle key={`f${cx}`} cx={cx} cy="60" r="6" />,
            <circle key={`g${cx}`} cx={cx} cy="78" r="6" />,
          ])}
        </g>
        <g className="pb-movel">
          <rect x="540" y="150" width="130" height="52" rx="4" />
        </g>
        {/* Suíte */}
        <g className="pb-movel">
          <rect x="490" y="300" width="130" height="170" rx="6" />
          <rect x="500" y="308" width="50" height="30" rx="6" />
          <rect x="560" y="308" width="50" height="30" rx="6" />
          <path d="M490 360 H620" />
        </g>
        <g className="pb-movel">
          <rect x="642" y="290" width="110" height="36" />
          <path d="M660 290 V326 M680 290 V326 M700 290 V326 M720 290 V326 M740 290 V326" />
        </g>
        {/* Banho */}
        <g className="pb-movel">
          <rect x="700" y="388" width="52" height="52" />
          <path d="M700 388 L752 440" />
          <ellipse cx="660" cy="500" rx="14" ry="16" />
          <rect x="700" y="466" width="50" height="34" rx="8" />
        </g>
      </g>

      <g className="pb-portas" fill="none" stroke="var(--pb-traco)" strokeWidth="1.5">
        <path className="pb-parede" pathLength={1} d="M300 520 A60 60 0 0 1 360 460 M360 520 V460" />
        <path className="pb-parede" pathLength={1} d="M470 380 A60 60 0 0 1 530 440 M470 440 H530" />
        <path className="pb-parede" pathLength={1} d="M630 430 A50 50 0 0 1 680 480 M630 480 H680" />
      </g>

      <g className="pb-paredes" fill="none" stroke="var(--pb-tinta)" strokeWidth="9" strokeLinecap="square">
        {PAREDES.map((d) => (
          <path key={d} className="pb-parede" pathLength={1} d={d} />
        ))}
      </g>

      <g className="pb-janelas" fill="var(--pb-papel)" stroke="var(--pb-tinta)" strokeWidth="1.5">
        {JANELAS.map((j) => (
          <rect key={`${j.x}-${j.y}`} className="pb-janela" x={j.x} y={j.y} width={j.w} height={j.h} />
        ))}
      </g>

      <g className="pb-cotas" stroke="var(--pb-traco)" strokeWidth="1" fill="var(--pb-traco)">
        <path d="M40 16 H760 M40 10 V22 M760 10 V22" fill="none" />
        <text x="400" y="10" textAnchor="middle">12,00 m</text>
        <path d="M784 40 V520 M778 40 H790 M778 520 H790" fill="none" />
        <text x="794" y="284" textAnchor="middle" transform="rotate(90 794 284)">8,00 m</text>
      </g>

      <g className="pb-rotulos" fill="var(--pb-tinta)">
        {AMBIENTES.map((a) => (
          <text key={a.rotulo} className="pb-rotulo" x={a.x} y={a.y} textAnchor="middle">
            {a.rotulo}
            <tspan x={a.x} dy="16">{a.area}</tspan>
          </text>
        ))}
      </g>
    </svg>
  );
}

// Seta do norte (assinatura da marca). Gira com a rolagem no hero.
export function SetaNorte({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 6" />
      {Array.from({ length: 36 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1="8"
          x2="100"
          y2={i % 9 === 0 ? 22 : 14}
          stroke="currentColor"
          strokeWidth={i % 9 === 0 ? 1.5 : 0.75}
          transform={`rotate(${i * 10} 100 100)`}
        />
      ))}
      <path d="M100 46 L116 100 L100 93 L84 100 Z" fill="currentColor" />
      <path d="M100 154 L116 100 L100 107 L84 100 Z" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <text x="100" y="41" textAnchor="middle" className="seta-norte-n">N</text>
    </svg>
  );
}
