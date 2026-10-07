import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter((l)=>l.includes("=")&&!l.trim().startsWith("#"))
  .map((l)=>[l.slice(0,l.indexOf("=")).trim(),l.slice(l.indexOf("=")+1).trim().replace(/^"|"$/g,"")]));
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{
    method:"POST",headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql}),
  });
  const data=await r.json(); if(!r.ok) throw new Error(JSON.stringify(data)); return data;
}
if (process.argv.includes("--backup")) {
  if(existsSync(".backups/banco-antes-fluxo-pagamento-20261007.json")) throw new Error("Backup anterior já existe; não será sobrescrito.");
  const defs = await query("select pg_get_functiondef(oid) as definicao,proacl::text as permissoes from pg_proc where pronamespace='public'::regnamespace and proname in ('responder_proposta','proposta_publica','renderizar_contrato','nova_versao_proposta','assinar_contrato')");
  mkdirSync(".backups",{recursive:true});
  writeFileSync(".backups/banco-antes-fluxo-pagamento-20261007.json",JSON.stringify(defs,null,2));
  console.log("Backup das funções e permissões salvo em .backups.");
} else if (process.argv.includes("--retorno") || process.argv.includes("--testar-retorno")) {
  const defs=JSON.parse(readFileSync(".backups/banco-antes-fluxo-pagamento-20261007.json","utf8"));
  let sql="drop function if exists responder_proposta(text,text,text,text,text,integer,boolean,text);\n";
  for(const d of defs) {
    sql+=d.definicao+";\n";
    const nome=d.definicao.match(/FUNCTION public\.([a-z_]+)\(/)[1];
    const args={assinar_contrato:"text,text,text,text,text,text",responder_proposta:"text,text,text,text,text,integer,boolean",proposta_publica:"text",renderizar_contrato:"uuid,text,text,text,date",nova_versao_proposta:"uuid"}[nome];
    sql+=`revoke all on function ${nome}(${args}) from public,anon,authenticated,service_role;\n`;
    for(const m of d.permissoes.matchAll(/(?:\{|,)([a-z_]*)=([^,/]*)\//g))
      if(m[2].includes("X")) sql+=`grant execute on function ${nome}(${args}) to ${m[1]||"public"};\n`;
  }
  sql+="notify pgrst, 'reload schema';\n";
  writeFileSync(".backups/retornar-banco-fluxo-pagamento.sql",`begin;\n${sql}commit;\n`);
  if(process.argv.includes("--testar-retorno")) {
    const migracao=readFileSync("supabase/migrations/0043_fluxo_pagamento.sql","utf8");
    await query(`begin;\n${migracao}\n${sql}\nrollback;`);
    console.log("SQL de retorno validado com rollback.");
  } else console.log("SQL de retorno salvo; nenhuma alteração aplicada.");
} else {
  const migracao=["0043_fluxo_pagamento.sql","0044_cartao_valor_total.sql","0045_cartao_checkout_global.sql"].map(n=>readFileSync(`supabase/migrations/${n}`,"utf8")).join("\n");
  const testes=readFileSync("scripts/test-fluxo-pagamento.sql","utf8");
  console.log(await query(`begin;\n${migracao}\n${testes}\nrollback;`));
}
