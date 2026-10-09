"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { modulosLiberados } from "@/lib/assinatura";
import { pode } from "@/lib/permissoes";
import { documentoValido } from "@/lib/contratos";
import { CAMPOS_FORNECEDOR, SEGMENTOS_FORNECEDOR, type Fornecedor } from "@/lib/fornecedores";
import { errosDe, valoresDe, type EstadoFormulario } from "@/lib/formulario";
type Resultado = EstadoFormulario & { fornecedor?: Fornecedor };
async function contexto() {
  const sessao=await obterSessaoArquiteto(), db=await criarClienteServidor();
  if(!sessao||!db||!pode(sessao.membro.papel,"registrar_pagamento")||!modulosLiberados(sessao.escritorio.plano).includes("01")||["leitura","suspenso"].includes(sessao.situacao)) return null;
  return {sessao,db};
}
const schema=z.object({
  id:z.uuid(), editar:z.enum(["sim","nao"]), nome:z.string().trim().min(2,"Informe o nome.").max(120),
  documento:z.string().trim().refine(s=>!s||documentoValido(s),"Informe um CPF ou CNPJ válido.").transform(s=>s.replace(/\D/g,"")),
  contato:z.string().trim().max(120), telefone:z.string().transform(s=>s.replace(/\D/g,"")).refine(s=>!s||/^\d{10,13}$/.test(s),"Informe um telefone válido."),
  email:z.string().trim().max(254).refine(s=>!s||z.email().safeParse(s).success,"Informe um e-mail válido."),
  segmento:z.string().trim().max(80), segmento_outro:z.string().trim().max(80).optional(), observacoes:z.string().trim().max(1000),
}).superRefine((p,ctx)=>{
 if(p.segmento==="outros"&&(!p.segmento_outro||p.segmento_outro.length<2))ctx.addIssue({code:"custom",path:["segmento_outro"],message:"Informe qual é o segmento."});
 if(p.segmento&&p.segmento!=="outros"&&!SEGMENTOS_FORNECEDOR.some(s=>s===p.segmento))ctx.addIssue({code:"custom",path:["segmento"],message:"Selecione um segmento da lista."});
});
export async function salvarFornecedor(form:FormData):Promise<Resultado> {
  const valores=valoresDe(form), parsed=schema.safeParse(valores);
  if(!parsed.success)return{status:"erro",mensagem:"Confira os campos destacados.",erros:errosDe(parsed.error.issues),valores};
  const ctx=await contexto();if(!ctx)return{status:"erro",mensagem:"Você não tem permissão para cadastrar fornecedores."};
  const p=parsed.data, payload={nome:p.nome,documento:p.documento||null,contato:p.contato||null,telefone:p.telefone||null,email:p.email||null,segmento:(p.segmento==="outros"?p.segmento_outro:p.segmento)||null,observacoes:p.observacoes||null};
  const query=p.editar==="sim"?ctx.db.from("fornecedores").update(payload).eq("id",p.id).eq("escritorio_id",ctx.sessao.escritorio.id):ctx.db.from("fornecedores").insert({id:p.id,escritorio_id:ctx.sessao.escritorio.id,...payload});
  const {data,error}=await query.select(CAMPOS_FORNECEDOR).single();
  if(error){
    if(error.code==="23505"&&p.editar==="nao"){
      const {data:existente}=await ctx.db.from("fornecedores").select(CAMPOS_FORNECEDOR).eq("id",p.id).eq("escritorio_id",ctx.sessao.escritorio.id).maybeSingle();
      if(existente&&Object.entries(payload).every(([k,v])=>existente[k as keyof typeof existente]===v))return{status:"sucesso",fornecedor:existente as Fornecedor};
    }
    return{status:"erro",mensagem:error.code==="23505"?"Já existe um fornecedor com esse CPF/CNPJ. Use o cadastro existente.":"Não foi possível salvar o fornecedor. Tente novamente.",valores};
  }
  revalidatePath("/app/fornecedores");revalidatePath("/app/financeiro");
  return{status:"sucesso",mensagem:"Fornecedor salvo.",fornecedor:data as Fornecedor};
}
export async function arquivarFornecedor(id:string, arquivar:boolean):Promise<EstadoFormulario>{
  if(!z.uuid().safeParse(id).success||typeof arquivar!=="boolean")return{status:"erro",mensagem:"Cadastro inválido."};
  const ctx=await contexto();if(!ctx)return{status:"erro",mensagem:"Você não tem permissão para alterar fornecedores."};
  const {data,error}=await ctx.db.from("fornecedores").update({arquivado_em:arquivar?new Date().toISOString():null}).eq("id",id).eq("escritorio_id",ctx.sessao.escritorio.id).select("id").maybeSingle();
  if(error||!data)return{status:"erro",mensagem:"Não foi possível atualizar o cadastro."};
  revalidatePath("/app/fornecedores");revalidatePath("/app/financeiro");
  return{status:"sucesso",mensagem:arquivar?"Fornecedor arquivado.":"Fornecedor reativado."};
}
export async function excluirFornecedor(id:string):Promise<EstadoFormulario>{
 if(!z.uuid().safeParse(id).success)return{status:"erro",mensagem:"Cadastro inválido."};
 const ctx=await contexto();if(!ctx)return{status:"erro",mensagem:"Você não tem permissão para excluir fornecedores."};
 // A exclusão usa o cliente servidor administrativo após validar o perfil e o escritório.
 // As FKs continuam impedindo a exclusão de cadastros usados no financeiro.
 const admin=criarClienteAdmin();
 if(!admin)return{status:"erro",mensagem:"A exclusão está indisponível. Tente novamente mais tarde."};
 const {data,error}=await admin.from("fornecedores").delete().eq("id",id).eq("escritorio_id",ctx.sessao.escritorio.id).select("id").maybeSingle();
 if(error?.code==="23503")return{status:"erro",mensagem:"Este fornecedor está vinculado a entradas ou despesas, inclusive canceladas. Use Arquivar para preservar o histórico."};
 if(error||!data)return{status:"erro",mensagem:"Não foi possível excluir o fornecedor. Atualize a lista e tente novamente."};
 revalidatePath("/app/fornecedores");revalidatePath("/app/financeiro");
 return{status:"sucesso",mensagem:"Fornecedor excluído permanentemente."};
}
