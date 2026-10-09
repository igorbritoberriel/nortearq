"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Store, X } from "lucide-react";
import { EditorFornecedor } from "./EditorFornecedor";
import { arquivarFornecedor, excluirFornecedor } from "@/app/app/(sistema)/fornecedores/acoes";
import { normalizarFornecedor, type Fornecedor } from "@/lib/fornecedores";
import { mascaraDocumento, mascaraTelefone } from "@/lib/mascaras";
import "../financeiro/financeiro.css";
import "./fornecedores.css";
export function Fornecedores({fornecedores,podeEditar}:{fornecedores:Fornecedor[];podeEditar:boolean}){
 const router=useRouter(),[busca,setBusca]=useState(""),[situacao,setSituacao]=useState("ativos"),[editor,setEditor]=useState<Fornecedor|"novo"|null>(null),[mensagem,setMensagem]=useState(""),[pendente,iniciar]=useTransition(),[pagina,setPagina]=useState(1);
 useEffect(()=>setPagina(1),[busca,situacao]);
 const [exclusao,setExclusao]=useState<Fornecedor|null>(null),[erroExclusao,setErroExclusao]=useState("");
 const lista=fornecedores.filter(f=>(situacao==="todos"||(situacao==="arquivados"?!!f.arquivado_em:!f.arquivado_em))&&normalizarFornecedor(`${f.nome} ${f.documento??""} ${f.segmento??""} ${f.contato??""}`).includes(normalizarFornecedor(busca)));
 const paginas=Math.max(1,Math.ceil(lista.length/15)),atual=Math.min(pagina,paginas);
 function arquivar(f:Fornecedor){iniciar(async()=>{try{const r=await arquivarFornecedor(f.id,!f.arquivado_em);setMensagem(r.mensagem??"");if(r.status==="sucesso")router.refresh();}catch{setMensagem("Não foi possível atualizar o cadastro.");}});}
 function excluir(){if(!exclusao)return;iniciar(async()=>{try{const r=await excluirFornecedor(exclusao.id);if(r.status==="sucesso"){setExclusao(null);setMensagem(r.mensagem??"");router.refresh();}else setErroExclusao(r.mensagem??"Não foi possível excluir.");}catch{setErroExclusao("Não foi possível excluir. Tente novamente.");}});}
 return <div className="financeiro"><header className="fin-cabecalho"><div><h1>Fornecedores e parceiros</h1><p>Cadastre uma vez e reutilize nas entradas de RT e despesas.</p></div>{podeEditar&&<button className="botao botao-primario" onClick={()=>setEditor("novo")}><Plus size={20}/>Novo fornecedor</button>}</header>
  {!podeEditar&&<p className="fin-aviso">Cadastros disponíveis para consulta.</p>}{mensagem&&<p role="status" className="fin-contexto">{mensagem}</p>}
  <section className="fin-cartao fin-listagem"><div className="fin-lista-cabecalho"><h2>{lista.length} {lista.length===1?"cadastro":"cadastros"}</h2><div className="fin-filtros"><label className="fin-busca"><Search size={18}/><input aria-label="Buscar fornecedores" placeholder="Nome, documento ou segmento" value={busca} onChange={e=>setBusca(e.target.value)}/></label><select aria-label="Situação do fornecedor" value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="ativos">Ativos</option><option value="arquivados">Arquivados</option><option value="todos">Todos</option></select></div></div>
   <div className="fin-tabela-rolagem"><table className="fin-tabela"><thead><tr><th>Fornecedor / documento</th><th>Segmento</th><th>Contato</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{lista.slice((atual-1)*15,atual*15).map(f=><tr key={f.id}><td><strong>{f.nome}</strong><small>{f.documento?mascaraDocumento(f.documento):"Sem documento"}</small></td><td>{f.segmento??"—"}</td><td>{f.contato??"—"}<small>{f.telefone?mascaraTelefone(f.telefone):""}</small><small>{f.email}</small></td><td>{f.arquivado_em?"Arquivado":"Ativo"}</td><td>{podeEditar?<div className="fin-linha-acoes"><button className="fin-link" onClick={()=>setEditor(f)}>Editar</button><button className="fin-link" disabled={pendente} onClick={()=>arquivar(f)}>{f.arquivado_em?"Reativar":"Arquivar"}</button><button className="fin-link fin-cancelar-link" disabled={pendente} onClick={()=>{setErroExclusao("");setExclusao(f);}}>Excluir permanentemente</button></div>:"—"}</td></tr>)}{!lista.length&&<tr><td colSpan={5}><div className="fin-vazio"><Store size={28}/><strong>Nenhum fornecedor encontrado</strong><p>Cadastre lojas, empresas e parceiros para aproveitar os dados nos lançamentos.</p></div></td></tr>}</tbody></table></div>
   <div className="fin-lista-rodape"><p>Arquivar retira o fornecedor de novos lançamentos e preserva os registros anteriores.</p>{paginas>1&&<div className="fin-paginacao"><button disabled={atual===1} onClick={()=>setPagina(atual-1)}>Anterior</button><span>{atual} de {paginas}</span><button disabled={atual===paginas} onClick={()=>setPagina(atual+1)}>Próxima</button></div>}</div>
  </section>
  {exclusao&&<DialogoFornecedor titulo="Excluir fornecedor" fechar={()=>{if(!pendente)setExclusao(null);}}><div className="fin-form"><p>Excluir permanentemente <strong>{exclusao.nome}</strong>?</p><p>Esta ação não pode ser desfeita. Cadastros vinculados a entradas ou despesas devem ser arquivados.</p>{erroExclusao&&<p className="fin-aviso" role="alert">{erroExclusao}</p>}<div className="fin-form-rodape"><button type="button" className="botao botao-fantasma" disabled={pendente} onClick={()=>setExclusao(null)}>Voltar</button><button type="button" className="botao botao-primario forn-excluir" disabled={pendente} onClick={excluir}>{pendente?"Excluindo…":"Excluir permanentemente"}</button></div></div></DialogoFornecedor>}
  {editor&&<DialogoFornecedor fechar={()=>setEditor(null)}><EditorFornecedor fornecedor={editor==="novo"?undefined:editor} cancelar={()=>setEditor(null)} salvo={()=>{setEditor(null);setMensagem("Fornecedor salvo.");router.refresh();}}/></DialogoFornecedor>}
 </div>;
}
function DialogoFornecedor({children,fechar,titulo="Cadastro de fornecedor"}:{children:React.ReactNode;fechar:()=>void;titulo?:string}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog className="fin-dialogo" ref={ref} onCancel={fechar} aria-label={titulo}><div className="fin-dialogo-cabecalho"><h2>{titulo}</h2><button type="button" className="fin-fechar" aria-label="Fechar" onClick={fechar}><X size={21}/></button></div>{children}</dialog>;
}
