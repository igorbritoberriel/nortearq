// Telas reais (escritório de demonstração) para os Reels, em alta resolução.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";
const projeto = "C:/Users/Usuário/Desktop/Marketing Digital/app - arquitetura/nortearq/";
const { createClient } = createRequire(projeto + "package.json")("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(projeto + ".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const d = JSON.parse(readFileSync("dados-demo.json", "utf8"));
const site = "https://nortearq.com.br";
const dir = "reels/img";
mkdirSync(dir, { recursive: true });

const arq = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await arq.auth.signInWithPassword({ email: d.email, password: d.senha });
await arq.rpc("preparar_briefing", { p_cliente_id: d.cliente2 });
const { data: token2 } = await arq.rpc("criar_link_cliente", { p_cliente_id: d.cliente2, p_destino: "briefing" });
const { data: bri } = await arq.from("briefings").select("id").eq("cliente_id", d.cliente).single();

const b = await chromium.launch();

// Celular: briefing passo a passo e quiz (várias imagens).
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: "pt-BR" })).newPage();
  await p.goto(`${site}/c/${token2}/briefing`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${dir}/briefing-1.png` });
  await p.getByRole("button", { name: /Começar/ }).click();
  await p.waitForSelector(".quiz-imagem img");
  for (let i = 1; i <= 6; i++) {
    await p.waitForTimeout(1300);
    await p.screenshot({ path: `${dir}/quiz-${i}.png` });
    const botao = p.getByRole("button", { name: i % 3 === 0 ? /Não gosto/ : /^Gosto/ }).first();
    if (!(await botao.count())) break;
    await botao.click();
  }
  // Passos seguintes do briefing.
  for (let passo = 3; passo <= 5; passo++) {
    const prox = p.getByRole("button", { name: /Próximo|Continuar|Avançar/ }).first();
    if (!(await prox.count())) break;
    await prox.click();
    await p.waitForTimeout(1300);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${dir}/briefing-${passo}.png` });
  }
  // Projeto visto pelo cliente (página inteira, para recortar).
  await p.goto(`${site}/c/${d.tokenProjeto}/projeto`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${dir}/projeto-cliente.png`, fullPage: true });
  console.log("projeto: blocos", await p.evaluate(() => [...document.querySelectorAll("h1,h2,h3,section")].slice(0, 30).map((e) => e.tagName + ":" + (e.className || "") + ":" + e.textContent.trim().slice(0, 30) + ":" + Math.round(e.getBoundingClientRect().top + scrollY)).join("\n")));
}

// Computador: Perfil do Cliente.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, locale: "pt-BR" });
  const p = await ctx.newPage();
  await p.goto(site + "/entrar");
  await p.fill('input[type="email"]', d.email);
  await p.fill('input[type="password"]', d.senha);
  await Promise.all([p.waitForURL(/\/app/), p.click('button[type="submit"]')]);
  await p.goto(`${site}/app/briefings/${bri.id}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${dir}/perfil.png`, fullPage: true });
  console.log("perfil: blocos", await p.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].map((e) => e.tagName + ":" + e.textContent.trim().slice(0, 30) + ":" + Math.round(e.getBoundingClientRect().top + scrollY)).join("\n")));
}
await b.close();
console.log("ok");
