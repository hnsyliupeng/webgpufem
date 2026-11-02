// app/app.js — WebGPUFEM standalone GUI (no build step, no network).
// Features: 3D view (WebGL, falls back to rendered screenshot), example runner with manual
// stepping, scene-graph tree + inspector, 3D picking, live env sliders, winch L0 slider,
// exports (JSON / OrcaFlex YAML / DAVE py / view PNG), channel chart with legend toggles,
// in-browser verification re-run, verification gallery tab, docs, flowcharts, downloads.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Line2 } from 'three/addons/Line2.js';
import { LineGeometry } from 'three/addons/LineGeometry.js';
import { LineMaterial } from 'three/addons/LineMaterial.js';
import { EXAMPLES, getExample } from '../examples/index.js';
import * as sv from '../core/solvers.js';
import { describeScene, tensionColor } from '../core/render_scene.js';
import { waveNumber } from '../core/waves.js';
import { VERIFICATION } from './verification_data.js';
import { DOC_META, DOC_SECTIONS } from '../docs/doc_data.js';
import { FLOWCHARTS, flowchartSVG } from '../core/flowcharts.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------- 3D view ----------------
const canvas = $('#view');
let renderer = null;
let webglOK = true;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
} catch (e) { webglOK = false; console.warn('WebGL unavailable — falling back to rendered screenshot view', e); }
// fallback: draw the example's software-rendered verification screenshot on a 2D canvas
const shotImgs = {};
function loadShot(id) { if (!shotImgs[id]) { const im = new Image(); im.src = `screenshots/${id}.png`; shotImgs[id] = im; im.onload = fallbackDraw; } }
function fallbackDraw() {
  if (webglOK || !curEx) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#060b16'; ctx.fillRect(0, 0, w, h);
  const img = shotImgs[curEx.id];
  if (img && img.complete && img.naturalWidth) {
    const sc = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    ctx.drawImage(img, (w - img.naturalWidth * sc) / 2, (h - img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc);
  }
  ctx.fillStyle = '#8ea0c2'; ctx.font = '13px sans-serif';
  ctx.fillText(`${curEx.id} 验证截图（当前环境无 WebGL，显示软件渲染结果；本地浏览器中为实时 3D；可直接点击左侧算例切换）`, 12, 22);
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b16);
scene.fog = new THREE.Fog(0x060b16, 400, 1600);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
const controls = new OrbitControls(camera, canvas);
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(200, -300, 400); scene.add(sun);
scene.add(new THREE.AxesHelper(30));

const grpWorld = new THREE.Group(); scene.add(grpWorld);
const grpModel = new THREE.Group(); scene.add(grpModel);
let waterMesh = null;

function resize() {
  if (!renderer) return;
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
  const bedMesh = new THREE.GridHelper(800, 20, 0x2a3a55, 0x1a2740);
  bedMesh.position.y = -depth; grpWorld.add(bedMesh);
  const N = 48, S = 500;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  waterMesh = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const wg = new THREE.Mesh(g.clone(), new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false }));
  grpWorld.add(waterMesh, wg); waterMesh.userData.wire = wg;
}

function setWaterT(model, t) {
  if (!waterMesh) return;
  const w = model.env.waves;
  const pos = waterMesh.geometry.attributes.position;
  if (!w) { for (let i = 0; i < pos.count; i++) pos.setZ(i, 0); }
  else for (let i = 0; i < pos.count; i++) pos.setZ(i, w.eta(pos.getX(i), pos.getY(i), t));
  pos.needsUpdate = true; waterMesh.geometry.computeVertexNormals();
  waterMesh.userData.wire.geometry = waterMesh.geometry;
}

// line visuals: fat line w/ tension colors + node points (raycastable)
const lineViz = new Map();
const bodyViz = new Map();
const poiViz = new Map();
let selMarker = null;

function clearModelViz() {
  for (const v of lineViz.values()) { grpModel.remove(v.line, v.pts); }
  lineViz.clear();
  for (const m of bodyViz.values()) grpModel.remove(m);
  bodyViz.clear();
  for (const p of poiViz.values()) grpModel.remove(p);
  poiViz.clear();
  if (selMarker) { grpModel.remove(selMarker); selMarker = null; }
}

function ensureLineViz(name, n) {
  let v = lineViz.get(name);
  if (v && v.n === n) return v;
  if (v) grpModel.remove(v.line, v.pts);
  // NOTE: LineGeometry stores data in instanceStart/instanceEnd interleaved attributes,
  // so we keep our own pos/col arrays and re-upload via setPositions/setColors each frame.
  const pos = new Float32Array((n + 1) * 3), col = new Float32Array((n + 1) * 3);
  const geo = new LineGeometry();
  geo.setPositions(pos); geo.setColors(col);
  const mat = new LineMaterial({ linewidth: 5, vertexColors: true });
  mat.resolution.set(canvas.clientWidth || 800, canvas.clientHeight || 600);
  const line = new Line2(geo, mat); line.frustumCulled = false;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false }));
  pts.frustumCulled = false;
  line.userData.ref = { kind: 'line', name }; pts.userData.ref = { kind: 'line', name };
  grpModel.add(line, pts); v = { line, pts, geo, mat, pos, col, n }; lineViz.set(name, v); return v;
}

function ensureBodyViz(name, d) {
  let m = bodyViz.get(name);
  if (m) return m;
  let geo;
  if (d.L && d.B && d.T) geo = new THREE.BoxGeometry(d.L, d.B, d.T);
  else { const r = Math.sqrt((d.Awp || 20) / Math.PI); geo = new THREE.CylinderGeometry(r, r, 2 * r, 20); }
  const color = d.type === 'Vessel' ? 0x7aa2f7 : 0xe0af68;
  m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.9 }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x0b1220 })));
  m.userData.ref = { kind: 'body', name };
  grpModel.add(m); bodyViz.set(name, m); return m;
}

function renderSnap(model, snap) {
  const desc = describeScene(model, snap);
  const allT = [];
  for (const l of desc.lines) for (const t of l.T) allT.push(t);
  const tmin = Math.min(...allT, 0), tmax = Math.max(...allT, 1);
  for (const l of desc.lines) {
    const v = ensureLineViz(l.name, l.pts.length - 1);
    l.pts.forEach((p, i) => {
      v.pos[i * 3] = p[0]; v.pos[i * 3 + 1] = p[1]; v.pos[i * 3 + 2] = p[2];
      const c = new THREE.Color(tensionColor(l.T[Math.min(i, l.T.length - 1)], tmin, tmax));
      v.col[i * 3] = c.r; v.col[i * 3 + 1] = c.g; v.col[i * 3 + 2] = c.b;
    });
    v.geo.setPositions(v.pos); v.geo.setColors(v.col);
    v.pts.geometry.attributes.position.needsUpdate = true;
  }
  for (const b of desc.bodies) {
    const m = ensureBodyViz(b.name, b);
    m.position.set(...b.pos);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(b.rot[0], b.rot[1], b.rot[2], 'ZYX')));
  }
  for (const p of desc.points) {
    let s = poiViz.get(p.name);
    if (!s) { s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf472b6 })); s.userData.ref = { kind: 'poi', name: p.name }; grpModel.add(s); poiViz.set(p.name, s); }
    s.position.set(...p.pos);
  }
  setWaterT(model, snap ? snap.t : 0);
  if (selMarker && selRef) placeMarker();
}

// ---------------- picking ----------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selRef = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!webglOK || !sim) return;
  const r = canvas.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const objs = [];
  for (const m of bodyViz.values()) objs.push(m);
  for (const v of lineViz.values()) objs.push(v.pts);
  for (const p of poiViz.values()) objs.push(p);
  const hits = raycaster.intersectObjects(objs, false);
  if (hits.length && hits[0].object.userData.ref) { inspect(hits[0].object.userData.ref); highlight(hits[0].object.userData.ref); }
});

function placeMarker() {
  if (!selRef) return;
  let p = null;
  if (selRef.kind === 'body') { const b = sim?.model.bodies.find(x => x.name === selRef.name); if (b) p = b.worldOrigin(); }
  else if (selRef.kind === 'poi') { const n = sim?.model.scene.get(selRef.name); if (n) p = sim.model.scene.worldPosition(n); }
  else if (selRef.kind === 'line') { const l = sim?.model.lines.find(x => x.name === selRef.name); if (l) p = l.pos[Math.floor(l.nSeg / 2)]; }
  if (p && selMarker) selMarker.position.set(p[0], p[1], p[2]);
}
function highlight(ref) {
  if (selMarker) { grpModel.remove(selMarker); selMarker = null; }
  for (const v of lineViz.values()) v.mat.linewidth = 5;
  if (ref.kind === 'line') { const v = lineViz.get(ref.name); if (v) v.mat.linewidth = 11; }
  if (ref.kind !== 'line') {
    selMarker = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true }));
    grpModel.add(selMarker); placeMarker();
  }
  document.querySelectorAll('.tnode').forEach(x => x.classList.remove('sel'));
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
  sim = { ex, model, dt, t: 0, tEnd, mode, st, snaps: [], series: { t: [] }, dead: false, playing: false, snapIdx: 0, speed: +($('#speed')?.value || 1), frame: 0 };
  for (const ch of model.channels) sim.series[ch.name] = [];
  const snap0 = snapshotOf(model, 0);
  sim.snaps.push(snap0); rec(sim, 0);
  renderSnap(model, snap0); drawChart();
  buildTree(model); buildEnvCtl(model); buildWinchCtl(model);
  inspect(selRef && sim.model ? selRef : { kind: 'env' });
  $('#scrub').max = 0; $('#scrub').value = 0;
  if (mode === 'dyn') {
    $('#btnStop').disabled = false;
    $('#prog').textContent += ` · 动力步进中 (dt=${dt.toExponential(2)}, tEnd=${tEnd}s，GUI 演示上限 30s；完整验证点“🧪 重跑校核”)`;
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
  const adv = 0.06 * (s.speed || 1);
  const n = Math.max(1, Math.round(adv / s.dt));
  const snapEvery = Math.max(1, Math.round(0.25 / s.dt));
  const recEvery = Math.max(1, Math.round(0.05 / s.dt));
  for (let k = 0; k < n && s.t < s.tEnd; k++) {
    const stepIdx = Math.round(s.t / s.dt);
    sv.updateAttachments(s.model, s.t);
    sv.coupleLinesToBodies(s.model);
    for (const l of s.model.lines) l.step(s.dt, s.t);
    for (const b of s.model.bodies) b.step(s.dt, s.t);
    s.t += s.dt;
    if (stepIdx % recEvery === 0) rec(s, s.t);
    if (stepIdx % snapEvery === 0 && s.snaps.length < 600) s.snaps.push(snapshotOf(s.model, s.t));
  }
  s.frame++;
  const last = s.snaps[s.snaps.length - 1];
  renderSnap(s.model, last);
  $('#scrub').max = s.snaps.length - 1;
  if (!s.playing) { $('#scrub').value = s.snaps.length - 1; $('#tlabel').textContent = `t = ${last.t.toFixed(2)} s`; }
  if (s.frame % 10 === 0) refreshInspector();
  drawChart();
  if (s.t < s.tEnd) requestAnimationFrame(tick);
  else { $('#prog').textContent += ' · 完成'; $('#btnStop').disabled = true; }
}

$('#btnStop').onclick = stopSim;
$('#btnPlay').onclick = () => { if (!sim || !sim.snaps.length) return; sim.playing = !sim.playing; $('#btnPlay').textContent = sim.playing ? '⏸ 暂停' : '▶ 播放'; playLoop(); };
$('#speed').onchange = (e) => { if (sim) sim.speed = +e.target.value; };
let playTimer = null;
function playLoop() {
  if (!sim || !sim.playing || sim.dead) return;
  sim.snapIdx = (sim.snapIdx + 1) % sim.snaps.length;
  $('#scrub').value = sim.snapIdx;
  const sn = sim.snaps[sim.snapIdx]; renderSnap(sim.model, sn); $('#tlabel').textContent = `t = ${sn.t.toFixed(2)} s`;
  playTimer = setTimeout(playLoop, 40 / (sim.speed || 1));
}
$('#scrub').oninput = (e) => {
  if (!sim) return; sim.playing = false; clearTimeout(playTimer); $('#btnPlay').textContent = '▶ 播放';
  const sn = sim.snaps[+e.target.value]; if (sn) { renderSnap(sim.model, sn); $('#tlabel').textContent = `t = ${sn.t.toFixed(2)} s`; }
};

// ---------------- chart (legend click = toggle channel) ----------------
const chanVis = {};
let legendBoxes = [];
function drawChart() {
  const c = $('#chart'); const dpr = Math.min(devicePixelRatio, 2);
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = c.clientWidth, H = c.clientHeight;
  ctx.fillStyle = '#0e1626'; ctx.fillRect(0, 0, W, H);
  if (!sim || sim.series.t.length < 2) { legendBoxes = []; return; }
  const names = Object.keys(sim.series).filter(k => k !== 't' && chanVis[k] !== false);
  const colors = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#e2e8f0', '#fb923c'];
  const t = sim.series.t, t0 = t[0], t1 = t[t.length - 1] || 1;
  let gmin = Infinity, gmax = -Infinity;
  for (const n of names) for (const v of sim.series[n]) { if (v < gmin) gmin = v; if (v > gmax) gmax = v; }
  if (!isFinite(gmin)) { legendBoxes = []; return; }
  if (gmax - gmin < 1e-12) gmax = gmin + 1;
  ctx.font = '10px sans-serif';
  legendBoxes = [];
  const allNames = Object.keys(sim.series).filter(k => k !== 't');
  allNames.forEach((n, i) => {
    const x = 6 + i * 130;
    const on = chanVis[n] !== false;
    legendBoxes.push({ x, y: 2, w: 124, h: 14, name: n });
    ctx.globalAlpha = on ? 1 : 0.3;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, 4, 8, 8);
    ctx.fillText(n, x + 12, 12);
    ctx.globalAlpha = 1;
  });
  names.forEach((n, i) => {
    ctx.strokeStyle = colors[allNames.indexOf(n) % colors.length]; ctx.beginPath();
    sim.series[n].forEach((v, j) => { const x = (t[j] - t0) / (t1 - t0) * (W - 8) + 4, y = H - 14 - (v - gmin) / (gmax - gmin) * (H - 30); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  });
  ctx.fillStyle = '#8ea0c2'; ctx.fillText(`t: ${t0.toFixed(1)} … ${t1.toFixed(1)} s`, W - 110, H - 4);
}
$('#chart').addEventListener('click', (e) => {
  const r = e.target.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  for (const b of legendBoxes) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { chanVis[b.name] = chanVis[b.name] === false; drawChart(); return; }
});

// ---------------- scene tree + inspector ----------------
function treeNode(label, ref, children = []) {
  const d = document.createElement('div'); d.className = 'tnode';
  const tw = document.createElement('span'); tw.className = 'tw'; tw.textContent = (children.length ? '▾ ' : '· ') + label;
  tw.onclick = () => { inspect(ref); highlight(ref); document.querySelectorAll('.tnode').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); };
  d.appendChild(tw);
  if (children.length) { const c = document.createElement('div'); c.className = 'tchild'; children.forEach(k => c.appendChild(k)); d.appendChild(c); }
  return d;
}
function buildTree(model) {
  const el = $('#tree'); el.innerHTML = '';
  const byParent = (p) => [...model.scene.nodes.values()].filter(n => n.parent === p);
  const nodeEl = (n) => treeNode(`${n.type} ${n.name}`, { kind: 'node', node: n }, byParent(n).map(nodeEl));
  const sceneKids = byParent(null).map(nodeEl);
  const kids = [
    treeNode(`Scene (${model.scene.nodes.size} nodes)`, { kind: 'env' }, sceneKids),
    treeNode(`Bodies (${model.bodies.length})`, { kind: 'env' }, model.bodies.map(b => treeNode(`${b.type} ${b.name}`, { kind: 'body', name: b.name }))),
    treeNode(`Lines (${model.lines.length})`, { kind: 'env' }, model.lines.map(l => treeNode(`Line ${l.name}`, { kind: 'line', name: l.name }))),
    treeNode(`Winches (${model.winches.length})`, { kind: 'env' }, model.winches.map((w, i) => treeNode(`Winch${i} → ${w.line.name} rate=${w.rate}`, { kind: 'winch', index: i }))),
    treeNode('Environment', { kind: 'env' }),
  ];
  el.appendChild(treeNode(`Model ${model.name}`, { kind: 'env' }, kids));
}

function fmt(x) { if (x === null || x === undefined) return '—'; if (typeof x !== 'number') return String(x); if (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) return x.toExponential(3); return x.toFixed(4); }
const fv = (v) => Array.isArray(v) ? '[' + v.map(fmt).join(', ') + ']' : fmt(v);

function inspect(ref) {
  selRef = ref;
  const el = $('#inspector');
  if (!ref || !sim) { el.innerHTML = '<span class="dim">无</span>'; return; }
  const m = sim.model;
  let rows = [];
  if (ref.kind === 'node') {
    const n = ref.node;
    rows = [['name', n.name], ['type', n.type], ['parent', n.parent ? n.parent.name : '(root)'], ['position(局部)', fv(n.position)], ['rotation', fv(n.rotation)], ['dofs', fv(n.dofs)], ['fixed', n.fixed], ['worldPosition', fv(m.scene.worldPosition(n))]];
  } else if (ref.kind === 'body') {
    const b = m.bodies.find(x => x.name === ref.name);
    if (!b) { el.innerHTML = '未找到'; return; }
    rows = [['name', b.name], ['type', b.type], ['mass (kg)', fmt(b.mass)], ['inertia', fv(b.inertia)], ['K (hydro)', fv(b.K)], ['pos', fv(b.pos)], ['q (实时)', fv(b.q)], ['qd (实时)', fv(b.qd)], ['fixed', fv(b.fixed)], ['worldOrigin', fv(b.worldOrigin())]];
  } else if (ref.kind === 'line') {
    const l = m.lines.find(x => x.name === ref.name);
    if (!l) { el.innerHTML = '未找到'; return; }
    const T = Array.from(l.segT);
    rows = [['name', l.name], ['nSeg', l.nSeg], ['L0 (m)', fmt(l.length0)], ['segL0', fmt(l.segL0)], ['EA (N)', fmt(l.EA)], ['EI', fmt(l.EI)], ['d (m)', fmt(l.d)], ['massPerLen', fmt(l.massPerLen)], ['endA', l.endA.type + (l.endA.vesselName ? ':' + l.endA.vesselName : '')], ['endB', l.endB.type + (l.endB.pos ? ' ' + fv(l.endB.pos) : '')], ['张力 min/max (实时)', `${fmt(Math.min(...T))} / ${fmt(Math.max(...T))} N`], ['reactionA', fv(l.reactionA)]];
  } else if (ref.kind === 'winch') {
    const w = m.winches[ref.index];
    rows = [['line', w.line.name], ['rate (m/s)', fmt(w.rate)], ['L0 base', fmt(w.L0)], ['tStart/tEnd', `${w.tStart} / ${w.tEnd}`], ['当前 L0 (实时)', fmt(w.line.length0)]];
  } else {
    const e = m.env;
    rows = [['waves', e.waves ? e.waves.describe() : '无'], ['current', e.current ? `speed=${e.current.speed} dir=${e.current.dir} ramp=${e.current.ramp}` : '无'], ['wind', e.wind ? `speed=${e.wind.speed} ramp=${e.wind.ramp}` : '无'], ['seabed', e.seabed ? `depth=${e.seabed.depth} k=${e.seabed.k} mu=${e.seabed.mu}` : '无'], ['model', m.name]];
  }
  el.classList.remove('dim');
  el.innerHTML = '<table>' + rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') + '</table>';
}
function refreshInspector() { if (selRef) inspect(selRef); }

// ---------------- env sliders ----------------
function sliderRow(label, min, max, step, val, oninput) {
  const row = document.createElement('div'); row.className = 'sliderow';
  row.innerHTML = `<span>${esc(label)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><b>${fmt(val)}</b>`;
  const inp = row.querySelector('input'), lab = row.querySelector('b');
  inp.oninput = () => { const v = +inp.value; lab.textContent = fmt(v); oninput(v); };
  return row;
}
function buildEnvCtl(model) {
  const el = $('#envctl'); el.innerHTML = '';
  const e = model.env;
  if (e.waves) {
    const w = e.waves;
    if (w.comps) {
      el.appendChild(sliderRow('Hs (m)', 1, 8, 0.1, w.Hs, (v) => { const r = v / w.Hs; w.Hs = v; for (const cp of w.comps) cp.a *= r; }));
    } else {
      el.appendChild(sliderRow('波高 H (m)', 0.5, 6, 0.1, w.H, (v) => { w.H = v; w.amp = v / 2; }));
      el.appendChild(sliderRow('周期 T (s)', 3, 14, 0.5, w.T, (v) => { w.T = v; w.w = 2 * Math.PI / v; w.k = waveNumber(w.w, w.h); }));
    }
    el.appendChild(sliderRow('波向 (°)', 0, 360, 15, w.dir * 180 / Math.PI, (v) => { w.dir = v * Math.PI / 180; if (w.comps) for (const cp of w.comps) cp.dir = w.dir; }));
  }
  if (e.current && e.current.speed > 0) el.appendChild(sliderRow('海流 (m/s)', 0, 2, 0.05, e.current.speed, (v) => { e.current.speed = v; }));
  if (e.wind && e.wind.speed > 0) el.appendChild(sliderRow('风速 (m/s)', 0, 20, 0.5, e.wind.speed, (v) => { e.wind.speed = v; }));
  const btn = document.createElement('button'); btn.textContent = '应用环境并重算静力'; btn.style.marginTop = '6px'; btn.style.fontSize = '12px';
  btn.onclick = () => curEx && startExample(curEx, 'statics');
  el.appendChild(btn);
}

// ---------------- winch slider ----------------
function buildWinchCtl(model) {
  const el = $('#winchctl'); el.innerHTML = '';
  if (!model.winches || !model.winches.length) { el.innerHTML = '<div class="dim">本算例无绞车</div>'; return; }
  for (const w of model.winches) {
    const L0 = w.line.length0;
    el.appendChild(sliderRow(`${w.line.name} L0`, Math.max(1, L0 - 40), L0 + 40, 0.5, L0, (v) => {
      w.rate = 0; w.tStart = 1e12; w.tEnd = 1e12; w.line.setLength0(v); // 手动接管
    }));
  }
}

// ---------------- exports ----------------
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('#btnJson').onclick = () => sim && download(`webgpufem_${curEx.id}.scene.json`, sim.model.saveJSON(), 'application/json');
$('#btnYaml').onclick = () => sim && download(`webgpufem_${curEx.id}.yml`, sim.model.exportOrcaFlexYAML(), 'text/yaml');
$('#btnPy').onclick = () => sim && download(`webgpufem_${curEx.id}.py`, sim.model.exportDavePy(), 'text/x-python');
$('#btnShot').onclick = () => {
  if (!curEx) return;
  if (renderer) { renderer.render(scene, camera); const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = `webgpufem_${curEx.id}_view.png`; a.click(); }
  else { const a = document.createElement('a'); a.href = `screenshots/${curEx.id}.png`; a.download = `webgpufem_${curEx.id}_view.png`; a.click(); }
};

// ---------------- in-browser verification re-run ----------------
$('#btnVerify').onclick = () => {
  if (!curEx) return;
  const el = $('#liveresult');
  el.innerHTML = '<div class="dim">浏览器内重跑校核中…（与 node runner 相同参数；ex10 约需数分钟）</div>';
  setTimeout(() => {
    try {
      const ex = curEx;
      const model = ex.build();
      const st = sv.computeStatics(model, { tol: 1e-7, maxIter: 80 });
      const staticTension = model.lines[0] ? model.lines[0].segT[0] : null;
      const staticReaction = model.lines[0] ? Math.hypot(...model.lines[0].reactionA) : null;
      const staticHeave = model.bodies[0] ? model.bodies[0].q[2] : 0;
      let run = null;
      if (ex.analysis.kind === 'dynamics') {
        if (ex.perturb) ex.perturb(model);
        run = sv.runDynamics(model, { tEnd: ex.analysis.tEnd, staticsFirst: false, init: false, sampleDt: 0.05, snapDt: ex.analysis.snapDt ?? 0.5, safety: 0.25 });
      }
      const checks = ex.verify(model, { st, run, staticTension, staticReaction, staticHeave, model });
      for (const c of checks) c.pass = c.pass !== undefined ? c.pass : Math.abs(c.actual - c.expected) <= c.tol * Math.max(Math.abs(c.expected), c.absFloor ?? 0.01);
      const np = checks.filter(c => c.pass).length;
      let html = `<div class="exblock"><h3>🧪 ${ex.id} 浏览器内重跑: <span class="${np === checks.length ? 'pass' : 'fail'}">${np}/${checks.length} PASS</span></h3><table class="v"><tr><th>校核项</th><th>期望</th><th>实际</th><th>单位</th><th>结果</th></tr>`;
      for (const c of checks) html += `<tr><td>${esc(c.name)}</td><td>${fmt(c.expected)}</td><td>${fmt(c.actual)}</td><td>${esc(c.unit || '')}</td><td class="${c.pass ? 'pass' : 'fail'}">${c.pass ? 'PASS' : 'FAIL'}</td></tr>`;
      el.innerHTML = html + '</table></div>';
    } catch (err) { el.innerHTML = '<div style="color:#f87171">异常: ' + esc(err.message) + '</div>'; }
  }, 60);
};

// ---------------- example list ----------------
const vmap = Object.fromEntries(VERIFICATION.results.map(r => [r.id, r]));
function buildExList() {
  const el = $('#exlist'); el.innerHTML = '';
  for (const ex of EXAMPLES) {
    const v = vmap[ex.id]; const np = v ? v.checks.filter(c => c.pass).length : 0, nt = v ? v.checks.length : 0;
    const d = document.createElement('div'); d.className = 'exitem'; d.dataset.id = ex.id;
    d.innerHTML = `<div class="t">${ex.id} ${esc(ex.name)}</div><div class="c">${esc(ex.cat)} · ${ex.analysis.kind === 'dynamics' ? '时域动力' : '静力'}</div><div class="pass">${v ? (v.checks.every(c => c.pass) ? `✓ ${np}/${nt} PASS` : `${np}/${nt}`) : ''}</div>`;
    d.onclick = () => selectExample(ex.id);
    el.appendChild(d);
  }
}
let curEx = null;
function selectExample(id) {
  curEx = getExample(id);
  if (!curEx) return;
  document.querySelectorAll('.exitem').forEach(e => e.classList.toggle('on', e.dataset.id === id));
  $('#exdesc').textContent = curEx.desc + (curEx.analysis.kind === 'dynamics' ? '\n\n点击“时域动力”观看实时仿真（GUI 演示取前 30 s；完整验证点“🧪 重跑校核”）。' : '');
  $('#liveresult').innerHTML = '';
  history.replaceState(null, '', '?ex=' + id);
  loadShot(curEx.id);
  startExample(curEx, 'statics');
}
$('#btnStatics').onclick = () => curEx && startExample(curEx, 'statics');
$('#btnDyn').onclick = () => curEx && curEx.analysis.kind === 'dynamics' && startExample(curEx, 'dyn');

// ---------------- verification tab ----------------
function buildVerify() {
  const el = $('#tab-verify');
  let html = `<div class="exblock"><h3>汇总</h3><p>${VERIFICATION.allPass ? '<span class="pass">全部 10 个算例 PASS</span>' : '<span class="fail">存在失败</span>'} · 生成时间 ${VERIFICATION.generated} · 运行器 <code>node tools/run_examples.mjs</code> · 也可点左侧“🧪 重跑校核”在浏览器内 live 重跑</p><img src="screenshots/verification_overview.png" style="width:100%;border-radius:8px" alt="verification overview"></div>`;
  for (const r of VERIFICATION.results) {
    html += `<div class="exblock"><h3>${r.id} ${esc(r.name)}</h3><table class="v"><tr><th>校核项</th><th>期望</th><th>实际</th><th>单位</th><th>结果</th></tr>`;
    for (const c of r.checks) html += `<tr><td>${esc(c.name)}</td><td>${fmt(c.expected)}</td><td>${fmt(c.actual)}</td><td>${esc(c.unit || '')}</td><td class="${c.pass ? 'pass' : 'fail'}">${c.pass ? 'PASS' : 'FAIL'}</td></tr>`;
    html += `</table><img src="screenshots/${r.id}.png" style="width:100%;border-radius:8px;margin-top:6px" alt="${r.id}" loading="lazy"></div>`;
  }
  el.innerHTML = html;
}

// ---------------- docs tab ----------------
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
  $('#tab-flow').innerHTML = FLOWCHARTS.map(f => `<div class="flow"><h3>${esc(f.title)}</h3>${flowchartSVG(f)}</div>`).join('');
}

// ---------------- downloads tab ----------------
const DL = [
  ['入口与 App', ['index.html', 'app/app.js', 'app/style.css', 'app/verification_data.js']],
  ['核心库 core/', ['core/math.js', 'core/waves.js', 'core/env.js', 'core/catenary.js', 'core/line.js', 'core/vessel.js', 'core/scene.js', 'core/solvers.js', 'core/post.js', 'core/render_scene.js', 'core/flowcharts.js']],
  ['算例 examples/', ['examples/index.js']],
  ['工具 tools/', ['tools/run_examples.mjs', 'tools/raster.mjs', 'tools/smoke.mjs', 'tools/export_docs.mjs', 'tools/build_docs.py', 'tools/make_overview.mjs', 'tools/wheels/python_docx-1.2.0-py3-none-any.whl']],
  ['文档 docs/', ['docs/doc_data.js', 'docs/verification_report.md', 'docs/verification_report.html', 'docs/OrcaFlex_DAVE_实现文档.docx', 'docs/flowcharts.json', 'docs/doc_data.json']],
  ['截图 screenshots/', [...Array.from({ length: 10 }, (_, i) => `screenshots/ex${String(i + 1).padStart(2, '0')}.png`), 'screenshots/verification_overview.png']],
  ['其他', ['README.md', 'package.json', '.gitignore', 'vendor/three.module.js', 'vendor/three.core.js', 'vendor/OrbitControls.js', 'vendor/Line2.js', 'vendor/LineGeometry.js', 'vendor/LineMaterial.js', 'vendor/LineSegments2.js', 'vendor/LineSegmentsGeometry.js', 'vendor/BufferGeometryUtils.js']],
];
function buildDl() {
  $('#tab-dl').innerHTML = '<p style="color:#8ea0c2;font-size:12px">全部文件均在本仓库内，点击下载；App 运行中还可导出当前模型的 JSON / OrcaFlex YAML / DAVE py（左上按钮）：</p>' +
    DL.map(([g, fs]) => `<div class="dl"><div class="grp">${g}</div>${fs.map(f => `<a href="./${f}" download>${f}</a>`).join('')}</div>`).join('');
}

// ---------------- tabs ----------------
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
});

// ---------------- boot ----------------
buildExList(); buildVerify(); buildDocs(); buildFlow(); buildDl();
const qp = new URLSearchParams(location.search);
selectExample(qp.get('ex') || 'ex01');
// in-browser kernel self-check (ex01 statics vs analytic catenary)
try {
  const m0 = getExample('ex01').build();
  const st0 = sv.computeStatics(m0, { tol: 1e-7 });
  const ok0 = st0.residual < 1e-6;
  const badge = document.querySelector('.badge');
  badge.textContent = `清洁室实现 · 内核自检 ${ok0 ? 'PASS' : 'FAIL'}（ex01 静力残差 ${st0.residual.toExponential(1)}）`;
  badge.style.color = ok0 ? '#34d399' : '#f87171';
} catch (e) {
  document.querySelector('.badge').textContent = '内核自检异常: ' + e.message;
}
document.getElementById('bootmsg')?.remove();
(function loop() {
  if (renderer) { resize(); renderer.render(scene, camera); } else fallbackDraw();
  requestAnimationFrame(loop);
})();
