import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ESTILOS, type Estilo } from "@/lib/briefing";
import { MOTIVOS_RECUSA, reais, type MotivoRecusa } from "@/lib/propostas";
import { STATUS_CONTATO, formatarReais, formatarWhatsapp, type StatusContato } from "@/lib/contatos";
import { enviarEmail, escaparHtml, modeloEmail } from "@/lib/email";
import { urlDoSite } from "@/lib/escritorio";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Avisos automáticos por e-mail para o arquiteto (spec, seção 9).
// Rodam depois da resposta ao visitante (after()), então um erro aqui nunca trava o formulário.
// Precisam da chave secreta do Supabase: o e-mail do arquiteto fica em auth.users.

async function emailsDoEscritorio(admin: SupabaseClient, escritorioId: string) {
  const { data: donos } = await admin.from("membros").select("id").eq("escritorio_id", escritorioId).eq("papel", "dono");
  const emails = await Promise.all(
    (donos ?? []).map(async ({ id }) => (await admin.auth.admin.getUserById(id)).data.user?.email),
  );
  return emails.filter((e): e is string => !!e);
}

// Notificação dentro do app (sininho + aviso na tela). Criada antes do e-mail: vale mesmo sem e-mail configurado.
type Notificacao = { tipo: "contato" | "briefing" | "proposta" | "contrato" | "etapa" | "aditivo"; titulo: string; texto?: string | null; link: string };

async function notificar(admin: SupabaseClient, escritorioId: string, n: Notificacao) {
  const { error } = await admin
    .from("notificacoes")
    .insert({ escritorio_id: escritorioId, tipo: n.tipo, titulo: n.titulo, texto: n.texto ?? null, link: n.link });
  if (error) console.error("[notificacao]", error.message);
}

// Novo pedido de orçamento pelo formulário público.
export async function avisarNovoContato(contatoId: string) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de novo contato não enviado.");

  const { data: c } = await admin
    .from("contatos")
    .select("escritorio_id, nome, whatsapp, email, status, orcamento_disponivel, prazo_desejado, localizacao, mensagem, prazo_apertado, acima_da_faixa")
    .eq("id", contatoId)
    .maybeSingle();
  if (!c) return;
  const status = STATUS_CONTATO[c.status as StatusContato];
  await notificar(admin, c.escritorio_id, {
    tipo: "contato",
    titulo: `${c.nome} pediu um orçamento`,
    texto: `${status} · ${formatarReais(c.orcamento_disponivel) ?? "investimento não informado"}${c.prazo_apertado ? " · prazo apertado" : ""}${c.acima_da_faixa ? " · acima da sua faixa" : ""}`,
    link: "/app/contatos",
  });
  const para = await emailsDoEscritorio(admin, c.escritorio_id);
  if (!para.length) return;

  const dados = [
    `<strong>WhatsApp:</strong> ${escaparHtml(formatarWhatsapp(c.whatsapp) ?? "—")}`,
    c.email && `<strong>E-mail:</strong> ${escaparHtml(c.email)}`,
    `<strong>Investimento:</strong> ${escaparHtml(formatarReais(c.orcamento_disponivel) ?? "não informou")}`,
    c.prazo_desejado && `<strong>Quer começar:</strong> ${escaparHtml(c.prazo_desejado)}${c.prazo_apertado ? " (prazo apertado para a sua agenda)" : ""}`,
    c.localizacao && `<strong>Local:</strong> ${escaparHtml(c.localizacao)}`,
  ].filter((l): l is string => !!l);

  await enviarEmail({
    para,
    assunto: `Novo pedido de orçamento: ${c.nome} (${status})`,
    html: modeloEmail({
      titulo: `${c.nome} pediu um orçamento`,
      linhas: [
        `O filtro classificou como <strong>${escaparHtml(status)}</strong>.`,
        dados.join("<br>"),
        ...(c.mensagem ? [`<em>“${escaparHtml(c.mensagem)}”</em>`] : []),
      ],
      botao: { texto: "Ver nos contatos", url: `${urlDoSite()}/app/contatos` },
    }),
    texto: [
      `${c.nome} pediu um orçamento (${status}).`,
      `WhatsApp: ${formatarWhatsapp(c.whatsapp) ?? "—"}`,
      `Investimento: ${formatarReais(c.orcamento_disponivel) ?? "não informou"}`,
      c.mensagem ? `Mensagem: ${c.mensagem}` : "",
      `Ver: ${urlDoSite()}/app/contatos`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

// O cliente terminou e enviou o briefing.
export async function avisarBriefingRespondido(briefingId: string) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de briefing não enviado.");

  const { data: b } = await admin
    .from("briefings")
    .select("escritorio_id, estilos_principais, cliente:clientes(nome)")
    .eq("id", briefingId)
    .maybeSingle();
  if (!b) return;
  const nome = (b.cliente as unknown as { nome: string } | null)?.nome ?? "Seu cliente";
  const estilo = (b.estilos_principais as Estilo[]).map((e) => ESTILOS[e] ?? e).join(" e ");
  const url = `${urlDoSite()}/app/briefings/${briefingId}`;

  await notificar(admin, b.escritorio_id, {
    tipo: "briefing",
    titulo: `${nome} respondeu o briefing`,
    texto: estilo ? `Estilo principal: ${estilo}` : "O Perfil do Cliente está pronto.",
    link: `/app/briefings/${briefingId}`,
  });
  const para = await emailsDoEscritorio(admin, b.escritorio_id);
  if (!para.length) return;

  await enviarEmail({
    para,
    assunto: `${nome} respondeu o briefing`,
    html: modeloEmail({
      titulo: `${nome} respondeu o briefing`,
      linhas: [
        "O Perfil do Cliente já está pronto para você revisar antes da reunião.",
        ...(estilo ? [`Estilo principal: <strong>${escaparHtml(estilo)}</strong>.`] : []),
      ],
      botao: { texto: "Abrir o Perfil do Cliente", url },
    }),
    texto: `${nome} respondeu o briefing.${estilo ? ` Estilo principal: ${estilo}.` : ""}\nAbrir: ${url}`,
  });
}

// O cliente aprovou, pediu ajuste ou recusou a proposta.
export async function avisarPropostaRespondida(propostaId: string) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de proposta não enviado.");

  const { data: p } = await admin
    .from("propostas")
    .select("escritorio_id, status, versao, valor_total, comentario_cliente, motivo_recusa, parcelas_escolhidas, entrada_pct, avista, desconto_avista_pct, cliente:clientes(nome)")
    .eq("id", propostaId)
    .maybeSingle();
  if (!p) return;
  const nome = (p.cliente as unknown as { nome: string } | null)?.nome ?? "Seu cliente";
  const acao = p.status === "aprovada" ? "aprovou" : p.status === "ajuste_pedido" ? "pediu ajustes na" : "recusou a";
  const assunto = `${nome} ${acao}${p.status === "aprovada" ? " a" : ""} proposta`;
  const motivo = p.motivo_recusa ? MOTIVOS_RECUSA[p.motivo_recusa as MotivoRecusa] : null;
  const url = `${urlDoSite()}/app/propostas/${propostaId}`;

  await notificar(admin, p.escritorio_id, {
    tipo: "proposta",
    titulo: assunto,
    texto: motivo ? `Motivo: ${motivo}` : p.comentario_cliente ? `“${p.comentario_cliente.slice(0, 140)}”` : reais(p.valor_total),
    link: `/app/propostas/${propostaId}`,
  });
  const para = await emailsDoEscritorio(admin, p.escritorio_id);
  if (!para.length) return;

  await enviarEmail({
    para,
    assunto,
    html: modeloEmail({
      titulo: assunto,
      linhas: [
        `Proposta de ${escaparHtml(reais(p.valor_total))}${p.versao > 1 ? ` (versão ${p.versao})` : ""}.`,
        ...(p.parcelas_escolhidas
          ? [
              p.avista
                ? `<strong>Pagamento escolhido:</strong> à vista, com ${p.desconto_avista_pct}% de desconto (pagamento único na assinatura).`
                : `<strong>Pagamento escolhido:</strong> ${p.entrada_pct ? `entrada de ${p.entrada_pct}% e ` : ""}saldo em ${p.parcelas_escolhidas === 1 ? "parcela única" : `${p.parcelas_escolhidas}x`}.`,
            ]
          : []),
        ...(motivo ? [`<strong>Motivo:</strong> ${escaparHtml(motivo)}`] : []),
        ...(p.comentario_cliente ? [`<em>“${escaparHtml(p.comentario_cliente)}”</em>`] : []),
        ...(p.status === "ajuste_pedido" ? ["Crie uma nova versão com os ajustes: o mesmo link mostra a versão nova."] : []),
      ],
      botao: { texto: "Abrir a proposta", url },
    }),
    texto: [assunto + ".", motivo && `Motivo: ${motivo}`, p.comentario_cliente && `Comentário: ${p.comentario_cliente}`, `Abrir: ${url}`]
      .filter(Boolean)
      .join("\n"),
  });
}

// Contrato assinado: avisa o escritório e manda a confirmação ao cliente (spec, seção 9: "os dois").
export async function avisarContratoAssinado(contratoId: string) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de contrato não enviado.");

  const { data: c } = await admin
    .from("contratos")
    .select("escritorio_id, codigo_verificacao, cliente:clientes(nome, email), escritorio:escritorios(nome), proposta:propostas(valor_total)")
    .eq("id", contratoId)
    .maybeSingle();
  if (!c) return;
  const cliente = c.cliente as unknown as { nome: string; email: string | null } | null;
  const escritorio = (c.escritorio as unknown as { nome: string } | null)?.nome ?? "O escritório";
  const valor = reais((c.proposta as unknown as { valor_total: number | null } | null)?.valor_total);
  const nome = cliente?.nome ?? "Seu cliente";
  const url = `${urlDoSite()}/app/contratos/${contratoId}`;

  await notificar(admin, c.escritorio_id, {
    tipo: "contrato",
    titulo: `${nome} assinou o contrato`,
    texto: `${valor} · o projeto já foi criado`,
    link: `/app/contratos/${contratoId}`,
  });
  const para = await emailsDoEscritorio(admin, c.escritorio_id);
  if (para.length) {
    await enviarEmail({
      para,
      assunto: `${nome} assinou o contrato`,
      html: modeloEmail({
        titulo: `${nome} assinou o contrato`,
        linhas: [
          `Contrato de ${escaparHtml(valor)}. O projeto foi criado com as etapas padrão e as parcelas estão em Pagamentos.`,
          `Código de verificação: <code>${escaparHtml(c.codigo_verificacao ?? "")}</code>`,
        ],
        botao: { texto: "Abrir o contrato", url },
      }),
      texto: `${nome} assinou o contrato (${valor}).\nCódigo de verificação: ${c.codigo_verificacao}\nAbrir: ${url}`,
    });
  }

  // Confirmação ao cliente com a marca do escritório no texto (o link do contrato já está com ele no WhatsApp).
  if (cliente?.email) {
    await enviarEmail({
      para: cliente.email,
      assunto: `Contrato com ${escritorio} assinado`,
      html: modeloEmail({
        titulo: "Seu contrato foi assinado",
        linhas: [
          `Olá, ${escaparHtml(nome.split(" ")[0])}! Registramos o seu aceite do contrato com ${escaparHtml(escritorio)}.`,
          "Você pode ver e salvar o contrato assinado pelo mesmo link que recebeu no WhatsApp.",
          `Código de verificação: <code>${escaparHtml(c.codigo_verificacao ?? "")}</code>`,
        ],
      }),
      texto: `Olá! Registramos o seu aceite do contrato com ${escritorio}.\nCódigo de verificação: ${c.codigo_verificacao}`,
    });
  }
}

// Etapa enviada para aprovação: e-mail ao cliente com o link (o WhatsApp sai pelo botão do arquiteto).
export async function avisarEtapaEnviada(etapaId: string, link: string) {
  const admin = criarClienteAdmin();
  if (!admin) return;
  const { data: e } = await admin
    .from("etapas")
    .select("nome, projeto:projetos(nome, cliente:clientes(nome, email), escritorio:escritorios(nome))")
    .eq("id", etapaId)
    .maybeSingle();
  const projeto = e?.projeto as unknown as {
    nome: string;
    cliente: { nome: string; email: string | null } | null;
    escritorio: { nome: string } | null;
  } | null;
  const email = projeto?.cliente?.email;
  if (!e || !projeto || !email) return;
  const escritorio = projeto.escritorio?.nome ?? "O escritório";

  await enviarEmail({
    para: email,
    assunto: `${escritorio}: etapa "${e.nome}" esperando a sua aprovação`,
    html: modeloEmail({
      titulo: `Etapa "${e.nome}" pronta para você`,
      linhas: [
        `Olá, ${escaparHtml(projeto.cliente!.nome.split(" ")[0])}! O ${escaparHtml(escritorio)} enviou a etapa <strong>${escaparHtml(e.nome)}</strong> do projeto ${escaparHtml(projeto.nome)}.`,
        "Veja os arquivos e aprove ou peça revisão pelo link abaixo.",
      ],
      botao: { texto: "Ver a etapa", url: link },
    }),
    texto: `O ${escritorio} enviou a etapa "${e.nome}" para a sua aprovação: ${link}`,
  });
}

// O cliente aprovou ou pediu revisão de uma etapa (RN-03.10: avisa se passou do limite).
export async function avisarEtapaRespondida(etapaId: string, excedeu: boolean) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de etapa não enviado.");
  const { data: e } = await admin
    .from("etapas")
    .select("nome, status, projeto_id, projeto:projetos(nome, escritorio_id, revisoes_incluidas, cliente:clientes(nome))")
    .eq("id", etapaId)
    .maybeSingle();
  const projeto = e?.projeto as unknown as {
    nome: string;
    escritorio_id: string;
    revisoes_incluidas: number;
    cliente: { nome: string } | null;
  } | null;
  if (!e || !projeto) return;

  const { data: ultima } = await admin
    .from("aprovacoes")
    .select("comentario")
    .eq("etapa_id", etapaId)
    .order("decidido_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nome = projeto.cliente?.nome ?? "O cliente";
  const aprovada = e.status === "aprovada";
  const assunto = `${nome} ${aprovada ? "aprovou" : "pediu revisão de"} "${e.nome}"`;
  const url = `${urlDoSite()}/app/projetos/${e.projeto_id}`;

  await notificar(admin, projeto.escritorio_id, {
    tipo: "etapa",
    titulo: assunto,
    texto: excedeu
      ? `Passou do limite de ${projeto.revisoes_incluidas} revisões contratadas`
      : ultima?.comentario
        ? `“${ultima.comentario.slice(0, 140)}”`
        : projeto.nome,
    link: `/app/projetos/${e.projeto_id}`,
  });
  const para = await emailsDoEscritorio(admin, projeto.escritorio_id);
  if (!para.length) return;

  await enviarEmail({
    para,
    assunto,
    html: modeloEmail({
      titulo: assunto,
      linhas: [
        `Projeto: ${escaparHtml(projeto.nome)}.`,
        ...(ultima?.comentario ? [`<em>“${escaparHtml(ultima.comentario)}”</em>`] : []),
        ...(excedeu
          ? [
              `<strong>Esta revisão passou do limite contratado (${projeto.revisoes_incluidas}).</strong> No projeto, você escolhe conceder como cortesia ou cobrar como aditivo.`,
            ]
          : []),
      ],
      botao: { texto: "Abrir o projeto", url },
    }),
    texto: `${assunto}.${ultima?.comentario ? `\nComentário: ${ultima.comentario}` : ""}${excedeu ? "\nPassou do limite de revisões contratado." : ""}\nAbrir: ${url}`,
  });
}

// O cliente aprovou ou recusou um aditivo (RN-03.15).
export async function avisarAditivoRespondido(aditivoId: string) {
  const admin = criarClienteAdmin();
  if (!admin) return console.info("[aviso] SUPABASE_SECRET_KEY não configurada: aviso de aditivo não enviado.");
  const { data: a } = await admin
    .from("aditivos")
    .select("escritorio_id, projeto_id, numero, descricao, valor, status, motivo_recusa, projeto:projetos(nome, cliente:clientes(nome))")
    .eq("id", aditivoId)
    .maybeSingle();
  if (!a) return;
  const projeto = a.projeto as unknown as { nome: string; cliente: { nome: string } | null } | null;
  const nome = projeto?.cliente?.nome ?? "O cliente";
  const aprovado = a.status === "aprovado";
  const assunto = `${nome} ${aprovado ? "aprovou" : "recusou"} o aditivo ${a.numero}`;
  const url = `${urlDoSite()}/app/projetos/${a.projeto_id}`;

  await notificar(admin, a.escritorio_id, {
    tipo: "aditivo",
    titulo: assunto,
    texto: aprovado ? `${reais(a.valor)} · as parcelas já estão em Pagamentos` : `Motivo: ${a.motivo_recusa ?? "—"}`,
    link: `/app/projetos/${a.projeto_id}`,
  });
  const para = await emailsDoEscritorio(admin, a.escritorio_id);
  if (!para.length) return;
  await enviarEmail({
    para,
    assunto,
    html: modeloEmail({
      titulo: assunto,
      linhas: [
        `Projeto: ${escaparHtml(projeto?.nome ?? "")}.`,
        `<strong>${escaparHtml(a.descricao)}</strong> · ${escaparHtml(reais(a.valor))}`,
        aprovado
          ? "As parcelas do aditivo já entraram nos Pagamentos do contrato, e as revisões ou visitas extras foram somadas ao projeto."
          : `<strong>Motivo da recusa:</strong> ${escaparHtml(a.motivo_recusa ?? "—")}`,
      ],
      botao: { texto: "Abrir o projeto", url },
    }),
    texto: `${assunto}.\n${a.descricao} (${reais(a.valor)})\nAbrir: ${url}`,
  });
}
