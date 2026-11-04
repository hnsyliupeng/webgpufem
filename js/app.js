// UI 与 3D 可视化（Three.js）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cases } from './cases.js';
import { fmt } from './math.js';

const $ = (id) => document.getElementById(id);
let world = null, currentCase = 'catenary', params = {}, histFrames = null, frameIdx = 0, animTimer = null;

// ---------- Three.js 场景 ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070d18, 200, 900);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(250, 160, 350);
const controls = new OrbitControls(camera, canvas);
scene.add(new THREE.AmbientLight(0x8899bb, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(200, 400, 100); scene.add(sun);
const grid = new THREE.GridHelper(1200, 60, 0x1d3355, 0x14233c); scene.add(grid);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshLambertMaterial({ color: 0x0a2d4a, transparent: true, opacity: 0.55 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = 0; scene.add(sea);

let lineObjs = [], beamObjs = [], bodyObjs = [];
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas); resize();
(function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();

function clearScene() {
  for (const o of [...lineObjs, ...beamObjs, ...bodyObjs]) scene.remove(o);
  lineObjs = []; beamObjs = []; bodyObjs = [];
}
function buildScene(w) {
  clearScene();
  for (const line of w.lines) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(w.nodes.length * 3), 3));
    const obj = new THREE.Line(g, new THREE.LineBasicMaterial({ color: line.color, linewidth: 2 }));
    scene.add(obj); lineObjs.push(obj);
  }
  for (const beam of w.beams) {
    const a = w.nodes[beam.n1].p, b = w.nodes[beam.n2].p;
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length(); dir.normalize();
    const geo = new THREE.CylinderGeometry(0.35, 0.35, len, 12);
    const m = new THREE.MeshLambertMaterial({ color: beam.color });
    const obj = new THREE.Mesh(geo, m);
    obj.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(obj); beamObjs.push(obj);
  }
  for (const b of w.bodies) {
    if (!b.mesh) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.mesh.verts.flat()), 3));
    geo.setIndex(b.mesh.faces.flat());
    geo.computeVertexNormals();
    const obj = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: b.color, transparent: true, opacity: 0.85 }));
    scene.add(obj); bodyObjs.push(obj);
  }
  // 定位相机
  const pts = w.nodes.map(n => n.p);
  if (pts.length) {
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
    const r = Math.max(...pts.map(p => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]))) * 2.2 || 100;
    camera.position.set(c[0] + r * 0.7, c[1] + r * 0.55, c[2] + r * 0.9);
    controls.target.set(c[0], c[1], c[2]);
  }
}
function updateScene(frame) {
  if (!world) return;
  world.lines.forEach((line, li) => {
    const attr = lineObjs[li].geometry.attributes.position;
    line.nodeIds.forEach((ni, i) => {
      const p = frame ? frame.nodes[ni] : world.nodes[ni].p;
      attr.setXYZ(i, p[0], p[1], p[2]);
    });
    attr.needsUpdate = true;
  });
  world.bodies.forEach((b, i) => {
    const o = bodyObjs[i]; if (!o) return;
    const bp = frame ? frame.bodies[i].pos : b.pos;
    o.position.set(bp[0], bp[1], bp[2]);
  });
}

// ---------- 绘图 ----------
function drawPlot(plot) {
  const c = $('plot'), ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = c.clientWidth, H = c.clientHeight;
  ctx.clearRect(0, 0, W, H);
  if (!plot || !plot.xs.length) { ctx.fillStyle = '#8fa3c0'; ctx.fillText('运行分析后显示时程曲线', 12, 20); return; }
  const xs = plot.xs, ys = plot.ys;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (x) => 30 + (x - x0) / (x1 - x0 || 1) * (W - 40);
  const py = (y) => H - 20 - (y - y0) / (y1 - y0 || 1) * (H - 34);
  ctx.strokeStyle = '#22314f'; ctx.strokeRect(30, 6, W - 40, H - 26);
  ctx.strokeStyle = '#38bdf8'; ctx.beginPath();
  xs.forEach((x, i) => i ? ctx.lineTo(px(x), py(ys[i])) : ctx.moveTo(px(x), py(ys[i])));
  ctx.stroke();
  ctx.fillStyle = '#8fa3c0'; ctx.font = '11px sans-serif';
  ctx.fillText(plot.label, 34, 17);
  ctx.fillText(fmt(y1, 2), 2, py(y1) + 3); ctx.fillText(fmt(y0, 2), 2, py(y0) + 3);
  ctx.fillText(fmt(x0, 1), 30, H - 6); ctx.fillText(fmt(x1, 1), W - 34, H - 6);
}

// ---------- UI ----------
function loadCase(key) {
  currentCase = key;
  const c = cases[key];
  $('caseSelect').value = key;
  $('caseDesc').textContent = c.desc;
  $('solverType').value = c.solver;
  params = {};
  const pp = $('paramPanel'); pp.innerHTML = '';
  for (const p of c.params) {
    params[p.k] = p.v;
    const lab = document.createElement('label');
    lab.textContent = p.label;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = p.v; inp.step = 'any';
    inp.onchange = () => { params[p.k] = parseFloat(inp.value); };
    lab.appendChild(inp); pp.appendChild(lab);
  }
  $('modelInfo').textContent = '尚未构建模型';
  $('runStatus').textContent = '';
  document.querySelectorAll('#dynParams,#dynParams2').forEach(e =>
    e.style.display = c.solver === 'dynamic' ? 'block' : 'none');
  drawPlot(null);
}

function run() {
  const c = cases[currentCase];
  const st = $('solverType').value;
  const p = { ...params };
  if (st === 'dynamic') { p.T = p.T || p.dur || parseFloat($('simTime').value); p.dt = p.dt || parseFloat($('simDt').value); }
  $('runStatus').textContent = '计算中…';
  setTimeout(() => {
    world = c.build(p);
    const t0 = performance.now();
    const out = c.run(world, p);
    const ms = (performance.now() - t0).toFixed(1);
    buildScene(world);
    histFrames = out.plot ? solveFrames(world, p) : null;
    updateScene(histFrames ? histFrames[0] : null);
    if (histFrames) playAnim();
    // 结果表
    const tb = $('resultTable').querySelector('tbody'); tb.innerHTML = '';
    for (const [name, num, ana] of out.results) {
      const tr = document.createElement('tr');
      const err = isFinite(ana) && ana !== 0 ? Math.abs((num - ana) / ana) : NaN;
      const cls = !isFinite(err) ? '' : err < 0.02 ? 'err-ok' : err < 0.1 ? 'err-warn' : 'err-bad';
      tr.innerHTML = `<td>${name}</td><td>${fmt(num)}</td><td>${isFinite(ana) ? fmt(ana) : '—'}</td>
        <td class="${cls}">${isFinite(err) ? (err * 100).toFixed(2) + '%' : '—'}</td>`;
      tb.appendChild(tr);
    }
    $('modelInfo').textContent = (out.info || '') + `\n计算耗时 ${ms} ms`;
    $('runStatus').textContent = `✔ 完成（${ms} ms）`;
    drawPlot(out.plot || null);
  }, 30);
}

// 动态算例：重新跑一遍拿完整帧（复用 run 内逻辑，简单处理：时域算例在 run 里已返回 plot）
function solveFrames(w, p) {
  // 重新时域积分获取帧（与 cases 内一致步长）
  const c = cases[currentCase];
  if (c.solver !== 'dynamic') return null;
  return c._lastHist || null;
}
function playAnim() {
  if (animTimer) clearInterval(animTimer);
  frameIdx = 0;
  animTimer = setInterval(() => {
    if (!histFrames || frameIdx >= histFrames.length - 1) { clearInterval(animTimer); return; }
    updateScene(histFrames[frameIdx++]);
  }, 33);
}

// 事件
$('caseSelect').innerHTML = Object.entries(cases).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('');
$('caseSelect').onchange = (e) => loadCase(e.target.value);
$('runBtn').onclick = run;
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  $('tab-analysis').classList.toggle('hidden', t.dataset.tab !== 'analysis');
  $('tab-doc').classList.toggle('hidden', t.dataset.tab !== 'doc');
});
loadCase('catenary');
