import type { ModuloId } from "@/lib/modulos";

// Placeholder das telas do esqueleto: mostra o que cada tela vai ter.
// Substitua pelo conteúdo real à medida que desenvolver.
export function EmConstrucao({
  modulo,
  titulo,
  descricao,
  itens,
}: {
  modulo: ModuloId;
  titulo: string;
  descricao?: string;
  itens: string[];
}) {
  return (
    <section className="em-construcao">
      <span className="selo">Módulo {modulo}</span>
      <h1>{titulo}</h1>
      {descricao && <p className="muted">{descricao}</p>}
      <div className="cartao">
        <h2>O que esta tela vai ter</h2>
        <ul className="checklist">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
