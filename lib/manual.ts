import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

// Central de ajuda e perguntas frequentes do cliente: lidas direto de docs/manual/manual.md (fonte única).
// O arquivo vai junto na publicação (outputFileTracingIncludes no next.config.ts).
// Trechos entre <!-- suporte --> e <!-- /suporte --> são só para o suporte e ficam de fora.

export type CapituloAjuda = { id: string; numero: number; titulo: string; texto: string };
export type PerguntaFrequente = { pergunta: string; resposta: string };

const lerManual = cache(() => {
  try {
    return readFileSync(path.join(process.cwd(), "docs", "manual", "manual.md"), "utf8").replace(/\r\n/g, "\n");
  } catch (e) {
    console.error("[manual] não foi possível ler", e);
    return "";
  }
});

const semSuporte = (texto: string) => texto.replace(/<!-- suporte -->[\s\S]*?<!-- \/suporte -->\n?/g, "");

export const capitulosAjuda = cache((): CapituloAjuda[] => {
  const partes = semSuporte(lerManual()).split(/^## /m).slice(1);
  return partes.map((parte) => {
    const [cabecalho, ...resto] = parte.split("\n");
    const m = cabecalho.match(/^(\d+)\.\s+(.+?)\s*[✅🟡⬜]?\s*$/u);
    const numero = m ? Number(m[1]) : 0;
    const titulo = (m ? m[2] : cabecalho).replace(/\*\*/g, "").trim();
    const texto = resto.join("\n").replace(/\n---\s*$/m, "").trim();
    return { id: `cap-${numero}`, numero, titulo: numero === 15 ? "Dúvidas comuns e como resolver" : titulo, texto };
  });
});

// Perguntas frequentes do cliente final: a lista "**Pergunta?** Resposta" do capítulo 14.
export const perguntasCliente = cache((): PerguntaFrequente[] => {
  const cap = capitulosAjuda().find((c) => c.numero === 14);
  if (!cap) return [];
  const inicio = cap.texto.indexOf("**Perguntas frequentes**");
  if (inicio < 0) return [];
  const itens = cap.texto
    .slice(inicio)
    .split(/\n(?=- \*\*)/)
    .slice(1);
  return itens
    .map((item) => {
      const m = item.replace(/\n\s+/g, " ").match(/^- \*\*(.+?)\*\*\s*(.+)$/s);
      return m ? { pergunta: m[1].trim(), resposta: m[2].trim() } : null;
    })
    .filter((p): p is PerguntaFrequente => !!p);
});
