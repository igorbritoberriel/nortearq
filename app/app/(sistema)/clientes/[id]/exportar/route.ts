import { NextResponse, type NextRequest } from "next/server";
import { formatarResposta, type PerguntaBriefing, type Respostas } from "@/lib/briefing";
import { obterSessaoArquiteto } from "@/lib/escritorio";
import { pode } from "@/lib/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";

// LGPD (RG-9): tudo o que o escritório guarda de um cliente, num arquivo para entregar a ele quando pedir.
// Só dono e administrador (tem valores). O banco (RLS) garante que é cliente deste escritório.
// Arquivos do projeto e fotos do briefing vão como lista (nome e data); os próprios arquivos ficam no sistema.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await criarClienteServidor();
  const sessao = await obterSessaoArquiteto();
  if (!supabase || !sessao || !UUID.test(id)) return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  if (!pode(sessao.membro.papel, "ver_valores")) {
    return NextResponse.json({ erro: "Só o dono ou um administrador pode exportar os dados do cliente." }, { status: 403 });
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, documento, telefone, email, endereco_imovel, observacoes, etapa, criado_em, arquivado_em, anonimizado_em, contato_id")
    .eq("id", id)
    .maybeSingle();
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });

  const [pedido, briefings, propostas, contratos, projetos, links] = await Promise.all([
    cliente.contato_id
      ? supabase
          .from("contatos")
          .select("criado_em, nome, whatsapp, email, area_m2, localizacao, orcamento_disponivel, prazo_desejado, mensagem, aceite_privacidade_em, ip")
          .eq("id", cliente.contato_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("briefings")
      .select("criado_em, status, respondido_em, validado_em, perguntas, respostas, estilos_principais, estilos_secundarios")
      .eq("cliente_id", id)
      .order("criado_em"),
    supabase
      .from("propostas")
      .select(
        "versao, status, titulo, escopo, itens, valor_total, parcelas, forma_pagamento, prazo, revisoes_incluidas, visitas_incluidas, nao_incluido, validade_ate, enviada_em, respondida_em, comentario_cliente, motivo_recusa, resposta_ip",
      )
      .eq("cliente_id", id)
      .order("criado_em"),
    supabase
      .from("contratos")
      .select(
        "id, status, conteudo, enviado_em, assinado_em, aceite_nome, aceite_documento, aceite_endereco, aceite_ip, aceite_navegador, codigo_verificacao, cancelado_em, pagamentos(descricao, valor, vencimento, pago_em)",
      )
      .eq("cliente_id", id)
      .order("criado_em"),
    supabase
      .from("projetos")
      .select(
        "nome, status, revisoes_incluidas, visitas_incluidas, criado_em, etapas(nome, ordem, status, enviada_em, aprovada_em, aprovacoes(decisao, comentario, decidido_em, ip, cortesia), arquivos(nome, versao, categoria, criado_em, visivel_cliente, tamanho_bytes)), aditivos(numero, descricao, valor, prazo_dias, status, respondido_em, motivo_recusa, resposta_ip), aprovacoes_externas(orgao, protocolo, entrada_em, situacao)",
      )
      .eq("cliente_id", id)
      .order("criado_em"),
    supabase.from("links_cliente").select("destino, criado_em, expira_em, usado_em").eq("cliente_id", id).order("criado_em"),
  ]);

  // Briefing legível: pergunta e resposta, em vez de códigos.
  const briefingsLegiveis = (briefings.data ?? []).map((b) => {
    const perguntas = (b.perguntas ?? []) as PerguntaBriefing[];
    const respostas = (b.respostas ?? {}) as Respostas;
    return {
      criado_em: b.criado_em,
      situacao: b.status,
      respondido_em: b.respondido_em,
      validado_em: b.validado_em,
      estilos_principais: b.estilos_principais,
      estilos_secundarios: b.estilos_secundarios,
      respostas: perguntas
        .filter((p) => respostas[p.id] !== undefined)
        .map((p) => ({
          pergunta: p.texto,
          resposta: p.tipo === "foto" ? `${(respostas[p.id] as string[]).length} arquivo(s) enviado(s)` : formatarResposta(p, respostas[p.id]),
        })),
    };
  });

  const dados = {
    exportado_em: new Date().toISOString(),
    escritorio: sessao.escritorio.nome,
    observacao:
      "Dados pessoais e registros do cliente guardados pelo escritório no NorteArq (LGPD, art. 18). Arquivos do projeto e fotos do briefing estão listados pelo nome; os arquivos em si podem ser baixados pelo portal ou entregues pelo escritório.",
    cliente: { ...cliente, contato_id: undefined, id: undefined },
    pedido_de_orcamento: pedido.data,
    briefings: briefingsLegiveis,
    propostas: propostas.data ?? [],
    contratos: (contratos.data ?? []).map((c) => ({ ...c, id: undefined })),
    projetos: projetos.data ?? [],
    links_enviados: links.data ?? [],
  };

  const nome = cliente.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-${nome || "cliente"}-${hoje}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
