import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CAMPOS_FORNECEDOR, type Fornecedor } from "./fornecedores";
export async function carregarFornecedores(db:SupabaseClient,escritorioId:string,ativos=false){
 const lista:Fornecedor[]=[];
 for(let offset=0;;offset+=1000){
  let query=db.from("fornecedores").select(CAMPOS_FORNECEDOR).eq("escritorio_id",escritorioId);
  if(ativos)query=query.is("arquivado_em",null);
  const {data,error}=await query.order("nome").order("id").range(offset,offset+999);
  if(error)throw new Error("Não foi possível carregar os fornecedores. Tente novamente.");
  lista.push(...(data??[]) as Fornecedor[]);
  if((data?.length??0)<1000)break;
  if(offset>=49000)throw new Error("Este volume de fornecedores exige uma consulta específica.");
 }
 return lista;
}
