import { perguntasCliente } from "@/lib/manual";

// Perguntas frequentes do cliente final (capítulo 14 do manual), no rodapé dos links e do portal.
export function PerguntasFrequentes() {
  const perguntas = perguntasCliente();
  if (!perguntas.length) return null;
  return (
    <section className="perguntas-frequentes" aria-labelledby="perguntas-frequentes">
      <h2 id="perguntas-frequentes">Dúvidas frequentes</h2>
      {perguntas.map((p) => (
        <details key={p.pergunta}>
          <summary>{p.pergunta}</summary>
          <p>{p.resposta}</p>
        </details>
      ))}
    </section>
  );
}
