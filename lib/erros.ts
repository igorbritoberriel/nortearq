import "server-only";
import { adminsNorteArq } from "@/lib/admin-nortearq";
import { enviarEmail, escaparHtml, modeloEmail } from "@/lib/email";
import { urlDoSite } from "@/lib/escritorio";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Aviso automático de erros (migração 0034). Registra no banco, junta repetições do mesmo erro na mesma
// página (24 h) e manda e-mail para quem administra o NorteArq só na primeira vez que o erro aparece.
// Nunca lança exceção: registrar um erro não pode causar outro.

export type DadosErro = {
  origem: "servidor" | "navegador";
  mensagem: string;
  digest?: string | null;
  caminho?: string | null;
  detalhe?: Record<string, unknown>;
  usuarioId?: string | null;
  escritorioId?: string | null;
};

export async function registrarErro(d: DadosErro) {
  try {
    const admin = criarClienteAdmin();
    if (!admin) {
      console.error(`[erro:${d.origem}]`, d.caminho, d.mensagem);
      return;
    }
    const { data, error } = await admin.rpc("registrar_erro", {
      p_origem: d.origem,
      p_mensagem: d.mensagem,
      p_digest: d.digest ?? null,
      p_caminho: d.caminho ?? null,
      p_detalhe: d.detalhe ?? {},
      p_usuario: d.usuarioId ?? null,
      p_escritorio: d.escritorioId ?? null,
    });
    if (error) {
      console.error("[erro] não registrado", error.message, d.mensagem);
      return;
    }
    if ((data as { novo?: boolean } | null)?.novo) await avisarErroNovo(d);
  } catch (falha) {
    console.error("[erro] falha ao registrar", falha);
  }
}

async function avisarErroNovo(d: DadosErro) {
  const local = d.origem === "servidor" ? "no servidor" : "na tela de um usuário";
  await enviarEmail({
    para: adminsNorteArq(),
    assunto: `[NorteArq] Erro novo ${local}: ${d.mensagem.slice(0, 80)}`,
    html: modeloEmail({
      titulo: `Erro novo ${local}`,
      linhas: [
        `<strong>Página:</strong> ${escaparHtml(d.caminho ?? "desconhecida")}`,
        `<strong>Mensagem:</strong> ${escaparHtml(d.mensagem.slice(0, 500))}`,
        "Repetições do mesmo erro não geram outro e-mail: o painel interno mostra quantas vezes aconteceu.",
      ],
      botao: { texto: "Abrir o painel interno", url: `${urlDoSite()}/app/interno` },
    }),
    texto: `Erro novo ${local}\nPágina: ${d.caminho ?? "desconhecida"}\nMensagem: ${d.mensagem}\nPainel: ${urlDoSite()}/app/interno`,
  });
}

// Erros que o Next usa como controle de fluxo (redirecionar, página não encontrada): não são falhas.
export function ehErroDeControle(erro: unknown) {
  const digest = typeof erro === "object" && erro !== null && "digest" in erro ? String((erro as { digest: unknown }).digest) : "";
  return /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(digest);
}

// Quem estava logado quando o erro aconteceu, a partir do cabeçalho "cookie" bruto da requisição.
// Usado pelo instrumentation.ts (onRequestError não tem acesso a next/headers cookies()).
export async function identificarUsuarioPorCookie(cabecalhoCookie: string | string[] | undefined) {
  const semNinguem = { usuarioId: null as string | null, escritorioId: null as string | null };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave || !cabecalhoCookie) return semNinguem;

    const cru = Array.isArray(cabecalhoCookie) ? cabecalhoCookie.join("; ") : cabecalhoCookie;
    const cookies = cru
      .split(";")
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const i = parte.indexOf("=");
        return { name: parte.slice(0, i), value: decodeURIComponent(parte.slice(i + 1)) };
      });

    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(url, chave, { cookies: { getAll: () => cookies, setAll: () => {} } });
    const { data } = await supabase.auth.getUser();
    const usuarioId = data.user?.id ?? null;
    if (!usuarioId) return semNinguem;

    const admin = criarClienteAdmin();
    if (!admin) return { usuarioId, escritorioId: null };
    const { data: membro } = await admin.from("membros").select("escritorio_id").eq("id", usuarioId).maybeSingle();
    return { usuarioId, escritorioId: (membro?.escritorio_id as string | undefined) ?? null };
  } catch {
    return semNinguem;
  }
}
