import "server-only";

// Envio de e-mail pelo Resend (https://resend.com), direto pela API, sem biblioteca extra.
// Sem RESEND_API_KEY o e-mail não sai: só aparece no terminal (bom para desenvolver).

export type Email = {
  para: string | string[];
  assunto: string;
  html: string;
  texto: string;
};

export async function enviarEmail({ para, assunto, html, texto }: Email): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE ?? "NorteArq <onboarding@resend.dev>";
  if (!chave) {
    console.info(`[email] RESEND_API_KEY não configurada. Não enviado: "${assunto}" para ${[para].flat().join(", ")}`);
    return false;
  }

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [para].flat(), subject: assunto, html, text: texto }),
    });
    if (!resposta.ok) {
      console.error("[email]", resposta.status, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error("[email]", erro);
    return false;
  }
}

// Tudo o que vem do cliente passa por aqui antes de entrar no HTML.
export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Modelo simples, legível em qualquer leitor de e-mail. `linhas` já devem vir escapadas.
export function modeloEmail({
  titulo,
  linhas,
  botao,
}: {
  titulo: string;
  linhas: string[];
  botao?: { texto: string; url: string };
}) {
  const corpo = linhas.map((l) => `<p style="margin:0 0 12px">${l}</p>`).join("");
  const chamada = botao
    ? `<p style="margin:24px 0 0"><a href="${escaparHtml(botao.url)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escaparHtml(botao.texto)}</a></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f5f1;font-family:Segoe UI,Arial,sans-serif;color:#1d1d1b;line-height:1.6">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:#ffffff;border:1px solid #e3dfd6;border-radius:10px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escaparHtml(titulo)}</h1>${corpo}${chamada}
</div>
<p style="font-size:12px;color:#5f5e5a;text-align:center;margin:16px 0 0">Aviso automático do NorteArq</p>
</div></body></html>`;
}
