import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const d = JSON.parse(readFileSync("dados-demo.json", "utf8"));
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR" })).newPage();
await p.goto(`https://nortearq.com.br/c/${d.tokenBriefing2}/briefing`, { waitUntil: "networkidle" });
for (let i = 0; i < 8 && !(await p.$(".quiz-imagem img")); i++) {
  const bt = p.getByRole("button", { name: /Começar|Próximo|Continuar|Avançar/ }).first();
  if (!(await bt.count())) break;
  await bt.click(); await p.waitForTimeout(900);
}
await p.waitForTimeout(1200);
console.log("quiz:", !!(await p.$(".quiz-imagem img")));
await p.screenshot({ path: "midia/cel-briefing.png" });
await b.close();
