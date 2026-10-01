import type { Metadata } from "next";
import { FormCadastro } from "@/components/auth/FormulariosAuth";

export const metadata: Metadata = { title: "Teste grátis" };

// Cadastro do ARQUITETO (o cliente final nunca se cadastra aqui).
// O banco cria o escritório, o dono e os serviços padrão (migração 0003).
export default function CadastroPage() {
  return <FormCadastro />;
}
