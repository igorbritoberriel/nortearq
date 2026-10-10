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

// E-mails de acesso à conta (senha nova etc.), com o topo da marca. Textos fixos; só a URL é dinâmica.
export function modeloEmailAcesso({ titulo, texto, botao, url, rodape }: { titulo: string; texto: string; botao: string; url: string; rodape: string }) {
  const link = escaparHtml(url);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#f7f5f1;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3dfd6;border-radius:14px;overflow:hidden;">
<tr><td style="background:#132640;padding:22px 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;"><img src="https://nortearq.com.br/icones/icone-192.png" width="36" height="36" alt="" style="display:block;border-radius:8px;"></td>
<td style="vertical-align:middle;padding-left:12px;font-size:21px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;">Norte<span style="color:#c9a46a;">Arq</span></td>
</tr></table></td></tr>
<tr><td style="padding:34px 32px 8px;">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#1f3a5f;">${titulo}</h1>
<p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#3d3d3a;">${texto}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9px;background:#c9a46a;">
<a href="${link}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#132640;text-decoration:none;border-radius:9px;">${botao}</a>
</td></tr></table>
<p style="margin:26px 0 0;font-size:12.5px;line-height:1.6;color:#5f5e5a;">Se o botão não abrir, copie e cole este endereço no navegador:<br><a href="${link}" style="color:#1f3a5f;word-break:break-all;">${link}</a></p>
</td></tr>
<tr><td style="padding:24px 32px 30px;"><p style="margin:0;padding-top:18px;border-top:1px solid #eeece8;font-size:12.5px;line-height:1.6;color:#5f5e5a;">${rodape}</p></td></tr>
</table>
<p style="margin:18px 0 0;font-size:11.5px;color:#9a978f;">NorteArq · nortearq.com.br</p>
</td></tr></table></body></html>`;
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
