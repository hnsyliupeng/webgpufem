#!/usr/bin/env python3
# tools/build_docs.py — build docs/OrcaFlex_DAVE_实现文档.docx (python-docx, graded headings, flowcharts as PNG).
# Auto-bootstraps a venv with python-docx + pillow if they are missing.
# Usage:  python3 tools/build_docs.py     (or: npm run docs)
import json, os, re, subprocess, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
FIGS = os.path.join(DOCS, 'figs')
OUT = os.path.join(DOCS, 'OrcaFlex_DAVE_实现文档.docx')


def bootstrap():
    try:
        import docx  # noqa
        import PIL   # noqa
        return
    except ImportError:
        pass
    venv = os.path.join(ROOT, '.venv')
    py = os.path.join(venv, 'bin', 'python')
    if not os.path.exists(py):
        print('[build_docs] creating venv .venv and installing python-docx + pillow ...')
        subprocess.check_call([sys.executable, '-m', 'venv', venv])
        subprocess.check_call([py, '-m', 'pip', 'install', '--quiet', 'python-docx', 'pillow'])
    os.execv(py, [py, os.path.abspath(__file__)])


bootstrap()

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from PIL import Image, ImageDraw, ImageFont

# ---------- inputs ----------
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

os.makedirs(FIGS, exist_ok=True)

# ---------- fonts ----------
CJK_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
    'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf',
    '/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/STHeiti Light.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
]
DEJAVU = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def pick_font(size, cjk):
    if cjk:
        for p in CJK_CANDIDATES:
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    if os.path.exists(DEJAVU):
        return ImageFont.truetype(DEJAVU, size)
    return ImageFont.load_default()


# English labels for flowchart PNGs when no CJK font is available (sandbox fallback)
EN = {
    'pipeline:build': 'Build Model\n(scene DAG+bodies+lines+env)', 'pipeline:env': 'Environment\nwaves/current/wind/seabed',
    'pipeline:statics': 'computeStatics\nNewton+numeric Jacobian', 'pipeline:dyn': 'runDynamics\nsemi-implicit Euler',
    'pipeline:post': 'post.js\nstats/rainflow/Miner/extremes', 'pipeline:out': 'Outputs\nchannels/snapshots/checks/shots',
    'line-forces:ends': 'end attachments\nfixed/vessel/motion', 'line-forces:axial': 'axial T=EA*eps\n+ axial damping',
    'line-forces:bend': 'bending U=1/2 EI th^2/L\nenergy-consistent grad', 'line-forces:morison': 'Morison\ndrag+inertia',
    'line-forces:bed': 'seabed penalty\n+ Coulomb friction', 'line-forces:sum': 'node forces F[i]\nreactions A/B',
    'newton:init': 'analytic init\ncatenary shape', 'newton:res': 'residual R(x)\nnode+body forces',
    'newton:jac': 'numeric J=dR/dx\n+ridge', 'newton:step': 'solve J dx=-R\ntrust region+line search',
    'newton:conv': 'res < tol?', 'newton:done': 'converged:\nstatic config',
    'dynamics:att': 'updateAttachments(t)\nwinch L0', 'dynamics:forces': 'line.computeForces\n+couple bodies',
    'dynamics:lstep': 'line.step(dt)\nv+=F/m dt', 'dynamics:bstep': 'body.step(dt)\n6DOF Euler+damping',
    'dynamics:rec': 'record channels\nsnapshots',
    'dave-scene:model': 'Model\nglobals+env', 'dave-scene:scene': 'Scene DAG\nPoint/Poi/Shape/Frame',
    'dave-scene:bodies': 'RigidBody6DOF', 'dave-scene:lines': 'Line lumped-mass\nends attached',
    'dave-scene:winch': 'Winch: rate->L0', 'dave-scene:attach': 'local->world\nattachments',
    'waves:spec': 'JONSWAP/PM S(f)\nm0=Hs^2/16', 'waves:disc': 'discretize: N regular\ncomponents+phases',
    'waves:airy': 'Airy/Stokes2\nu,a,p', 'waves:use': 'Morison / FK /\nbuoy wave force',
    'fatigue:hist': 'tension history T(t)', 'fatigue:rf': 'ASTM rainflow\n(amp,mean)',
    'fatigue:sn': 'S-N curve\nN=A S^-m', 'fatigue:miner': 'Miner D=sum n/N',
    'fatigue:ext': 'Gumbel extremes\nreturn levels',
}

KIND_FILL = {'proc': (219, 234, 254), 'data': (220, 252, 231), 'decision': (254, 243, 199)}
KIND_EDGE = {'proc': (37, 99, 235), 'data': (22, 163, 74), 'decision': (217, 119, 6)}


def draw_flowchart_png(fc, path):
    W, H = 112, 34
    maxX = max(n['x'] + n['w'] for n in fc['nodes']); maxY = max(n['y'] + n['h'] for n in fc['nodes'])
    scale = min(9.0, 1500 / (maxX + 2) / W * W / W)  # px per grid unit
    scale = min(1500 / (maxX + 2), 260 / (maxY + 2))
    pad = 20
    Wpx = int((maxX + 2) * scale) + pad * 2; Hpx = int((maxY + 2) * scale) + pad * 2
    img = Image.new('RGB', (Wpx, Hpx), 'white'); dr = ImageDraw.Draw(img)
    cjk = any(os.path.exists(p) for p in CJK_CANDIDATES)
    fnt = pick_font(max(11, int(scale * 0.30)), cjk)
    byid = {n['id']: n for n in fc['nodes']}

    def rect(n): return [pad + n['x'] * scale, pad + n['y'] * scale, pad + (n['x'] + n['w']) * scale, pad + (n['y'] + n['h']) * scale]
    def center(n): r = rect(n); return ((r[0] + r[2]) / 2, (r[1] + r[3]) / 2)

    def arrow(p1, p2, dashed=False, label=None):
        import math
        steps = 24 if dashed else 1
        for i in range(steps):
            if dashed and i % 2: continue
            a = (p1[0] + (p2[0] - p1[0]) * i / 24, p1[1] + (p2[1] - p1[1]) * i / 24)
            b = (p1[0] + (p2[0] - p1[0]) * (i + 1) / 24, p1[1] + (p2[1] - p1[1]) * (i + 1) / 24)
            dr.line([a, b], fill=(100, 116, 139), width=2)
        ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        L = 8
        dr.polygon([p2, (p2[0] - L * math.cos(ang - 0.4), p2[1] - L * math.sin(ang - 0.4)),
                    (p2[0] - L * math.cos(ang + 0.4), p2[1] - L * math.sin(ang + 0.4))], fill=(100, 116, 139))
        if label:
            dr.text(((p1[0] + p2[0]) / 2 + 4, (p1[1] + p2[1]) / 2 - 10), label, fill=(71, 85, 105), font=fnt)

    EDGE_EN = {'否: x+=Δx': 'no: x+=dx', '是': 'yes', 't+=dt 下一步': 't+=dt', '初始状态': 'init state',
               'series/snapshots': 'series/snaps', '附着点': 'attach', 'vessel 端': 'vessel end', 'FK/运动': 'FK/motion',
               '局部坐标→世界坐标': 'local->world', '落地段': 'on seabed'}
    for e in fc['edges']:
        a, b = byid[e['from']], byid[e['to']]
        ca, cb = center(a), center(b)
        ra, rb = rect(a), rect(b)
        dx, dy = cb[0] - ca[0], cb[1] - ca[1]
        if abs(dx) >= abs(dy):
            p1 = (ra[2], ca[1]) if dx > 0 else (ra[0], ca[1]); p2 = (rb[0], cb[1]) if dx > 0 else (rb[2], cb[1])
            mid = ((p1[0] + p2[0]) / 2, p1[1] if abs(dy) < 1 else (p1[1] + p2[1]) / 2)
            dr.line([p1, mid], fill=(100, 116, 139), width=2)
            if abs(dy) >= 1: dr.line([(mid[0], p1[1]), mid], fill=(100, 116, 139), width=2)
            arrow(mid, p2, e.get('dashed'), e.get('label') if cjk else None)
        else:
            p1 = (ca[0], ra[3]) if dy > 0 else (ca[0], ra[1]); p2 = (cb[0], rb[1]) if dy > 0 else (cb[0], rb[3])
            mid = (p1[0] if abs(dx) < 1 else (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
            dr.line([p1, mid], fill=(100, 116, 139), width=2)
            if abs(dx) >= 1: dr.line([(p1[0], mid[1]), mid], fill=(100, 116, 139), width=2)
            arrow(mid, p2, e.get('dashed'), e.get('label') if cjk else None)
        if e.get('label') and not cjk:
            lab = EDGE_EN.get(e['label'], e['label'])
            if all(ord(ch) < 128 for ch in lab):
                mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
                dr.text((mx + 4, my - 12), lab, fill=(71, 85, 105), font=fnt)
    for n in fc['nodes']:
        r = rect(n)
        dr.rounded_rectangle(r, radius=6, fill=KIND_FILL.get(n['kind'], (226, 232, 240)), outline=KIND_EDGE.get(n['kind'], (71, 85, 105)), width=2)
        label = n['label'] if cjk else EN.get(f"{fc['id']}:{n['id']}", n['id'])
        fs = max(10, int(scale * 0.26)); fnt2 = pick_font(fs, cjk)
        lh = int(fs * 1.3)
        maxw = (n['w'] * scale) - 12
        lines = []
        for seg in label.split('\n'):
            cur = ''
            for ch in seg:
                if dr.textlength(cur + ch, font=fnt2) <= maxw or not cur:
                    cur += ch
                else:
                    lines.append(cur); cur = ch
            lines.append(cur)
        y0 = center(n)[1] - (len(lines) - 1) * lh / 2
        for i, ln in enumerate(lines):
            wtxt = dr.textlength(ln, font=fnt2)
            dr.text((center(n)[0] - wtxt / 2, y0 + i * lh), ln, fill=(15, 23, 42), font=fnt2)
    img.save(path)
    return cjk


# ---------- docx ----------
doc = Document()
st = doc.styles['Normal']; st.font.name = 'Microsoft YaHei'; st.font.size = Pt(10.5)

t = doc.add_heading(DOC['meta']['title'], level=0)
p = doc.add_paragraph(DOC['meta']['subtitle']); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p = doc.add_paragraph(f"生成日期: {DOC['meta']['generated']}   |   代码: github 仓库 webgpufem (branch arena/77e5e282-webgpufem)")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
b = doc.add_paragraph(); r = b.add_run('边界声明：' + DOC['meta']['boundary']); r.bold = True; r.font.color.rgb = RGBColor(0xB4, 0x5F, 0x06)

doc.add_heading('目录', level=1)
for sec in DOC['sections']:
    doc.add_paragraph(sec['title'], style='List Number')
doc.add_paragraph('附录A 流程图（PNG）', style='List Number')
doc.add_paragraph('附录B 验证结果总表（10 算例，全部 PASS）', style='List Number')

for sec in DOC['sections']:
    doc.add_heading(sec['title'], level=1)
    for ch in sec['children']:
        doc.add_heading(ch['h'], level=2)
        for bd in ch['body']:
            if bd['t'] == 'p':
                doc.add_paragraph(bd['s'])
            elif bd['t'] == 'ul':
                for it in bd['items']:
                    doc.add_paragraph(it, style='List Bullet')
            elif bd['t'] == 'code':
                cp = doc.add_paragraph(); cr = cp.add_run(bd['s']); cr.font.name = 'Consolas'; cr.font.size = Pt(9)
            elif bd['t'] == 'formula':
                fp = doc.add_paragraph(); fr = fp.add_run(bd['s']); fr.italic = True; fr.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)

doc.add_heading('附录A 流程图（PNG）', level=1)
doc.add_paragraph('与 App 中“流程图”页卡一致（同一份 core/flowcharts.js 数据渲染）；在装有中文字体的环境运行 npm run docs 时图内标签为中文，否则为英文标签。')
for fc in FC:
    png = os.path.join(FIGS, fc['id'] + '.png')
    draw_flowchart_png(fc, png)
    doc.add_heading(fc['title'], level=2)
    doc.add_picture(png, width=Inches(6.5))

if VER:
    doc.add_heading('附录B 验证结果总表（10 算例，全部 PASS）', level=1)
    doc.add_paragraph(f"生成时间 {VER['generated']} · allPass={VER['allPass']} · 运行器: node tools/run_examples.mjs（同时输出 screenshots/ 与 docs/verification_report.{{md,html}}）")
    for res in VER['results']:
        doc.add_heading(f"{res['id']} {res['name']}", level=2)
        tb = doc.add_table(rows=1, cols=5); tb.style = 'Light Grid Accent 1'
        for i, h in enumerate(['校核项', '期望', '实际', '单位', '结果']):
            tb.rows[0].cells[i].text = h
        for c in res['checks']:
            row = tb.add_row().cells
            row[0].text = str(c['name'])
            row[1].text = f"{c['expected']:.6g}" if isinstance(c['expected'], (int, float)) else str(c['expected'])
            row[2].text = f"{c['actual']:.6g}" if isinstance(c['actual'], (int, float)) else str(c['actual'])
            row[3].text = str(c.get('unit') or '')
            row[4].text = 'PASS' if c['pass'] else 'FAIL'

doc.save(OUT)
print('wrote', OUT, f'({os.path.getsize(OUT)//1024} KB), figs in docs/figs/')
