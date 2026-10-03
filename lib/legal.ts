// Dados legais usados nos Termos de uso e na Política de privacidade (fonte única).
// TODO (RG-10): preencher razão social, CNPJ e e-mail do encarregado (DPO) e passar os dois textos
//       por revisão de advogado antes do lançamento. Enquanto vazios, as páginas não mostram esses campos.

export const LEGAL = {
  versao: "2026-10-03", // muda a cada nova versão dos textos; fica registrada no aceite do cadastro
  atualizadoEm: "03/10/2026",
  razaoSocial: "",
  cnpj: "",
  emailContato: process.env.NEXT_PUBLIC_EMAIL_CONTATO ?? "",
};
