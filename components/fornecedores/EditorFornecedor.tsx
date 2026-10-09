"use client";
import { useState, useTransition } from "react";
import { InputMascara } from "@/components/InputMascara";
import { salvarFornecedor } from "@/app/app/(sistema)/fornecedores/acoes";
import { SEGMENTOS_FORNECEDOR, type Fornecedor } from "@/lib/fornecedores";
import type { EstadoFormulario } from "@/lib/formulario";
export function EditorFornecedor({fornecedor,salvo,cancelar}:{fornecedor?:Fornecedor;salvo:(f:Fornecedor)=>void;cancelar:()=>void}){
 const [id]=useState(()=>fornecedor?.id??crypto.randomUUID()),[pendente,iniciar]=useTransition();
 const [estado,setEstado]=useState<EstadoFormulario>({status:"inicial"});
 const segmentoConhecido=SEGMENTOS_FORNECEDOR.some(s=>s===fornecedor?.segmento);
 const [valores,setValores]=useState({nome:fornecedor?.nome??"",documento:fornecedor?.documento??"",contato:fornecedor?.contato??"",telefone:fornecedor?.telefone??"",email:fornecedor?.email??"",segmento:fornecedor?.segmento?(segmentoConhecido?fornecedor.segmento:"outros"):"",segmento_outro:segmentoConhecido?"":fornecedor?.segmento??"",observacoes:fornecedor?.observacoes??""});
 function salvar(){
  iniciar(async()=>{
   try{
    const form=new FormData();form.set("id",id);form.set("editar",fornecedor?"sim":"nao");
    Object.entries(valores).forEach(([k,v])=>form.set(k,v));
    const r=await salvarFornecedor(form);setEstado(r);if(r.status==="sucesso"&&r.fornecedor)salvo(r.fornecedor);
   }catch{setEstado({status:"erro",mensagem:"Não foi possível salvar. Tente novamente."});}
  });
 }
 const campo=(nome:keyof typeof valores,rotulo:string,tipo="text")=><div className="fin-campo"><label htmlFor={`forn-${id}-${nome}`}>{rotulo}</label><input id={`forn-${id}-${nome}`} type={tipo} value={valores[nome]} maxLength={nome==="email"?254:120} onChange={e=>setValores({...valores,[nome]:e.target.value})}/>{estado.erros?.[nome]&&<small className="campo-erro">{estado.erros[nome]}</small>}</div>;
 return <section className="fin-form forn-editor" aria-label={fornecedor?"Editar fornecedor":"Cadastrar fornecedor"} onKeyDown={e=>{if(e.key==="Enter"&&e.target instanceof HTMLInputElement){e.preventDefault();if(!pendente)salvar();}}}>
  {estado.status==="erro"&&<p className="fin-aviso" role="alert">{estado.mensagem}</p>}
  {campo("nome","Nome da loja, empresa ou pessoa")}
  <div className="fin-form-linha"><div className="fin-campo"><label htmlFor={`forn-${id}-documento`}>CPF/CNPJ (opcional)</label><InputMascara id={`forn-${id}-documento`} mascara="documento" value={valores.documento} onChange={e=>setValores({...valores,documento:e.target.value})}/>{estado.erros?.documento&&<small className="campo-erro">{estado.erros.documento}</small>}</div><div className="fin-campo"><label htmlFor={`forn-${id}-segmento`}>Segmento (opcional)</label><select id={`forn-${id}-segmento`} value={valores.segmento} onChange={e=>setValores({...valores,segmento:e.target.value})}><option value="">Selecione um segmento</option>{SEGMENTOS_FORNECEDOR.map(s=><option key={s} value={s}>{s}</option>)}<option value="outros">Outros</option></select>{estado.erros?.segmento&&<small className="campo-erro">{estado.erros.segmento}</small>}</div></div>
  {valores.segmento==="outros"&&campo("segmento_outro","Qual segmento?")}
  {campo("contato","Contato responsável (opcional)")}
  <div className="fin-form-linha"><div className="fin-campo"><label htmlFor={`forn-${id}-telefone`}>Telefone (opcional)</label><InputMascara id={`forn-${id}-telefone`} mascara="telefone" value={valores.telefone} onChange={e=>setValores({...valores,telefone:e.target.value})}/>{estado.erros?.telefone&&<small className="campo-erro">{estado.erros.telefone}</small>}</div>{campo("email","E-mail (opcional)","email")}</div>
  <div className="fin-campo"><label htmlFor={`forn-${id}-observacoes`}>Observações (opcional)</label><textarea id={`forn-${id}-observacoes`} rows={2} maxLength={1000} value={valores.observacoes} onChange={e=>setValores({...valores,observacoes:e.target.value})}/>{estado.erros?.observacoes&&<small className="campo-erro">{estado.erros.observacoes}</small>}</div>
  <div className="fin-form-rodape"><button type="button" className="botao botao-fantasma" onClick={cancelar} disabled={pendente}>Voltar</button><button type="button" className="botao botao-primario" onClick={salvar} disabled={pendente}>{pendente?"Salvando…":"Salvar fornecedor"}</button></div>
 </section>;
}
