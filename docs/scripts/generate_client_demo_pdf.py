from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Frame, Paragraph
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "client-demo-presentation.pdf"
CAR_IMAGE = ROOT / "web" / "shell" / "assets" / "client-hero-car.png"

TITLE_FONT = "AutoserviceGeorgiaBold"
BODY_FONT = "AutoserviceArial"
BODY_BOLD_FONT = "AutoserviceArialBold"

WIDTH, HEIGHT = landscape(A4)
MARGIN = 15 * mm


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont(TITLE_FONT, "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"))
    pdfmetrics.registerFont(TTFont(BODY_FONT, "/System/Library/Fonts/Supplemental/Arial.ttf"))
    pdfmetrics.registerFont(TTFont(BODY_BOLD_FONT, "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))


def styles():
    sample = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle(
            "eyebrow",
            parent=sample["BodyText"],
            fontName=BODY_BOLD_FONT,
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#2563EB"),
            spaceAfter=6,
        ),
        "title": ParagraphStyle(
            "title",
            parent=sample["Heading1"],
            fontName=TITLE_FONT,
            fontSize=26,
            leading=31,
            textColor=colors.HexColor("#14213D"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#475569"),
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=14,
            leading=19,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=18,
            firstLineIndent=-10,
            spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "small",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#64748B"),
        ),
        "card_title": ParagraphStyle(
            "card_title",
            parent=sample["BodyText"],
            fontName=BODY_BOLD_FONT,
            fontSize=12.5,
            leading=15,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4,
        ),
        "card_text": ParagraphStyle(
            "card_text",
            parent=sample["BodyText"],
            fontName=BODY_FONT,
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#475569"),
        ),
    }


def paragraph(pdf: canvas.Canvas, text: str, style: ParagraphStyle, x: float, y: float, w: float, h: float):
    frame = Frame(x, y, w, h, showBoundary=0)
    story = [Paragraph(text, style)]
    frame.addFromList(story, pdf)


def draw_bg(pdf: canvas.Canvas):
    pdf.setFillColor(colors.HexColor("#F4F8FC"))
    pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#E8F1F9"))
    pdf.circle(WIDTH - 40 * mm, HEIGHT - 20 * mm, 55 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#EAF6F7"))
    pdf.circle(35 * mm, HEIGHT - 28 * mm, 35 * mm, fill=1, stroke=0)


def draw_footer(pdf: canvas.Canvas, index: int, total: int):
    pdf.setFont(BODY_FONT, 10)
    pdf.setFillColor(colors.HexColor("#64748B"))
    pdf.drawString(MARGIN, 8 * mm, "Autoservice • Клиентская презентация")
    pdf.drawRightString(WIDTH - MARGIN, 8 * mm, f"{index} / {total}")


def draw_header(pdf: canvas.Canvas, eyebrow: str, title: str, subtitle: str):
    s = styles()
    paragraph(pdf, eyebrow, s["eyebrow"], MARGIN, HEIGHT - 36 * mm, 120 * mm, 10 * mm)
    paragraph(pdf, title, s["title"], MARGIN, HEIGHT - 60 * mm, 145 * mm, 24 * mm)
    paragraph(pdf, subtitle, s["subtitle"], MARGIN, HEIGHT - 82 * mm, 145 * mm, 22 * mm)


def draw_bullets(pdf: canvas.Canvas, items: list[str], x: float, y: float, w: float, h: float):
    s = styles()
    frame = Frame(x, y, w, h, showBoundary=0)
    story = [Paragraph(f"• {item}", s["bullet"]) for item in items]
    frame.addFromList(story, pdf)


def rounded_panel(pdf: canvas.Canvas, x: float, y: float, w: float, h: float, fill: str = "#FFFFFF", stroke: str = "#D9E7F2", radius: float = 8 * mm):
    pdf.setFillColor(colors.HexColor(fill))
    pdf.setStrokeColor(colors.HexColor(stroke))
    pdf.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def draw_chip(pdf: canvas.Canvas, x: float, y: float, text: str, fill: str = "#DBEAFE", text_color: str = "#1D4ED8"):
    width = max(26 * mm, 4.5 * mm * len(text) / 2)
    pdf.setFillColor(colors.HexColor(fill))
    pdf.roundRect(x, y, width, 8 * mm, 4 * mm, fill=1, stroke=0)
    pdf.setFont(BODY_BOLD_FONT, 9)
    pdf.setFillColor(colors.HexColor(text_color))
    pdf.drawCentredString(x + width / 2, y + 2.5 * mm, text)


def draw_browser_mockup(pdf: canvas.Canvas, x: float, y: float, w: float, h: float, title: str):
    rounded_panel(pdf, x, y, w, h, fill="#FFFFFF", stroke="#CBD5E1", radius=6 * mm)
    pdf.setFillColor(colors.HexColor("#F8FAFC"))
    pdf.roundRect(x + 1.5 * mm, y + h - 12 * mm, w - 3 * mm, 10 * mm, 4 * mm, fill=1, stroke=0)
    for i, color in enumerate(["#F97316", "#FACC15", "#22C55E"]):
        pdf.setFillColor(colors.HexColor(color))
        pdf.circle(x + 8 * mm + i * 6 * mm, y + h - 7 * mm, 1.5 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.setFont(BODY_BOLD_FONT, 11)
    pdf.drawString(x + 26 * mm, y + h - 8.4 * mm, title)


def draw_phone_frame(pdf: canvas.Canvas, x: float, y: float, w: float, h: float, title: str):
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.roundRect(x, y, w, h, 9 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.roundRect(x + 2 * mm, y + 2 * mm, w - 4 * mm, h - 4 * mm, 7 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.roundRect(x + w / 2 - 16 * mm, y + h - 7 * mm, 32 * mm, 3 * mm, 1.5 * mm, fill=1, stroke=0)
    pdf.setFont(BODY_BOLD_FONT, 9)
    pdf.setFillColor(colors.HexColor("#475569"))
    pdf.drawCentredString(x + w / 2, y + h - 12 * mm, title)


def draw_dashboard_screen(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    draw_browser_mockup(pdf, x, y, w, h, "Панель управления")
    rounded_panel(pdf, x + 8 * mm, y + h - 38 * mm, w - 16 * mm, 20 * mm, fill="#F8FBFF", stroke="#E2E8F0", radius=5 * mm)
    pdf.setFont(TITLE_FONT, 16)
    pdf.setFillColor(colors.HexColor("#14213D"))
    pdf.drawString(x + 14 * mm, y + h - 26 * mm, "Центр управления")
    draw_chip(pdf, x + w - 58 * mm, y + h - 31 * mm, "Данные актуальны", fill="#DCFCE7", text_color="#166534")
    card_y = y + h - 73 * mm
    card_w = (w - 26 * mm) / 3
    for idx, (label, value) in enumerate([("Визиты сегодня", "12"), ("Активные клиенты", "248"), ("Открытые чаты", "6")]):
        cx = x + 8 * mm + idx * (card_w + 5 * mm)
        rounded_panel(pdf, cx, card_y, card_w, 24 * mm, fill="#FFFFFF", stroke="#E2E8F0", radius=5 * mm)
        pdf.setFont(BODY_FONT, 9.5)
        pdf.setFillColor(colors.HexColor("#64748B"))
        pdf.drawString(cx + 5 * mm, card_y + 16 * mm, label)
        pdf.setFont(TITLE_FONT, 16)
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.drawString(cx + 5 * mm, card_y + 7 * mm, value)
    rounded_panel(pdf, x + 8 * mm, y + 12 * mm, w - 16 * mm, 36 * mm, fill="#FFFFFF", stroke="#E2E8F0", radius=5 * mm)
    pdf.setFont(BODY_BOLD_FONT, 11)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 14 * mm, y + 40 * mm, "Быстрые действия")
    buttons = ["Создать клиента", "Создать визит", "Настройки бонусов", "Чат"]
    for idx, button in enumerate(buttons):
        bx = x + 14 * mm + idx * 36 * mm
        pdf.setFillColor(colors.HexColor("#E8F1FF" if idx == 0 else "#F1F5F9"))
        pdf.roundRect(bx, y + 19 * mm, 30 * mm, 12 * mm, 4 * mm, fill=1, stroke=0)
        pdf.setFont(BODY_BOLD_FONT, 8.5)
        pdf.setFillColor(colors.HexColor("#2563EB" if idx == 0 else "#334155"))
        pdf.drawCentredString(bx + 15 * mm, y + 23.7 * mm, button)


def draw_visit_screen(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    draw_browser_mockup(pdf, x, y, w, h, "Создание визита")
    rounded_panel(pdf, x + 8 * mm, y + h - 42 * mm, w - 16 * mm, 18 * mm, fill="#F8FBFF", stroke="#E2E8F0", radius=5 * mm)
    pdf.setFont(BODY_BOLD_FONT, 12)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 14 * mm, y + h - 32 * mm, "Новый визит")
    form_x = x + 10 * mm
    form_y = y + h - 80 * mm
    for row in range(2):
        for col in range(2):
            fx = form_x + col * ((w - 30 * mm) / 2 + 5 * mm)
            fy = form_y - row * 20 * mm
            rounded_panel(pdf, fx, fy, (w - 30 * mm) / 2, 14 * mm, fill="#FFFFFF", stroke="#D7E3EE", radius=3 * mm)
    pdf.setFont(BODY_FONT, 9)
    pdf.setFillColor(colors.HexColor("#64748B"))
    pdf.drawString(form_x + 2 * mm, form_y + 10 * mm, "Клиент")
    pdf.drawString(form_x + (w - 30 * mm) / 2 + 7 * mm, form_y + 10 * mm, "Филиал")
    pdf.drawString(form_x + 2 * mm, form_y - 10 * mm, "Дата визита")
    pdf.drawString(form_x + (w - 30 * mm) / 2 + 7 * mm, form_y - 10 * mm, "Комментарий")
    rounded_panel(pdf, x + 10 * mm, y + 34 * mm, w - 20 * mm, 28 * mm, fill="#F8FBFF", stroke="#CFE0F5", radius=5 * mm)
    pdf.setFont(BODY_BOLD_FONT, 11)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 15 * mm, y + 53 * mm, "Начисление бонусов")
    pdf.setFont(BODY_FONT, 10)
    pdf.setFillColor(colors.HexColor("#475569"))
    pdf.drawString(x + 15 * mm, y + 43 * mm, "Режим: 10% от суммы визита")
    pdf.drawString(x + 15 * mm, y + 35 * mm, "Если сумма визита 1 500 ₽, клиент получит 150 бонусов")
    pdf.setFillColor(colors.HexColor("#DBEAFE"))
    pdf.roundRect(x + w - 58 * mm, y + 38 * mm, 42 * mm, 14 * mm, 4 * mm, fill=1, stroke=0)
    pdf.setFont(BODY_BOLD_FONT, 10)
    pdf.setFillColor(colors.HexColor("#1D4ED8"))
    pdf.drawCentredString(x + w - 37 * mm, y + 43.2 * mm, "150 бонусов")


def draw_bonus_settings_screen(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    draw_browser_mockup(pdf, x, y, w, h, "Настройки бонусов")
    rounded_panel(pdf, x + 10 * mm, y + h - 58 * mm, (w - 35 * mm) / 2, 30 * mm, fill="#F8FBFF", stroke="#CFE0F5", radius=5 * mm)
    rounded_panel(pdf, x + 20 * mm + (w - 35 * mm) / 2, y + h - 58 * mm, (w - 35 * mm) / 2, 30 * mm, fill="#FFFFFF", stroke="#D7E3EE", radius=5 * mm)
    pdf.setFont(BODY_BOLD_FONT, 11)
    pdf.setFillColor(colors.HexColor("#1D4ED8"))
    pdf.drawString(x + 15 * mm, y + h - 42 * mm, "Процент от суммы визита")
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 25 * mm + (w - 35 * mm) / 2, y + h - 42 * mm, "Фикс за визит")
    rounded_panel(pdf, x + 10 * mm, y + 48 * mm, w - 20 * mm, 22 * mm, fill="#FFFFFF", stroke="#D7E3EE", radius=4 * mm)
    pdf.setFont(BODY_FONT, 10)
    pdf.setFillColor(colors.HexColor("#475569"))
    pdf.drawString(x + 15 * mm, y + 60 * mm, "Процент начисления (%)")
    pdf.setFont(BODY_BOLD_FONT, 14)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 15 * mm, y + 51 * mm, "5")
    rounded_panel(pdf, x + 10 * mm, y + 18 * mm, w - 20 * mm, 22 * mm, fill="#EEF6FF", stroke="#CFE0F5", radius=4 * mm)
    pdf.setFont(BODY_BOLD_FONT, 10)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawString(x + 15 * mm, y + 30 * mm, "Пример начисления")
    pdf.setFont(BODY_FONT, 10)
    pdf.setFillColor(colors.HexColor("#1E3A5F"))
    pdf.drawString(x + 15 * mm, y + 22 * mm, "Если сумма визита 1 000 ₽, клиент получит 50 бонусов")


def draw_mobile_home(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    draw_phone_frame(pdf, x, y, w, h, "Клиентское приложение")
    inner_x = x + 5 * mm
    inner_y = y + 5 * mm
    inner_w = w - 10 * mm
    inner_h = h - 18 * mm
    pdf.setFillColor(colors.HexColor("#F4F8FC"))
    pdf.roundRect(inner_x, inner_y, inner_w, inner_h, 5 * mm, fill=1, stroke=0)
    rounded_panel(pdf, inner_x + 3 * mm, inner_y + inner_h - 42 * mm, inner_w - 6 * mm, 34 * mm, fill="#FFFFFF", stroke="#E2E8F0", radius=5 * mm)
    if CAR_IMAGE.exists():
        image = ImageReader(str(CAR_IMAGE))
        pdf.drawImage(image, inner_x + 6 * mm, inner_y + inner_h - 38 * mm, inner_w - 12 * mm, 20 * mm, preserveAspectRatio=True, mask="auto")
    contacts_y = inner_y + inner_h - 52 * mm
    for idx, label in enumerate(["VK", "IG", "TG", "@", "PH"]):
        cx = inner_x + 10 * mm + idx * 13 * mm
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.circle(cx, contacts_y, 3 * mm, fill=1, stroke=0)
        pdf.setFont(BODY_BOLD_FONT, 6.5)
        pdf.setFillColor(colors.white)
        pdf.drawCentredString(cx, contacts_y - 1 * mm, label)
    action_y = inner_y + inner_h - 74 * mm
    for idx, label in enumerate(["Запись", "Визиты", "Бонусы", "Кешбек"]):
        ax = inner_x + 5 * mm + idx * 18 * mm
        pdf.setFillColor(colors.HexColor("#F1F5F9"))
        pdf.roundRect(ax, action_y, 15 * mm, 11 * mm, 3 * mm, fill=1, stroke=0)
        pdf.setFont(BODY_FONT, 6.5)
        pdf.setFillColor(colors.HexColor("#334155"))
        pdf.drawCentredString(ax + 7.5 * mm, action_y + 4.2 * mm, label)
    pdf.setFillColor(colors.HexColor("#1F2937"))
    pdf.roundRect(inner_x + 4 * mm, inner_y + 52 * mm, inner_w - 8 * mm, 16 * mm, 3 * mm, fill=1, stroke=0)
    pdf.setFont(TITLE_FONT, 18)
    pdf.setFillColor(colors.white)
    pdf.drawString(inner_x + 10 * mm, inner_y + 57 * mm, "ЧАТ")
    pdf.setLineWidth(2)
    pdf.setStrokeColor(colors.HexColor("#0F172A"))
    pdf.circle(inner_x + 21 * mm, inner_y + 25 * mm, 13 * mm, fill=0, stroke=1)
    pdf.setFont(TITLE_FONT, 20)
    pdf.drawCentredString(inner_x + 21 * mm, inner_y + 27 * mm, "100")
    pdf.setFont(BODY_BOLD_FONT, 10)
    pdf.drawCentredString(inner_x + 21 * mm, inner_y + 19 * mm, "БОНУСОВ")
    pdf.setFont(TITLE_FONT, 16)
    pdf.drawString(inner_x + 42 * mm, inner_y + 30 * mm, "Иван")
    pdf.drawString(inner_x + 42 * mm, inner_y + 22 * mm, "Петров")
    pdf.setFont(BODY_BOLD_FONT, 11)
    pdf.setFillColor(colors.HexColor("#F97316"))
    pdf.drawString(inner_x + 8 * mm, inner_y + 8 * mm, "CRS")
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.setFont(BODY_FONT, 8.5)
    pdf.drawString(inner_x + 22 * mm, inner_y + 8.5 * mm, "Centr Radius Service")


def draw_chat_slide(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    left_w = w * 0.56
    draw_browser_mockup(pdf, x, y, left_w, h, "Чат с клиентом")
    rounded_panel(pdf, x + 6 * mm, y + 10 * mm, left_w - 12 * mm, h - 28 * mm, fill="#F8FBFF", stroke="#E2E8F0", radius=4 * mm)
    messages = [
        ("Клиент", "Добрый день, подскажите по бонусам", "#E0F2FE"),
        ("Администратор", "Добрый день. После визита вам уже начислено 150 бонусов", "#DCFCE7"),
        ("Клиент", "Отлично, спасибо", "#E0F2FE"),
    ]
    current_y = y + h - 40 * mm
    for author, text, fill in messages:
        bubble_w = left_w - 40 * mm
        bubble_x = x + (10 * mm if author == "Клиент" else 22 * mm)
        rounded_panel(pdf, bubble_x, current_y, bubble_w, 14 * mm, fill=fill, stroke=fill, radius=4 * mm)
        pdf.setFont(BODY_BOLD_FONT, 8.5)
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.drawString(bubble_x + 4 * mm, current_y + 9 * mm, author)
        pdf.setFont(BODY_FONT, 8.5)
        pdf.drawString(bubble_x + 4 * mm, current_y + 4 * mm, text)
        current_y -= 18 * mm
    right_x = x + left_w + 10 * mm
    phone_w = w - left_w - 10 * mm
    draw_mobile_home(pdf, right_x + 8 * mm, y + 8 * mm, phone_w - 16 * mm, h - 16 * mm)


def draw_problem_cards(pdf: canvas.Canvas, x: float, y: float, w: float):
    card_w = (w - 10 * mm) / 2
    data = [
        ("Ручной учёт", "Записи, бонусы и история клиентов ведутся в разных местах."),
        ("Потеря контакта", "Переписка уходит в мессенджеры и не связана с клиентской базой."),
        ("Ошибки в бонусах", "Начисления считаются вручную и зависят от внимательности администратора."),
        ("Нет прозрачности", "Собственнику сложно быстро понять, что происходит с клиентами и визитами."),
    ]
    s = styles()
    for idx, (title, text) in enumerate(data):
        cx = x + (idx % 2) * (card_w + 10 * mm)
        cy = y - (idx // 2) * 32 * mm
        rounded_panel(pdf, cx, cy, card_w, 24 * mm, fill="#FFFFFF", stroke="#E2E8F0", radius=5 * mm)
        paragraph(pdf, title, s["card_title"], cx + 4 * mm, cy + 13 * mm, card_w - 8 * mm, 8 * mm)
        paragraph(pdf, text, s["card_text"], cx + 4 * mm, cy + 4 * mm, card_w - 8 * mm, 12 * mm)


def slide_cover(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Готовая система для автосервиса",
        "Autoservice",
        "Клиенты, визиты, бонусы и чат в одной понятной системе для команды и клиента.",
    )
    draw_bullets(
        pdf,
        [
            "Быстрое создание клиентов и визитов",
            "Автоматическое начисление бонусов",
            "Настраиваемая программа лояльности",
            "Клиентское приложение с историей и чатом",
        ],
        MARGIN,
        62 * mm,
        90 * mm,
        70 * mm,
    )
    draw_dashboard_screen(pdf, 160 * mm, 78 * mm, 110 * mm, 78 * mm)
    draw_mobile_home(pdf, 223 * mm, 24 * mm, 54 * mm, 98 * mm)
    draw_chip(pdf, MARGIN, 20 * mm, "Для показа клиенту", fill="#DCFCE7", text_color="#166534")
    draw_footer(pdf, index, total)


def slide_problem(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Проблема рынка",
        "Почему сервисы теряют деньги и клиентов",
        "Когда данные разрознены, команде сложнее продавать услуги, удерживать клиентов и управлять повторными визитами.",
    )
    draw_problem_cards(pdf, MARGIN, 105 * mm, 150 * mm)
    rounded_panel(pdf, 178 * mm, 52 * mm, 95 * mm, 78 * mm, fill="#FFFFFF", stroke="#D7E3EE", radius=6 * mm)
    s = styles()
    paragraph(pdf, "Что меняется после внедрения", s["card_title"], 184 * mm, 118 * mm, 80 * mm, 8 * mm)
    draw_bullets(
        pdf,
        [
            "Все клиенты и визиты в одной базе",
            "Бонусы считаются автоматически",
            "Клиент видит историю сам",
            "Переписка хранится внутри системы",
        ],
        184 * mm,
        64 * mm,
        80 * mm,
        52 * mm,
    )
    draw_footer(pdf, index, total)


def slide_admin(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Админка",
        "Понятное рабочее место для команды",
        "Сотрудник сразу видит основные действия: клиентов, услуги, визиты, бонусы и чат.",
    )
    draw_bullets(
        pdf,
        [
            "Главный экран собран вокруг ежедневной работы",
            "Нового клиента можно завести за минуту",
            "Каталог услуг хранится централизованно",
            "Дашборд помогает не терять важные действия",
        ],
        MARGIN,
        64 * mm,
        85 * mm,
        72 * mm,
    )
    draw_dashboard_screen(pdf, 132 * mm, 46 * mm, 145 * mm, 110 * mm)
    draw_footer(pdf, index, total)


def slide_visit(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Создание визита",
        "Система сама считает сумму и бонусы",
        "Оформление визита становится быстрым и прозрачным: администратор видит итог и начисление ещё до сохранения.",
    )
    draw_bullets(
        pdf,
        [
            "Выбор клиента, филиала и услуг в одном сценарии",
            "Сумма визита считается автоматически",
            "Начисление бонусов видно заранее",
            "После сохранения ничего не нужно доначислять вручную",
        ],
        MARGIN,
        62 * mm,
        88 * mm,
        74 * mm,
    )
    draw_visit_screen(pdf, 136 * mm, 45 * mm, 140 * mm, 112 * mm)
    draw_footer(pdf, index, total)


def slide_bonus_settings(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Настройки бонусов",
        "Гибкая программа лояльности под ваш сервис",
        "Логику начисления можно быстро менять без ручных пересчётов: процент от суммы визита или фикс за визит.",
    )
    draw_bullets(
        pdf,
        [
            "Процентная схема подходит для стандартной программы лояльности",
            "Фиксированная схема удобна для акций и сервисных программ",
            "Пример начисления понятен сотруднику без объяснений",
            "Изменения действуют централизованно для всей системы",
        ],
        MARGIN,
        62 * mm,
        88 * mm,
        74 * mm,
    )
    draw_bonus_settings_screen(pdf, 138 * mm, 46 * mm, 138 * mm, 108 * mm)
    draw_footer(pdf, index, total)


def slide_mobile(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Клиентское приложение",
        "Клиент сам видит бонусы, визиты и связь с сервисом",
        "Это повышает доверие и снимает лишнюю нагрузку с администратора: не нужно постоянно отвечать на однотипные вопросы.",
    )
    draw_bullets(
        pdf,
        [
            "Главный экран показывает бонусы и быстрые действия",
            "История визитов и начислений всегда под рукой",
            "Чат доступен прямо из приложения",
            "Интерфейс простой и понятный с первого взгляда",
        ],
        MARGIN,
        64 * mm,
        88 * mm,
        72 * mm,
    )
    draw_mobile_home(pdf, 168 * mm, 28 * mm, 70 * mm, 128 * mm)
    draw_phone_frame(pdf, 246 * mm, 40 * mm, 38 * mm, 90 * mm, "История бонусов")
    pdf.setFillColor(colors.HexColor("#F4F8FC"))
    pdf.roundRect(249 * mm, 43 * mm, 32 * mm, 80 * mm, 4 * mm, fill=1, stroke=0)
    for idx, line in enumerate(["+150 бонусов", "+50 бонусов", "-30 бонусов"]):
        rounded_panel(pdf, 252 * mm, 109 * mm - idx * 18 * mm, 26 * mm, 12 * mm, fill="#FFFFFF", stroke="#E2E8F0", radius=3 * mm)
        pdf.setFont(BODY_BOLD_FONT, 7.5)
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.drawString(254 * mm, 114 * mm - idx * 18 * mm, line)
    draw_footer(pdf, index, total)


def slide_chat(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Чат внутри системы",
        "Общение с клиентом остаётся под контролем",
        "Клиент пишет из приложения, администратор отвечает из рабочей системы. Переписка не теряется в сторонних мессенджерах.",
    )
    draw_bullets(
        pdf,
        [
            "Быстрая связь без перехода в сторонние сервисы",
            "История сообщений хранится в одном месте",
            "Команда отвечает прямо из рабочего контура",
            "Для клиента это выглядит как полноценный сервис",
        ],
        MARGIN,
        62 * mm,
        84 * mm,
        72 * mm,
    )
    draw_chat_slide(pdf, 128 * mm, 42 * mm, 150 * mm, 112 * mm)
    draw_footer(pdf, index, total)


def slide_value(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Что получает автосервис",
        "Практическая ценность для бизнеса",
        "Система не просто красиво выглядит, а упрощает ежедневную работу и делает клиентскую базу прозрачной.",
    )
    cards = [
        ("Меньше ручной работы", "Сотрудникам не нужно считать бонусы и вести разрозненные записи."),
        ("Больше повторных визитов", "Клиент видит бонусы, историю и связь с сервисом в приложении."),
        ("Прозрачность для владельца", "Клиенты, визиты, бонусы и доступы находятся под контролем."),
        ("Готовность к внедрению", "Система уже собрана как рабочий инструмент, а не как концепт."),
    ]
    s = styles()
    start_x = MARGIN
    start_y = 108 * mm
    card_w = 62 * mm
    card_h = 30 * mm
    gap = 8 * mm
    for idx, (title, text) in enumerate(cards):
        cx = start_x + (idx % 2) * (card_w + gap)
        cy = start_y - (idx // 2) * (card_h + gap)
        rounded_panel(pdf, cx, cy, card_w, card_h, fill="#FFFFFF", stroke="#E2E8F0", radius=5 * mm)
        paragraph(pdf, title, s["card_title"], cx + 4 * mm, cy + 18 * mm, card_w - 8 * mm, 7 * mm)
        paragraph(pdf, text, s["card_text"], cx + 4 * mm, cy + 4 * mm, card_w - 8 * mm, 14 * mm)
    rounded_panel(pdf, 154 * mm, 62 * mm, 118 * mm, 60 * mm, fill="#0F172A", stroke="#0F172A", radius=7 * mm)
    paragraph(pdf, "Готовый итог для клиента", s["eyebrow"], 162 * mm, 110 * mm, 90 * mm, 8 * mm)
    closing_style = ParagraphStyle(
        "closing",
        fontName=TITLE_FONT,
        fontSize=18,
        leading=24,
        textColor=colors.white,
    )
    paragraph(
        pdf,
        "Система заменяет таблицы, ручной учёт и разрозненные переписки. Всё, что нужно для работы с клиентом, собрано в одном месте.",
        closing_style,
        162 * mm,
        74 * mm,
        96 * mm,
        34 * mm,
    )
    draw_footer(pdf, index, total)


def slide_closing(pdf: canvas.Canvas, index: int, total: int):
    draw_bg(pdf)
    draw_header(
        pdf,
        "Следующий шаг",
        "Систему можно внедрять и запускать в работу",
        "Для клиента это выглядит как готовый цифровой сервис, а для команды — как понятный рабочий инструмент.",
    )
    draw_bullets(
        pdf,
        [
            "Единая база клиентов, визитов и бонусов",
            "Автоматическое начисление без ручного учёта",
            "Клиентское приложение с историей и чатом",
            "Понятная админка для ежедневной работы",
            "Готовность к показу, пилоту и внедрению",
        ],
        MARGIN,
        64 * mm,
        95 * mm,
        76 * mm,
    )
    rounded_panel(pdf, 158 * mm, 62 * mm, 112 * mm, 64 * mm, fill="#FFFFFF", stroke="#D7E3EE", radius=7 * mm)
    s = styles()
    paragraph(pdf, "Итоговая формулировка для клиента", s["card_title"], 166 * mm, 112 * mm, 90 * mm, 8 * mm)
    paragraph(
        pdf,
        "Готовая система для автосервиса, которая помогает учитывать клиентов, вести визиты, автоматически начислять бонусы и поддерживать связь с клиентом без лишней ручной работы.",
        s["card_text"],
        166 * mm,
        84 * mm,
        96 * mm,
        24 * mm,
    )
    draw_chip(pdf, 166 * mm, 70 * mm, "Готово к отправке клиенту", fill="#DCFCE7", text_color="#166534")
    draw_footer(pdf, index, total)


def main():
    register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4))
    pdf.setTitle("Autoservice Client Presentation")
    slides = [
        slide_cover,
        slide_problem,
        slide_admin,
        slide_visit,
        slide_bonus_settings,
        slide_mobile,
        slide_chat,
        slide_value,
        slide_closing,
    ]
    total = len(slides)
    for idx, slide in enumerate(slides, start=1):
        slide(pdf, idx, total)
        pdf.showPage()
    pdf.save()
    print(f"generated: {OUTPUT}")


if __name__ == "__main__":
    main()
