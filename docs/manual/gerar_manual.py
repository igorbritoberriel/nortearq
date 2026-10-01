"""Gera o Manual de uso do NorteArq (PDF, A4)."""

import os
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image as RLImage, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.environ.get("SAIDA_MANUAL", os.path.join(AQUI, "Manual-NorteArq.pdf"))

# ---------- Fontes e cores ----------
F = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Segoe", os.path.join(F, "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-B", os.path.join(F, "segoeuib.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-I", os.path.join(F, "segoeuii.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-SB", os.path.join(F, "seguisb.ttf")))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Segoe", normal="Segoe", bold="Segoe-B", italic="Segoe-I", boldItalic="Segoe-B")

NORTE = colors.HexColor("#1f3a5f")
NORTE_ESCURO = colors.HexColor("#132640")
AREIA = colors.HexColor("#c9a46a")
FUNDO = colors.HexColor("#f7f5f1")
BORDA = colors.HexColor("#e3dfd6")
TEXTO = colors.HexColor("#1d1d1b")
SUAVE = colors.HexColor("#5f5e5a")
AVISO_FUNDO = colors.HexColor("#fdf8ef")
DICA_FUNDO = colors.HexColor("#eef2f7")

# ---------- Estilos ----------
corpo = ParagraphStyle("corpo", fontName="Segoe", fontSize=10.5, leading=15.5, textColor=TEXTO, spaceAfter=6, alignment=TA_LEFT)
h1 = ParagraphStyle("h1", fontName="Segoe-B", fontSize=22, leading=27, textColor=NORTE, spaceBefore=0, spaceAfter=4)
rotulo = ParagraphStyle("rotulo", fontName="Segoe-SB", fontSize=8.5, leading=11, textColor=AREIA, spaceAfter=2)
h2 = ParagraphStyle("h2", fontName="Segoe-B", fontSize=13.5, leading=18, textColor=NORTE_ESCURO, spaceBefore=12, spaceAfter=4)
h3 = ParagraphStyle("h3", fontName="Segoe-SB", fontSize=11, leading=15, textColor=TEXTO, spaceBefore=8, spaceAfter=2)
intro = ParagraphStyle("intro", parent=corpo, fontSize=11.5, leading=17, textColor=SUAVE, spaceAfter=10)
item = ParagraphStyle("item", parent=corpo, leftIndent=14, bulletIndent=2, spaceAfter=3)
passo = ParagraphStyle("passo", parent=corpo, leftIndent=18, bulletIndent=0, spaceAfter=4)
caixa_txt = ParagraphStyle("caixa", parent=corpo, fontSize=10, leading=14.5, spaceAfter=0)
legenda = ParagraphStyle("legenda", parent=corpo, fontSize=8.5, leading=11, textColor=SUAVE, alignment=1)
celula = ParagraphStyle("celula", parent=corpo, fontSize=9.5, leading=13, spaceAfter=0)
celula_b = ParagraphStyle("celula_b", parent=celula, fontName="Segoe-SB")

LARGURA = A4[0] - 40 * mm


def p(texto, estilo=corpo):
    return Paragraph(texto, estilo)


def itens(lista):
    return [Paragraph(t, item, bulletText="•") for t in lista]


def passos(lista):
    return [Paragraph(t, passo, bulletText=f"{i}.") for i, t in enumerate(lista, 1)]


def caixa(titulo, texto, fundo=DICA_FUNDO, cor=NORTE):
    conteudo = [Paragraph(f"<font name='Segoe-SB' color='{cor.hexval()}'>{titulo}</font>", caixa_txt), Spacer(1, 2)]
    conteudo += [Paragraph(t, caixa_txt) for t in ([texto] if isinstance(texto, str) else texto)]
    t = Table([[conteudo]], colWidths=[LARGURA])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fundo),
        ("LINEBEFORE", (0, 0), (0, -1), 3, cor),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 8)])


def dica(texto):
    return caixa("Dica", texto)


def atencao(texto):
    return caixa("Atenção", texto, AVISO_FUNDO, colors.HexColor("#8a5a00"))


def tabela(linhas, larguras, cabecalho=True):
    dados = [[Paragraph(c, celula_b if (cabecalho and i == 0) or j == 0 else celula) for j, c in enumerate(l)] for i, l in enumerate(linhas)]
    t = Table(dados, colWidths=larguras, repeatRows=1 if cabecalho else 0)
    estilo = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDA),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]
    if cabecalho:
        estilo += [("BACKGROUND", (0, 0), (-1, 0), FUNDO), ("LINEBELOW", (0, 0), (-1, 0), 1, NORTE)]
    t.setStyle(TableStyle(estilo))
    return KeepTogether([t, Spacer(1, 10)])


def secao(numero, titulo, subtitulo):
    return [p(f"CAPÍTULO {numero}", rotulo), p(titulo, h1), p(subtitulo, intro)]


def recortar(nome, faixa, fim):
    """Remove a faixa de aviso da página de exemplo e corta antes do selo de desenvolvimento."""
    im = Image.open(os.path.join(AQUI, f"{nome}.png")).convert("RGB")
    w, _ = im.size
    topo = im.crop((0, 0, w, faixa[0]))
    resto = im.crop((0, faixa[1], w, fim))
    novo = Image.new("RGB", (w, topo.height + resto.height), "white")
    novo.paste(topo, (0, 0))
    novo.paste(resto, (0, topo.height))
    caminho = os.path.join(AQUI, f"{nome}_manual.png")
    novo.save(caminho)
    return caminho


def figura(caminho, largura_mm, texto):
    im = Image.open(caminho)
    larg = largura_mm * mm
    alt = larg * im.height / im.width
    img = RLImage(caminho, width=larg, height=alt)
    moldura = Table([[img]], colWidths=[larg + 2])
    moldura.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, BORDA), ("LEFTPADDING", (0, 0), (-1, -1), 1),
                                 ("RIGHTPADDING", (0, 0), (-1, -1), 1), ("TOPPADDING", (0, 0), (-1, -1), 1),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    return [moldura, Spacer(1, 3), p(texto, legenda)]


def lado_a_lado(figura_flow, textos, larg_fig=62):
    t = Table([[figura_flow, textos]], colWidths=[larg_fig * mm + 8, LARGURA - larg_fig * mm - 8])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (0, -1), 12)]))
    return t


# ---------- Páginas ----------
def capa(c, doc):
    w, h = A4
    c.saveState()
    c.setFillColor(NORTE_ESCURO)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    # Rosa dos ventos simples
    cx, cy = w - 62 * mm, h - 70 * mm
    c.setStrokeColor(AREIA)
    c.setLineWidth(1.2)
    c.circle(cx, cy, 26 * mm, stroke=1, fill=0)
    c.setFillColor(AREIA)
    caminho = c.beginPath()
    caminho.moveTo(cx, cy + 22 * mm)
    caminho.lineTo(cx + 5 * mm, cy)
    caminho.lineTo(cx, cy - 22 * mm)
    caminho.lineTo(cx - 5 * mm, cy)
    caminho.close()
    c.drawPath(caminho, stroke=0, fill=1)
    c.setFont("Segoe-B", 13)
    c.drawCentredString(cx, cy + 29 * mm, "N")
    # Títulos
    c.setFillColor(colors.white)
    c.setFont("Segoe", 30)
    c.drawString(22 * mm, h - 130 * mm, "Norte")
    largura_norte = pdfmetrics.stringWidth("Norte", "Segoe", 30)
    c.setFillColor(AREIA)
    c.setFont("Segoe-B", 30)
    c.drawString(22 * mm + largura_norte, h - 130 * mm, "Arq")
    c.setFillColor(colors.white)
    c.setFont("Segoe-B", 34)
    c.drawString(22 * mm, h - 150 * mm, "Manual de uso")
    c.setFont("Segoe", 13)
    c.setFillColor(colors.HexColor("#c8d2df"))
    c.drawString(22 * mm, h - 162 * mm, "Para arquitetos e designers de interiores")
    c.setStrokeColor(AREIA)
    c.setLineWidth(2)
    c.line(22 * mm, h - 172 * mm, 62 * mm, h - 172 * mm)
    c.setFont("Segoe-I", 12)
    c.setFillColor(colors.white)
    c.drawString(22 * mm, h - 186 * mm, "“Seu cliente explica o que quer sozinho. Você só projeta.”")
    c.setFont("Segoe", 9.5)
    c.setFillColor(colors.HexColor("#9fb0c4"))
    c.drawString(22 * mm, 22 * mm, "Versão 1.0 · outubro de 2026 · versão de teste (Fase 1)")
    c.restoreState()


def pagina(c, doc):
    w, h = A4
    c.saveState()
    c.setStrokeColor(BORDA)
    c.setLineWidth(0.6)
    c.line(20 * mm, h - 14 * mm, w - 20 * mm, h - 14 * mm)
    c.setFont("Segoe-SB", 8.5)
    c.setFillColor(NORTE)
    c.drawString(20 * mm, h - 11.5 * mm, "NorteArq")
    c.setFont("Segoe", 8.5)
    c.setFillColor(SUAVE)
    c.drawRightString(w - 20 * mm, h - 11.5 * mm, "Manual de uso")
    c.line(20 * mm, 14 * mm, w - 20 * mm, 14 * mm)
    c.drawRightString(w - 20 * mm, 9.5 * mm, str(doc.page))
    c.restoreState()


doc = BaseDocTemplate(SAIDA, pagesize=A4, title="Manual de uso · NorteArq", author="NorteArq",
                      subject="Manual de uso do sistema para arquitetos e designers de interiores",
                      leftMargin=20 * mm, rightMargin=20 * mm, topMargin=22 * mm, bottomMargin=22 * mm)
quadro = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="quadro")
doc.addPageTemplates([
    PageTemplate(id="capa", frames=[Frame(0, 0, A4[0], A4[1])], onPage=capa),
    PageTemplate(id="normal", frames=[quadro], onPage=pagina),
])

img_briefing = recortar("briefing", (180, 360), 1340)
img_proposta = recortar("proposta", (180, 310), 2800)

h = []
h += [NextPageTemplate("normal"), PageBreak()]

# ---------- Sumário ----------
h += [p("Sumário", h1), Spacer(1, 6)]
sumario = [
    ("1", "Como o NorteArq funciona"), ("2", "Primeiro acesso e configuração"), ("3", "Contatos: pedidos de orçamento"),
    ("4", "Clientes e links pelo WhatsApp"), ("5", "Briefing e Perfil do Cliente"), ("6", "Proposta"),
    ("7", "Contrato com aceite eletrônico"), ("8", "Projeto, etapas e aprovações"), ("9", "Avisos por e-mail"),
    ("10", "Dúvidas frequentes"),
]
t = Table([[p(f"<font color='{AREIA.hexval()}'><b>{n}</b></font>", celula), p(titulo, celula)] for n, titulo in sumario],
          colWidths=[12 * mm, LARGURA - 12 * mm])
t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDA), ("TOPPADDING", (0, 0), (-1, -1), 6),
                       ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
h += [t, Spacer(1, 16)]
h.append(caixa("Sobre esta versão", [
    "O NorteArq está em fase de testes. Este manual descreve o que já funciona hoje. Recursos ainda em construção "
    "(aditivos, aprovações externas, portal do cliente com login e assinatura do NorteArq) aparecem marcados como "
    "<b>em breve</b>.",
]))
h.append(PageBreak())

# ---------- 1 ----------
h += secao(1, "Como o NorteArq funciona",
           "Do primeiro contato ao projeto aprovado, tudo num lugar só, e o cliente responde pelo celular.")
h.append(p("O NorteArq organiza o caminho de cada cliente em seis passos. Em cada um, o cliente recebe um "
           "<b>link pelo WhatsApp</b>, abre no celular, sem login e sem instalar nada, e sempre vê a "
           "<b>marca do seu escritório</b>, não a do NorteArq."))
fluxo = [
    ["Passo", "O que acontece", "Quem age"],
    ["1. Contato", "O cliente preenche o seu formulário de pedido de orçamento. O sistema classifica o pedido pelo orçamento.", "Cliente"],
    ["2. Briefing", "O cliente responde as perguntas do projeto, faz o quiz de estilo e envia fotos. Você recebe o Perfil do Cliente.", "Cliente"],
    ["3. Proposta", "Você monta a proposta. O cliente aprova, pede ajuste ou recusa pelo link.", "Você e o cliente"],
    ["4. Contrato", "O contrato sai pronto da proposta. O cliente confere os dados e aceita.", "Você e o cliente"],
    ["5. Projeto", "Você envia os arquivos de cada etapa. O cliente aprova ou pede revisão, com o contador de revisões visível.", "Você e o cliente"],
    ["6. Pagamentos", "As parcelas do contrato viram uma lista para você marcar como pagas.", "Você"],
]
h.append(tabela(fluxo, [26 * mm, LARGURA - 56 * mm, 30 * mm]))
h.append(p("O endereço do sistema do escritório é <b>/app</b> (com login). Os links do cliente começam com <b>/c/</b> e "
           "o seu formulário público com <b>/e/</b>."))
h.append(dica("O briefing completo pode vir antes ou depois da proposta. Você escolhe na configuração inicial "
              "(e muda depois em Configurações)."))
h.append(PageBreak())

# ---------- 2 ----------
h += secao(2, "Primeiro acesso e configuração", "Leva poucos minutos e deixa tudo com a cara do seu escritório.")
h.append(p("Criar a conta", h2))
h += passos([
    "Acesse a página <b>Criar conta</b>, informe seu nome, o nome do escritório, o WhatsApp, o e-mail e uma senha.",
    "Confirme o e-mail pelo link que chega na sua caixa de entrada.",
    "Entre em <b>Entrar</b> com o e-mail e a senha. Esqueceu a senha? Use <b>Esqueci minha senha</b>.",
])
h.append(p("Configuração inicial", h2))
h.append(p("No primeiro acesso, o sistema abre um assistente em quatro partes:"))
h.append(tabela([
    ["Parte", "O que preencher"],
    ["Sua marca", "Nome do escritório, logo (PNG, JPG ou WEBP, até 2 MB), cor principal, WhatsApp e o endereço do seu formulário. "
                  "O cliente vê essa logo e essa cor em todos os links."],
    ["Serviços", "Marque o que você oferece (Arquitetura, Interiores, Reforma, Legalização…). Dá para renomear, criar outros e "
                 "dizer quais têm briefing."],
    ["Faixa de preço e agenda", "O <b>menor orçamento que você aceita</b> (usado para classificar os pedidos) e quando você consegue "
                                "começar um projeto novo (usado no alerta de prazo apertado)."],
    ["Briefing", "Se o cliente responde o briefing completo <b>antes da proposta</b> ou <b>depois do contrato assinado</b>."],
], [40 * mm, LARGURA - 40 * mm]))
h.append(p("Tudo isso pode ser mudado depois em <b>Configurações</b>."))
h.append(p("O que mais vale preparar antes do primeiro cliente", h2))
h += itens([
    "<b>Contratos → Modelo e dados do escritório</b>: seu CPF ou CNPJ, endereço, quem assina e o registro no CAU/CREA. "
    "Eles entram no contrato.",
    "<b>Briefings → Editar perguntas e imagens</b>: envie pelo menos <b>12 fotos de ambientes</b>, cada uma com o seu estilo, "
    "para o quiz de estilo aparecer para o cliente.",
    "Revise as perguntas do briefing e o texto do contrato (veja os capítulos 5 e 7).",
])
h.append(PageBreak())

# ---------- 3 ----------
h += secao(3, "Contatos: pedidos de orçamento", "O seu formulário filtra quem cabe no seu perfil antes da primeira conversa.")
h.append(p("Seu formulário público", h2))
h.append(p("Na configuração você ganha um endereço como <b>nortearq.com.br/e/seu-escritorio</b>. Coloque na bio do Instagram "
           "e mande no WhatsApp. O cliente informa nome, WhatsApp, e-mail, os serviços, a área, o local, quanto pretende "
           "investir, quando quer começar e uma mensagem, e aceita a política de privacidade."))
h.append(p("Como o pedido é classificado", h2))
h.append(tabela([
    ["Classificação", "Quando acontece"],
    ["Compatível", "O orçamento informado é igual ou maior que o menor valor que você aceita."],
    ["Fora do perfil", "O orçamento informado é menor que o seu valor mínimo."],
    ["A avaliar", "O cliente não informou o orçamento (ou você não definiu o valor mínimo)."],
    ["Prazo apertado", "Alerta extra: o cliente quer começar antes da data em que você consegue. Não muda a classificação."],
], [38 * mm, LARGURA - 38 * mm]))
h.append(atencao("O filtro só sinaliza. Ele nunca bloqueia ninguém: quem decide é você."))
h.append(p("O que fazer com cada pedido", h2))
h += itens([
    "As abas <b>Em aberto, Compatíveis, A avaliar, Fora do perfil e Encerrados</b> separam os pedidos. Os que você ainda não viu "
    "aparecem com o selo <b>Novo</b>.",
    "Mude a <b>Classificação</b> se achar que o filtro errou.",
    "<b>Virar cliente</b>: cria o cliente com todos os dados que ele já preencheu, sem redigitar nada.",
    "<b>Encerrar contato</b>: pede o motivo (orçamento, prazo, escopo, sem retorno ou outro) e uma observação opcional.",
])
h.append(PageBreak())

# ---------- 4 ----------
h += secao(4, "Clientes e links pelo WhatsApp", "A ficha do cliente é o centro de tudo: dela saem o briefing, a proposta e o contrato.")
h.append(p("A ficha do cliente", h2))
h += itens([
    "<b>Dados do cliente</b>: nome, WhatsApp, e-mail, CPF ou CNPJ, endereço do imóvel, serviços e observações internas (só você vê).",
    "<b>Etapa</b>: em que ponto o cliente está (primeiro contato, briefing, proposta, contrato, projeto…). Ela avança sozinha com os "
    "eventos, e você também pode ajustar.",
    "<b>Pedido de orçamento</b> original e a <b>linha do tempo</b>: links gerados, briefing respondido, contrato assinado.",
    "<b>Enviar para o cliente</b>: os blocos de Briefing, Proposta e Contrato.",
])
h.append(p("Como funcionam os links", h2))
h += passos([
    "Clique em <b>Gerar link e enviar no WhatsApp</b>. O WhatsApp abre com a mensagem pronta para o cliente.",
    "Se o cliente não tiver WhatsApp cadastrado, use <b>Copiar mensagem com o link</b> e envie por onde preferir.",
])
h.append(tabela([
    ["Regra", "Na prática"],
    ["Cada link é pessoal", "Mostra só os dados daquele cliente e daquele item, com a marca do seu escritório."],
    ["Link novo desativa o anterior", "Se o cliente perdeu a mensagem, gere de novo: o link antigo para de funcionar."],
    ["Validade", "30 dias para briefing, proposta e contrato; 90 dias para o link do projeto. Vencido, o cliente vê um botão "
                 "para pedir um link novo pelo WhatsApp."],
], [48 * mm, LARGURA - 48 * mm]))
h.append(PageBreak())

# ---------- 5 ----------
h += secao(5, "Briefing e Perfil do Cliente", "O cliente explica o que quer sozinho, com imagens. Você recebe tudo organizado.")
textos_briefing = [
    p("O que o cliente vê", h2),
    p("Um passo a passo no celular, com barra de progresso:"),
    *itens([
        "<b>Quiz de estilo</b>: uma imagem por vez, “gosto” ou “não gosto”.",
        "<b>Blocos dos serviços contratados</b>: arquitetura, interiores (ele escolhe os ambientes e cada um tem perguntas próprias) e reforma.",
        "<b>Rotina e referências</b>: rotina, prioridades, investimento, fotos de referência e fotos e documentos do imóvel "
        "(até 20 arquivos por pergunta, 10 MB cada).",
        "<b>Revisão e envio</b>: mostra o que falta responder. Pode deixar em branco o que não souber.",
    ]),
    p("Tudo é <b>salvo sozinho</b>: o cliente pode parar e continuar depois pelo mesmo link. Depois de enviado, ele não edita mais."),
]
h.append(lado_a_lado(figura(img_briefing, 58, "Tela inicial do briefing no celular, com a marca do escritório."), textos_briefing))
h.append(p("Perfil do Cliente", h2))
h.append(p("Em <b>Briefings</b>, abra o cliente para ver:"))
h += itens([
    "<b>Estilo principal e secundários</b>, com a porcentagem de “gosto” de cada estilo e as imagens que ele curtiu. "
    "Em caso de empate, aparecem dois estilos principais.",
    "As respostas organizadas por bloco e por ambiente, e as fotos enviadas.",
    "<b>Baixar PDF</b>: gera o Perfil do Cliente com a sua marca (no navegador, escolha “Salvar como PDF”).",
    "<b>Validar com o cliente</b>: depois da reunião, marque como validado. Ele vira o programa de necessidades oficial.",
    "<b>Reabrir para o cliente</b>: libera o mesmo link para ele corrigir ou completar.",
])
h.append(p("Editor de perguntas e imagens", h2))
h += itens([
    "Ligue ou desligue perguntas, mude a ordem e crie perguntas próprias (texto, escolha única, múltipla escolha, número, sim ou não, fotos).",
    "As perguntas padrão do NorteArq podem ser desativadas, mas não apagadas.",
    "<b>Quiz de estilo</b>: envie fotos e marque o estilo de cada uma (contemporâneo, minimalista, industrial, clássico, "
    "escandinavo, rústico, boho, japandi). O quiz só aparece com 12 imagens ou mais.",
])
h.append(atencao("Mudanças no editor valem para os <b>próximos</b> briefings. Quem já recebeu o link continua com as perguntas da época. "
                 "Use fotos suas ou com licença de uso no quiz."))
h.append(PageBreak())

# ---------- 6 ----------
h += secao(6, "Proposta", "Escopo, valores e o que está incluído, aprovados com um toque e registrados como prova.")
textos_proposta = [
    p("Criar e enviar", h2),
    *passos([
        "Na ficha do cliente, clique em <b>Nova proposta</b>. Os serviços dele já vêm listados.",
        "Preencha a apresentação, o escopo e os entregáveis de cada serviço (um por linha).",
        "Informe o <b>valor total</b> e as <b>parcelas</b>. O botão <b>Sugerir 30% de entrada + saldo</b> ajuda, e o sistema "
        "avisa se a soma não bater.",
        "Defina o prazo, as <b>revisões</b> e as <b>visitas incluídas</b>, o que <b>não está incluído</b> e a validade (15 dias, se não mudar).",
        "Clique em <b>Salvar rascunho</b> quando quiser e em <b>Enviar no WhatsApp</b> quando estiver pronta.",
    ]),
    p("O que o cliente pode fazer", h2),
    *itens([
        "<b>Aprovar</b>.",
        "<b>Pedir ajuste</b>, com comentário obrigatório.",
        "<b>Recusar</b>, escolhendo o motivo.",
    ]),
    p("Cada resposta fica registrada com data, hora e IP."),
]
h.append(lado_a_lado(figura(img_proposta, 58, "Proposta como o cliente vê no celular."), textos_proposta))
h.append(p("Versões e validade", h2))
h += itens([
    "Proposta enviada <b>não pode ser editada</b>. Para mudar, use <b>Criar nova versão</b> (v2, v3…). O <b>mesmo link</b> passa "
    "a mostrar a versão mais recente.",
    "Depois da validade, o cliente vê “proposta expirada” e não consegue mais responder. Crie uma nova versão para reenviar.",
    "Se o cliente perdeu a mensagem, use <b>Reenviar no WhatsApp</b>: o link anterior deixa de valer.",
])
h.append(p("Resultado das propostas", h2))
h.append(p("A tela <b>Propostas</b> mostra a sua taxa de aprovação e <b>por que os clientes recusaram</b> (preço, prazo, escopo, "
           "outro profissional…). É onde você descobre onde está perdendo clientes."))
h.append(PageBreak())

# ---------- 7 ----------
h += secao(7, "Contrato com aceite eletrônico", "Gerado da proposta aprovada, sem redigitar nada.")
h.append(p("Antes do primeiro contrato", h2))
h += itens([
    "Em <b>Contratos → Modelo e dados do escritório</b>, preencha CPF ou CNPJ, endereço, quem assina e o registro profissional.",
    "Revise o <b>texto do modelo</b>. Ele usa <b>campos automáticos</b>, como {{cliente.nome}} e {{proposta.valor_total}}, que "
    "o sistema troca pelos dados reais. Clique num campo da lista para inserir no texto.",
])
h.append(atencao("O texto padrão é um ponto de partida. Peça para um advogado revisar o seu modelo antes de usar com clientes."))
h.append(p("Gerar, enviar e assinar", h2))
h += passos([
    "Na proposta aprovada, clique em <b>Gerar contrato</b>. Ele já vem preenchido com o cliente, os serviços, os valores, as "
    "parcelas, o prazo, as revisões e as visitas.",
    "Se quiser, ajuste o texto <b>só deste cliente</b> e confira em <b>Ver como o cliente vai ler</b>.",
    "Clique em <b>Enviar no WhatsApp</b>. A partir daqui o texto trava, e o envio vale como o <b>seu aceite</b>.",
    "O cliente lê, confere ou completa o nome, o CPF ou CNPJ e o endereço do imóvel, marca “Li e concordo” e clica em "
    "<b>Assinar contrato</b>.",
])
h.append(p("O registro do aceite", h2))
h.append(p("O contrato assinado mostra o nome e o documento de quem aceitou, a data e a hora, o IP, o navegador e um "
           "<b>código de verificação</b>: uma impressão digital do texto. Se alguém alterar uma vírgula, o código deixa de bater. "
           "Os dois lados podem salvar o contrato em PDF."))
h.append(p("O que acontece quando o cliente assina", h2))
h += itens([
    "O <b>projeto é criado sozinho</b>, com as etapas padrão e as revisões e visitas da proposta.",
    "As parcelas viram <b>Pagamentos</b>: marque cada uma como paga quando receber. O NorteArq não cobra o seu cliente.",
    "Você e o cliente recebem um e-mail de confirmação (se o e-mail do cliente estiver cadastrado).",
])
h.append(PageBreak())

# ---------- 8 ----------
h += secao(8, "Projeto, etapas e aprovações", "Arquivos organizados por etapa e cada aprovação registrada, sem revisão infinita.")
h.append(p("Etapas", h2))
h.append(p("Todo projeto começa com <b>Estudo preliminar → Anteprojeto → Aprovações externas → Projeto executivo → Entrega</b>. "
           "Você pode renomear, mudar a ordem, apagar as que ainda não começaram e adicionar outras (ex.: Projeto luminotécnico)."))
h.append(tabela([
    ["Situação da etapa", "Significado"],
    ["Não iniciada", "Ainda sem arquivos."],
    ["Em andamento", "Você já enviou arquivos e está trabalhando."],
    ["Aguardando aprovação", "Enviada ao cliente, esperando a resposta."],
    ["Em revisão", "O cliente pediu mudanças. Envie a versão nova e mande de novo."],
    ["Aprovada", "Fechada. Mudanças depois disso viram aditivo (em breve)."],
], [44 * mm, LARGURA - 44 * mm]))
h.append(p("Arquivos e versões", h2))
h += itens([
    "Envie os arquivos na etapa (até 50 MB cada). <b>Mesmo nome = versão nova</b> (Rev01, Rev02…). A anterior nunca é apagada "
    "e fica em “Versões anteriores”.",
    "O ícone de olho define se o arquivo é <b>visível ao cliente</b> ou só seu (interno).",
    "PDF e imagens abrem na tela do cliente. DWG, SKP e outros formatos ficam para baixar.",
])
h.append(p("Enviar para aprovação", h2))
h += passos([
    "Com pelo menos <b>um arquivo visível</b>, clique em <b>Enviar para aprovação no WhatsApp</b>.",
    "O cliente abre o link, vê os arquivos e <b>aprova</b> ou <b>pede revisão</b> (com comentário obrigatório). Fica registrado com data, hora e IP.",
    "Etapa aprovada não volta atrás. Para lembrar o cliente, use <b>Lembrar o cliente no WhatsApp</b>.",
])
h.append(p("Controle de revisões", h2))
h += itens([
    "O contador <b>“revisões usadas: 2 de 3”</b> aparece para você e para o cliente.",
    "Antes de pedir revisão, o cliente vê quantas ainda tem. Se já usou todas, ele é avisado de que a revisão pode ser cobrada.",
    "Revisão acima do limite fica marcada no histórico. Você escolhe <b>Conceder como cortesia</b> (não conta) ou cobrar como "
    "aditivo (em breve).",
])
h.append(dica("Use o bloco <b>Link do cliente</b> no topo do projeto para mandar um link só de acompanhamento, sem etapa nova para aprovar."))
h.append(PageBreak())

# ---------- 9 ----------
h += secao(9, "Avisos por e-mail", "Você fica sabendo na hora, sem precisar abrir o sistema.")
h.append(tabela([
    ["Quando", "Quem recebe"],
    ["Chega um pedido de orçamento", "Você"],
    ["O cliente envia o briefing", "Você"],
    ["O cliente aprova, pede ajuste ou recusa a proposta", "Você"],
    ["O contrato é assinado", "Você e o cliente"],
    ["Uma etapa é enviada para aprovação", "O cliente (se tiver e-mail cadastrado)"],
    ["O cliente aprova ou pede revisão de uma etapa", "Você (com alerta se passou do limite de revisões)"],
], [LARGURA - 60 * mm, 60 * mm]))
h.append(p("O WhatsApp continua sendo o canal principal com o cliente: os botões do sistema abrem a conversa com a mensagem "
           "pronta. O envio automático pelo WhatsApp fica para uma próxima fase."))
h.append(PageBreak())

# ---------- 10 ----------
h += secao(10, "Dúvidas frequentes", "")
faq = [
    ("O cliente diz que o link não abre.", "O link pode ter vencido ou ter sido trocado por um mais novo. Gere de novo na ficha do "
                                            "cliente (ou na proposta, no contrato ou no projeto) e reenvie."),
    ("Mandei a proposta com erro. Posso corrigir?", "Proposta enviada não se edita. Clique em <b>Criar nova versão</b>, corrija e "
                                                    "envie: o mesmo link do cliente mostra a versão nova."),
    ("O cliente quer mudar o briefing depois de enviar.", "No Perfil do Cliente, clique em <b>Reabrir para o cliente</b>. Ele "
                                                          "corrige pelo mesmo link e envia de novo."),
    ("O quiz de estilo não aparece para o cliente.", "Ele só aparece com 12 imagens de estilo ou mais. Envie em Briefings → "
                                                     "Editar perguntas e imagens. Vale para os próximos briefings."),
    ("Posso apagar um arquivo enviado ao cliente?", "Enquanto a etapa está aberta, sim. Depois de enviada para aprovação, não: "
                                                    "envie uma versão nova com o mesmo nome."),
    ("O contrato mostra “[a preencher]”.", "Falta algum dado: do escritório (em Contratos → Modelo e dados do escritório) ou do "
                                           "cliente (CPF e endereço, que ele mesmo completa antes de assinar)."),
    ("Meus dados e os dos meus clientes ficam seguros?", "Cada escritório só enxerga os próprios dados, e cada link do cliente só "
                                                         "abre os itens dele. Fotos e arquivos ficam em armazenamento privado."),
]
for pergunta, resposta in faq:
    h.append(KeepTogether([p(pergunta, h3), p(resposta)]))

doc.build(h)
print("PDF gerado:", SAIDA)
