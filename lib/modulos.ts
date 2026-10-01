// Catálogo dos módulos do NorteArq.
// É a fonte única usada pela landing page, pelos planos e pelo menu do sistema.

export type ModuloId = "00" | "01" | "02" | "03" | "04" | "05" | "06";

export type Modulo = {
  id: ModuloId;
  nome: string;
  resumo: string;
  dor: string;
  fase: 1 | 2 | 3; // 1 = primeira versão
};

export const MODULOS: Modulo[] = [
  {
    id: "00",
    nome: "Base",
    resumo: "Conta, marca do escritório, clientes, portal e avisos.",
    dor: "Tudo espalhado entre WhatsApp, e-mail e planilhas.",
    fase: 1,
  },
  {
    id: "01",
    nome: "Captação e fechamento",
    resumo: "Contato, briefing preliminar, filtro de compatibilidade, proposta, contrato e pagamentos.",
    dor: "Tempo perdido com quem não fecha e proposta/contrato feitos à mão.",
    fase: 1,
  },
  {
    id: "02",
    nome: "Briefing detalhado",
    resumo: "Perguntas por ambiente, quiz visual de estilo, referências e Perfil do Cliente em PDF.",
    dor: "O cliente não sabe explicar o que quer.",
    fase: 1,
  },
  {
    id: "03",
    nome: "Projeto e aprovações",
    resumo: "Etapas, arquivos com versões, aprovação do cliente, revisões contadas e aditivos.",
    dor: "Arquivos fora da nuvem e cliente que “não lembra” do que aprovou.",
    fase: 1,
  },
  {
    id: "04",
    nome: "Acompanhamento de obra",
    resumo: "Registro e contador de visitas, alterações, vistoria e entrega.",
    dor: "Visitas ilimitadas e mudanças na obra sem aprovação.",
    fase: 2,
  },
  {
    id: "05",
    nome: "Pós-entrega",
    resumo: "Avaliação, depoimento, arquivamento e lembrete de retorno.",
    dor: "Projeto entregue e cliente esquecido.",
    fase: 2,
  },
  {
    id: "06",
    nome: "Adicionais",
    resumo: "Página do arquiteto, IA, loja de modelos, rede de indicação e espaço extra.",
    dor: "Crescer além do básico.",
    fase: 3,
  },
];

export type Plano = {
  id: "briefing" | "profissional" | "escritorio";
  nome: string;
  descricao: string;
  preco: number; // mensal; o anual é 10x (2 meses grátis)
  modulos: ModuloId[];
  destaque?: boolean;
  itens: string[];
};

export const PLANOS: Plano[] = [
  {
    id: "briefing",
    nome: "Briefing",
    descricao: "Para começar pelo que mais dói: entender o cliente.",
    preco: 49,
    modulos: ["00", "02"],
    itens: ["Briefing inteligente", "Quiz visual de estilo", "Perfil do Cliente em PDF"],
  },
  {
    id: "profissional",
    nome: "Profissional",
    descricao: "Do primeiro contato à entrega, para quem trabalha sozinho.",
    preco: 97,
    modulos: ["00", "01", "02", "03", "04", "05"],
    destaque: true,
    itens: ["Tudo do Briefing", "Proposta e contrato automático", "Etapas e aprovações", "Controle de visitas e revisões"],
  },
  {
    id: "escritorio",
    nome: "Escritório",
    descricao: "Para equipes de até 5 pessoas, com a marca completa.",
    preco: 197,
    modulos: ["00", "01", "02", "03", "04", "05", "06"],
    itens: ["Tudo do Profissional", "Vários usuários", "Marca própria completa", "Domínio do escritório"],
  },
];

// Tabela comparativa da página /precos (especificação, seção 8).
export const COMPARATIVO_PLANOS: { item: string; valores: Record<Plano["id"], string | boolean> }[] = [
  { item: "Usuários", valores: { briefing: "1", profissional: "1", escritorio: "Até 5" } },
  { item: "Briefings por mês", valores: { briefing: "15", profissional: "Ilimitados", escritorio: "Ilimitados" } },
  { item: "Projetos ativos", valores: { briefing: false, profissional: "15", escritorio: "Ilimitados" } },
  { item: "Espaço para arquivos", valores: { briefing: "2 GB", profissional: "30 GB", escritorio: "150 GB" } },
  { item: "Briefing com quiz de estilo e Perfil do Cliente", valores: { briefing: true, profissional: true, escritorio: true } },
  { item: "Contatos com filtro de compatibilidade", valores: { briefing: false, profissional: true, escritorio: true } },
  { item: "Proposta e contrato automáticos", valores: { briefing: false, profissional: true, escritorio: true } },
  { item: "Etapas, aprovações, revisões e aditivos", valores: { briefing: false, profissional: true, escritorio: true } },
  { item: "Obra e pós-entrega (quando lançarem)", valores: { briefing: false, profissional: true, escritorio: true } },
  { item: "Marca do escritório", valores: { briefing: "Logo", profissional: "Logo e cores", escritorio: "Completa + domínio próprio" } },
];

export const ADICIONAIS: { item: string; preco: string }[] = [
  { item: "Implantação: configuramos seu briefing, imagens e contrato", preco: "R$ 297, uma vez" },
  { item: "+50 GB de espaço", preco: "R$ 19/mês" },
  { item: "Usuário extra (plano Escritório)", preco: "R$ 29/mês" },
  { item: "Assinaturas digitais além da franquia", preco: "Conforme o serviço contratado" },
];
