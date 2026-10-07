// Matriz de permissões (fonte única): o que cada perfil pode fazer no sistema do arquiteto.
// Vale para o menu, as páginas e os botões. A trava de verdade está no banco (RLS e funções:
// migrações 0015, 0024, 0026, 0032 e 0033); aqui é para a tela nunca oferecer o que vai ser recusado.
// Sem dependências de servidor: pode ser usada em componentes do navegador.

export type Papel = "dono" | "administrador" | "colaborador";

export type Acao =
  | "ver_pedidos" // pedidos de orçamento (mostram o investimento do cliente)
  | "ver_valores" // propostas, contratos, pagamentos, aditivos e recibos
  | "editar_propostas_contratos"
  | "registrar_pagamento"
  | "estornar_pagamento"
  | "cancelar_contrato"
  | "gerir_aditivos"
  | "gerir_clientes" // cadastrar, editar, arquivar, enviar links
  | "excluir_cliente"
  | "juntar_clientes"
  | "anonimizar_cliente"
  | "gerir_briefings"
  | "gerir_projetos" // etapas, arquivos, capa, envio para aprovação, aprovações externas
  | "configurar_escritorio" // marca, serviços, faixa de preço, modelos, editor de briefing
  | "gerir_equipe"
  | "gerir_assinatura";

const TODAS: Acao[] = [
  "ver_pedidos",
  "ver_valores",
  "editar_propostas_contratos",
  "registrar_pagamento",
  "estornar_pagamento",
  "cancelar_contrato",
  "gerir_aditivos",
  "gerir_clientes",
  "excluir_cliente",
  "juntar_clientes",
  "anonimizar_cliente",
  "gerir_briefings",
  "gerir_projetos",
  "configurar_escritorio",
  "gerir_equipe",
  "gerir_assinatura",
];

export const PERMISSOES: Record<Papel, ReadonlySet<Acao>> = {
  dono: new Set(TODAS),
  administrador: new Set(
    TODAS.filter((a) => !["estornar_pagamento", "anonimizar_cliente", "gerir_equipe", "gerir_assinatura"].includes(a)),
  ),
  colaborador: new Set<Acao>(["gerir_clientes", "gerir_briefings", "gerir_projetos"]),
};

export const pode = (papel: Papel, acao: Acao) => PERMISSOES[papel].has(acao);

// Páginas do menu que exigem uma permissão (as demais valem para todos).
export const PAGINA_EXIGE: Record<string, Acao> = {
  "/app/contatos": "ver_pedidos",
  "/app/propostas": "ver_valores",
  "/app/contratos": "ver_valores",
  "/app/financeiro": "ver_valores",
  "/app/configuracoes": "configurar_escritorio",
};
