import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormCliente } from "@/components/clientes/FormCliente";
import { listarServicos } from "@/lib/escritorio";
import { criarCliente } from "../acoes";

export const metadata: Metadata = { title: "Novo cliente" };

// Cadastro manual: para quem chegou por indicação, telefone ou Instagram sem passar pelo formulário.
export default async function NovoClientePage() {
  const servicos = await listarServicos();
  return (
    <div className="pagina-app">
      <Link href="/app/clientes" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>
      <h1>Novo cliente</h1>
      <p className="muted">Depois de salvar, você já pode enviar o link do briefing pelo WhatsApp.</p>
      <section className="cartao">
        <FormCliente acao={criarCliente} servicos={servicos} />
      </section>
    </div>
  );
}
