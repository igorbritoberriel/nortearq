"use client";
import { useState } from "react";
import { EditorFornecedor } from "./EditorFornecedor";
import { normalizarFornecedor, type Fornecedor } from "@/lib/fornecedores";
export function SeletorFornecedor({fornecedores,nomeCampo,rotulo,valorInicial="",idInicial="",erro}:{fornecedores:Fornecedor[];nomeCampo:"origem"|"fornecedor";rotulo:string;valorInicial?:string;idInicial?:string;erro?:string}){
 const [novos,setNovos]=useState<Fornecedor[]>([]),[id,setId]=useState(idInicial),[busca,setBusca]=useState(""),[manual,setManual]=useState(valorInicial),[cadastrar,setCadastrar]=useState(false);
 const lista=[...fornecedores,...novos.filter(n=>!fornecedores.some(f=>f.id===n.id))].filter(f=>!f.arquivado_em);
 const selecionado=lista.find(f=>f.id===id);
 const filtrados=lista.filter(f=>f.id===id||normalizarFornecedor(`${f.nome} ${f.segmento??""} ${f.documento??""}`).includes(normalizarFornecedor(busca)));
 return <div className="fin-campo forn-seletor">
  <label htmlFor={`fin-${nomeCampo}-cadastro`}>{rotulo}</label>
  <input type="hidden" name="fornecedor_id" value={selecionado?.id??""}/>
  <input type="hidden" name={nomeCampo} value={selecionado?.nome??manual}/>
  <input aria-label="Buscar fornecedor cadastrado" placeholder="Buscar por nome, segmento ou documento" value={busca} onChange={e=>setBusca(e.target.value)}/>
  <div className="forn-selecao-linha"><select id={`fin-${nomeCampo}-cadastro`} value={id} onChange={e=>setId(e.target.value)}><option value="">Sem cadastro / informar manualmente</option>{filtrados.map(f=><option key={f.id} value={f.id}>{f.nome}{f.segmento?` · ${f.segmento}`:""}</option>)}</select><button type="button" className="botao botao-secundario" onClick={()=>setCadastrar(!cadastrar)}>+ Cadastrar fornecedor</button></div>
  {!selecionado&&<input aria-label="Origem sem cadastro (opcional)" placeholder="Origem sem cadastro (opcional)" value={manual} maxLength={120} onChange={e=>setManual(e.target.value)}/>}
  {selecionado&&<small>{[selecionado.contato,selecionado.telefone,selecionado.email].filter(Boolean).join(" · ")}</small>}
  {erro&&<small className="campo-erro" role="alert">{erro}</small>}
  {cadastrar&&<div className="forn-rapido"><h3>Novo fornecedor</h3><EditorFornecedor cancelar={()=>setCadastrar(false)} salvo={f=>{setNovos([...novos.filter(n=>n.id!==f.id),f]);setId(f.id);setBusca("");setCadastrar(false);}}/></div>}
 </div>;
}
