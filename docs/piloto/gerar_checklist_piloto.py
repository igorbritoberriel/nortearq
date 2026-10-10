"""Gera o Checklist do piloto (PDF, A4) — uma etapa por página, para testar com a Débora."""

import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.environ.get("SAIDA_CHECKLIST", os.path.join(AQUI, "Checklist-Piloto-NorteArq.pdf"))

# ---------- Fontes e cores (mesma identidade do manual) ----------
F = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Segoe", os.path.join(F, "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-B", os.path.join(F, "segoeuib.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-I", os.path.join(F, "segoeuii.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-SB", os.path.join(F, "seguisb.ttf")))
registerFontFamily("Segoe", normal="Segoe", bold="Segoe-B", italic="Segoe-I", boldItalic="Segoe-B")

NORTE = colors.HexColor("#1f3a5f")
NORTE_ESCURO = colors.HexColor("#132640")
AREIA = colors.HexColor("#c9a46a")
FUNDO = colors.HexColor("#f7f5f1")
BORDA = colors.HexColor("#e3dfd6")
TEXTO = colors.HexColor("#1d1d1b")
SUAVE = colors.HexColor("#5f5e5a")

corpo = ParagraphStyle("corpo", fontName="Segoe", fontSize=10.5, leading=15.5, textColor=TEXTO, spaceAfter=6, alignment=TA_LEFT)
rotulo = ParagraphStyle("rotulo", fontName="Segoe-SB", fontSize=9, leading=12, textColor=AREIA, spaceAfter=2)
h1 = ParagraphStyle("h1", fontName="Segoe-B", fontSize=20, leading=25, textColor=NORTE, spaceAfter=4)
intro = ParagraphStyle("intro", parent=corpo, fontSize=11, leading=16, textColor=SUAVE, spaceAfter=10)
passo_num = ParagraphStyle("passo_num", parent=corpo, fontName="Segoe-SB", fontSize=10.5, textColor=colors.white, alignment=1)
passo_txt = ParagraphStyle("passo_txt", parent=corpo, fontSize=10.8, leading=16, spaceAfter=0)
obs_titulo = ParagraphStyle("obs_titulo", parent=corpo, fontName="Segoe-SB", fontSize=9.5, textColor=SUAVE, spaceAfter=0)

LARGURA = A4[0] - 40 * mm


def p(texto, estilo=corpo):
    return Paragraph(texto, estilo)


def passos(lista):
    """Lista numerada, cada item com uma bolinha numerada e uma caixinha de marcar ao lado."""
    linhas = []
    for i, texto in enumerate(lista, 1):
        bola = Table([[Paragraph(str(i), passo_num)]], colWidths=[6.5 * mm], rowHeights=[6.5 * mm])
        bola.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NORTE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        caixa = Table([[""]], colWidths=[5.5 * mm], rowHeights=[5.5 * mm])
        caixa.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 1.1, SUAVE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        linha = Table([[bola, Paragraph(texto, passo_txt), caixa]],
                       colWidths=[9 * mm, LARGURA - 9 * mm - 14 * mm, 14 * mm])
        linha.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (2, 0), (2, 0), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDA),
        ]))
        linhas.append(linha)
    return linhas


def observacao():
    caixa = Table([[Paragraph("Observações (o que deu errado, se deu):", obs_titulo)], [Spacer(1, 16 * mm)]],
                   colWidths=[LARGURA])
    caixa.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BORDA), ("BACKGROUND", (0, 0), (-1, -1), FUNDO),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return caixa


def etapa(numero, titulo, lista_passos):
    conteudo = [p(f"ETAPA {numero} DE 9", rotulo), p(titulo, h1), Spacer(1, 8)]
    conteudo += passos(lista_passos)
    conteudo += [Spacer(1, 14), observacao()]
    return conteudo


# ---------- Páginas de moldura ----------
def capa(c, doc):
    w, h = A4
    c.saveState()
    c.setFillColor(NORTE_ESCURO)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Segoe", 26)
    c.drawString(22 * mm, h - 110 * mm, "Checklist do piloto")
    c.setFont("Segoe-B", 34)
    c.setFillColor(AREIA)
    c.drawString(22 * mm, h - 128 * mm, "NorteArq")
    c.setStrokeColor(AREIA)
    c.setLineWidth(2)
    c.line(22 * mm, h - 138 * mm, 62 * mm, h - 138 * mm)
    c.setFont("Segoe", 12.5)
    c.setFillColor(colors.HexColor("#c8d2df"))
    c.drawString(22 * mm, h - 150 * mm, "9 etapas, do pedido de orçamento ao pagamento,")
    c.drawString(22 * mm, h - 157 * mm, "para testar de ponta a ponta com a Débora.")
    c.setFont("Segoe", 9.5)
    c.setFillColor(colors.HexColor("#9fb0c4"))
    c.drawString(22 * mm, 22 * mm, "Versão de teste · outubro de 2026")
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
    c.drawRightString(w - 20 * mm, h - 11.5 * mm, "Checklist do piloto")
    c.line(20 * mm, 14 * mm, w - 20 * mm, 14 * mm)
    c.drawRightString(w - 20 * mm, 9.5 * mm, str(doc.page))
    c.restoreState()


doc = BaseDocTemplate(SAIDA, pagesize=A4, title="Checklist do piloto · NorteArq", author="NorteArq",
                       subject="Checklist de teste do piloto com a Débora",
                       leftMargin=20 * mm, rightMargin=20 * mm, topMargin=22 * mm, bottomMargin=22 * mm)
quadro = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="quadro")
doc.addPageTemplates([
    PageTemplate(id="capa", frames=[Frame(0, 0, A4[0], A4[1])], onPage=capa),
    PageTemplate(id="normal", frames=[quadro], onPage=pagina),
])

h = []

# ---------- Capa (frame cheio) + como usar ----------
from reportlab.platypus import NextPageTemplate
h += [NextPageTemplate("normal"), PageBreak()]
h += [p("Como usar este checklist", h1), Spacer(1, 4)]
h.append(p(
    "Faça o teste inteiro no <b>escritório de teste</b> (login igorbritoberriel@gmail.com), fazendo você mesmo o "
    "papel do cliente final — use outro e-mail e, se puder, outro número de WhatsApp para receber as mensagens. "
    "Marque a caixinha de cada passo ao concluir e anote na caixa de observações qualquer coisa que não funcionou "
    "como esperado, travou ou pareceu confusa.", intro))
h.append(p(
    "São 9 etapas, cada uma numa página, na ordem do fluxo real: pedido de orçamento → proposta → contrato → "
    "briefing → projeto → revisão → aditivo e pagamento → recuperação de senha.", intro))
h.append(PageBreak())

# ---------- Etapa 1 ----------
h += etapa(1, "Pedido de orçamento pelo formulário (celular)", [
    "No celular, abra o link do formulário do escritório de teste (nortearq.com.br/e/endereço-do-escritório).",
    "Preencha <b>Seu nome</b>, <b>WhatsApp</b> e <b>E-mail</b> — use um e-mail e WhatsApp diferentes dos seus, "
    "fazendo o papel do cliente.",
    "Marque o que precisa em <b>\"O que você precisa?\"</b> (os outros campos são opcionais).",
    "Marque o aceite \"Autorizo o uso destes dados...\" (obrigatório).",
    "Toque em <b>\"Pedir orçamento\"</b>.",
    "Confirme que apareceu a tela <b>\"Pedido enviado!\"</b>, com o botão \"Falar no WhatsApp agora\".",
])
h.append(PageBreak())

# ---------- Etapa 2 ----------
h += etapa(2, "Virar cliente e montar a proposta; salvar como modelo", [
    "No painel, abra <b>Contatos</b> e encontre o pedido com o selo \"Novo\".",
    "Clique em <b>\"Virar cliente\"</b>. Você é levado para a ficha do novo cliente.",
    "Na ficha, em \"Enviar para o cliente\" → Proposta, clique em <b>\"Nova proposta\"</b>.",
    "Preencha a apresentação, os serviços e entregáveis, os honorários e pagamento, o prazo e o que está incluído.",
    "Clique em <b>\"Salvar como modelo\"</b> e dê um nome, para testar que o modelo fica salvo.",
    "Clique em <b>\"Revisar e enviar\"</b>, confira a pré-visualização e envie no WhatsApp.",
])
h.append(PageBreak())

# ---------- Etapa 3 ----------
h += etapa(3, "Cliente aprova a proposta pelo link (celular)", [
    "No celular (como cliente), abra o link da proposta recebido no WhatsApp.",
    "Leia a proposta até o fim.",
    "Em \"O que você achou?\", toque em <b>\"Aprovar proposta\"</b>.",
    "Escolha a forma de pagamento (Pix, boleto ou cartão) e o número de parcelas.",
    "Toque em <b>\"Confirmar aprovação\"</b>.",
    "Confirme a mensagem final <b>\"Proposta aprovada!\"</b>.",
])
h.append(PageBreak())

# ---------- Etapa 4 ----------
h += etapa(4, "Gerar o contrato e o cliente assinar (celular); convite do portal", [
    "No painel, na proposta aprovada, clique em <b>\"Gerar contrato\"</b>.",
    "Confira os dados preenchidos (cliente, serviços, valores, parcelas, prazo, revisões e visitas).",
    "Clique em <b>\"Enviar no WhatsApp\"</b> — a partir daqui o texto trava.",
    "No celular (como cliente), abra o link, confira ou complete CPF/CNPJ e endereço do imóvel.",
    "Marque \"Li e concordo\" e toque em <b>\"Assinar contrato\"</b>.",
    "Confira se chegou o convite do portal do cliente (e-mail com o link de acesso) e se o login funciona.",
])
h.append(PageBreak())

# ---------- Etapa 5 ----------
h += etapa(5, "Briefing com o quiz de estilo; Perfil do Cliente", [
    "No celular (como cliente), abra o link do briefing.",
    "Responda o quiz de estilo: toque em <b>\"Gosto\"</b> ou <b>\"Não gosto\"</b> em cada imagem até o fim.",
    "Complete os blocos dos serviços contratados (arquitetura, interiores, reforma) e envie o briefing.",
    "No painel, na ficha do cliente, clique em <b>\"Ver o Perfil do Cliente\"</b>.",
    "Confira o estilo principal, as imagens curtidas e as respostas organizadas por bloco.",
])
h.append(PageBreak())

# ---------- Etapa 6 ----------
h += etapa(6, "Etapa com arquivo enviado; e-mail ao cliente; cliente pede revisão", [
    "No painel, abra o projeto e, numa etapa, use \"Enviar arquivos\" para subir um arquivo de teste.",
    "Clique em <b>\"Enviar para aprovação\"</b> (ou \"...no WhatsApp\", se o cliente tiver telefone).",
    "Confira se chegou e-mail ao cliente avisando da etapa (se ele tiver e-mail cadastrado).",
    "No celular (como cliente), abra o link da etapa e toque em <b>\"Pedir revisão\"</b>.",
    "Escreva o que precisa mudar e confirme em <b>\"Enviar pedido de revisão\"</b>.",
])
h.append(PageBreak())

# ---------- Etapa 7 ----------
h += etapa(7, "Reenviar a etapa e o cliente aprovar", [
    "No painel, suba a nova versão do arquivo (mesmo nome do anterior).",
    "Clique em <b>\"Enviar para aprovação\"</b> de novo (ou \"Lembrar o cliente no WhatsApp\").",
    "No celular (como cliente), abra o link e toque em <b>\"Aprovar etapa\"</b>.",
    "Confirme em <b>\"Confirmar aprovação\"</b> e veja o contador de revisões atualizado.",
])
h.append(PageBreak())

# ---------- Etapa 8 ----------
h += etapa(8, "Aditivo criado e respondido; pagamento registrado e recibo", [
    "No projeto, na seção \"Aditivos\", clique em <b>\"Novo aditivo\"</b>.",
    "Preencha o que o aditivo cobre, o valor, a forma de pagamento, os dias extras e as revisões/visitas extras.",
    "Clique em <b>\"Criar aditivo\"</b>.",
    "No celular (como cliente), toque em <b>\"Aprovar aditivo\"</b> e confirme.",
    "No contrato, na lista de parcelas, clique em <b>\"Registrar pagamento\"</b> numa parcela.",
    "Confira o botão <b>\"Recibo\"</b> (abre o link) e <b>\"Enviar recibo\"</b> (manda pelo WhatsApp).",
])
h.append(PageBreak())

# ---------- Etapa 9 ----------
h += etapa(9, "\"Esqueci a senha\" (e-mail chega e funciona)", [
    "Na tela de entrada (nortearq.com.br/entrar), clique em <b>\"Esqueci minha senha\"</b>.",
    "Informe o e-mail e clique em <b>\"Enviar link\"</b>.",
    "Confira se o e-mail chegou e abra o link recebido.",
    "Em \"Criar senha nova\", defina a nova senha e clique em <b>\"Salvar senha\"</b>.",
    "Entre de novo no sistema com a senha nova, para confirmar que funciona.",
])

doc.build(h)
print("PDF gerado:", SAIDA)
