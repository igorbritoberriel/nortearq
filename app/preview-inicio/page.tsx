import { ArrowDown, ArrowUp, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, FileCheck2, FileText, Handshake, House, LayoutGrid, ListChecks, Plus, Settings, Store, Users, Wallet, AlertCircle } from "lucide-react";
import { notFound } from "next/navigation";
import "./preview.css";

const navigation = [ [House,"Início"], [Users,"Contatos"], [Users,"Clientes"], [FileText,"Propostas"], [FileCheck2,"Contratos"], [ListChecks,"Briefings"], [BriefcaseBusiness,"Projetos"], [Wallet,"Financeiro"], [Store,"Fornecedores"] ] as const;
export default function PreviewInicio() {
 if(process.env.NODE_ENV!=="development")notFound();
 return <div className="ux-preview">
  <aside className="ux-sidebar"><div className="ux-brand"><Compass size={25}/> Norte<span>Arq</span></div><strong>Débora Ribeiro · Arquitetura</strong><small><b>Profissional</b> · teste grátis, 8 dias</small><div className="ux-notifications"><Bell size={18}/> Notificações <i>3</i></div><nav>{navigation.map(([Icon,label])=><div key={label} className={label==="Início"?"selected":""}><Icon size={19}/>{label}</div>)}</nav><div className="ux-sidebar-bottom"><div><Settings size={18}/>Configurações</div><div><CircleHelp size={18}/>Ajuda</div><div><LayoutGrid size={18}/>Plano e assinatura</div><footer><span className="ux-avatar">DR</span> Débora Ribeiro</footer></div></aside>
  <main className="ux-main">
   <div className="ux-preview-note"><span>PRÉVIA DO DESIGN</span> Dados ilustrativos para aprovação</div>
   <header className="ux-header"><div><div className="ux-eyebrow">QUINTA-FEIRA, 8 DE OUTUBRO DE 2026</div><h1>Bom dia, Débora</h1><p>Seu escritório em um só lugar. Veja o que precisa da sua atenção.</p></div><div className="ux-shortcuts"><button><Plus size={17}/>Nova entrada</button><button className="primary"><Plus size={17}/>Nova proposta</button></div></header>
   <div className="ux-section-top"><h2>Resumo financeiro <span>Outubro de 2026</span></h2><a>Ver financeiro <ArrowUpRight size={16}/></a></div>
   <section className="ux-metrics">
    <article><div className="ux-icon green"><ArrowUp/></div><div><p>Entradas do mês</p><strong className="green-text">R$ 8.450,00</strong><small>Contratos: R$ 7.900,00<br/>Outras entradas: R$ 550,00</small></div></article>
    <article><div className="ux-icon amber"><Clock3/></div><div><p>A receber no mês</p><strong>R$ 4.200,00</strong><small>3 parcelas pendentes</small></div></article>
    <article><div className="ux-icon red"><AlertCircle/></div><div><p>Em atraso</p><strong className="red-text">R$ 850,00</strong><small>1 parcela vencida · todos os meses</small></div></article>
    <article><div className="ux-icon neutral"><ArrowDown/></div><div><p>Despesas do mês</p><strong>R$ 2.180,00</strong><small>Despesas pagas</small></div></article>
   </section>
   <div className="ux-work-grid">
    <section className="ux-panel ux-attention"><div className="ux-panel-heading"><h2>Precisa de você <span className="ux-count">3</span></h2><span className="ux-caption">Próximas ações</span></div>
     <div className="ux-task"><div className="ux-task-icon amber"><FileText size={19}/></div><div><h3>Preparar proposta</h3><p>Mariana Almeida · Projeto de interiores</p><small>Briefing respondido ontem</small></div><button>Preparar <ChevronRight size={16}/></button></div>
     <div className="ux-task"><div className="ux-task-icon blue"><BriefcaseBusiness size={19}/></div><div><h3>Entregar estudo preliminar</h3><p>Manoel Cabral · Residência unifamiliar</p><small className="amber-text">Prazo hoje, 8 de outubro</small></div><button>Abrir projeto <ChevronRight size={16}/></button></div>
     <div className="ux-task"><div className="ux-task-icon red"><Wallet size={19}/></div><div><h3>Conferir parcela em atraso</h3><p>Lucas Ferreira · Consultório</p><small className="red-text">R$ 850,00 · venceu em 5 de outubro</small></div><button>Ver parcela <ChevronRight size={16}/></button></div>
    </section>
    <section className="ux-panel"><div className="ux-panel-heading"><h2>Aguardando o cliente <span className="ux-count">2</span></h2></div><p className="ux-panel-intro">Acompanhe o retorno para dar o próximo passo.</p><div className="ux-wait"><div className="ux-task-icon neutral"><FileCheck2 size={19}/></div><div><h3>Assinatura do contrato</h3><p>Ana Paula Santos</p><small>Enviado há 2 dias</small></div><ChevronRight size={17}/></div><div className="ux-wait"><div className="ux-task-icon neutral"><Check size={19}/></div><div><h3>Aprovação do anteprojeto</h3><p>Renata Costa</p><small>Enviado ontem</small></div><ChevronRight size={17}/></div><div className="ux-wait-footer"><Handshake size={16}/> Cada retorno libera uma nova etapa.</div></section>
   </div>
   <div className="ux-project-grid"><section className="ux-panel"><div className="ux-panel-heading"><h2>Projetos em andamento <span className="ux-count">4</span></h2><a>Ver todos <ArrowUpRight size={16}/></a></div><div className="ux-project-table"><div className="ux-table-label"><span>CLIENTE / PROJETO</span><span>ETAPA ATUAL</span><span>PRÓXIMO PRAZO</span></div>{[
    ["Manoel Cabral","Residência unifamiliar","Estudo preliminar","Hoje","today"], ["Renata Costa","Apartamento · Interiores","Anteprojeto","14 out",""], ["Lucas Ferreira","Consultório","Projeto executivo","19 out",""]
   ].map(([name,project,stage,date,style])=><div className="ux-project-row" key={name}><div><h3>{name}</h3><p>{project}</p></div><span>{stage}</span><div><span className={style==="today"?"ux-date today":"ux-date"}>{date}</span><ChevronRight size={16}/></div></div>)}</div></section>
    <section className="ux-panel ux-deadlines"><div className="ux-panel-heading"><h2>Próximos prazos</h2><CalendarDays size={19}/></div><p className="ux-panel-intro">Entregas dos próximos 7 dias</p><div className="ux-deadline"><div className="ux-day today"><strong>08</strong><small>OUT</small></div><div><h3>Estudo preliminar</h3><p>Manoel Cabral</p><small className="amber-text">Hoje</small></div></div><div className="ux-deadline"><div className="ux-day"><strong>14</strong><small>OUT</small></div><div><h3>Anteprojeto</h3><p>Renata Costa</p><small>Em 6 dias</small></div></div><a className="ux-deadline-link">Ver projetos e prazos <ArrowUpRight size={16}/></a></section>
   </div><p className="ux-footnote">Os indicadores mostram os registros do escritório. Consulte o saldo disponível diretamente no Asaas.</p>
  </main>
 </div>;
}
