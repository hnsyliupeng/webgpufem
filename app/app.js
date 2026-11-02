// app/app.js — WebGPUFEM standalone GUI (no build step, no network).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Line2 } from 'three/addons/Line2.js';
import { LineGeometry } from 'three/addons/LineGeometry.js';
import { LineMaterial } from 'three/addons/LineMaterial.js';
import { EXAMPLES, getExample } from '../examples/index.js';
import * as sv from '../core/solvers.js';
import { describeScene, tensionColor } from '../core/render_scene.js';
import { VERIFICATION } from './verification_data.js';
import { DOC_META, DOC_SECTIONS } from '../docs/doc_data.js';
import { FLOWCHARTS, flowchartSVG } from '../core/flowcharts.js';

const $ = (s) => document.querySelector(s);

// ---------------- 3D view ----------------
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b16);
scene.fog = new THREE.Fog(0x060b16, 400, 1600);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
const controls = new OrbitControls(camera, canvas);
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(200, -300, 400); scene.add(sun);
scene.add(new THREE.AxesHelper(30));

const grpWorld = new THREE.Group(); scene.add(grpWorld);   // seabed + water
const grpModel = new THREE.Group(); scene.add(grpModel);   // lines + bodies + pois
let waterMesh = null, bedMesh = null;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}
new ResizeObserver(resize).observe(canvas);

function setCamera(cam) {
  camera.position.set(...cam.pos); controls.target.set(...cam.target); controls.update();
}

function buildWorld(model) {
  grpWorld.clear();
  const depth = model.env.seabed ? model.env.seabed.depth : 100;
  // seabed grid
  const ext = 400;
  bedMesh = new THREE.GridHelper(ext * 2, 20, 0x2a3a55, 0x1a2740);
  bedMesh.position.y = -depth; grpWorld.add(bedMesh);
  // water surface
  const N = 48, S = 500;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  waterMesh = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const wg = new THREE.Mesh(g.clone(), new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false }));
  grpWorld.add(waterMesh, wg); waterMesh.userData.wire = wg;
  grpModel.clear();
}

function setWaterT(model, t) {
  if (!waterMesh) return;
  const w = model.env.waves;
  const pos = waterMesh.geometry.attributes.position;
  if (!w) { for (let i = 0; i < pos.count; i++) pos.setZ(i, 0); }
  else {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, w.eta(x, y, t));
    }
  }
  pos.needsUpdate = true; waterMesh.geometry.computeVertexNormals();
  waterMesh.userData.wire.position.z = 0; waterMesh.userData.wire.geometry = waterMesh.geometry;
}

// line visuals: fat line w/ tension colors + node points
const lineViz = new Map(); // name -> {line, pts}
const bodyViz = new Map(); // name -> mesh
const poiViz = new Map();

function clearModelViz() { for (const v of lineViz.values()) { grpModel.remove(v.line, v.pts); v.line.geometry.dispose(); } lineViz.clear(); for (const m of bodyViz.values()) grpModel.remove(m); bodyViz.clear(); for (const p of poiViz.values()) grpModel.remove(p); poiViz.clear(); }

function ensureLineViz(name, n) {
  let v = lineViz.get(name);
  if (v && v.pts.geometry.attributes.position.count === n + 1) return v;
  if (v) { grpModel.remove(v.line, v.pts); }
  const geo = new LineGeometry();
  const pos = new Float32Array((n + 1) * 3), col = new Float32Array((n + 1) * 3);
  geo.setPositions(pos); geo.setColors(col);
  const mat = new LineMaterial({ linewidth: 5, vertexColors: true, dashed: false });
  mat.resolution.set(canvas.clientWidth || 800, canvas.clientHeight || 600);
  const line = new Line2(geo, mat); line.frustumCulled = false;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }));
  pts.frustumCulled = false;
  grpModel.add(line, pts); v = { line, pts, geo, mat }; lineViz.set(name, v); return v;
}

function ensureBodyViz(name, d) {
  let m = bodyViz.get(name);
  if (m) return m;
  let geo;
  if (d.L && d.B && d.T) geo = new THREE.BoxGeometry(d.L, d.B, d.T);
  else { const r = Math.sqrt((d.Awp || 20) / Math.PI); geo = new THREE.CylinderGeometry(r, r, 2 * r, 20); }
  const color = d.type === 'Vessel' ? 0x7aa2f7 : 0xe0af68;
  m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.9 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x0b1220 }));
  m.add(edges); grpModel.add(m); bodyViz.set(name, m); return m;
}

function renderSnap(model, snap) {
  const desc = describeScene(model, snap);
  // lines
  const allT = [];
  for (const l of desc.lines) for (const t of l.T) allT.push(t);
  const tmin = Math.min(...allT, 0), tmax = Math.max(...allT, 1);
  for (const l of desc.lines) {
    const v = ensureLineViz(l.name, l.pts.length - 1);
    const pa = v.geo.attributes.position, ca = v.geo.attributes.color;
    l.pts.forEach((p, i) => { pa.setXYZ(i, p[0], p[1], p[2]); const c = new THREE.Color(tensionColor(l.T[Math.min(i, l.T.length - 1)], tmin, tmax)); ca.setXYZ(i, c.r, c.g, c.b); });
    pa.needsUpdate = true; ca.needsUpdate = true;
    v.geo.setPositions(pa.array); v.geo.setColors(ca.array);
    const pp = v.pts.geometry.attributes.position; l.pts.forEach((p, i) => pp.setXYZ(i, p[0], p[1], p[2])); pp.needsUpdate = true;
  }
  // bodies
  for (const b of desc.bodies) {
    const m = ensureBodyViz(b.name, b);
    m.position.set(...b.pos);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(b.rot[0], b.rot[1], b.rot[2], 'ZYX')));
  }
  // pois
  for (const p of desc.points) {
    let s = poiViz.get(p.name);
    if (!s) { s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf472b6 })); grpModel.add(s); poiViz.set(p.name, s); }
    s.position.set(...p.pos);
  }
  setWaterT(model, snap ? snap.t : 0);
}

// ---------------- simulation (manual stepping so the UI never blocks) ----------------
let sim = null;
function stopSim() { if (sim) sim.dead = true; sim = null; $('#btnStop').disabled = true; $('#btnPlay').textContent = '▶ 播放'; }

function startExample(ex, mode) {
  stopSim(); clearModelViz();
  const model = ex.build();
  setCamera(ex.camera || { pos: [120, -160, 90], target: [0, 0, -30] });
  buildWorld(model);
  const st = sv.computeStatics(model, { tol: 1e-7, maxIter: 80 });
  if (ex.perturb) ex.perturb(model);
  sv.updateAttachments(model, 0);
  $('#prog').textContent = `静力残差 ${st.residual.toExponential(2)} (${st.iterations} 次迭代)`;
  let dt = 1e9;
  for (const l of model.lines) dt = Math.min(dt, l.autoDt(0.25));
  for (const b of model.bodies) dt = Math.min(dt, b.autoDt(0.25));
  dt = Math.min(dt, 0.01);
  const tEnd = mode === 'dyn' ? Math.min(ex.analysis.tEnd || 30, 30) : 0;
  sim = { ex, model, dt, t: 0, tEnd, mode, st, snaps: [], series: { t: [] }, dead: false, playing: false, snapIdx: 0 };
  for (const ch of model.channels) sim.series[ch.name] = [];
  const snap0 = { t: 0, lines: model.lines.map(l => ({ name: l.name, pts: l.pos.map(p => [...p]), T: Array.from(l.segT) })), bodies: model.bodies.map(b => ({ name: b.name, type: b.type, pos: b.worldOrigin(), rot: b.rotVec(), q: [...b.q] })) };
  sim.snaps.push(snap0); rec(sim, 0);
  renderSnap(model, snap0); drawChart();
  $('#scrub').max = 0; $('#scrub').value = 0;
  if (mode === 'dyn') {
    $('#btnStop').disabled = false;
    $('#prog').textContent += ` · 动力步进中 (dt=${dt.toExponential(2)}, tEnd=${tEnd}s，GUI 演示时长上限 30s)`;
    requestAnimationFrame(tick);
  }
}

function rec(s, t) { s.series.t.push(t); for (const ch of s.model.channels) s.series[ch.name].push(ch.fn(s.model, t)); }

function snapshotOf(model, t) {
  return { t, lines: model.lines.map(l => ({ name: l.name, pts: l.pos.map(p => [...p]), T: Array.from(l.segT) })), bodies: model.bodies.map(b => ({ name: b.name, type: b.type, pos: b.worldOrigin(), rot: b.rotVec(), q: [...b.q] })) };
}

function tick() {
  if (!sim || sim.dead) return;
  const s = sim;
  // advance ~0.06 s sim time per frame
  const n = Math.max(1, Math.round(0.06 / s.dt));
  const snapEvery = Math.max(1, Math.round(0.25 / s.dt));
  for (let k = 0; k < n && s.t < s.tEnd; k++) {
    sv.updateAttachments(s.model, s.t);
    sv.coupleLinesToBodies(s.model);
    for (const l of s.model.lines) l.step(s.dt, s.t);
    for (const b of s.model.bodies) b.step(s.dt, s.t);
    s.t += s.dt;
    if (Math.round(s.t / s.dt) % Math.max(1, Math.round(0.05 / s.dt)) === 0) rec(s, s.t);
    if (Math.round(s.t / s.dt) % snapEvery === 0 && s.snaps.length < 600) s.snaps.push(snapshotOf(s.model, s.t));
  }
  const last = s.snaps[s.snaps.length - 1];
  renderSnap(s.model, last);
  $('#scrub').max = s.snaps.length - 1;
  if (!s.playing) { $('#scrub').value = s.snaps.length - 1; $('#tlabel').textContent = `t = ${last.t.toFixed(2)} s`; }
  drawChart();
  if (s.t < s.tEnd) requestAnimationFrame(tick);
  else { $('#prog').textContent += ' · 完成'; $('#btnStop').disabled = true; }
}

$('#btnStop').onclick = stopSim;
$('#btnPlay').onclick = () => { if (!sim || !sim.snaps.length) return; sim.playing = !sim.playing; $('#btnPlay').textContent = sim.playing ? '⏸ 暂停' : '▶ 播放'; playLoop(); };
let playTimer = null;
function playLoop() {
  if (!sim || !sim.playing || sim.dead) return;
  sim.snapIdx = (sim.snapIdx + 1) % sim.snaps.length;
  $('#scrub').value = sim.snapIdx;
  const sn = sim.snaps[sim.snapIdx]; renderSnap(sim.model, sn); $('#tlabel').textContent = `t = ${sn.t.toFixed(2)} s`;
  playTimer = setTimeout(playLoop, 40);
}
$('#scrub').oninput = (e) => {
  if (!sim) return; sim.playing = false; clearTimeout(playTimer); $('#btnPlay').textContent = '▶ 播放';
  const sn = sim.snaps[+e.target.value]; if (sn) { renderSnap(sim.model, sn); $('#tlabel').textContent = `t = ${sn.t.toFixed(2)} s`; }
};

// ---------------- chart ----------------
function drawChart() {
  const c = $('#chart'); const dpr = Math.min(devicePixelRatio, 2);
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const W = c.clientWidth, H = c.clientHeight;
  ctx.fillStyle = '#0e1626'; ctx.fillRect(0, 0, W, H);
  if (!sim || sim.series.t.length < 2) return;
  const names = Object.keys(sim.series).filter(k => k !== 't');
  const colors = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171'];
  const t = sim.series.t, t0 = t[0], t1 = t[t.length - 1] || 1;
  let gmin = Infinity, gmax = -Infinity;
  for (const n of names) for (const v of sim.series[n]) { if (v < gmin) gmin = v; if (v > gmax) gmax = v; }
  if (!isFinite(gmin)) return; if (gmax - gmin < 1e-12) { gmax = gmin + 1; }
  ctx.font = '10px sans-serif';
  names.forEach((n, i) => {
    ctx.strokeStyle = colors[i % colors.length]; ctx.beginPath();
    sim.series[n].forEach((v, j) => { const x = (t[j] - t0) / (t1 - t0) * (W - 8) + 4, y = H - 14 - (v - gmin) / (gmax - gmin) * (H - 30); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.fillStyle = colors[i % colors.length]; ctx.fillText(n, 6 + i * 130, 12);
  });
  ctx.fillStyle = '#8ea0c2'; ctx.fillText(`t: ${t0.toFixed(1)} … ${t1.toFixed(1)} s`, W - 110, 12);
}

// ---------------- example list ----------------
const vmap = Object.fromEntries(VERIFICATION.results.map(r => [r.id, r]));
function buildExList() {
  const el = $('#exlist'); el.innerHTML = '';
  for (const ex of EXAMPLES) {
    const v = vmap[ex.id]; const np = v ? v.checks.filter(c => c.pass).length : 0, nt = v ? v.checks.length : 0;
    const d = document.createElement('div'); d.className = 'exitem'; d.dataset.id = ex.id;
    d.innerHTML = `<div class="t">${ex.id} ${ex.name}</div><div class="c">${ex.cat} · ${ex.analysis.kind === 'dynamics' ? '时域动力' : '静力'}</div><div class="pass">${v ? (v.checks.every(c => c.pass) ? `✓ ${np}/${nt} PASS` : `${np}/${nt}`) : ''}</div>`;
    d.onclick = () => selectExample(ex.id);
    el.appendChild(d);
  }
}
let curEx = null;
function selectExample(id) {
  curEx = getExample(id);
  document.querySelectorAll('.exitem').forEach(e => e.classList.toggle('on', e.dataset.id === id));
  $('#exdesc').textContent = curEx.desc + (curEx.analysis.kind === 'dynamics' ? '\n\n点击“时域动力”观看实时仿真（GUI 演示取前 30 s；完整验证: npm run verify）。' : '');
  startExample(curEx, curEx.analysis.kind === 'dynamics' ? 'statics' : 'statics');
}
$('#btnStatics').onclick = () => curEx && startExample(curEx, 'statics');
$('#btnDyn').onclick = () => curEx && curEx.analysis.kind === 'dynamics' && startExample(curEx, 'dyn');

// ---------------- verification tab ----------------
function fmt(x) { if (x === null || x === undefined) return '—'; if (typeof x !== 'number') return String(x); if (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) return x.toExponential(3); return x.toFixed(4); }
function buildVerify() {
  const el = $('#tab-verify');
  let html = `<div class="exblock"><h3>汇总</h3><p>${VERIFICATION.allPass ? '<span class="pass">全部 10 个算例 PASS</span>' : '<span class="fail">存在失败</span>'} · 生成时间 ${VERIFICATION.generated} · 运行器 <code>node tools/run_examples.mjs</code></p></div>`;
  for (const r of VERIFICATION.results) {
    html += `<div class="exblock"><h3>${r.id} ${r.name}</h3><table class="v"><tr><th>校核项</th><th>期望</th><th>实际</th><th>单位</th><th>结果</th></tr>`;
    for (const c of r.checks) html += `<tr><td>${c.name}</td><td>${fmt(c.expected)}</td><td>${fmt(c.actual)}</td><td>${c.unit || ''}</td><td class="${c.pass ? 'pass' : 'fail'}">${c.pass ? 'PASS' : 'FAIL'}</td></tr>`;
    html += '</table></div>';
  }
  el.innerHTML = html;
}

// ---------------- docs tab ----------------
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function buildDocs() {
  const el = $('#tab-docs');
  let html = `<div class="doc"><h2>${esc(DOC_META.title)}</h2><p>${esc(DOC_META.subtitle)}</p><p class="formula">边界声明：${esc(DOC_META.boundary)}</p>`;
  for (const sec of DOC_SECTIONS) {
    html += `<h2>${esc(sec.title)}</h2>`;
    for (const ch of sec.children) {
      html += `<h3>${esc(ch.h)}</h3>`;
      for (const b of ch.body) {
        if (b.t === 'p') html += `<p>${esc(b.s)}</p>`;
        else if (b.t === 'ul') html += `<ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
        else if (b.t === 'code') html += `<pre>${esc(b.s)}</pre>`;
        else if (b.t === 'formula') html += `<div class="formula">${esc(b.s)}</div>`;
      }
    }
  }
  html += '</div>';
  el.innerHTML = html;
}

// ---------------- flowcharts tab ----------------
function buildFlow() {
  const el = $('#tab-flow');
  el.innerHTML = FLOWCHARTS.map(f => `<div class="flow"><h3>${esc(f.title)}</h3>${flowchartSVG(f)}</div>`).join('');
}

// ---------------- downloads tab ----------------
const DL = [
  ['入口与 App', ['index.html', 'app/app.js', 'app/style.css', 'app/verification_data.js']],
  ['核心库 core/', ['core/math.js', 'core/waves.js', 'core/env.js', 'core/catenary.js', 'core/line.js', 'core/vessel.js', 'core/scene.js', 'core/solvers.js', 'core/post.js', 'core/render_scene.js', 'core/flowcharts.js']],
  ['算例 examples/', ['examples/index.js']],
  ['工具 tools/', ['tools/run_examples.mjs', 'tools/raster.mjs', 'tools/smoke.mjs', 'tools/export_docs.mjs', 'tools/build_docs.py']],
  ['文档 docs/', ['docs/doc_data.js', 'docs/verification_report.md', 'docs/verification_report.html', 'docs/OrcaFlex_DAVE_实现文档.docx', 'docs/flowcharts.json', 'docs/doc_data.json']],
  ['截图 screenshots/', Array.from({ length: 10 }, (_, i) => `screenshots/ex${String(i + 1).padStart(2, '0')}.png`)],
  ['其他', ['README.md', 'package.json', '.gitignore', 'vendor/three.module.js', 'vendor/OrbitControls.js', 'vendor/Line2.js', 'vendor/LineGeometry.js', 'vendor/LineMaterial.js', 'vendor/LineSegments2.js', 'vendor/LineSegmentsGeometry.js', 'vendor/BufferGeometryUtils.js']],
];
function buildDl() {
  const el = $('#tab-dl');
  el.innerHTML = '<p style="color:#8ea0c2;font-size:12px">全部文件均在本仓库内，点击下载（需通过 <code>npm run serve</code> 或任意静态服务器打开本页）：</p>' +
    DL.map(([g, fs]) => `<div class="dl"><div class="grp">${g}</div>${fs.map(f => `<a href="./${f}" download>${f}</a>`).join('')}</div>`).join('');
}

// ---------------- tabs ----------------
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
});

// ---------------- boot ----------------
buildExList(); buildVerify(); buildDocs(); buildFlow(); buildDl();
selectExample('ex01');
(function loop() { resize(); renderer.render(scene, camera); requestAnimationFrame(loop); })();
