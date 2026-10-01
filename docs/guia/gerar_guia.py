"""Gera o Guia de criação de apps com o Claude Code (PDF, A4), com o fluxograma e os 13 prompts."""

import os
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image as RLImage, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))  # "app - arquitetura"
SAIDA = os.environ.get("SAIDA_GUIA", os.path.join(PASTA, "Guia-criar-app-com-Claude-Code.pdf"))
FLUXO = os.environ.get("FLUXO_PNG", os.path.join(PASTA, "Fluxo-criar-app-com-Claude.png"))

# ---------- Fontes e cores (mesmo visual do manual do NorteArq) ----------
F = r"C:\Windows\Fonts"
for nome, arquivo in [("Segoe", "segoeui.ttf"), ("Segoe-B", "segoeuib.ttf"), ("Segoe-I", "segoeuii.ttf"),
                      ("Segoe-SB", "seguisb.ttf"), ("Mono", "consola.ttf"), ("Mono-B", "consolab.ttf")]:
    pdfmetrics.registerFont(TTFont(nome, os.path.join(F, arquivo)))
registerFontFamily("Segoe", normal="Segoe", bold="Segoe-B", italic="Segoe-I", boldItalic="Segoe-B")
registerFontFamily("Mono", normal="Mono", bold="Mono-B", italic="Mono", boldItalic="Mono-B")

MARINHO = colors.HexColor("#14283f")
MARINHO_2 = colors.HexColor("#1f3a5f")
DOURADO = colors.HexColor("#c89b50")
FUNDO = colors.HexColor("#f7f5f0")
BORDA = colors.HexColor("#e3dfd6")
TEXTO = colors.HexColor("#1d1d1b")
SUAVE = colors.HexColor("#5c6675")
PROMPT_FUNDO = colors.HexColor("#f4f1ea")
EXEMPLO_FUNDO = colors.HexColor("#eef2f7")
AVISO_FUNDO = colors.HexColor("#fdf8ef")

corpo = ParagraphStyle("corpo", fontName="Segoe", fontSize=10.5, leading=15.5, textColor=TEXTO, spaceAfter=6)
intro = ParagraphStyle("intro", parent=corpo, fontSize=11.5, leading=17, textColor=SUAVE, spaceAfter=10)
rotulo = ParagraphStyle("rotulo", fontName="Segoe-SB", fontSize=8.5, leading=11, textColor=DOURADO, spaceAfter=2)
h1 = ParagraphStyle("h1", fontName="Segoe-B", fontSize=22, leading=27, textColor=MARINHO, spaceAfter=4)
h2 = ParagraphStyle("h2", fontName="Segoe-B", fontSize=13.5, leading=18, textColor=MARINHO, spaceBefore=12, spaceAfter=4)
item = ParagraphStyle("item", parent=corpo, leftIndent=14, bulletIndent=2, spaceAfter=3)
passo = ParagraphStyle("passo", parent=corpo, leftIndent=18, spaceAfter=4)
caixa_txt = ParagraphStyle("caixa", parent=corpo, fontSize=10, leading=14.5, spaceAfter=0)
prompt_txt = ParagraphStyle("prompt", fontName="Mono", fontSize=9.3, leading=13.2, textColor=TEXTO, spaceAfter=0)
prompt_cab = ParagraphStyle("prompt_cab", fontName="Segoe-SB", fontSize=9, leading=12, textColor=colors.white)
celula = ParagraphStyle("celula", parent=corpo, fontSize=9.5, leading=13, spaceAfter=0)
celula_b = ParagraphStyle("celula_b", parent=celula, fontName="Segoe-SB")

LARGURA = A4[0] - 40 * mm


def p(t, e=corpo):
    return Paragraph(t, e)


def itens(lista):
    return [Paragraph(t, item, bulletText="•") for t in lista]


def passos(lista):
    return [Paragraph(t, passo, bulletText=f"{i}.") for i, t in enumerate(lista, 1)]


def caixa(titulo, textos, fundo=EXEMPLO_FUNDO, cor=MARINHO_2):
    conteudo = [Paragraph(f"<font name='Segoe-SB' color='{cor.hexval()}'>{titulo}</font>", caixa_txt), Spacer(1, 2)]
    conteudo += [Paragraph(t, caixa_txt) for t in ([textos] if isinstance(textos, str) else textos)]
    t = Table([[conteudo]], colWidths=[LARGURA])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fundo), ("LINEBEFORE", (0, 0), (0, -1), 3, cor),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 8)])


def dica(t):
    return caixa("Dica", t)


def atencao(t):
    return caixa("Atenção", t, AVISO_FUNDO, colors.HexColor("#8a5a00"))


def prompt(codigo, titulo, texto, exemplo=None, rotulo_caixa="PROMPT"):
    """Caixa de prompt: texto em fonte monoespaçada, linha a linha, pronto para copiar."""
    linhas = escape(texto.strip("\n")).split("\n")
    corpo_prompt = "<br/>".join(l.replace("  ", "&nbsp;&nbsp;") if l else "&nbsp;" for l in linhas)
    cab = Table([[Paragraph(f"{rotulo_caixa} {codigo} · {escape(titulo)}" if codigo else f"{rotulo_caixa} · {escape(titulo)}", prompt_cab),
                  Paragraph("copie e cole no Claude Code", ParagraphStyle("d", parent=prompt_cab, fontName="Segoe", alignment=2, textColor=colors.HexColor("#c8d2df")))]],
                colWidths=[LARGURA * 0.62, LARGURA * 0.38])
    cab.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), MARINHO), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                             ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 6),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    caixa_p = Table([[Paragraph(corpo_prompt, prompt_txt)]], colWidths=[LARGURA])
    caixa_p.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PROMPT_FUNDO), ("LINEBEFORE", (0, 0), (0, -1), 3, DOURADO),
                                 ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                                 ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    bloco = [Spacer(1, 10), cab, caixa_p]
    saida = [KeepTogether(bloco) if len(linhas) < 40 else bloco]
    if exemplo:
        saida.append(caixa("Exemplo preenchido (NutriRota)", exemplo))
    return saida


def secao(numero, titulo, subtitulo):
    return [p(f"FASE {numero}", rotulo), p(titulo, h1), p(subtitulo, intro)]


def tabela(linhas, larguras):
    dados = [[Paragraph(c, celula_b if i == 0 or j == 0 else celula) for j, c in enumerate(l)] for i, l in enumerate(linhas)]
    t = Table(dados, colWidths=larguras, repeatRows=1)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDA),
                           ("BACKGROUND", (0, 0), (-1, 0), FUNDO), ("LINEBELOW", (0, 0), (-1, 0), 1, MARINHO),
                           ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return KeepTogether([t, Spacer(1, 10)])


# ---------- Páginas ----------
def capa(c, doc):
    w, h = A4
    c.saveState()
    c.setFillColor(MARINHO)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    cx, cy = w - 62 * mm, h - 70 * mm
    c.setStrokeColor(DOURADO)
    c.setLineWidth(1.2)
    c.circle(cx, cy, 26 * mm, stroke=1, fill=0)
    c.setFillColor(DOURADO)
    pth = c.beginPath()
    pth.moveTo(cx, cy + 22 * mm); pth.lineTo(cx + 5 * mm, cy); pth.lineTo(cx, cy - 22 * mm); pth.lineTo(cx - 5 * mm, cy); pth.close()
    c.drawPath(pth, stroke=0, fill=1)
    c.setFont("Segoe-B", 13)
    c.drawCentredString(cx, cy + 29 * mm, "N")
    c.setFillColor(DOURADO)
    c.setFont("Segoe-SB", 12)
    c.drawString(22 * mm, h - 118 * mm, "GUIA PRÁTICO")
    c.setFillColor(colors.white)
    c.setFont("Segoe-B", 34)
    c.drawString(22 * mm, h - 135 * mm, "Do zero ao app no ar")
    c.setFont("Segoe-B", 34)
    c.drawString(22 * mm, h - 150 * mm, "com o Claude Code")
    c.setFont("Segoe", 13)
    c.setFillColor(colors.HexColor("#c8d2df"))
    c.drawString(22 * mm, h - 163 * mm, "O método usado no NorteArq, com os 13 prompts prontos para copiar")
    c.setStrokeColor(DOURADO)
    c.setLineWidth(2)
    c.line(22 * mm, h - 173 * mm, 62 * mm, h - 173 * mm)
    c.setFont("Segoe-I", 12)
    c.setFillColor(colors.white)
    c.drawString(22 * mm, h - 186 * mm, "Tudo dentro do VS Code: ideia, especificação, visual, código, banco e publicação.")
    c.setFont("Segoe", 9.5)
    c.setFillColor(colors.HexColor("#9fb0c4"))
    c.drawString(22 * mm, 22 * mm, "Versão 1.0 · outubro de 2026 · exemplo usado no guia: NutriRota (app para nutricionistas)")
    c.restoreState()


def pagina(c, doc):
    w, h = c._pagesize
    c.saveState()
    c.setStrokeColor(BORDA)
    c.setLineWidth(0.6)
    c.line(20 * mm, h - 14 * mm, w - 20 * mm, h - 14 * mm)
    c.setFont("Segoe-SB", 8.5)
    c.setFillColor(MARINHO)
    c.drawString(20 * mm, h - 11.5 * mm, "Guia · Do zero ao app no ar")
    c.setFont("Segoe", 8.5)
    c.setFillColor(SUAVE)
    c.drawRightString(w - 20 * mm, h - 11.5 * mm, "Método NorteArq + Claude Code")
    c.line(20 * mm, 14 * mm, w - 20 * mm, 14 * mm)
    c.drawRightString(w - 20 * mm, 9.5 * mm, str(doc.page))
    c.restoreState()


doc = BaseDocTemplate(SAIDA, pagesize=A4, title="Guia · Do zero ao app no ar com o Claude Code", author="NorteArq",
                      subject="Fluxo completo e prompts para criar um app do zero no Claude Code",
                      leftMargin=20 * mm, rightMargin=20 * mm, topMargin=22 * mm, bottomMargin=22 * mm)
quadro = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="quadro")
LW, LH = landscape(A4)
quadro_deitado = Frame(15 * mm, 18 * mm, LW - 30 * mm, LH - 36 * mm, id="deitado")
doc.addPageTemplates([
    PageTemplate(id="capa", frames=[Frame(0, 0, A4[0], A4[1])], onPage=capa),
    PageTemplate(id="normal", frames=[quadro], onPage=pagina),
    PageTemplate(id="deitada", frames=[quadro_deitado], onPage=pagina, pagesize=landscape(A4)),
])

h = [NextPageTemplate("normal"), PageBreak()]

# ---------- Sumário e como usar ----------
h += [p("Como usar este guia", h1), p("Siga as fases na ordem. Em cada uma, copie o prompt da caixa escura, troque o que está entre [colchetes] e cole no Claude Code.", intro)]
h += passos([
    "Abra o <b>fluxograma</b> (próxima página) e veja onde você está.",
    "Copie o prompt da fase: selecione o texto da caixa no PDF, <b>Ctrl+C</b>, e cole no chat do Claude Code com <b>Ctrl+V</b>.",
    "Troque tudo o que estiver entre <b>[colchetes]</b> pelo seu caso. As caixas azuis mostram um exemplo preenchido com a NutriRota.",
    "Espere o Claude terminar, <b>teste</b> o que ele pediu e só então siga para o próximo prompt.",
])
h.append(tabela([
    ["Fase", "O que acontece", "Prompts"],
    ["0 · Preparação", "Contas e pasta do projeto (uma vez)", "—"],
    ["1 · Ideia e especificação", "O Claude te entrevista e escreve a especificação", "P1, P2"],
    ["2 · Identidade visual", "Nome, cores, logo e prévia das telas", "P3, P4"],
    ["3 · Esqueleto", "Projeto com todas as telas e o banco ligado", "P5, P6"],
    ["4 · Construção", "Um módulo por vez, testado e publicado", "P7, P8"],
    ["5 · Publicação", "GitHub e site online na Vercel", "P9, P10"],
    ["6 · Lançamento", "Teste real, melhorias, manual e checklist", "P11, P12, P13"],
    ["Anexo", "Prompts do dia a dia", "—"],
], [42 * mm, LARGURA - 42 * mm - 30 * mm, 30 * mm]))
h.append(caixa("O exemplo deste guia: NutriRota", [
    "App para <b>nutricionistas</b>, com a mesma lógica do NorteArq: o paciente pede atendimento pelo link da nutricionista, "
    "responde a <b>anamnese</b> pelo celular (no lugar do briefing), recebe a <b>proposta</b> de acompanhamento, assina o "
    "<b>contrato</b> e acompanha as <b>consultas e o plano alimentar</b> (no lugar das etapas do projeto), aprovando e tirando dúvidas pelo link.",
]))
h.append(dica("Os prompts funcionam para qualquer app de prestação de serviço: personal trainer, psicólogo, fotógrafo, "
              "advogado, engenheiro, designer… Só muda a ideia que você descreve no P1."))

# ---------- Fluxograma (página deitada) ----------
h.append(NextPageTemplate("deitada"))
h.append(PageBreak())
from PIL import Image as PILImage
im = PILImage.open(FLUXO)
larg = LW - 30 * mm - 14
alt = larg * im.height / im.width
if alt > LH - 36 * mm - 14:
    alt = LH - 36 * mm - 14
    larg = alt * im.width / im.height
h.append(RLImage(FLUXO, width=larg, height=alt))
h.append(NextPageTemplate("normal"))
h.append(PageBreak())

# ---------- Fase 0 ----------
h += secao(0, "Preparação", "Uma vez na vida. Para os próximos apps, você só cria a pasta nova.")
h.append(p("Contas (grátis para começar)", h2))
h.append(tabela([
    ["Serviço", "Para quê", "Onde"],
    ["GitHub", "Guardar o código e o histórico de versões", "github.com"],
    ["Vercel", "Colocar o site no ar (atualiza sozinho)", "vercel.com · entrar com o GitHub"],
    ["Supabase", "Banco de dados, login e arquivos", "supabase.com"],
    ["Canva", "Logo e imagens (conectado ao Claude)", "canva.com"],
    ["Resend", "E-mails automáticos do app", "resend.com"],
], [28 * mm, LARGURA - 28 * mm - 58 * mm, 58 * mm]))
h.append(p("Para cada app novo", h2))
h += passos([
    "Crie uma pasta com o nome do app, por exemplo <b>Desktop › Projetos › nutrirota</b>.",
    "No VS Code: <b>Arquivo › Abrir pasta</b> e escolha essa pasta.",
    "Abra o Claude Code (ícone do Claude na barra lateral) e comece pelo <b>P1</b>.",
])
h.append(caixa("Onde pegar as chaves do Supabase", [
    "<b>URL e chave pública:</b> no projeto do Supabase, <b>Project Settings › API</b>.",
    "<b>Token pessoal:</b> supabase.com/dashboard/account/tokens › <b>Generate new token</b>, com validade curta. "
    "Revogue quando terminar a parte de banco.",
]))
h.append(atencao("Nunca cole senhas, tokens ou chaves no chat. Quando o Claude pedir uma chave, cole no arquivo <b>.env.local</b> "
                 "que ele indicar e só avise \"pronto\"."))
h.append(PageBreak())

# ---------- Fase 1 ----------
h += secao(1, "Ideia e especificação", "A fase mais importante: tudo depois segue o documento que sai daqui.")
h += prompt("P1", "Entrevista da ideia", """
Quero criar um app novo do zero com você, aqui no Claude Code, seguindo o mesmo método do projeto NorteArq.

A ideia, do meu jeito:
[COLE AQUI A SUA IDEIA: o problema, quem usa, como o cliente final participa e como o app ganha dinheiro. Pode colar a transcrição de um áudio.]

Antes de escrever qualquer coisa, me entreviste: faça no máximo 12 perguntas, em blocos, sobre público, dores, jornada do cliente, o que precisa ter na primeira versão, o que fica para depois, concorrentes e como vou cobrar. Use alternativas de múltipla escolha quando der e marque a que você recomenda.
""", exemplo=[
    "<b>A ideia:</b> nutricionistas perdem tempo com anamnese em papel, mensagens soltas no WhatsApp e pacientes que somem. "
    "Quero um app em que o paciente pede atendimento pelo link da nutricionista, responde a anamnese e o recordatório alimentar pelo "
    "celular, recebe e aprova a proposta de acompanhamento, assina o contrato e acompanha consultas, plano alimentar e evolução "
    "(peso e medidas). A nutricionista paga uma assinatura mensal.",
])
h += prompt("P2", "Especificação completa", """
Com as minhas respostas, escreva a especificação completa do app no arquivo docs/especificacao-v1.md, no mesmo formato da especificação do NorteArq (C:\\Users\\Usuário\\Desktop\\Marketing Digital\\app - arquitetura\\NorteArq-especificacao-v1.md):

1. Visão geral: o que é, público, dores, diferenciais e nome
2. Escopo da versão 1 e o que fica para as fases 2 e 3
3. Papéis (quem usa) e acessos: área pública, links sem login para o cliente e área com login
4. Jornada completa em fluxograma
5. Módulos numerados (00, 01, 02...), cada um com objetivo, telas, estados e regras numeradas (RN-01.1, RN-01.2...), marcadas como decidida, sugerida ou em aberto
6. Regras gerais: teste grátis, segurança e LGPD
7. Planos e preços sugeridos
8. Avisos automáticos (e-mail e WhatsApp)
9. Mapa de telas com os endereços
10. Modelo de dados resumido
11. Stack: Next.js + Supabase + Vercel, igual ao NorteArq
12. Roteiro da fase 1 em passos pequenos, um módulo por passo
13. Decisões em aberto, com a sua sugestão para cada uma

Português do Brasil, linguagem simples. No fim, me liste só as decisões que eu preciso responder.
""")
h += prompt("P2b", "Responder as dúvidas e fechar a especificação", """
Minhas decisões:
1. [decisão 1]
2. [decisão 2]
3. [decisão 3]

Atualize a especificação com essas respostas, marque as regras como decididas e me mostre só o que mudou. Se ainda faltar alguma decisão importante, pergunte.
""")
h.append(dica("Repita o P2b até não sobrar dúvida importante. Leia o roteiro da fase 1: é a lista de módulos que você vai construir na Fase 4."))
h.append(PageBreak())

# ---------- Fase 2 ----------
h += secao(2, "Identidade visual", "Nome, cores, logo e a cara das telas principais, antes de programar.")
h += prompt("P3", "Nome, cores e logo", """
Agora a identidade visual do [NOME DO APP]:
1. Se eu ainda não tiver um nome, proponha 5 opções curtas e fáceis de falar, com domínio .com.br sugerido para cada uma.
2. Proponha 2 paletas de cores (com os códigos) e 2 combinações de fontes do Google Fonts, explicando o porquê para o meu público.
3. Gere 3 opções de logo pelo Canva, nas cores sugeridas, em fundo claro, e me mostre.

Depois que eu escolher, salve a logo em public/marca/, recorte o fundo se precisar e anote cores e fontes no CLAUDE.md.
""", exemplo=["<b>Troque [NOME DO APP] por:</b> NutriRota. Depois de escolher, responda: \"Paleta 2, fontes 1, logo B\"."])
h.append(atencao("O Canva gera as imagens, mas o download em alta resolução é feito por você em <b>canva.com › Projetos › Uploads</b>. "
                 "Salve na pasta que o Claude indicar e avise."))
h += prompt("P4", "Prévia das telas principais", """
Monte a prévia das 3 telas principais do [NOME DO APP] já em código, com as cores, a fonte e a logo escolhidas:
1. Login
2. Painel inicial do profissional
3. A tela que o cliente abre pelo link no celular

Abra no navegador, tire os prints (computador e celular) e me mostre. Ainda não precisa funcionar: é só para aprovar o visual.
""")
h += prompt("P4b", "Prévia a partir de uma referência pronta", """
[ARRASTE AQUI A IMAGEM DE REFERÊNCIA, ou informe a pasta onde ela está]

Implemente a tela de [nome da tela] seguindo fielmente essa referência: mesma composição, cores, espaçamentos e textos. Use a fonte do projeto se for parecida. Formulário e textos precisam ser elementos reais, não imagem. Funcione no celular. Tire um print no mesmo tamanho da referência, compare lado a lado e ajuste as diferenças antes de me mostrar.
""")
h.append(PageBreak())

# ---------- Fase 3 ----------
h += secao(3, "Esqueleto do app", "O projeto inteiro de pé, com todas as telas vazias e o banco ligado.")
h += prompt("P5", "Criar o projeto", """
Visual aprovado. Crie o projeto seguindo a especificação docs/especificacao-v1.md:
- Next.js com TypeScript, CSS simples em globals.css, ícones lucide-react e validação com zod: a mesma stack do NorteArq.
- Todas as telas do mapa de telas criadas, mostrando "Em construção" com a lista do que cada uma vai ter.
- Pastas por área: site de vendas, login e cadastro, sistema do profissional (/app), links do cliente sem login (/c/[token]) e portal (/portal).
- CLAUDE.md com o resumo do produto, as regras do projeto, as cores e as fontes.
- README com como rodar e o roteiro de desenvolvimento em checklist.
- Migração inicial do banco em supabase/migrations/0001.

Depois, rode o projeto numa janela própria do terminal e me passe o endereço para eu navegar.
""")
h += prompt("P5b", "Alternativa: começar a partir do NorteArq", """
Crie o projeto novo usando o NorteArq como base (C:\\Users\\Usuário\\Desktop\\Marketing Digital\\app - arquitetura\\nortearq).

Copie tudo o que serve para qualquer app: login, cadastro, recuperar senha, layout do sistema, configuração inicial, links do cliente sem login, máscaras de CPF/CNPJ e WhatsApp, avisos por e-mail, contrato com aceite eletrônico, parcelamento e publicação.
Troque marca, cores, textos e imagens pelos do [NOME DO APP] e remova o que é específico de arquitetura (briefing de ambientes, quiz de estilo, etapas de projeto).
Para o resto, siga a especificação nova. Me liste o que foi reaproveitado e o que ficou para construir.
""")
h.append(dica("O P5b economiza muito tempo: o app novo já nasce com uns 40% pronto e testado. Use quando o negócio for parecido "
              "(profissional que atende clientes, com proposta, contrato e acompanhamento)."))
h += prompt("P6", "Ligar o banco de dados", """
Vamos ligar o banco. Criei um projeto no Supabase chamado [nome] e colei no .env.local:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_ACCESS_TOKEN (token pessoal).

Rode a migração inicial pelo token, ligue a segurança por conta (RLS), crie o cadastro com a configuração inicial e teste o login. Pegue também a chave secreta (SUPABASE_SECRET_KEY) pelo token e grave no .env.local. Nunca mostre as chaves no chat.
""")
h.append(PageBreak())

# ---------- Fase 4 ----------
h += secao(4, "Construir um módulo por vez", "O coração do método. Repita P7 (e P8 quando precisar) para cada módulo do roteiro.")
h += prompt("P7", "Implementar um módulo", """
Continuar projeto: implemente o módulo [NÚMERO E NOME DO MÓDULO], seguindo as regras RN-[XX] da especificação.

Siga o nosso ciclo:
1. Leia as regras do módulo e me diga em até 5 linhas o que vai fazer.
2. Escreva a migração do banco (tabelas, segurança RLS e funções).
3. Teste no banco real dentro de uma transação desfeita no final (rollback), cobrindo também os casos de erro.
4. Faça as telas do profissional e do cliente, com mensagens claras e funcionando no celular.
5. Rode a checagem de tipos e o build de produção.
6. Teste as páginas de verdade no Chrome automático (prints e digitação).
7. Atualize o checklist do README e a memória, faça o commit e envie para o GitHub.

No fim, me diga o que eu devo testar e o que ficou de fora.
""", exemplo=[
    "<b>Continuar projeto: implemente o módulo 02 · Anamnese do paciente, seguindo as regras RN-02.1 a RN-02.9 da especificação.</b>",
    "Depois, um por vez: 03 · Proposta · 04 · Contrato · 05 · Consultas e plano alimentar · 06 · Evolução · 07 · Portal do paciente.",
])
h += prompt("P8", "Ajustar o que não ficou bom", """
[ARRASTE O PRINT DA TELA AQUI]

Nessa tela: [o que está errado ou o que você quer diferente].
Corrija, teste do mesmo jeito (banco, build e navegador) e publique.
""", exemplo=["[print da proposta] Nessa tela: quero que o parcelamento seja escolhido pelo paciente, de 1x até o máximo que eu configurar, com 30% de entrada."])
h.append(p("Ordem que funciona bem", h2))
h += itens([
    "<b>Um módulo por conversa.</b> Ao terminar e testar, digite <b>/clear</b> e comece o próximo com \"Continuar projeto\". O Claude retoma lendo o CLAUDE.md e a memória.",
    "<b>Teste antes de seguir</b>, usando o seu WhatsApp como se fosse o cliente. Mudou uma regra? Atualize a especificação primeiro.",
])
h.append(PageBreak())

# ---------- Fase 5 ----------
h += secao(5, "Publicar na internet", "Site no ar com endereço próprio, atualizando sozinho a cada mudança.")
h += prompt("P9", "Subir no GitHub", """
Vamos publicar. Prepare o projeto para o GitHub: confira se nenhuma senha ou chave vai junto, rode o build de produção e faça o commit.
Criei o repositório vazio e privado em [https://github.com/seu-usuario/nome-do-app]. Envie o código.
""")
h.append(caixa("Você, no navegador (uma vez por app)", [
    "1. <b>github.com/new</b> › nome do app › <b>Private</b> › sem README › Create repository.",
    "2. Depois do P9: <b>vercel.com</b> › Add New › Project › Importar o repositório.",
]))
h += prompt("P10", "Ligar o site online", """
Importei o repositório na Vercel. Me prepare as variáveis de ambiente num arquivo fora da pasta do projeto, para eu colar na Vercel, e me diga o passo a passo.
Quando o site estiver no ar em [https://nome-do-app.vercel.app], configure o Supabase para aceitar o endereço novo (links de confirmação e de nova senha), teste o login e as páginas principais online e apague o arquivo com as chaves.
""")
h.append(dica("Se o primeiro deploy não começar sozinho, peça: \"Dispare a publicação com um commit vazio.\""))
h.append(PageBreak())

# ---------- Fase 6 ----------
h += secao(6, "Teste real e lançamento", "Pessoas de verdade usando, ajustes finais e tudo pronto para cobrar.")
h += prompt("P11", "Rodada de melhorias", """
Testei com [quantas] pessoas. Seguem os prints e os comentários:
[cole a lista ou arraste os prints]

Organize por prioridade (erro, confuso, melhoria), me mostre a lista e corrija na ordem, publicando a cada grupo de ajustes.
""")
h += prompt("P12", "Manual em PDF e README", """
Gere o manual de uso em PDF para os usuários do [NOME DO APP]: capa, sumário, um capítulo por módulo com passo a passo, prints reais das telas, dicas e dúvidas frequentes, no mesmo estilo do manual do NorteArq. Atualize também o README. Salve o PDF na pasta do projeto e abra para eu ver.
""")
h += prompt("P13", "Checklist de lançamento", """
Monte o checklist de lançamento do [NOME DO APP] e me guie em cada item:
- domínio próprio ligado na Vercel
- e-mails pelo Resend com o domínio verificado
- termos de uso e política de privacidade
- revisão jurídica do contrato padrão
- cobrança da assinatura (Asaas ou Stripe)
- planos pagos da Vercel e do Supabase quando houver clientes pagando
- backup do banco e revogar os tokens que não uso mais
""")
h.append(caixa("Pronto: app no ar", "A partir daqui, cada melhoria nova segue o P7 (módulo novo) ou o P8 (ajuste). O site atualiza sozinho em 1 a 2 minutos."))
h.append(PageBreak())

# ---------- Anexo ----------
h += [p("ANEXO", rotulo), p("Prompts do dia a dia", h1), p("Atalhos que você vai usar o tempo todo.", intro)]
dia = [
    ("Retomar", "Continuar projeto."),
    ("Onde parei", "Em qual etapa estamos? Me mostre o checklist do README."),
    ("Ver como está", "Rode o projeto, abra a tela de [nome] e me mostre um print no computador e no celular."),
    ("Imagens pelo Canva", "Gere pelo Canva [descrição da imagem], formato [4:3 / quadrado / vertical]. Depois eu baixo em Uploads e coloco na pasta [nome]."),
    ("Prompts de imagem", "Escreva os prompts para gerar as imagens de [seção], todas com o mesmo padrão de foto, e salve num arquivo de texto."),
    ("Desfazer", "Não gostei. Volte [a tela de X] para a versão anterior."),
    ("Algo quebrou", "[print do erro] Isso apareceu quando eu [o que fez]. Descubra a causa, corrija e me diga o que era."),
    ("Testar no celular", "Quero testar no celular pela rede de casa. Deixe o sistema acessível pelo endereço da rede e me passe o link."),
    ("Guardar uma decisão", "Atualize a memória com o que decidimos hoje: [resumo]."),
    ("Economizar", "Use /model para trocar para o Sonnet em ajustes simples e /clear ao mudar de assunto. Volte para o Opus em módulos novos e problemas difíceis."),
]
for titulo, texto in dia:
    h += prompt("", titulo, texto, rotulo_caixa="ATALHO")

doc.build(h)
print("PDF gerado:", SAIDA)
