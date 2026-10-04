// Vídeo e prints da landing (public/landing/), sempre com um escritório de DEMONSTRAÇÃO, nunca com dados reais.
// Ordem: node montar-demo.mjs → node gravar.mjs (cel | video) → node quiz.mjs → apagar-demo.mjs.
// Rodar numa pasta com "npm i playwright"; o vídeo é montado com ffmpeg (corte dos trechos + transição suave).
// apagar-demo.mjs pode esbarrar na trava do histórico de pagamentos: desligar o gatilho só dentro da transação.
// Monta o escritório "Estúdio Aurora Arquitetura" usando as funções do próprio sistema. Grava os dados em dados-demo.json.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const projeto = "C:/Users/Usuário/Desktop/Marketing Digital/app - arquitetura/nortearq/";
const require = createRequire(projeto + "package.json");
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(projeto + ".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const ok = (r, o) => { if (r.error) throw new Error(o + ": " + r.error.message); return r.data; };

const email = `demo.landing.${Date.now()}@nortearq.com.br`;
const senha = "Teste-" + Math.random().toString(36).slice(2) + "A9!";
const u = ok(await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { tipo: "arquiteto", nome: "Helena Duarte", escritorio: "Estúdio Aurora Arquitetura", whatsapp: "21999990000" } }), "usuário");
const m = ok(await admin.from("membros").select("escritorio_id").eq("id", u.user.id).single(), "membro");
const esc = m.escritorio_id;
ok(await admin.from("escritorios").update({
  onboarding_concluido_em: new Date().toISOString(), documento: "12345678000195", endereco: "Rua das Flores, 100, Niterói/RJ",
  responsavel: "Helena Duarte", registro_profissional: "CAU A000000-0", faixa_preco_min: 8000, faixa_preco_max: 80000,
  pix_tipo: "email", pix_chave: "pix@nortearq.com.br", pix_nome: "Estudio Aurora", pix_cidade: "Niteroi",
}).eq("id", esc), "escritório");
const { data: slugRow } = await admin.from("escritorios").select("slug").eq("id", esc).single();

// Arquiteto logado (as funções do sistema conferem quem é).
const arq = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
ok(await arq.auth.signInWithPassword({ email, password: senha }), "login");
const servicos = ok(await arq.from("servicos").select("id, nome").order("ordem"), "serviços");
const cli = ok(await arq.from("clientes").insert({ escritorio_id: esc, nome: "Mariana Souza", telefone: "21988887777", email: "mariana@exemplo.com", documento: "52998224725", endereco_imovel: "Av. Atlântica, 2000, apto 501, Rio de Janeiro/RJ", servicos: [servicos[1].id] }).select("id").single(), "cliente");
const cli2 = ok(await arq.from("clientes").insert({ escritorio_id: esc, nome: "Rafael Lima", telefone: "21977776666", email: "rafael@exemplo.com", servicos: [servicos[0].id] }).select("id").single(), "cliente 2");

const itens = [{ servico: "Interiores", escopo: "Projeto de interiores da sala, cozinha e dois quartos.", entregaveis: ["Planta de layout", "Projeto 3D", "Detalhamento de marcenaria"] }];
const base = { escritorio_id: esc, cliente_id: cli.id, titulo: "Interiores do apartamento", escopo: "Proposta para o apartamento da Av. Atlântica.", itens, valor_total: 18000, modo_pagamento: "manual", parcelas: [{ descricao: "Entrada, na assinatura do contrato", valor: 5400 }, { descricao: "Na entrega do anteprojeto", valor: 6300 }, { descricao: "Na entrega do projeto executivo", valor: 6300 }], prazo: "60 dias úteis após a validação do briefing", revisoes_incluidas: 2, visitas_incluidas: 3 };
const aprovada = ok(await admin.from("propostas").insert({ ...base, status: "aprovada", enviada_em: new Date(Date.now() - 5 * 864e5).toISOString(), respondida_em: new Date(Date.now() - 2 * 864e5).toISOString(), validade_ate: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10) }).select("id").single(), "proposta aprovada");
const rascunho = ok(await arq.from("propostas").insert({ escritorio_id: esc, cliente_id: cli2.id, titulo: "Reforma da casa", itens: [{ servico: "Arquitetura", escopo: "", entregaveis: [] }], modo_pagamento: "parcelado", entrada_pct: 30, parcelas_max: 6 }).select("id").single(), "rascunho");

const contratoId = ok(await arq.rpc("gerar_contrato", { p_proposta: aprovada.id }), "gerar contrato");
const tokenContrato = ok(await arq.rpc("enviar_contrato", { p_contrato: contratoId }), "enviar contrato");
const anon = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
ok(await anon.rpc("assinar_contrato", { p_token: tokenContrato, p_nome: "Mariana Souza", p_documento: "52998224725", p_endereco: "Av. Atlântica, 2000, apto 501, Rio de Janeiro/RJ", p_ip: "127.0.0.1", p_navegador: "teste" }), "assinar");
const projetoRow = ok(await arq.from("projetos").select("id").eq("contrato_id", contratoId).single(), "projeto");
const tokenProjeto = ok(await arq.rpc("link_do_projeto", { p_projeto: projetoRow.id }), "link projeto");
ok(await arq.rpc("preparar_briefing", { p_cliente_id: cli.id }), "briefing");
const tokenBriefing = ok(await arq.rpc("criar_link_cliente", { p_cliente_id: cli.id, p_destino: "briefing" }), "link briefing");
// Segundo contrato em rascunho com uma lacuna (para ver a caixa amarela).
const aprov2 = ok(await admin.from("propostas").insert({ ...base, cliente_id: cli2.id, titulo: "Reforma da cobertura", status: "aprovada", respondida_em: new Date().toISOString() }).select("id").single(), "proposta 2");
const contrato2 = ok(await arq.rpc("gerar_contrato", { p_proposta: aprov2.id }), "contrato 2");
await admin.from("clientes").update({ email: null }).eq("id", cli2.id);
// Proposta enviada (para o link do cliente).
const enviada = ok(await admin.from("propostas").insert({ ...base, cliente_id: cli2.id, titulo: "Reforma da casa de praia", modo_pagamento: "parcelado", parcelas: [], entrada_pct: 30, parcelas_max: 6, desconto_avista_pct: 5 }).select("id").single(), "proposta enviada");
const tokenProposta = ok(await arq.rpc("enviar_proposta", { p_proposta: enviada.id }), "enviar proposta");

const dados = { email, senha, esc, slug: slugRow.slug, userId: u.user.id, cliente: cli.id, cliente2: cli2.id, proposta: aprovada.id, rascunho: rascunho.id, enviada: enviada.id, contrato: contratoId, contrato2, projeto: projetoRow.id, tokenProjeto, tokenBriefing, tokenProposta, tokenContrato };
writeFileSync("dados-demo.json", JSON.stringify(dados, null, 2));
// Briefing respondido: estilos curtidos, ambientes e respostas de texto.
const br = ok(await admin.from("briefings").select("perguntas, estilos").eq("cliente_id", cli.id).single(), "briefing");
console.log("tipos de pergunta:", [...new Set(br.perguntas.map((p) => p.tipo))].join(", "));
const ambientes = [...new Set(br.perguntas.map((p) => p.ambiente).filter(Boolean))].slice(0, 4);
const respostas = {};
for (const p of br.perguntas) {
  if (p.ambiente && !ambientes.includes(p.ambiente)) continue;
  if (p.tipo === "texto" || p.tipo === "texto_longo") respostas[p.id] = "Quero um ambiente claro, acolhedor e fácil de manter, com madeira natural e boa iluminação.";
  else if ((p.tipo === "escolha" || p.tipo === "unica") && p.opcoes?.length) respostas[p.id] = p.opcoes[0].valor ?? p.opcoes[0];
  else if ((p.tipo === "multipla" || p.tipo === "multipla_escolha") && p.opcoes?.length) respostas[p.id] = p.opcoes.slice(0, 2).map((o) => o.valor ?? o);
}
const porEstilo = {};
for (const e of br.estilos) (porEstilo[e.estilo] ??= []).push(e.id);
const nomes = Object.keys(porEstilo);
const curtidos = [...(porEstilo[nomes[0]] ?? []), ...(porEstilo[nomes[1]] ?? []).slice(0, 1)];
const rejeitados = nomes.slice(2).flatMap((n) => porEstilo[n].slice(0, 1));
ok(await anon.rpc("salvar_briefing", { p_token: tokenBriefing, p_respostas: respostas, p_ambientes: ambientes, p_curtidos: curtidos, p_rejeitados: rejeitados }), "salvar briefing");
ok(await anon.rpc("enviar_briefing", { p_token: tokenBriefing }), "enviar briefing");

// Projeto: entrada paga por Pix; 1ª etapa com uma revisão pedida e depois aprovada.
const pg = ok(await arq.from("pagamentos").select("id").eq("contrato_id", contratoId).order("ordem").limit(1).single(), "pagamento");
const rp = await arq.rpc("registrar_pagamento", { p_pagamento: pg.id, p_data: new Date().toISOString().slice(0, 10), p_forma: "pix", p_observacao: null });
if (rp.error) console.log("aviso pagamento:", rp.error.message);
const et = ok(await admin.from("etapas").select("id").eq("projeto_id", projetoRow.id).order("ordem").limit(2), "etapas");
for (const [decisao, comentario] of [["revisao_pedida", "Podemos trocar o sofá de lugar e abrir mais a passagem para a varanda?"], ["aprovada", null]]) {
  ok(await admin.from("etapas").update({ status: "aguardando_aprovacao", enviada_em: new Date().toISOString() }).eq("id", et[0].id), "etapa aguardando");
  ok(await anon.rpc("responder_etapa", { p_token: tokenProjeto, p_etapa: et[0].id, p_decisao: decisao, p_comentario: comentario, p_ip: "127.0.0.1" }), "responder etapa");
}
ok(await admin.from("etapas").update({ status: "em_andamento" }).eq("id", et[1].id), "etapa 2");
console.log("escritório de demonstração montado:", slugRow.slug);
