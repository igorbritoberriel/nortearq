// Cópia de segurança diária do NorteArq para o Cloudflare R2 (roda no GitHub Actions: .github/workflows/backup.yml).
//
// 1. Banco: pg_dump completo (formato custom) + só os dados (public, logins e identidades) em SQL compactado.
//    Fica em banco/AAAA-MM-DD/; a própria rotina apaga as pastas com mais de 30 dias.
// 2. Arquivos do Supabase Storage (plantas, renders, fotos do briefing...): copia só os que ainda não estão no R2,
//    em arquivos/<balde>/<caminho>. Arquivo no NorteArq nunca muda (versão nova = caminho novo).
//
// Variáveis: SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET. Precisa do pacote @aws-sdk/client-s3 e do pg_dump 17 no caminho.
// Teste local sem pg_dump: SEM_BANCO=1 node backup.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const e = process.env;
for (const v of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
  if (!e[v]) throw new Error(`Falta a variável ${v}`);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
});
const enviar = (Key, Body, ContentType) => r2.send(new PutObjectCommand({ Bucket: e.R2_BUCKET, Key, Body, ContentType }));
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const temp = mkdtempSync(path.join(tmpdir(), "nortearq-"));
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ---------- 1. Banco ----------
if (!e.SEM_BANCO) {
  if (!e.SUPABASE_DB_URL) throw new Error("Falta a variável SUPABASE_DB_URL");
  const completo = path.join(temp, "completo.dump");
  execFileSync("pg_dump", [e.SUPABASE_DB_URL, "--format=custom", "--no-owner", "--no-privileges", "--file", completo], { stdio: "inherit" });
  await enviar(`banco/${hoje}/completo.dump`, readFileSync(completo), "application/octet-stream");
  console.log(`banco completo: ${mb(statSync(completo).size)}`);

  // Só os dados que importam para refazer o sistema num projeto novo (a estrutura vem das migrações do repositório).
  // Duas chamadas: com --table o pg_dump ignora --schema, então public e os logins saem separados e são juntados.
  const base = [e.SUPABASE_DB_URL, "--data-only", "--no-owner", "--no-privileges"];
  const opcoes = { maxBuffer: 1024 * 1024 * 1024 };
  const dados = Buffer.concat([
    execFileSync("pg_dump", [...base, "--table=auth.users", "--table=auth.identities"], opcoes),
    execFileSync("pg_dump", [...base, "--schema=public"], opcoes),
  ]);
  const compactado = gzipSync(dados);
  await enviar(`banco/${hoje}/dados.sql.gz`, compactado, "application/gzip");
  console.log(`dados (public + logins): ${mb(compactado.length)}`);

  // Guarda 30 dias de cópias do banco: as pastas mais antigas saem.
  const limite = new Date(`${hoje}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 30);
  const antigas = [...(await chavesNoR2("banco/"))].filter((k) => {
    const dia = k.split("/")[1];
    return /^\d{4}-\d{2}-\d{2}$/.test(dia) && new Date(`${dia}T12:00:00Z`) < limite;
  });
  for (let i = 0; i < antigas.length; i += 1000) {
    await r2.send(new DeleteObjectsCommand({ Bucket: e.R2_BUCKET, Delete: { Objects: antigas.slice(i, i + 1000).map((Key) => ({ Key })) } }));
  }
  console.log(`cópias do banco com mais de 30 dias apagadas: ${antigas.length} arquivo(s)`);
}

// ---------- 2. Arquivos do Storage ----------
const cabecalhos = { apikey: e.SUPABASE_SECRET_KEY, Authorization: `Bearer ${e.SUPABASE_SECRET_KEY}` };
const storage = `${e.SUPABASE_URL.replace(/\/$/, "")}/storage/v1`;

async function listarStorage(balde, prefixo = "") {
  const lista = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${storage}/object/list/${balde}`, {
      method: "POST",
      headers: { ...cabecalhos, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefixo, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!r.ok) throw new Error(`Storage (${balde}/${prefixo}): ${r.status} ${await r.text()}`);
    const itens = await r.json();
    for (const item of itens) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.id === null) lista.push(...(await listarStorage(balde, caminho))); // pasta
      else lista.push({ caminho, tamanho: item.metadata?.size ?? 0, tipo: item.metadata?.mimetype });
    }
    if (itens.length < 1000) return lista;
  }
}

async function chavesNoR2(prefixo) {
  const chaves = new Set();
  let token;
  do {
    const r = await r2.send(new ListObjectsV2Command({ Bucket: e.R2_BUCKET, Prefix: prefixo, ContinuationToken: token }));
    for (const o of r.Contents ?? []) chaves.add(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return chaves;
}

const resB = await fetch(`${storage}/bucket`, { headers: cabecalhos });
if (!resB.ok) throw new Error(`Storage (baldes): ${resB.status} ${await resB.text()}`);
const baldes = (await resB.json()).map((b) => b.name);
let novos = 0;
let bytes = 0;
for (const balde of baldes) {
  const [noStorage, noR2] = await Promise.all([listarStorage(balde), chavesNoR2(`arquivos/${balde}/`)]);
  const faltando = noStorage.filter((a) => !noR2.has(`arquivos/${balde}/${a.caminho}`));
  for (const a of faltando) {
    const r = await fetch(`${storage}/object/${balde}/${a.caminho.split("/").map(encodeURIComponent).join("/")}`, { headers: cabecalhos });
    if (!r.ok) {
      console.warn(`não baixou ${balde}/${a.caminho}: ${r.status}`);
      continue;
    }
    const corpo = Buffer.from(await r.arrayBuffer());
    await enviar(`arquivos/${balde}/${a.caminho}`, corpo, a.tipo);
    novos += 1;
    bytes += corpo.length;
  }
  console.log(`${balde}: ${noStorage.length} arquivo(s), ${faltando.length} novo(s)`);
}
console.log(`arquivos novos copiados: ${novos} (${mb(bytes)})`);

rmSync(temp, { recursive: true, force: true });
console.log(`cópia de ${hoje} concluída`);
