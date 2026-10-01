// Configuração do site de vendas.
// Enquanto o sistema não abre, todas as chamadas levam à lista de espera.
// No lançamento, troque PRE_LANCAMENTO para false: os botões passam a levar ao cadastro.

export const PRE_LANCAMENTO = true;

export const TEXTO_CHAMADA = PRE_LANCAMENTO ? "Entrar na lista de espera" : "Começar teste grátis";

export function linkChamada(plano?: string) {
  if (PRE_LANCAMENTO) return plano ? `/?plano=${plano}#lista-espera` : "/#lista-espera";
  return plano ? `/cadastro?plano=${plano}` : "/cadastro";
}
