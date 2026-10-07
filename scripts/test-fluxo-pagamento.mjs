import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url), cache = new Map();
function carregar(arquivo) {
  const absoluto = path.resolve(arquivo);
  if (cache.has(absoluto)) return cache.get(absoluto);
  const modulo = { exports: {} }; cache.set(absoluto, modulo.exports);
  const codigo = ts.transpileModule(fs.readFileSync(absoluto, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const importar = (nome) => {
    if (nome === "server-only") return {};
    if (!nome.startsWith(".") && !nome.startsWith("@/")) return require(nome);
    const base = nome.startsWith("@/") ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(absoluto), nome);
    return carregar([base, `${base}.ts`, `${base}.tsx`].find(fs.existsSync));
  };
  new Function("require", "module", "exports", codigo)(importar, modulo, modulo.exports);
  return modulo.exports;
}
// Sem .env.local, sem rede, sem banco real e sem dados de clientes reais.
process.env.COBRANCA_CHAVE = "ab".repeat(32);
process.env.ASAAS_AMBIENTE = "teste";
delete process.env.ASAAS_CARTEIRA_NORTEARQ;
const { planejarCobrancas } = carregar("lib/condicoes-pagamento.ts");
const { prepararCobrancasContrato, cifrar } = carregar("lib/cobranca.ts");
const condicoes = [
  { descricao: "Entrada, na assinatura do contrato", valor: 300 },
  ...Array.from({ length: 4 }, (_, i) => ({ descricao: `Parcela ${i + 1} de 4 (mensal)`, valor: 175 })),
];
const linhas = () => condicoes.map((p, i) => ({ ...p, id: `parcela-${i}`, escritorio_id: "escritorio-teste", contrato_id: "contrato-teste",
  vencimento: `2027-${String(i + 1).padStart(2, "0")}-07`, pago_em: null, asaas_cobranca_id: null, asaas_link: null, asaas_parcelamento_id: null }));
assert.equal(planejarCobrancas(linhas(), "cartao", true, "2026-10-07").length, 2);
for (const meio of ["pix", "boleto"]) assert.equal(planejarCobrancas(linhas(), meio, true, "2026-10-07").length, 5);
assert.equal(planejarCobrancas(linhas(), "cartao", false, "2026-10-07").length, 5);
assert.throws(() => planejarCobrancas(linhas().map((p, i) => ({ ...p, pago_em: i === 2 ? "2026-10-07" : null })), "cartao", true, "2026-10-07"), /já tem pagamentos/);
assert.throws(() => planejarCobrancas(linhas().map((p) => ({ ...p, valor: 1 })), "cartao", true, "2026-10-07"), /R\$ 5/);
assert.throws(() => planejarCobrancas(linhas().map((p, i) => ({ ...p, valor: i === 2 ? 170 : p.valor })), "cartao", true, "2026-10-07"), /valores diferentes/);
const centavos = Array.from({ length: 3 }, (_, i) => ({ ...linhas()[1], id: `c${i}`, valor: i === 2 ? 33.34 : 33.33 }));
assert.equal(planejarCobrancas(centavos, "cartao", true, "2026-10-07")[0].parcelas.length, 3);

function ambiente(meio = "cartao", opcoes = {}) {
  const parcelas = opcoes.cartaoTotal ? Array.from({length:4},(_,i)=>({descricao:`Parcela ${i+1} de 4 (mensal)`,valor:250})) : condicoes;
  const tabelas = {
    contratos: [{ id: "contrato-teste", status: opcoes.status ?? "assinado", escritorio_id: "escritorio-teste",
      proposta: { meio_escolhido: meio, modo_pagamento: "parcelado", avista: false, parcelas, cartao_valor_total: !!opcoes.cartaoTotal },
      cliente: { id: "cliente-teste", nome: "Cliente Teste", documento: "52998224725", email: null, telefone: null },
      escritorio: { nome: "Escritório Teste", cobranca_ativa: true } }],
    pagamentos: opcoes.cartaoTotal ? parcelas.map((p,i)=>({...linhas()[i],...p})) : linhas(), cobranca_credenciais: [{ escritorio_id: "escritorio-teste", chave_cifrada: cifrar("$aact_hmlg_teste_falso"), carteira_id: "wallet-teste" }],
    cobranca_preparos: [], cobranca_solicitacoes: [],
  };
  let falhouSave = false;
  let saves = 0;
  const admin = {
    async rpc(nome, args) {
      if (nome === "baixa_automatica") { tabelas.pagamentos.find((p) => p.id === args.p_pagamento).pago_em = "2026-10-07"; return { data: null, error: null }; }
      assert.equal(nome, "iniciar_preparo_cobranca");
      if (tabelas.cobranca_preparos.length) return { data: false, error: null };
      tabelas.cobranca_preparos.push({ contrato_id: args.p_contrato, dono: args.p_dono }); return { data: true, error: null };
    },
    from(tabela) {
      let filtros = [], acao = "select", dados, unico = false;
      const q = {
        select() { return q; }, order() { return q; }, eq(k, v) { filtros.push((r) => r[k] === v); return q; },
        single() { unico = true; return q; }, maybeSingle() { unico = true; return q; },
        update(v) { acao = "update"; dados = v; return q; }, delete() { acao = "delete"; return q; }, insert(v) { acao = "insert"; dados = v; return q; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            const rows = tabelas[tabela].filter((r) => filtros.every((f) => f(r)));
            if (acao === "insert") {
              if (tabela === "cobranca_solicitacoes" && tabelas[tabela].some((r) => r.referencia === dados.referencia)) return { data: null, error: { code: "23505" } };
              tabelas[tabela].push({ ...dados });
            }
            if (acao === "update") {
              if (tabela === "pagamentos" && (++saves === (opcoes.falharSaveEm ?? 1)) && (opcoes.falharSave || opcoes.falharSaveEm) && !falhouSave) { falhouSave = true; return { data: null, error: { message: "Falha simulada" } }; }
              rows.forEach((r) => Object.assign(r, dados));
            }
            if (acao === "delete") tabelas[tabela] = tabelas[tabela].filter((r) => !rows.includes(r));
            return { data: unico ? rows[0] ?? null : rows, error: null };
          }).then(resolve, reject);
        },
      }; return q;
    },
  };
  const chamadas = [], provider = [];
  let tentouTimeout = false;
  globalThis.fetch = async (url, init) => {
    assert.ok(url.startsWith("https://api-sandbox.asaas.com/v3/"));
    assert.equal(init.headers.access_token, "$aact_hmlg_teste_falso");
    const u = new URL(url), metodo = init.method ?? "GET";
    chamadas.push({ caminho: u.pathname, metodo, body: init.body && JSON.parse(init.body) });
    if (u.pathname.endsWith("/customers")) return Response.json({ data: [{ id: "cus-teste" }] });
    if (metodo === "POST") {
      const d = JSON.parse(init.body);
      assert.ok(!("creditCard" in d));
      if (opcoes.timeout && !tentouTimeout) { tentouTimeout = true; throw new Error("Timeout simulado"); }
      const n = d.installmentCount ?? 1, total = Math.round((d.totalValue ?? d.value) * 100), base = Math.floor(total / n);
      const installment = n > 1 ? `inst-${provider.length}` : null;
      const novos = Array.from({ length: n }, (_, i) => ({ id: `pay-${provider.length + i}`, invoiceUrl: `https://pagamento-teste.invalid/${provider.length + i}`,
        status: opcoes.confirmado ? "CONFIRMED" : "PENDING", value: (i === n - 1 ? total - base * i : base) / 100, dueDate: `2027-${i + 1}-07`, installment, installmentNumber: i + 1,
        billingType: d.billingType, externalReference: d.externalReference }));
      provider.push(...novos); return Response.json(novos[0]);
    }
    if (u.pathname.includes("/installments/")) return Response.json({ data: provider.filter((p) => p.installment === u.pathname.split("/")[3]) });
    if (u.searchParams.has("externalReference")) return Response.json({ data: provider.filter((p) => p.externalReference === u.searchParams.get("externalReference")) });
    return Response.json(provider.find((p) => p.id === u.pathname.split("/").at(-1)));
  };
  return { admin, tabelas, chamadas, provider };
}
for (const [meio, posts, billingType] of [["cartao", 2, "CREDIT_CARD"], ["pix", 5, "PIX"], ["boleto", 5, "BOLETO"]]) {
  const a = ambiente(meio);
  assert.deepEqual(await prepararCobrancasContrato(a.admin, "contrato-teste"), { ok: true });
  const criacoes = a.chamadas.filter((c) => c.metodo === "POST");
  assert.equal(criacoes.length, posts);
  assert.ok(criacoes.every((c) => c.body.billingType === billingType));
  if (meio === "cartao") { assert.equal(criacoes[0].body.value, 300); assert.equal(criacoes[1].body.totalValue, 700); assert.equal(criacoes[1].body.installmentCount, 4); }
  assert.deepEqual(await prepararCobrancasContrato(a.admin, "contrato-teste"), { ok: true });
  assert.equal(a.chamadas.filter((c) => c.metodo === "POST").length, posts);
  assert.ok(a.tabelas.pagamentos.every((p) => p.asaas_cobranca_id && p.asaas_link));
}
{
  const a = ambiente("cartao", { falharSave: true });
  assert.match((await prepararCobrancasContrato(a.admin, "contrato-teste")).erro, /não foi salvo/);
  assert.deepEqual(await prepararCobrancasContrato(a.admin, "contrato-teste"), { ok: true });
  assert.equal(a.chamadas.filter((c) => c.metodo === "POST").length, 2);
}
{
  const a = ambiente("pix", { timeout: true });
  assert.match((await prepararCobrancasContrato(a.admin, "contrato-teste")).erro, /demorou/);
  assert.match((await prepararCobrancasContrato(a.admin, "contrato-teste")).erro, /já foi enviada/);
  assert.equal(a.chamadas.filter((c) => c.metodo === "POST").length, 1);
}
{
  const a = ambiente("cartao");
  const resultados = await Promise.all([prepararCobrancasContrato(a.admin, "contrato-teste"), prepararCobrancasContrato(a.admin, "contrato-teste")]);
  assert.equal(resultados.filter((r) => r.ok).length, 1);
  assert.equal(a.chamadas.filter((c) => c.metodo === "POST").length, 2);
}
{
  const a = ambiente("pix", { status: "aguardando_assinatura" });
  assert.match((await prepararCobrancasContrato(a.admin, "contrato-teste")).erro, /Assine/);
  assert.equal(a.chamadas.length, 0);
}
{
  const a = ambiente("cartao", { confirmado: true });
  assert.deepEqual(await prepararCobrancasContrato(a.admin, "contrato-teste"), { ok: true });
  assert.ok(a.tabelas.pagamentos.every((p) => p.pago_em));
}
{
  const a = ambiente("cartao", { confirmado: true, falharSaveEm: 3 });
  assert.match((await prepararCobrancasContrato(a.admin, "contrato-teste")).erro, /não foi salvo/);
  assert.deepEqual(await prepararCobrancasContrato(a.admin, "contrato-teste"), { ok: true });
  assert.equal(a.chamadas.filter((c) => c.metodo === "POST").length, 2);
  assert.ok(a.tabelas.pagamentos.every((p) => p.pago_em));
}
{
  const a=ambiente("cartao",{cartaoTotal:true});
  assert.deepEqual(await prepararCobrancasContrato(a.admin,"contrato-teste"),{ok:true});
  const posts=a.chamadas.filter(c=>c.metodo==="POST");
  assert.equal(posts.length,1); assert.equal(posts[0].body.totalValue,1000); assert.equal(posts[0].body.installmentCount,4);
  assert.ok(a.tabelas.pagamentos.every(p=>p.valor===250&&p.asaas_parcelamento_id));
}
console.log("OK: cartão com valor total sem entrada, contratos antigos, Pix, boleto, centavos, assinatura, concorrência e recuperação sem duplicação.");
