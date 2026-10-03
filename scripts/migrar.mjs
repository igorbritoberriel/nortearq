// Aplica uma migração no Supabase pela Management API (usa SUPABASE_ACCESS_TOKEN do .env.local).
// Uso:
//   node scripts/migrar.mjs supabase/migrations/0029_xxx.sql            → aplica
//   node scripts/migrar.mjs supabase/migrations/0029_xxx.sql --testar   → roda e desfaz (só valida)
//   node scripts/migrar.mjs -e "select ..."                              → consulta
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_ACCESS_TOKEN) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_ACCESS_TOKEN no .env.local.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Informe o arquivo .sql (ou -e \"consulta\").");
  process.exit(1);
}
let sql = args[0] === "-e" ? args[1] : readFileSync(args[0], "utf8");
if (args.includes("--testar")) sql = `begin;\n${sql}\n;rollback;`;

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const resposta = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const texto = await resposta.text();
console.log(resposta.ok ? "OK" : `ERRO ${resposta.status}`, texto.slice(0, 3000));
process.exit(resposta.ok ? 0 : 1);
