import { Fragment, type ReactNode } from "react";

// Mostra o texto do manual (o pedaço de Markdown que ele usa: parágrafos, listas, tabelas, **negrito** e `código`).
// Sem dependências: serve no servidor e no navegador.

function inline(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith("`") && parte.endsWith("`")) return <code key={i}>{parte.slice(1, -1)}</code>;
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

type Bloco =
  | { tipo: "p"; texto: string }
  | { tipo: "ul" | "ol"; itens: string[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

function blocos(texto: string): Bloco[] {
  const lista: Bloco[] = [];
  const linhas = texto.split("\n");
  let i = 0;
  const celulas = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim() || /^---\s*$/.test(l) || /^<!--/.test(l.trim())) {
      i++;
      continue;
    }
    if (l.trim().startsWith("|")) {
      const tabela: string[] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) tabela.push(linhas[i++]);
      const corpo = tabela.filter((t) => !/^\|[\s:|-]+\|$/.test(t.trim()));
      lista.push({ tipo: "tabela", cabecalho: celulas(corpo[0]), linhas: corpo.slice(1).map(celulas) });
      continue;
    }
    const marcador = l.match(/^(- |\d+\. )/);
    if (marcador) {
      const tipo = marcador[1] === "- " ? "ul" : "ol";
      const itens: string[] = [];
      while (i < linhas.length && (/^(- |\d+\. )/.test(linhas[i]) || (/^\s+\S/.test(linhas[i]) && itens.length))) {
        if (/^(- |\d+\. )/.test(linhas[i])) itens.push(linhas[i].replace(/^(- |\d+\. )/, ""));
        else itens[itens.length - 1] += " " + linhas[i].trim();
        i++;
      }
      lista.push({ tipo, itens });
      continue;
    }
    let paragrafo = l.trim();
    i++;
    while (i < linhas.length && linhas[i].trim() && !/^(- |\d+\. |\|)/.test(linhas[i].trim())) {
      paragrafo += " " + linhas[i].trim();
      i++;
    }
    lista.push({ tipo: "p", texto: paragrafo });
  }
  return lista;
}

export function TextoManual({ texto }: { texto: string }) {
  return (
    <div className="texto-manual">
      {blocos(texto).map((b, i) => {
        if (b.tipo === "p") return <p key={i}>{inline(b.texto)}</p>;
        if (b.tipo === "tabela") {
          return (
            <div key={i} className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    {b.cabecalho.map((c, j) => (
                      <th key={j} scope="col">
                        {inline(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.linhas.map((linha, j) => (
                    <tr key={j}>
                      {linha.map((c, k) => (
                        <td key={k}>{inline(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const Lista = b.tipo;
        return (
          <Lista key={i}>
            {b.itens.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
