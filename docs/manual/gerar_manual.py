"""Gera o Manual do NorteArq (PDF, A4) a partir de docs/manual/manual.md, a fonte única.

Uso:
  python docs/manual/gerar_manual.py            -> as duas versões na pasta "app - arquitetura"
  Manual-NorteArq.pdf          versão para arquitetos (sem os trechos <!-- suporte -->), pode ir para parceiros
  Manual-NorteArq-Suporte.pdf  versão completa, só para o Igor

Mesmas regras da Central de Ajuda (lib/manual.ts): todos os capítulos, o 15 vira "Dúvidas comuns e como resolver".
"""

import datetime
import os
import re
import sys
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, NextPageTemplate, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.join(AQUI, "manual.md")
PASTA_SAIDA = os.environ.get("SAIDA_MANUAL_PASTA", os.path.abspath(os.path.join(AQUI, "..", "..", "..")))

# ---------- Fontes e cores (identidade do NorteArq) ----------
F = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Segoe", os.path.join(F, "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-B", os.path.join(F, "segoeuib.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-I", os.path.join(F, "segoeuii.ttf")))
pdfmetrics.registerFont(TTFont("Segoe-SB", os.path.join(F, "seguisb.ttf")))
pdfmetrics.registerFont(TTFont("Mono", os.path.join(F, "consola.ttf")))
registerFontFamily("Segoe", normal="Segoe", bold="Segoe-B", italic="Segoe-I", boldItalic="Segoe-B")

NORTE = colors.HexColor("#1f3a5f")
NORTE_ESCURO = colors.HexColor("#132640")
AREIA = colors.HexColor("#c9a46a")
FUNDO = colors.HexColor("#f7f5f1")
BORDA = colors.HexColor("#e3dfd6")
TEXTO = colors.HexColor("#1d1d1b")
SUAVE = colors.HexColor("#5f5e5a")
DICA_FUNDO = colors.HexColor("#eef2f7")

corpo = ParagraphStyle("corpo", fontName="Segoe", fontSize=10.5, leading=15.5, textColor=TEXTO, spaceAfter=7, alignment=TA_LEFT)
rotulo = ParagraphStyle("rotulo", fontName="Segoe-SB", fontSize=9, leading=12, textColor=AREIA, spaceAfter=2)
h1 = ParagraphStyle("h1", fontName="Segoe-B", fontSize=22, leading=27, textColor=NORTE, spaceAfter=14)
item = ParagraphStyle("item", parent=corpo, leftIndent=16, bulletIndent=4, spaceAfter=4)
item2 = ParagraphStyle("item2", parent=item, leftIndent=30, bulletIndent=18)
celula = ParagraphStyle("celula", parent=corpo, fontSize=9, leading=12.5, spaceAfter=0)
celula_b = ParagraphStyle("celula_b", parent=celula, fontName="Segoe-SB", textColor=colors.white)
toc1 = ParagraphStyle("toc1", fontName="Segoe", fontSize=11.5, leading=20, textColor=TEXTO, leftIndent=0)

LARGURA = A4[0] - 40 * mm
SEM_EMOJI = re.compile(r"\s*[✅🟡⬜]\s*")


def inline(texto):
    """Markdown de uma linha (negrito, itálico, código) para o mini-HTML do reportlab."""
    partes = re.split(r"(`[^`]+`)", texto)
    saida = []
    for parte in partes:
        if parte.startswith("`") and parte.endswith("`") and len(parte) > 1:
            saida.append(f'<font name="Mono" color="#1f3a5f">{escape(parte[1:-1])}</font>')
            continue
        t = escape(parte)
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
        t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", t)
        saida.append(t)
    return SEM_EMOJI.sub(" ", "".join(saida)).strip()


def larguras_tabela(linhas):
    colunas = max(len(l) for l in linhas)
    pesos = [0] * colunas
    for l in linhas:
        for i, c in enumerate(l):
            pesos[i] = max(pesos[i], min(len(c), 60))
    pesos = [max(p, 6) for p in pesos]
    total = sum(pesos)
    return [LARGURA * p / total for p in pesos]


def tabela(linhas):
    celulas = []
    for n, l in enumerate(linhas):
        estilo = celula_b if n == 0 else celula
        celulas.append([Paragraph(inline(c), estilo) for c in l])
    t = Table(celulas, colWidths=larguras_tabela(linhas), repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NORTE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FUNDO]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def ler_capitulos(suporte):
    texto = open(FONTE, encoding="utf-8").read().replace("\r\n", "\n")
    if suporte:
        texto = re.sub(r"<!-- /?suporte -->\n?", "", texto)
    else:
        texto = re.sub(r"<!-- suporte -->[\s\S]*?<!-- /suporte -->\n?", "", texto)
    capitulos = []
    for parte in re.split(r"^## ", texto, flags=re.M)[1:]:
        cabecalho, _, resto = parte.partition("\n")
        m = re.match(r"^(\d+)\.\s+(.+?)\s*[✅🟡⬜]?\s*$", cabecalho)
        numero = int(m.group(1)) if m else 0
        titulo = (m.group(2) if m else cabecalho).replace("**", "").strip()
        if numero == 15:
            titulo = "Dúvidas comuns e como resolver"
        capitulos.append((numero, titulo, re.sub(r"\n---\s*$", "", resto.strip())))
    return capitulos


def blocos(texto):
    """Converte o corpo de um capítulo em elementos do PDF."""
    linhas = texto.split("\n")
    i, saida = 0, []
    while i < len(linhas):
        linha = linhas[i]
        if not linha.strip() or linha.strip() == "---":
            i += 1
            continue
        if linha.startswith("|"):
            tab = []
            while i < len(linhas) and linhas[i].startswith("|"):
                cel = [c.strip() for c in linhas[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", c) for c in cel if c):
                    tab.append(cel)
                i += 1
            saida += [tabela(tab), Spacer(1, 8)]
            continue
        lista = re.match(r"^(\s*)(- |\d+\. )(.*)$", linha)
        if lista:
            nivel = 1 if len(lista.group(1)) >= 2 else 0
            marcador = "•" if lista.group(2) == "- " else lista.group(2).strip()
            partes = [lista.group(3)]
            i += 1
            while i < len(linhas) and linhas[i].strip() and not re.match(r"^\s*(- |\d+\. |\|)", linhas[i]) and linhas[i].startswith(" "):
                partes.append(linhas[i].strip())
                i += 1
            saida.append(Paragraph(inline(" ".join(partes)), item2 if nivel else item, bulletText=marcador))
            continue
        partes = []
        while i < len(linhas) and linhas[i].strip() and not linhas[i].startswith("|") and not re.match(r"^\s*(- |\d+\. )", linhas[i]) and linhas[i].strip() != "---":
            partes.append(linhas[i].strip())
            i += 1
        saida.append(Paragraph(inline(" ".join(partes)), corpo))
    return saida


class Manual(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph) and fl.style.name == "h1":
            self.notify("TOCEntry", (0, fl.getPlainText(), self.page))


def gerar(suporte):
    hoje = datetime.date.today()
    meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
    data = f"{hoje.day} de {meses[hoje.month - 1]} de {hoje.year}"
    nome = "Manual-NorteArq-Suporte.pdf" if suporte else "Manual-NorteArq.pdf"
    saida = os.path.join(PASTA_SAIDA, nome)
    subtitulo = "Edição completa para o suporte (uso interno)" if suporte else "Para arquitetos e designers de interiores"

    def capa(c, doc):
        w, h = A4
        c.saveState()
        c.setFillColor(NORTE_ESCURO)
        c.rect(0, 0, w, h, stroke=0, fill=1)
        cx, cy = w - 62 * mm, h - 70 * mm
        c.setStrokeColor(AREIA)
        c.setLineWidth(1.2)
        c.circle(cx, cy, 26 * mm, stroke=1, fill=0)
        c.setFillColor(AREIA)
        p = c.beginPath()
        p.moveTo(cx, cy + 22 * mm)
        p.lineTo(cx + 5 * mm, cy)
        p.lineTo(cx, cy - 22 * mm)
        p.lineTo(cx - 5 * mm, cy)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        c.setFont("Segoe-B", 13)
        c.drawCentredString(cx, cy + 29 * mm, "N")
        c.setFillColor(colors.white)
        c.setFont("Segoe", 30)
        c.drawString(22 * mm, h - 130 * mm, "Norte")
        c.setFillColor(AREIA)
        c.setFont("Segoe-B", 30)
        c.drawString(22 * mm + pdfmetrics.stringWidth("Norte", "Segoe", 30), h - 130 * mm, "Arq")
        c.setFillColor(colors.white)
        c.setFont("Segoe-B", 34)
        c.drawString(22 * mm, h - 150 * mm, "Manual de uso")
        c.setFont("Segoe", 13)
        c.setFillColor(colors.HexColor("#c8d2df"))
        c.drawString(22 * mm, h - 162 * mm, subtitulo)
        c.setStrokeColor(AREIA)
        c.setLineWidth(2)
        c.line(22 * mm, h - 172 * mm, 62 * mm, h - 172 * mm)
        c.setFont("Segoe-I", 12)
        c.setFillColor(colors.white)
        c.drawString(22 * mm, h - 186 * mm, "“Seu cliente explica o que quer sozinho. Você só projeta.”")
        c.setFont("Segoe", 9.5)
        c.setFillColor(colors.HexColor("#9fb0c4"))
        c.drawString(22 * mm, 22 * mm, f"Atualizado em {data} · nortearq.com.br")
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
        c.drawRightString(w - 20 * mm, h - 11.5 * mm, "Manual de uso" + (" · suporte" if suporte else ""))
        c.line(20 * mm, 14 * mm, w - 20 * mm, 14 * mm)
        c.drawString(20 * mm, 9.5 * mm, f"Atualizado em {data}")
        c.drawRightString(w - 20 * mm, 9.5 * mm, str(doc.page))
        c.restoreState()

    doc = Manual(saida, pagesize=A4, title="Manual de uso · NorteArq", author="NorteArq",
                 leftMargin=20 * mm, rightMargin=20 * mm, topMargin=22 * mm, bottomMargin=22 * mm)
    quadro = Frame(20 * mm, 22 * mm, LARGURA, A4[1] - 44 * mm, id="q")
    doc.addPageTemplates([
        PageTemplate(id="capa", frames=[quadro], onPage=capa),
        PageTemplate(id="miolo", frames=[quadro], onPage=pagina),
    ])

    sumario = TableOfContents()
    sumario.levelStyles = [toc1]
    historia = [NextPageTemplate("miolo"), PageBreak(), Paragraph("Sumário", ParagraphStyle("s", parent=h1)), sumario, PageBreak()]
    for n, (numero, titulo, texto) in enumerate(ler_capitulos(suporte)):
        if n:
            historia.append(PageBreak())
        historia.append(Paragraph(f"CAPÍTULO {numero}", rotulo))
        historia.append(Paragraph(escape(titulo), h1))
        historia += blocos(texto)
    doc.multiBuild(historia)
    return saida


if __name__ == "__main__":
    versoes = [False, True] if len(sys.argv) < 2 else [sys.argv[1] == "suporte"]
    for v in versoes:
        print("PDF gerado:", gerar(v))
