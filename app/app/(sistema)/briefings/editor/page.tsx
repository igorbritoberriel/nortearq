import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditorPerguntas } from "@/components/briefing/EditorBriefing";
import { ImagensEstilo, type ImagemEstiloEditor } from "@/components/briefing/ImagensEstilo";
import { EmConstrucao } from "@/components/EmConstrucao";
import { type Estilo, type PerguntaModelo } from "@/lib/briefing";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editor de briefing" };

// Editor do modelo de briefing (RN-02.10 a RN-02.12): vale para os próximos briefings enviados.
export default async function EditorBriefingPage() {
  const sessao = await obterSessaoArquiteto();
  const supabase = await criarClienteServidor();
  if (!sessao || !supabase) {
    return (
      <EmConstrucao
        modulo="02"
        titulo="Editor de briefing"
        descricao="Ligue o Supabase no .env.local para editar."
        itens={["Ligar/desligar e reordenar perguntas", "Criar perguntas próprias", "Banco de imagens de estilo"]}
      />
    );
  }

  // Escritórios criados antes do modelo existir ganham as perguntas padrão aqui.
  await supabase.rpc("garantir_modelo_briefing");

  const [{ data: perguntas, error }, { data: imagens }, { data: ocultos }] = await Promise.all([
    supabase
      .from("briefing_perguntas")
      .select("id, tipo_briefing, ambiente, texto, ajuda, tipo_resposta, opcoes, ativa, ordem, padrao")
      .eq("escritorio_id", sessao.escritorio.id)
      .order("ordem")
      .order("criado_em"),
    supabase
      .from("estilos_imagens")
      .select("id, estilo, imagem_url, escritorio_id")
      .order("criado_em", { ascending: false }),
    supabase.from("estilos_ocultos").select("imagem_id"),
  ]);
  if (error) console.error("[editor]", error.message);

  // Padrão do NorteArq + as do escritório; as padrão que ele escondeu continuam na lista (para mostrar de novo).
  const escondidas = new Set((ocultos ?? []).map((o) => o.imagem_id as string));
  const quiz: ImagemEstiloEditor[] = (imagens ?? [])
    .filter((i) => i.escritorio_id === null || i.escritorio_id === sessao.escritorio.id)
    .map((i) => ({
      id: i.id as string,
      estilo: i.estilo as Estilo,
      url: i.imagem_url as string,
      padrao: i.escritorio_id === null,
      oculta: escondidas.has(i.id as string),
    }));

  return (
    <div className="pagina-app pagina-larga">
      <Link href="/app/briefings" className="voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Briefings
      </Link>
      <h1>Editor de briefing</h1>
      <p className="muted">
        As mudanças valem para os próximos briefings. Quem já recebeu o link continua com as perguntas da época.
      </p>

      <section className="cartao secao-config">
        <h2>Quiz de estilo</h2>
        <p className="muted">
          O cliente vê uma imagem por vez e marca se gosta ou não. Clique num estilo para ver as imagens que ele vai
          ver; troque pelas suas quando quiser e volte ao padrão do NorteArq a qualquer momento.
        </p>
        <ImagensEstilo escritorioId={sessao.escritorio.id} imagens={quiz} />
      </section>

      <EditorPerguntas perguntas={(perguntas ?? []) as PerguntaModelo[]} />
    </div>
  );
}
