import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
// Executa as mesmas funções TypeScript usadas nos formulários, sem depender de um navegador.
function carregar(arquivo) {
  const absoluto = path.resolve(arquivo);
  if (cache.has(absoluto)) return cache.get(absoluto);
  const modulo = { exports: {} };
  cache.set(absoluto, modulo.exports);
  const codigo = ts.transpileModule(fs.readFileSync(absoluto, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const importar = (nome) => {
    if (!nome.startsWith(".") && !nome.startsWith("@/")) return require(nome);
    const base = nome.startsWith("@/") ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(absoluto), nome);
    const destino = [base, `${base}.ts`, `${base}.tsx`].find((p) => fs.existsSync(p));
    return carregar(destino);
  };
  new Function("require", "module", "exports", codigo)(importar, modulo, modulo.exports);
  return modulo.exports;
}

const { lerNumero, dataValida, somarMesesCalendario } = carregar("lib/formatacao.ts");
const { mascaraDocumento, mascaraDinheiro, finalizarDinheiro, mascaraTelefone } = carregar("lib/mascaras.ts");
const { documentoValido, formatarDocumento, normalizarDocumento, paraEtiquetas, paraCampos, etiquetasDesconhecidas, CAMPOS_CONTRATO, previaDoModelo } = carregar("lib/contratos.ts");

// Etiquetas do contrato: {{campo}} no banco, [Etiqueta] na tela, ida e volta sem perder nada.
const modeloTeste = "CONTRATANTE: {{cliente.nome}}, CPF {{cliente.documento}}. Valor {{proposta.valor_total}} em {{data}}. [a preencher]";
assert.equal(paraEtiquetas(modeloTeste), "CONTRATANTE: [Nome do cliente], CPF [CPF ou CNPJ do cliente]. Valor [Valor total] em [Data do aceite]. [a preencher]");
assert.equal(paraCampos(paraEtiquetas(modeloTeste)), modeloTeste);
const todos = CAMPOS_CONTRATO.map((c) => c.campo).join(" ");
assert.equal(paraCampos(paraEtiquetas(todos)), todos);
assert.equal(paraCampos("[nome do  CLIENTE] [CPF do cliente] [Endereco do imovel] [CAU]"), "{{cliente.nome}} {{cliente.documento}} {{cliente.endereco}} {{escritorio.registro}}");
assert.deepEqual(etiquetasDesconhecidas("[Nome do clinte] [Nome do cliente] [a preencher] [ ] [1]"), ["Nome do clinte"]);
assert.equal(paraCampos("[Nome do clinte]"), "[Nome do clinte]");
const previa = previaDoModelo("A {{cliente.nome}} B {{escritorio.registro}} C {{proposta.forma_pagamento}}", { nome: "Esc", documento: null, endereco: null, responsavel: null, registro_profissional: null });
assert.deepEqual(previa.map((t) => t.texto), ["A ", "Mariana Souza", " B ", "falta preencher", " C "]);
assert.ok(previa[3].falta && previa[1].automatico && !previa[0].automatico);
const { lerReais, dataCurta } = carregar("lib/propostas.ts");
const { normalizarChave } = carregar("lib/pix.ts");
const { InputMascara } = carregar("components/InputMascara.tsx");

for (const [texto, esperado] of [
  ["", null], ["1500", 1500], ["1.500", 1500], ["1.500,50", 1500.5],
  ["R$ 1.500,50", 1500.5], ["1500.50", 1500.5], ["1,50", 1.5],
  ["0,01", 0.01], ["0", 0], ["1.234.567,89", 1234567.89], ["1500,", 1500],
]) assert.equal(lerNumero(texto), esperado, texto);
for (const texto of ["abc", "1e3", "1,2,3", "1.23.4", "R$", "1,234", "Infinity"])
  assert.ok(Number.isNaN(lerNumero(texto)), texto);
assert.equal(lerReais("1500.50"), 1500.5);
assert.equal(lerReais("abc"), null);

for (const data of ["2024-02-29", "2000-02-29", "2026-10-07"]) assert.ok(dataValida(data));
for (const data of ["2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "07/10/2026", "0000-01-01"])
  assert.equal(dataValida(data), false, data);
assert.equal(dataCurta("2026-10-07"), "07/10/2026");
assert.equal(dataCurta("2026-10-07T01:00:00Z"), "06/10/2026");
assert.equal(dataCurta("2026-02-31"), "\u2014");
assert.equal(somarMesesCalendario("2026-01-31", 1), "2026-02-28");
assert.equal(somarMesesCalendario("2024-01-31", 1), "2024-02-29");
assert.equal(somarMesesCalendario("2026-12-07", 1), "2027-01-07");

const cpf = "52998224725", cnpj = "11222333000181";
assert.equal(mascaraDocumento("1234"), "123.4");
assert.equal(mascaraDocumento(cpf), "529.982.247-25");
assert.equal(mascaraDocumento(cnpj), "11.222.333/0001-81");
for (const d of [cpf, cnpj, mascaraDocumento(cpf), mascaraDocumento(cnpj)]) assert.ok(documentoValido(d));
for (const d of ["11111111111", "00000000000000", "52998224724", "11222333000182", `abc${cpf}`, "1234567890A"]) assert.equal(documentoValido(d), false);
assert.equal(normalizarChave("cpf", "111.111.111-11"), null);
assert.equal(normalizarChave("cpf", mascaraDocumento(cpf)), cpf);

// CNPJ alfanumérico (exemplo oficial da Receita: 12.ABC.345/01DE-35).
const alfa = "12ABC34501DE35";
for (const d of [alfa, "12.ABC.345/01DE-35", "12abc34501de35"]) assert.ok(documentoValido(d), d);
for (const d of ["12ABC34501DE36", "12ABC34501DEAB", "AAAAAAAAAAAAAA"]) assert.equal(documentoValido(d), false, d);
assert.equal(mascaraDocumento("12abc34501de35"), "12.ABC.345/01DE-35");
assert.equal(mascaraDocumento("12A"), "12.A");
assert.equal(formatarDocumento(alfa), "12.ABC.345/01DE-35");
assert.equal(formatarDocumento(cnpj), "11.222.333/0001-81");
assert.equal(normalizarDocumento("12.abc.345/01de-35"), alfa);
assert.equal(normalizarChave("cnpj", "12.ABC.345/01DE-35"), alfa);
assert.equal(normalizarChave("cpf", alfa), null);
assert.equal(mascaraTelefone("11912345678"), "(11) 91234-5678");

let digitado = "";
for (const c of "1500,50") digitado = mascaraDinheiro(digitado + c);
assert.equal(digitado, "1.500,50");
for (const esperado of ["1.500,5", "1.500,", "1.500", "150", "15", "1", ""]){
  digitado = mascaraDinheiro(digitado.slice(0, -1), false);
  assert.equal(digitado, esperado);
}
assert.equal(mascaraDinheiro("0,01"), "0,01");
for (const entrada of ["7900", "7.900", "7900.00", "7.900,00", "R$ 7.900,00"]) {
  assert.equal(finalizarDinheiro(entrada), "7.900,00", entrada);
  assert.equal(lerReais(mascaraDinheiro(entrada)), 7900, entrada);
}
assert.equal(mascaraDinheiro("7.900.00"), "7.900,00");
assert.equal(finalizarDinheiro("7900,5"), "7.900,50");
assert.equal(finalizarDinheiro(""), "");
assert.equal(InputMascara({ mascara: "dinheiro", defaultValue: 7900 }).props.defaultValue, "7.900,00");
// A vírgula e os centavos devem ficar depois do cursor ao inserir a separação de milhares.
let recebido;
const elemento = InputMascara({ mascara: "dinheiro", onChange: (e) => { recebido = e.target.value; } });
const campo = { value: "1500,", selectionStart: 5, setSelectionRange: (a) => { campo.selectionStart = a; } };
globalThis.document = { activeElement: campo };
elemento.props.onChange({ currentTarget: campo, target: campo });
assert.equal(recebido, "1.500,");
assert.equal(campo.selectionStart, 6);
campo.value = "";
campo.selectionStart = 0;
campo.selectionEnd = 0;
campo.setRangeText = (texto) => { campo.value = texto; campo.selectionStart = texto.length; };
campo.dispatchEvent = () => elemento.props.onChange({ currentTarget: campo, target: campo });
let impedido = false;
elemento.props.onPaste({
  clipboardData: { getData: () => "1500.50" }, currentTarget: campo,
  preventDefault: () => { impedido = true; },
});
assert.ok(impedido);
assert.equal(recebido, "1.500,50");
campo.value = "7.900";
elemento.props.onBlur({ currentTarget: campo, target: campo });
assert.equal(recebido, "7.900,00");
assert.equal(lerReais(recebido), 7900);
campo.value = "7.900.00";
elemento.props.onChange({ currentTarget: campo, target: campo });
assert.equal(recebido, "7.900,00");
campo.value = "1.50";
elemento.props.onChange({ currentTarget: campo, target: campo, nativeEvent: { inputType: "deleteContentBackward" } });
assert.equal(recebido, "150");
delete globalThis.document;
console.log("OK: dinheiro, documentos, Pix, datas e edição do cursor.");
