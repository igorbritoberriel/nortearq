import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { modulosLiberados } from "@/lib/assinatura";
import { pode } from "@/lib/permissoes";
import { carregarFornecedores } from "@/lib/fornecedores-servidor";
import { Fornecedores } from "@/components/fornecedores/Fornecedores";
export const metadata:Metadata={title:"Fornecedores"};
export default async function PaginaFornecedores(){
 const sessao=await obterSessaoArquiteto(),db=await criarClienteServidor();
 if(!sessao||!db)redirect("/entrar");
 if(!pode(sessao.membro.papel,"ver_valores")||!modulosLiberados(sessao.escritorio.plano).includes("01"))redirect("/app");
 const fornecedores=await carregarFornecedores(db,sessao.escritorio.id);
 return <Fornecedores fornecedores={fornecedores} podeEditar={pode(sessao.membro.papel,"registrar_pagamento")&&!["leitura","suspenso"].includes(sessao.situacao)}/>;
}
