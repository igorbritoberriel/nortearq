import type { Instrumentation } from "next";

// Aviso automático de erros do servidor (páginas, ações e rotas): vão para o painel interno do NorteArq.
// Só no Node.js (o registro usa a chave secreta do Supabase).
export const onRequestError: Instrumentation.onRequestError = async (erro, requisicao, contexto) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ehErroDeControle, registrarErro } = await import("./lib/erros");
  if (ehErroDeControle(erro)) return;

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const digest = typeof erro === "object" && erro !== null && "digest" in erro ? String((erro as { digest: unknown }).digest) : null;
  await registrarErro({
    origem: "servidor",
    mensagem,
    digest,
    caminho: requisicao.path.split("?")[0],
    detalhe: {
      metodo: requisicao.method,
      rota: contexto.routePath,
      tipo: contexto.routeType,
      pilha: erro instanceof Error ? erro.stack?.split("\n").slice(0, 8).join("\n") : undefined,
    },
  });
};
