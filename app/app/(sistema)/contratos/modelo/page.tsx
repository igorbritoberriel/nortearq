import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditorContrato, FormDadosContratado } from "@/components/contratos/EditorContrato";
import { EmConstrucao } from "@/components/EmConstrucao";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { salvarDadosContratado, salvarModeloContrato } from "../acoes";

export const metadata: Metadata = { title: "Modelo de contrato" };

export default async function ModeloContratoPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return <EmConstrucao modulo="01" titulo="Modelo de contrato" itens={["Ligue o Supabase no .env.local."]} />;
  }

  // Primeiro acesso: o escritório ganha o modelo padrão.
  await supabase.rpc("garantir_modelo_contrato");
  const { data: modelo } = await supabase.from("modelos_contrato").select("corpo").maybeSingle();
  const e = sessao.escritorio;

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/contratos" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Contratos
      </Link>
      <h1>Modelo de contrato</h1>
      <p className="muted">Vale para os próximos contratos gerados. Contratos já gerados guardam o texto da época.</p>

      <section className="cartao secao-config">
        <h2>Dados do escritório no contrato</h2>
        <FormDadosContratado
          acao={salvarDadosContratado}
          dados={{
            documento: e.documento,
            endereco: e.endereco,
            responsavel: e.responsavel,
            registro_profissional: e.registro_profissional,
          }}
        />
      </section>

      <section className="cartao secao-config">
        <h2>Texto</h2>
        <p className="contato-alerta">
          O texto padrão é um ponto de partida. Peça para um advogado revisar antes de usar com clientes.
        </p>
        <EditorContrato texto={modelo?.corpo ?? ""} salvar={salvarModeloContrato} />
      </section>
    </div>
  );
}
