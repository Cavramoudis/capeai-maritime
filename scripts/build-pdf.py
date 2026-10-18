#!/usr/bin/env python3
"""Build CapeAI's reference book from its Markdown sources.

Usage: python3 scripts/build-pdf.py [--font-dir PATH] [--output PATH]
Requires reportlab: python3 -m pip install reportlab
Fonts: DejaVu Sans and DejaVu Sans Mono, discovered in standard font locations.
Pass --font-dir when fonts are installed elsewhere. No network access is used.
"""
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor('#173343')
INK = colors.HexColor('#243E4C')
MUTED = colors.HexColor('#546977')
TEAL = colors.HexColor('#087D82')
RULE = colors.HexColor('#D1DCDF')
PALE = colors.HexColor('#F0F4F5')
WHITE = colors.white
PAGE_W, PAGE_H = A4
MARGIN = 19 * mm
BODY_W = PAGE_W - 2 * MARGIN
DOCS = [
    ('MANUAL.md', '01', 'User and financial-model manual'),
    ('GLOSSARY.md', '02', 'Glossary and notation'),
    ('CURRENT-SYSTEM.md', '03', 'Original system and forensic findings'),
    ('TARGET-SYSTEM.md', '04', 'Target system and acceptance criteria'),
    ('MODEL-CONTRACT.md', '05', 'Financial model contract'),
    ('references.md', '06', 'References and source boundaries'),
]


def normalize(text: str) -> str:
    """Use ordinary hyphens and embedded fonts for remaining mathematical glyphs."""
    return re.sub('[\u2010-\u2015\u2212]', '-', text).replace('\u00a0', ' ')


def slug(text: str) -> str:
    text = re.sub(r'[`*]', '', normalize(text)).lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'\s+', '-', text.strip())


def font_locations(explicit: str | None) -> list[Path]:
    roots = []
    if explicit:
        roots.append(Path(explicit).expanduser())
    roots.extend([
        Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype',
        Path('/usr/share/fonts/truetype/dejavu'),
        Path('/usr/local/share/fonts'),
        Path('/Library/Fonts'),
        Path.home() / 'Library/Fonts',
        Path('C:/Windows/Fonts'),
    ])
    return roots


def register_fonts(explicit: str | None) -> None:
    locations = font_locations(explicit)
    files = {
        'CapeSans': 'DejaVuSans.ttf',
        'CapeSans-Bold': 'DejaVuSans-Bold.ttf',
        'CapeSans-Italic': 'DejaVuSans-Oblique.ttf',
        'CapeSans-BoldItalic': 'DejaVuSans-BoldOblique.ttf',
        'CapeMono': 'DejaVuSansMono.ttf',
        'CapeMono-Bold': 'DejaVuSansMono-Bold.ttf',
    }
    for name, filename in files.items():
        candidate = next((folder / filename for folder in locations if (folder / filename).is_file()), None)
        if candidate is None:
            raise SystemExit(f'Missing {filename}. Install DejaVu fonts or pass --font-dir PATH.')
        pdfmetrics.registerFont(TTFont(name, str(candidate)))
    pdfmetrics.registerFontFamily('CapeSans', normal='CapeSans', bold='CapeSans-Bold', italic='CapeSans-Italic', boldItalic='CapeSans-BoldItalic')
    pdfmetrics.registerFontFamily('CapeMono', normal='CapeMono', bold='CapeMono-Bold', italic='CapeMono', boldItalic='CapeMono-Bold')


def styles() -> dict[str, ParagraphStyle]:
    base = dict(fontName='CapeSans', textColor=INK, alignment=TA_LEFT, allowWidows=0, allowOrphans=0, splitLongWords=1)
    return {
        'body': ParagraphStyle('Body', fontSize=9.1, leading=14, spaceAfter=6.5, **base),
        'lead': ParagraphStyle('BlockLead', fontSize=9.1, leading=14, spaceAfter=6.5, keepWithNext=True, **base),
        'small': ParagraphStyle('Small', fontSize=8.0, leading=11.5, spaceAfter=5, **base),
        'chapter': ParagraphStyle('Chapter', fontSize=27, leading=33, spaceAfter=18, keepWithNext=True, **base),
        'h2': ParagraphStyle('Heading2', fontSize=15, leading=20, spaceBefore=16, spaceAfter=8, keepWithNext=True, **base),
        'h3': ParagraphStyle('Heading3', fontSize=11.1, leading=15.3, spaceBefore=12, spaceAfter=7, keepWithNext=True, **base),
        'h4': ParagraphStyle('Heading4', fontSize=10, leading=14, spaceBefore=9, spaceAfter=6, keepWithNext=True, **base),
        'bullet': ParagraphStyle('Bullet', fontSize=9.1, leading=14, leftIndent=13, firstLineIndent=-10, spaceAfter=4, **base),
        'step': ParagraphStyle('Step', fontSize=9.1, leading=14, leftIndent=20, firstLineIndent=-18, spaceAfter=4, **base),
        'table': ParagraphStyle('TableCell', fontSize=7.5, leading=10.7, spaceAfter=0, **base),
        'numeric': ParagraphStyle('NumericCell', fontName='CapeSans', fontSize=7.5, leading=10.7, spaceAfter=0, alignment=TA_RIGHT, textColor=INK, splitLongWords=1),
        'thead': ParagraphStyle('TableHead', fontSize=7.5, leading=10.7, spaceAfter=0, fontName='CapeSans-Bold', textColor=WHITE, splitLongWords=1),
        'code': ParagraphStyle('CodeLine', fontName='CapeMono', fontSize=7.4, leading=11.4, textColor=INK, spaceAfter=0, splitLongWords=1),
        'kicker': ParagraphStyle('Kicker', fontName='CapeSans-Bold', fontSize=9, leading=13, textColor=TEAL, spaceAfter=10),
        'toc0': ParagraphStyle('Contents0', fontName='CapeSans-Bold', fontSize=10.3, leading=15, leftIndent=0, firstLineIndent=0, spaceBefore=10, textColor=NAVY),
        'toc1': ParagraphStyle('Contents1', fontName='CapeSans', fontSize=9.1, leading=14, leftIndent=13, firstLineIndent=0, spaceBefore=3, textColor=INK),
    }


ANCHORS: dict[tuple[str, str], str] = {}
for filename, _, _ in DOCS:
    ANCHORS[(filename, '')] = f'doc-{filename}'
    for line in (ROOT / 'docs' / filename).read_text().splitlines():
        match = re.match(r'^(#{2,6})\s+(.+)', line)
        if match:
            name = slug(match.group(2))
            ANCHORS[(filename, name)] = f'{filename}-{name}'


def inline(text: str, filename: str) -> str:
    """Translate the bounded Markdown used by the book into ReportLab markup."""
    text = normalize(text)
    slots: list[str] = []

    def stash(value: str) -> str:
        slots.append(value)
        return f'ZZSLOT{len(slots)-1}ZZ'

    def link(match: re.Match) -> str:
        label, target = match.groups()
        safe_label = html.escape(label.replace('`', ''))
        if target.startswith(('https://', 'http://')):
            return stash(f'<link href="{html.escape(target, quote=True)}" color="#087D82">{safe_label}</link>')
        path, _, fragment = target.partition('#')
        other = Path(path).name if path else filename
        destination = ANCHORS.get((other, fragment))
        if destination:
            return stash(f'<link href="#{destination}" color="#087D82">{safe_label}</link>')
        return stash(safe_label)

    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)
    text = re.sub(r'`([^`]+)`', lambda m: stash(f'<font name="CapeMono" size="8">{font_text(m.group(1), "CapeMono")}</font>'), text)
    text = html.escape(text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)
    for i, value in enumerate(slots):
        text = text.replace(f'ZZSLOT{i}ZZ', value)
    return text


def font_text(text: str, font_name: str) -> str:
    """Fallback to the embedded sans font for mathematical glyphs absent from mono."""
    primary = pdfmetrics.getFont(font_name).face.charWidths
    fallback = pdfmetrics.getFont('CapeSans').face.charWidths
    output = []
    for char in text:
        escaped = html.escape(char)
        if ord(char) > 32 and ord(char) not in primary:
            if ord(char) not in fallback:
                raise ValueError(f'Unsupported PDF glyph: {char!r} U+{ord(char):04X}')
            escaped = f'<font name="CapeSans">{escaped}</font>'
        output.append(escaped)
    return ''.join(output)


class Cover(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = BODY_W, 670

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.setFillColor(NAVY)
        c.rect(0, h - 265, w, 265, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('CapeSans-Bold', 14)
        c.drawString(24, h - 42, 'CAPEAI')
        c.setFont('CapeSans', 10)
        c.drawString(24, h - 64, 'VESSEL INVESTMENT ANALYSIS')
        c.setFont('CapeSans-Bold', 32)
        c.drawString(24, h - 130, 'Reference book')
        c.setFont('CapeSans', 14)
        c.drawString(24, h - 164, 'A complete guide to the calculator,')
        c.drawString(24, h - 186, 'cash flows, assumptions, and limits.')
        c.setStrokeColor(colors.HexColor('#5CC0BC'))
        c.setLineWidth(2)
        c.line(24, h - 222, w - 24, h - 222)
        c.setFillColor(INK)
        c.setFont('CapeSans-Bold', 11)
        c.drawString(0, h - 309, 'One vessel. Explicit cash flows. Reproducible results.')
        c.setFont('CapeSans', 9.4)
        lines = [
            'Model 1.0.0  /  Study schema 1  /  18 October 2026',
            'Annual end-of-year periods  /  USD  /  Device-first storage',
        ]
        for index, line in enumerate(lines):
            c.drawString(0, h - 334 - index * 17, line)
        c.setFillColor(MUTED)
        c.setFont('CapeSans', 9)
        for index, (_, number, title) in enumerate(DOCS):
            c.drawString(0, h - 394 - index * 24, f'{number}  {title}')
        c.setStrokeColor(RULE)
        c.setLineWidth(.6)
        c.line(0, 72, w, 72)
        c.setFillColor(MUTED)
        c.setFont('CapeSans', 8)
        c.drawString(0, 50, 'STE-inspired plain technical English. No ASD-STE100 conformity claim.')
        c.drawString(0, 33, 'Original financial explanations. No author or institution endorsement.')
        c.drawString(0, 16, 'Illustrative assumptions require independent commercial and tax review.')


class ReferenceBook(BaseDocTemplate):
    def __init__(self, output: Path, style: dict[str, ParagraphStyle]):
        super().__init__(str(output), pagesize=A4, rightMargin=MARGIN, leftMargin=MARGIN,
                         topMargin=22*mm, bottomMargin=19*mm, title='CapeAI vessel investment reference book',
                         author='CapeAI', subject='User manual, equations, glossary, forensic history, and model contract')
        self.chapter = 'CAPEAI REFERENCE BOOK'
        self.style = style
        self.addPageTemplates(PageTemplate(id='Book', frames=[Frame(MARGIN, 19*mm, BODY_W, PAGE_H-41*mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPageEnd=self.decorate))

    def beforeDocument(self):
        self.chapter = 'CAPEAI REFERENCE BOOK'

    def decorate(self, canvas, doc):
        if doc.page == 1:
            return
        canvas.saveState()
        canvas.setFillColor(MUTED)
        canvas.setFont('CapeSans-Bold', 7.1)
        canvas.drawString(MARGIN, PAGE_H-13*mm, 'CAPEAI')
        canvas.setFont('CapeSans', 7.1)
        canvas.drawRightString(PAGE_W-MARGIN, PAGE_H-13*mm, self.chapter.upper())
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(.5)
        canvas.line(MARGIN, PAGE_H-16*mm, PAGE_W-MARGIN, PAGE_H-16*mm)
        canvas.line(MARGIN, 14*mm, PAGE_W-MARGIN, 14*mm)
        canvas.setFont('CapeSans', 7.1)
        canvas.drawString(MARGIN, 9.4*mm, 'MODEL 1.0.0  |  USD  |  ANNUAL PERIODS')
        canvas.drawRightString(PAGE_W-MARGIN, 9.4*mm, str(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if not hasattr(flowable, 'bookmark'):
            return
        key, level, title = flowable.bookmark
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(title, key, level=level, closed=level > 0)
        if level == 0:
            self.chapter = title
        if getattr(flowable, 'toc', False):
            self.notify('TOCEntry', (level, title, self.page, key))


def column_widths(rows: list[list[str]]) -> list[float]:
    count = len(rows[0])
    if count == 2:
        # Field names need a substantial column; narrative definitions need more space.
        first = ' '.join(row[0] for row in rows[1:])
        share = .42 if '.' in first or '[]' in first else .31
        return [BODY_W*share, BODY_W*(1-share)]
    if count == 3:
        if rows[0][0].strip().lower() in ('field', 'path'):
            return [BODY_W*.35, BODY_W*.37, BODY_W*.28]
        return [BODY_W*.25, BODY_W*.39, BODY_W*.36]
    if count == 4:
        return [BODY_W*.26] + [BODY_W*.74/3]*3
    if count == 5:
        return [BODY_W*.26] + [BODY_W*.74/4]*4
    return [BODY_W/count]*count


def make_table(lines: list[str], filename: str, style: dict[str, ParagraphStyle]):
    raw = [[part.strip() for part in line.strip().strip('|').split('|')] for line in lines]
    raw = [row for row in raw if not all(re.fullmatch(r':?-{3,}:?', cell) for cell in row)]
    count = max(map(len, raw))
    raw = [row+['']*(count-len(row)) for row in raw]
    def cell_style(cell: str, row: int, column: int):
        if row == 0:
            return style['thead']
        if column > 0 and re.match(r'^[\u2212-]?\$?[\d]+', cell):
            return style['numeric']
        return style['table']
    cells = [[Paragraph(inline(cell, filename), cell_style(cell, index, column)) for column, cell in enumerate(row)] for index, row in enumerate(raw)]
    result = Table(cells, colWidths=column_widths(raw), repeatRows=1, hAlign='LEFT', spaceBefore=5, spaceAfter=11, splitByRow=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, PALE]),
        ('LINEBELOW', (0, 0), (-1, 0), .7, NAVY),
        ('LINEBELOW', (0, 1), (-1, -1), .25, RULE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    # Keep compact reference tables together; long registers repeat their header.
    height = result.wrap(BODY_W, PAGE_H)[1]
    return KeepTogether([result]) if height <= 300 else result


def code_flowables(lines: list[str], style: dict[str, ParagraphStyle]) -> list:
    # One paragraph per logical line allows safe wrapping, with no equation truncation.
    rows = []
    for line in lines:
        line = normalize(line)
        # Preserve indentation without replacing spaces inside financial expressions.
        indentation = len(line)-len(line.lstrip(' '))
        content = '&#160;'*indentation + font_text(line.lstrip(' '), 'CapeMono')
        rows.append([Paragraph(content or '&#160;', style['code'])])
    box = Table(rows or [[Paragraph('&#160;', style['code'])]], colWidths=[BODY_W], hAlign='LEFT', spaceBefore=5, spaceAfter=11)
    box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PALE),
        ('LINEBEFORE', (0, 0), (0, -1), 2, TEAL),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return [KeepTogether([box])] if len(lines) <= 18 else [box]


def document_flowables(filename: str, number: str, title: str, style: dict[str, ParagraphStyle]) -> list:
    if filename == 'references.md':
        # Keep the complete bibliography on one readable page, without a sparse tail page.
        style = dict(style)
        for key in ['body', 'lead', 'step']:
            style[key] = ParagraphStyle(f'Reference-{key}', parent=style[key], fontSize=8.6, leading=12.8, spaceAfter=4)
        style['h2'] = ParagraphStyle('ReferenceHeading', parent=style['h2'], spaceBefore=12, spaceAfter=7)
    result = [PageBreak(), Paragraph(f'REFERENCE BOOK / {number}', style['kicker'])]
    chapter = Paragraph(title, style['chapter'])
    chapter.bookmark = (ANCHORS[(filename, '')], 0, title)
    chapter.toc = True
    result.append(chapter)
    lines = (ROOT/'docs'/filename).read_text().splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip() or line.startswith('# '):
            index += 1
            continue
        if filename == 'MANUAL.md' and line == '## Contents':
            # Replace the Markdown contents with the book's paginated, linked contents.
            index += 1
            while index < len(lines) and not lines[index].startswith('## 1.'):
                index += 1
            continue
        if line.startswith('```'):
            code = []
            index += 1
            while index < len(lines) and not lines[index].startswith('```'):
                code.append(lines[index])
                index += 1
            result.extend(code_flowables(code, style))
            index += 1
            continue
        if line.strip().startswith('|'):
            table = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                table.append(lines[index])
                index += 1
            result.append(make_table(table, filename, style))
            continue
        heading = re.match(r'^(#{2,6})\s+(.+)', line)
        if heading:
            depth = min(len(heading.group(1)), 4)
            title_text = heading.group(2)
            item = Paragraph(inline(title_text, filename), style[f'h{depth}'])
            item.bookmark = (ANCHORS[(filename, slug(title_text))], min(depth-1, 2), normalize(title_text))
            item.toc = filename == 'MANUAL.md' and depth == 2
            result.append(item)
            index += 1
            continue
        numbered = re.match(r'^(\d+)\.\s+(.*)', line)
        bullet = re.match(r'^[-*]\s+(.*)', line)
        if numbered:
            result.append(Paragraph(f'<b>{numbered.group(1)}.</b>  '+inline(numbered.group(2), filename), style['step']))
            index += 1
            continue
        if bullet:
            result.append(Paragraph('&#8226;  '+inline(bullet.group(1), filename), style['bullet']))
            index += 1
            continue
        paragraph = [line.strip()]
        hard_break = line.endswith('  ')
        index += 1
        while not hard_break and index < len(lines) and lines[index].strip() and not re.match(r'^(?:#|\||```|\d+\.\s|[-*]\s)', lines[index]):
            paragraph.append(lines[index].strip())
            hard_break = lines[index].endswith('  ')
            index += 1
        body = ' '.join(paragraph)
        result.append(Paragraph(inline(body, filename), style['lead'] if body.endswith(':') else style['body']))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font-dir', help='Directory with DejaVu Sans and DejaVu Sans Mono TTF families.')
    parser.add_argument('--output', default=str(ROOT/'output/pdf/CapeAI-manual.pdf'))
    args = parser.parse_args()
    register_fonts(args.font_dir)
    style = styles()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    book = ReferenceBook(output, style)
    contents = TableOfContents()
    contents.levelStyles = [style['toc0'], style['toc1']]
    contents.dotsMinLevel = 0
    story = [Cover(), PageBreak(), Paragraph('Contents', style['chapter']),
             Paragraph('Use the page numbers or click an entry. PDF bookmarks also navigate the full reference book.', style['body']), contents]
    for filename, number, title in DOCS:
        story.extend(document_flowables(filename, number, title, style))
    book.multiBuild(story)
    print(f'Created {output}')


if __name__ == '__main__':
    main()
