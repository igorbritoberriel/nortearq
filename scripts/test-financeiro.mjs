import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function carregar(file) {
 const codigo=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',codigo)(()=>carregar('lib/formatacao.ts'),module,module.exports);return module.exports;
}
const f=carregar('lib/financeiro.ts');
const base={id:'p',contratoId:'c',cliente:'Cliente',projeto:'Projeto',descricao:'Entrada',valor:100,vencimento:'2026-10-07',pagoEm:null,forma:'pix',asaas:false,checkout:false};
assert.equal(f.situacaoRecebivel(base,'2026-10-07'),'pendente');
assert.equal(f.situacaoRecebivel({...base,vencimento:'2026-10-06'},'2026-10-07'),'atraso');
assert.equal(f.situacaoRecebivel({...base,vencimento:null},'2026-10-07'),'pendente');
assert.equal(f.situacaoRecebivel({...base,pagoEm:'2026-10-05'},'2026-10-07'),'pago');
assert.equal(f.mesValido('2026-13','2026-10-07'),'2026-10');
assert.deepEqual(f.intervaloMes('2028-02'),{inicio:'2028-02-01',fim:'2028-02-29'});
assert.deepEqual(f.intervaloMes('2026-12'),{inicio:'2026-12-01',fim:'2026-12-31'});
assert.equal(f.somaValores([.1,.2]),.3);
const pagamentos=[{...base,valor:.1,pagoEm:'2026-10-01'},{...base,valor:.2,pagoEm:'2026-10-07'},{...base,valor:50,vencimento:'2026-10-06'},{...base,valor:100},{...base,valor:300,pagoEm:'2026-09-01'},{...base,valor:200,pagoEm:'2026-11-01'}];
const despesas=[{valor:30,pago_em:'2026-10-03'},{valor:50,pago_em:null},{valor:20,pago_em:'2026-09-01'}];
const despesaBase={id:'d',descricao:'Software',fornecedor:null,categoria:'software',valor:10,vencimento:'2026-09-01',pago_em:null,observacao:null};
const despesasPeriodo=[despesaBase,{...despesaBase,id:'atual',pago_em:'2026-10-03'},{...despesaBase,id:'anterior',pago_em:'2026-09-10'},{...despesaBase,id:'futura',vencimento:'2026-11-01'}];
assert.deepEqual(f.despesasDoPeriodo(despesasPeriodo,'2026-10').map(d=>d.id),['d','atual','futura']);
assert.deepEqual(f.resumoFinanceiro(pagamentos,despesas,'2026-10','2026-10-07'),{recebido:.3,aReceber:150,emAtraso:50,parcelasAtrasadas:1,despesas:30});
const serie=f.serieFinanceiro(pagamentos,despesas,'2026-10');assert.equal(serie.length,5);assert.deepEqual(serie.at(-1),{mes:'2026-10',entradas:.3,saidas:30});assert.equal(serie.at(-2).entradas,300);
assert.deepEqual(f.serieFinanceiro([],[],'2026-01').map(s=>s.mes),['2025-09','2025-10','2025-11','2025-12','2026-01']);
console.log('OK: centavos, vencimentos, meses, despesas pagas, entradas confirmadas e gráfico sem valores futuros.');
