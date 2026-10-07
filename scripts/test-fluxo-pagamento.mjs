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
const { prepararCobrancasContrato, gerarCobranca, cifrar } = carregar("lib/cobranca.ts");
const { processarEventoCheckout } = carregar("lib/checkout-eventos.ts");
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
  const parcelas = opcoes.cartaoAsaas ? [{descricao:"Valor total no cartão",valor:1000}] : opcoes.cartaoTotal ? Array.from({length:4},(_,i)=>({descricao:`Parcela ${i+1} de 4 (mensal)`,valor:250})) : condicoes;
  const tabelas = {
    contratos: [{ id: "contrato-teste", status: opcoes.status ?? "assinado", escritorio_id: "escritorio-teste",
      proposta: { meio_escolhido: meio, modo_pagamento: "parcelado", avista: false, parcelas, cartao_valor_total: !!opcoes.cartaoTotal, cartao_no_asaas: !!opcoes.cartaoAsaas },
      cliente: { id: "cliente-teste", nome: "Cliente Teste", documento: "52998224725", email: null, telefone: null },
      escritorio: { nome: "Escritório Teste", cobranca_ativa: true } }],
    pagamentos: opcoes.cartaoTotal || opcoes.cartaoAsaas ? parcelas.map((p,i)=>({...linhas()[i],...p})) : linhas(), cobranca_credenciais: [{ escritorio_id: "escritorio-teste", chave_cifrada: cifrar("$aact_hmlg_teste_falso"), carteira_id: "wallet-teste",webhook_id:"webhook-teste" }],
    cobranca_preparos: [], cobranca_solicitacoes: [],
    cobranca_checkout_sessoes: [], notificacoes: [], escritorios:[{id:"escritorio-teste",cobranca_ambiente:"teste"}],
    links_cliente:[{referencia_id:"contrato-teste",destino:"contrato",escritorio_id:"escritorio-teste",token:"a".repeat(48),expira_em:"2099-01-01"}],
  };
  let falhouSave = false;
  let saves = 0;
  let registrarFalhou = false;
  const admin = {
    async rpc(nome, args) {
      if(nome==="registrar_checkout") {
        if(opcoes.falharRegistrar&&!registrarFalhou){registrarFalhou=true;return{data:null,error:{message:"Falha simulada"}};}
        const s=tabelas.cobranca_checkout_sessoes.find(s=>s.id===args.p_sessao&&s.escritorio_id===args.p_escritorio);
        if(!s||s.valor!==args.p_total)return{data:null,error:{message:"Não corresponde"}};
        const pg=tabelas.pagamentos.find(p=>p.id===s.pagamento_id),novo=!pg.pago_em&&args.p_estado==="PAID";
        if(s.estado==="PAID")return{data:{novo_pagamento:false},error:null};
        Object.assign(s,{estado:args.p_estado,asaas_id:args.p_asaas,link:args.p_link});
        Object.assign(pg,{asaas_checkout_id:args.p_asaas,asaas_link:["EXPIRED","CANCELED"].includes(args.p_estado)?null:args.p_link,asaas_status:args.p_estado});
        if(novo)pg.pago_em="2026-10-07";
        return{data:{novo_pagamento:novo,valor:pg.valor,contrato_id:pg.contrato_id},error:null};
      }
      if (nome === "baixa_automatica") { tabelas.pagamentos.find((p) => p.id === args.p_pagamento).pago_em = "2026-10-07"; return { data: null, error: null }; }
      assert.equal(nome, "iniciar_preparo_cobranca");
      if (tabelas.cobranca_preparos.length) return { data: false, error: null };
      tabelas.cobranca_preparos.push({ contrato_id: args.p_contrato, dono: args.p_dono }); return { data: true, error: null };
    },
    from(tabela) {
      let filtros = [], acao = "select", dados, unico = false, ordem, asc = true, limite;
      const q = {
        select() { return q; }, order(k, op={}) { ordem=k;asc=op.ascending!==false;return q; }, limit(n) {limite=n;return q;}, gt(k,v){filtros.push(r=>r[k]>v);return q;}, eq(k, v) { filtros.push((r) => r[k] === v); return q; },
        single() { unico = true; return q; }, maybeSingle() { unico = true; return q; },
        update(v) { acao = "update"; dados = v; return q; }, delete() { acao = "delete"; return q; }, insert(v) { acao = "insert"; dados = v; return q; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            let rows = tabelas[tabela].filter((r) => filtros.every((f) => f(r)));
            if(ordem)rows.sort((a,b)=>String(a[ordem]??"").localeCompare(String(b[ordem]??""))*(asc?1:-1));
            if(limite)rows=rows.slice(0,limite);
            if (acao === "insert") {
              if (tabela === "cobranca_solicitacoes" && tabelas[tabela].some((r) => r.referencia === dados.referencia)) return { data: null, error: { code: "23505" } };
              tabelas[tabela].push({estado:"SOLICITADO",criado_em:new Date(Date.now()+tabelas[tabela].length).toISOString(),...dados });
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
    if(u.pathname.includes("/webhooks/"))return Response.json({enabled:true,interrupted:false,events:["PAYMENT_CONFIRMED"]});
    if(u.pathname.endsWith("/checkouts")){
      assert.equal(metodo,"POST");const d=JSON.parse(init.body);
      assert.deepEqual(d.billingTypes,["CREDIT_CARD"]);assert.equal(d.items[0].value,1000);
      assert.ok(!("installmentCount" in d));assert.ok(!("creditCard" in d));
      assert.ok(d.installment.maxInstallmentCount>4);assert.deepEqual(d.chargeTypes,["DETACHED","INSTALLMENT"]);
      if(opcoes.timeout&&!tentouTimeout){tentouTimeout=true;throw new Error("Timeout simulado");}
      return Response.json({id:`checkout-teste-${chamadas.filter(c=>c.metodo==="POST").length}`,status:"ACTIVE"});
    }
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
{
  const a = ambiente("pix", { status: "cancelado" });
  a.tabelas.pagamentos[0].contrato = a.tabelas.contratos[0];
  a.tabelas.pagamentos[0].asaas_link = "https://pagamento-teste.invalid/antigo";
  assert.match((await gerarCobranca(a.admin, a.tabelas.pagamentos[0].id)).erro, /não está ativo/);
  assert.equal(a.chamadas.length, 0);
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
for(const opcoes of [{},{timeout:true},{falharRegistrar:true}]){
  const a=ambiente("cartao",{cartaoAsaas:true,...opcoes});
  const r=await prepararCobrancasContrato(a.admin,"contrato-teste");
  if(opcoes.timeout||opcoes.falharRegistrar)assert.ok(r.erro);else assert.deepEqual(r,{ok:true});
  const post=a.chamadas.find(c=>c.caminho.endsWith("/checkouts"));
  assert.ok(post);assert.equal(a.chamadas.filter(c=>c.caminho.endsWith("/payments")).length,0);
  if(opcoes.timeout){
    assert.match((await prepararCobrancasContrato(a.admin,"contrato-teste")).erro,/solicitação estiver pendente/);
    assert.equal(a.chamadas.filter(c=>c.caminho.endsWith("/checkouts")).length,1);
  }
  const evento={event:"CHECKOUT_CREATED",checkout:{id:"checkout-teste-1",externalReference:post.body.externalReference,items:post.body.items}};
  assert.deepEqual(await processarEventoCheckout(a.admin,"escritorio-teste",evento),{ok:true});
  assert.ok(a.tabelas.pagamentos[0].asaas_link);assert.equal(a.tabelas.pagamentos[0].pago_em,null);
  assert.deepEqual(await prepararCobrancasContrato(a.admin,"contrato-teste"),{ok:true});
  assert.equal(a.chamadas.filter(c=>c.caminho.endsWith("/checkouts")).length,1);
  assert.ok((await processarEventoCheckout(a.admin,"escritorio-teste",{...evento,event:"CHECKOUT_PAID",checkout:{...evento.checkout,items:[{quantity:1,value:999}]}})).erro);
  assert.deepEqual(await processarEventoCheckout(a.admin,"outro-escritorio",{...evento,event:"CHECKOUT_PAID"}),{ok:true});
  assert.equal(a.tabelas.pagamentos[0].pago_em,null);
  assert.deepEqual(await processarEventoCheckout(a.admin,"escritorio-teste",{...evento,event:"CHECKOUT_PAID"}),{ok:true});
  assert.deepEqual(await processarEventoCheckout(a.admin,"escritorio-teste",{...evento,event:"CHECKOUT_PAID"}),{ok:true});
  assert.equal(a.tabelas.notificacoes.length,1);
}
{
  const a=ambiente("cartao",{cartaoAsaas:true});await prepararCobrancasContrato(a.admin,"contrato-teste");
  const post=a.chamadas.find(c=>c.caminho.endsWith("/checkouts"));
  await processarEventoCheckout(a.admin,"escritorio-teste",{event:"CHECKOUT_EXPIRED",checkout:{id:"checkout-teste-1",externalReference:post.body.externalReference,items:post.body.items}});
  assert.equal(a.tabelas.pagamentos[0].asaas_link,null);
  assert.deepEqual(await prepararCobrancasContrato(a.admin,"contrato-teste"),{ok:true});
  assert.equal(a.chamadas.filter(c=>c.caminho.endsWith("/checkouts")).length,2);
}
console.log("OK: cartão escolhido no Asaas, webhook, isolamento de escritórios, expiração, timeout, recuperação, contratos anteriores, Pix e boleto.");
