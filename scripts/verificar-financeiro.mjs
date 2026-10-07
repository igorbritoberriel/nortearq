import {readFileSync} from 'node:fs';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim().replace(/^"|"$/g,'')]));
const ref=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
async function consultar(query) {
 const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
 const texto=await r.text();
 if(!r.ok)throw new Error(`Supabase ${r.status}: ${texto}`);
 return JSON.parse(texto);
}
const [estado]=await consultar("select to_regclass('public.financeiro_despesas') is not null as instalado");
const migracao=estado.instalado?'':readFileSync('supabase/migrations/0046_financeiro_despesas.sql','utf8');
const sql=`begin;\n${migracao}\n${readFileSync('scripts/test-financeiro.sql','utf8')}\nrollback;`;
console.log('OK',await consultar(sql));
