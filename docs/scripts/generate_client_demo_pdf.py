from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Frame, Paragraph
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs" / "client-demo-presentation.md"
OUTPUT = ROOT / "docs" / "client-demo-presentation.pdf"

TITLE_FONT = "AutoserviceGeorgiaBold"
BODY_FONT = "AutoserviceArial"
BODY_BOLD_FONT = "AutoserviceArialBold"


@dataclass
class Slide:
    title: str
    subtitle: str
    bullets: list[str]
    note: str


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont(TITLE_FONT, "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"))
    pdfmetrics.registerFont(TTFont(BODY_FONT, "/System/Library/Fonts/Supplemental/Arial.ttf"))
    pdfmetrics.registerFont(TTFont(BODY_BOLD_FONT, "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))


def parse_slides(markdown: str) -> list[Slide]:
    sections = [section.strip() for section in markdown.split("\n---\n") if section.strip()]
    slides: list[Slide] = []
    for section in sections:
        title = ""
        subtitle = ""
        bullets: list[str] = []
        note = ""
        for raw_line in section.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("# "):
                title = line[2:].strip()
                continue
            if line.startswith("- "):
                bullets.append(line[2:].strip())
                continue
            if line.startswith("> "):
                note = line[2:].strip()
                continue
            if not subtitle:
                subtitle = line
        slides.append(Slide(title=title, subtitle=subtitle, bullets=bullets, note=note))
    return slides


def escape_paragraph(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"“([^”]+)”", r"«\1»", escaped)
    return escaped


def build_styles():
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "slide-title",
            parent=sample["Heading1"],
            fontName=TITLE_FONT,
            fontSize=28,
            leading=34,
            textColor=colors.HexColor("#14213D"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "slide-subtitle",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=14,
            leading=19,
            textColor=colors.HexColor("#4A5568"),
            spaceAfter=10,
        ),
        "bullet": ParagraphStyle(
            "slide-bullet",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=17,
            leading=24,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=16,
            firstLineIndent=-10,
            bulletIndent=0,
            spaceAfter=8,
        ),
        "note": ParagraphStyle(
            "slide-note",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=12.5,
            leading=17,
            textColor=colors.HexColor("#1E3A5F"),
        ),
        "footer": ParagraphStyle(
            "slide-footer",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=10,
            leading=12,
            alignment=2,
            textColor=colors.HexColor("#64748B"),
        ),
    }


def draw_slide(pdf: canvas.Canvas, slide: Slide, page_number: int, total: int, styles) -> None:
    width, height = landscape(A4)
    margin = 18 * mm

    pdf.setFillColor(colors.HexColor("#F4F8FC"))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    pdf.setFillColor(colors.HexColor("#E2ECF7"))
    pdf.roundRect(margin, height - 52 * mm, width - margin * 2, 32 * mm, 9 * mm, fill=1, stroke=0)

    title_frame = Frame(margin + 10 * mm, height - 48 * mm, width - margin * 2 - 20 * mm, 24 * mm, showBoundary=0)
    title_story = [
        Paragraph(escape_paragraph(slide.title), styles["title"]),
        Paragraph(escape_paragraph(slide.subtitle), styles["subtitle"]),
    ]
    title_frame.addFromList(title_story, pdf)

    bullet_frame = Frame(margin + 10 * mm, 55 * mm, width - margin * 2 - 20 * mm, height - 135 * mm, showBoundary=0)
    bullet_story = [
        Paragraph(f"• {escape_paragraph(bullet)}", styles["bullet"])
        for bullet in slide.bullets
    ]
    bullet_frame.addFromList(bullet_story, pdf)

    note_height = 34 * mm
    pdf.setFillColor(colors.white)
    pdf.roundRect(margin, 16 * mm, width - margin * 2, note_height, 7 * mm, fill=1, stroke=0)
    pdf.setStrokeColor(colors.HexColor("#D6E2F0"))
    pdf.roundRect(margin, 16 * mm, width - margin * 2, note_height, 7 * mm, fill=0, stroke=1)

    note_frame = Frame(margin + 8 * mm, 20 * mm, width - margin * 2 - 16 * mm, note_height - 8 * mm, showBoundary=0)
    note_story = [Paragraph(f"<b>Что говорить:</b> {escape_paragraph(slide.note)}", styles["note"])]
    note_frame.addFromList(note_story, pdf)

    footer = Paragraph(f"Autoservice Demo • {page_number} / {total}", styles["footer"])
    footer.wrapOn(pdf, width - margin * 2, 10 * mm)
    footer.drawOn(pdf, margin, 8 * mm)


def main() -> None:
    register_fonts()
    styles = build_styles()
    slides = parse_slides(SOURCE.read_text(encoding="utf-8"))
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4))
    pdf.setTitle("Autoservice Demo Presentation")
    total = len(slides)
    for index, slide in enumerate(slides, start=1):
        draw_slide(pdf, slide, index, total, styles)
        pdf.showPage()
    pdf.save()
    print(f"generated: {OUTPUT}")


if __name__ == "__main__":
    main()
