// Grava os trechos do vídeo da landing e tira os prints de celular, com o escritório de demonstração.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";
const projeto = "C:/Users/Usuário/Desktop/Marketing Digital/app - arquitetura/nortearq/";
const { createClient } = createRequire(projeto + "package.json")("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(projeto + ".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const d = JSON.parse(readFileSync("dados-demo.json", "utf8"));
const site = "https://nortearq.com.br";
mkdirSync("midia", { recursive: true });

// Briefing em andamento (o da Mariana já foi enviado): prepara um para o Rafael.
const arq = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await arq.auth.signInWithPassword({ email: d.email, password: d.senha });
if (!d.tokenBriefing2) {
  await arq.rpc("preparar_briefing", { p_cliente_id: d.cliente2 });
  const r = await arq.rpc("criar_link_cliente", { p_cliente_id: d.cliente2, p_destino: "briefing" });
  d.tokenBriefing2 = r.data;
  writeFileSync("dados-demo.json", JSON.stringify(d, null, 2));
}

const b = await chromium.launch();
const so = process.argv[2];

// Prints de celular (390x844, nítidos).
if (!so || so === "cel") {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR" });
  const p = await ctx.newPage();
  for (const [nome, caminho] of [["cel-briefing", `/c/${d.tokenBriefing2}/briefing`], ["cel-proposta", `/c/${d.tokenProposta}/proposta`], ["cel-projeto", `/c/${d.tokenProjeto}/projeto`]]) {
    await p.goto(site + caminho, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `midia/${nome}.png` });
  }
  await ctx.close();
}

// Trechos do vídeo (1280x800). Cada trecho grava num contexto próprio; anota quando a tela ficou pronta.
async function entrar(ctx) {
  const p = await ctx.newPage();
  await p.goto(site + "/entrar");
  await p.fill('input[type="email"]', d.email);
  await p.fill('input[type="password"]', d.senha);
  await Promise.all([p.waitForURL(/\/app/, { timeout: 30000 }), p.click('button[type="submit"]')]);
  return ctx.storageState();
}
const estado = await entrar(await b.newContext());
const rolar = (p, y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => {
  const ini = window.scrollY, t0 = performance.now();
  const passo = (t) => { const k = Math.min((t - t0) / ms, 1); const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; window.scrollTo(0, ini + (y - ini) * e); k < 1 ? requestAnimationFrame(passo) : ok(); };
  requestAnimationFrame(passo);
}), [y, ms]);
const alvo = (p, seletor) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + window.scrollY - 90 : 0; }, seletor);

const { data: bri } = await arq.from("briefings").select("id").eq("cliente_id", d.cliente).single();
const trechos = [
  ["1-painel", "/app", async (p) => { await p.waitForTimeout(2600); await rolar(p, 380, 1800); await p.waitForTimeout(1400); }],
  ["2-perfil", `/app/briefings/${bri.id}`, async (p) => { await p.waitForTimeout(2600); await rolar(p, 560, 2200); await p.waitForTimeout(2400); }],
  ["3-projeto", `/app/projetos/${d.projeto}`, async (p) => { await p.waitForTimeout(2000); await rolar(p, 520, 2000); await p.waitForTimeout(1600); await rolar(p, 1150, 2000); await p.waitForTimeout(1800); }],
];
const inicios = {};
if (!so || so === "video") {
  for (const [nome, caminho, roteiro] of trechos) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, storageState: estado, locale: "pt-BR", recordVideo: { dir: "midia/bruto", size: { width: 1280, height: 800 } } });
    const t0 = Date.now();
    const p = await ctx.newPage();
    await p.goto(site + caminho, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    if (nome === "1-painel") await p.screenshot({ path: "midia/sistema-capa.png" });
    inicios[nome] = (Date.now() - t0) / 1000;
    const t1 = Date.now();
    await roteiro(p);
    inicios[nome + "-dur"] = (Date.now() - t1) / 1000;
    const v = p.video();
    await ctx.close();
    renameSync(await v.path(), `midia/${nome}.webm`);
  }
  writeFileSync("midia/tempos.json", JSON.stringify(inicios, null, 2));
  console.log(inicios);
}
await b.close();
console.log("ok");
