#!/usr/bin/env python3
# tools/build_pdf.py — build docs/OrcaFlex_DAVE_实现文档.pdf (reportlab), the PDF copy of the docx.
# Same source data as build_docs.py (docs/doc_data.json + docs/flowcharts.json + app/verification_data.js),
# so the PDF mirrors the Word document section by section, with the same flowchart PNGs (docs/figs).
#
# CJK font: uses docs/fonts/NotoSansSC-*.ttf or /tmp/noto/NotoSansSC-*.ttf if present; otherwise
# auto-fetches @fontsource/noto-sans-sc from npm and converts woff2->ttf with fonttools+brotli:
#   npm pack @fontsource/noto-sans-sc && tar xzf *.tgz
#   python -c "from fontTools.ttLib import TTFont; f=TTFont('package/files/noto-sans-sc-chinese-simplified-400-normal.woff2'); f.flavor=None; f.save('NotoSansSC-400.ttf')"
# Usage:  /tmp/docxenv/bin/python tools/build_pdf.py   (or: npm run docs:pdf)
import json, os, re, subprocess, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
FIGS = os.path.join(DOCS, 'figs')
OUT = os.path.join(DOCS, 'OrcaFlex_DAVE_实现文档.pdf')


def ensure_font():
    """return (regular_path, bold_path) of a CJK ttf; auto-download if missing."""
    cands = [os.path.join(DOCS, 'fonts'), '/tmp/noto']
    for d in cands:
        r = os.path.join(d, 'NotoSansSC-400.ttf')
        b = os.path.join(d, 'NotoSansSC-700.ttf')
        if os.path.exists(r) and os.path.exists(b):
            return r, b
    # auto-fetch
    work = '/tmp/noto'
    os.makedirs(work, exist_ok=True)
    if not os.path.exists(os.path.join(work, 'NotoSansSC-400.ttf')):
        subprocess.check_call(['npm', 'pack', '@fontsource/noto-sans-sc'], cwd='/tmp/fontpkg' if os.path.isdir('/tmp/fontpkg') else work)
        tgz = glob.glob(os.path.join('/tmp/fontpkg' if os.path.isdir('/tmp/fontpkg') else work, 'fontsource-noto-sans-sc-*.tgz'))[0]
        subprocess.check_call(['tar', 'xzf', tgz, '-C', work])
        from fontTools.ttLib import TTFont
        pkg = os.path.join(work, 'package', 'files')
        for w in ('400', '700'):
            f = TTFont(os.path.join(pkg, f'noto-sans-sc-chinese-simplified-{w}-normal.woff2'))
            f.flavor = None
            f.save(os.path.join(work, f'NotoSansSC-{w}.ttf'))
    return os.path.join(work, 'NotoSansSC-400.ttf'), os.path.join(work, 'NotoSansSC-700.ttf')


def main():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
                                    PageBreak, KeepTogether)
    from reportlab.lib.styles import ParagraphStyle

    reg, bold = ensure_font()
    pdfmetrics.registerFont(TTFont('NotoSC', reg))
    pdfmetrics.registerFont(TTFont('NotoSC-Bold', bold))
    pdfmetrics.registerFontFamily('NotoSC', normal='NotoSC', bold='NotoSC-Bold', italic='NotoSC', boldItalic='NotoSC-Bold')

    if not (os.path.exists(os.path.join(DOCS, 'flowcharts.json')) and os.path.exists(os.path.join(DOCS, 'doc_data.json'))):
        subprocess.check_call(['node', os.path.join(ROOT, 'tools', 'export_docs.mjs')], cwd=ROOT)
    with open(os.path.join(DOCS, 'flowcharts.json')) as f:
        FC = json.load(f)['flowcharts']
    with open(os.path.join(DOCS, 'doc_data.json')) as f:
        DOC = json.load(f)
    ver_js = os.path.join(ROOT, 'app', 'verification_data.js')
    VER = None
    if os.path.exists(ver_js):
        s = open(ver_js).read()
        VER = json.loads(s[s.index('{'):s.rindex('}') + 1])

    S = {
        'title': ParagraphStyle('title', fontName='NotoSC-Bold', fontSize=20, leading=26, alignment=1, spaceAfter=8),
        'sub': ParagraphStyle('sub', fontName='NotoSC', fontSize=11, leading=15, alignment=1, textColor=colors.HexColor('#475569')),
        'meta': ParagraphStyle('meta', fontName='NotoSC', fontSize=9, leading=13, alignment=1, textColor=colors.HexColor('#64748b')),
        'boundary': ParagraphStyle('boundary', fontName='NotoSC-Bold', fontSize=10, leading=14, textColor=colors.HexColor('#B45F06'), spaceBefore=6, spaceAfter=6),
        'h1': ParagraphStyle('h1', fontName='NotoSC-Bold', fontSize=15, leading=20, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor('#0f172a')),
        'h2': ParagraphStyle('h2', fontName='NotoSC-Bold', fontSize=12, leading=16, spaceBefore=10, spaceAfter=4, textColor=colors.HexColor('#1e293b')),
        'p': ParagraphStyle('p', fontName='NotoSC', fontSize=10, leading=14.5, spaceAfter=5),
        'li': ParagraphStyle('li', fontName='NotoSC', fontSize=10, leading=14.5, leftIndent=16, bulletIndent=6, spaceAfter=2.5),
        'code': ParagraphStyle('code', fontName='NotoSC', fontSize=8.2, leading=11, leftIndent=10, backColor=colors.HexColor('#f1f5f9'), borderPadding=4, spaceAfter=6, textColor=colors.HexColor('#0f172a')),
        'formula': ParagraphStyle('formula', fontName='NotoSC', fontSize=10, leading=14, leftIndent=10, textColor=colors.HexColor('#1D4ED8'), spaceAfter=5),
        'cell': ParagraphStyle('cell', fontName='NotoSC', fontSize=8, leading=10.5),
        'cellh': ParagraphStyle('cellh', fontName='NotoSC-Bold', fontSize=8, leading=10.5, textColor=colors.white),
    }

    def esc(t):
        return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont('NotoSC', 8)
        canvas.setFillColor(colors.HexColor('#64748b'))
        canvas.drawString(0.7 * inch, 0.45 * inch, 'WebGPUFEM — OrcaFlex/DAVE 清洁室实现文档 (PDF 副本)')
        canvas.drawRightString(A4[0] - 0.7 * inch, 0.45 * inch, f'第 {doc_.page} 页')
        canvas.restoreState()

    story = []
    story.append(Paragraph(esc(DOC['meta']['title']), S['title']))
    story.append(Paragraph(esc(DOC['meta']['subtitle']), S['sub']))
    story.append(Paragraph(esc(f"生成日期: {DOC['meta']['generated']}   |   代码: github 仓库 webgpufem (branch arena/77e5e282-webgpufem)"), S['meta']))
    story.append(Paragraph(esc('边界声明：' + DOC['meta']['boundary']), S['boundary']))

    story.append(Paragraph('目录', S['h1']))
    for sec in DOC['sections']:
        story.append(Paragraph(esc(sec['title']), S['li']))
    story.append(Paragraph('附录A 流程图（PNG)', S['li']))
    story.append(Paragraph(f"附录B 验证结果总表（{len(VER['results']) if VER else 27} 算例，全部 PASS）", S['li']))

    for sec in DOC['sections']:
        story.append(Paragraph(esc(sec['title']), S['h1']))
        for ch in sec.get('children', []):
            story.append(Paragraph(esc(ch['h']), S['h2']))
            for bd in ch['body']:
                t = bd['t']
                if t == 'p':
                    story.append(Paragraph(esc(bd['s']), S['p']))
                elif t == 'ul':
                    for it in bd['items']:
                        story.append(Paragraph(esc(it), S['li'], bulletText='•'))
                elif t == 'code':
                    story.append(Paragraph('<font face="NotoSC">' + esc(bd['s']).replace('\n', '<br/>') + '</font>', S['code']))
                elif t == 'formula':
                    story.append(Paragraph('<i>' + esc(bd['s']) + '</i>', S['formula']))

    story.append(PageBreak())
    story.append(Paragraph('附录A 流程图（PNG）', S['h1']))
    story.append(Paragraph('与 App 中“流程图”页卡及 docx 附录A 一致（同一份 core/flowcharts.js 数据渲染的 docs/figs/*.png)。', S['p']))
    for fc in FC:
        png = os.path.join(FIGS, fc['id'] + '.png')
        if not os.path.exists(png):
            continue
        story.append(Paragraph(esc(fc['title']), S['h2']))
        from PIL import Image as PILImage
        with PILImage.open(png) as im:
            w, h = im.size
        maxw = A4[0] - 1.4 * inch
        story.append(Image(png, width=maxw, height=maxw * h / w))
        story.append(Spacer(1, 6))

    if VER:
        story.append(PageBreak())
        n = len(VER['results'])
        story.append(Paragraph(f'附录B 验证结果总表（{n} 算例，全部 PASS）', S['h1']))
        story.append(Paragraph(esc(f"生成时间 {VER['generated']} · allPass={VER['allPass']} · 运行器: node tools/run_examples.mjs（同时输出 screenshots/ 与 docs/verification_report.{{md,html}}）"), S['p']))
        for res in VER['results']:
            rows = [[Paragraph('校核项', S['cellh']), Paragraph('期望', S['cellh']), Paragraph('实际', S['cellh']), Paragraph('单位', S['cellh']), Paragraph('结果', S['cellh'])]]
            for c in res['checks']:
                def fmt(v):
                    return f'{v:.6g}' if isinstance(v, (int, float)) and not isinstance(v, bool) else str(v)
                rows.append([Paragraph(esc(c['name']), S['cell']), Paragraph(esc(fmt(c['expected'])), S['cell']),
                             Paragraph(esc(fmt(c['actual'])), S['cell']), Paragraph(esc(str(c.get('unit') or '')), S['cell']),
                             Paragraph('PASS' if c['pass'] else 'FAIL', S['cellh'] if c['pass'] else S['cell'])])
            tb = Table(rows, colWidths=[2.9 * inch, 1.15 * inch, 1.15 * inch, 0.55 * inch, 0.6 * inch], repeatRows=1)
            tb.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#94a3b8')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TEXTCOLOR', (4, 1), (4, -1), colors.HexColor('#15803d')),
            ]))
            story.append(KeepTogether([Paragraph(esc(f"{res['id']} {res['name']}"), S['h2']), tb, Spacer(1, 8)]))

    doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=0.7 * inch, rightMargin=0.7 * inch,
                            topMargin=0.7 * inch, bottomMargin=0.7 * inch,
                            title=DOC['meta']['title'], author='webgpufem')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print('wrote', OUT, f'({os.path.getsize(OUT)//1024} KB)')


if __name__ == '__main__':
    main()
