// MarineFEM 海洋结构分析工作台（Hydra 风格三栏布局 + 明暗主题）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cases } from './cases.js';
import { fmt, v3 } from './math.js';
import { createWebGPURenderer } from './renderer.js';

const $ = (id) => document.getElementById(id);
let gpu = null;
let world = null, currentCase = 'catenary', params = {}, lastOut = null;
let histFrames = null, frameIdx = 0, playing = false, animTimer = null, animSpeed = 1;

function log(msg) {
  const p = $('logPanel');
  const t = new Date().toLocaleTimeString();
  p.textContent += `[${t}] ${msg}\n`;
  p.scrollTop = p.scrollHeight;
}

// ---------- 明暗主题 ----------
(function initTheme() {
  const saved = localStorage.getItem('mf-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  $('btnTheme').onclick = () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    localStorage.setItem('mf-theme', cur);
  };
})();

// ---------- WebGL 回退场景 ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x040c11, 200, 900);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(250, 160, 350);
const controls = new OrbitControls(camera, canvas);
scene.add(new THREE.AmbientLight(0x8899bb, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(200, 400, 100); scene.add(sun);
scene.add(new THREE.GridHelper(1200, 60, 0x1d3540, 0x152a33));
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshLambertMaterial({ color: 0x0a2d3a, transparent: true, opacity: 0.55 }));
sea.rotation.x = -Math.PI / 2; scene.add(sea);
let lineObjs = [], beamObjs = [], bodyObjs = [];
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas); resize();

(async () => {
  gpu = await createWebGPURenderer(canvas);
  const b = $('backend');
  if (gpu) { b.textContent = 'WebGPU · WGSL'; log('WebGPU(WGSL) 渲染器已启用'); }
  else { b.textContent = 'WebGL 回退'; log('环境不支持 WebGPU，回退 three.js WebGL'); }
})();

let frames = 0, fpsT = performance.now();
(function loop() {
  requestAnimationFrame(loop);
  if (gpu) gpu.frame(); else { controls.update(); renderer.render(scene, camera); }
  frames++;
  const now = performance.now();
  if (now - fpsT > 1000) { $('statRight').textContent = `FPS ${frames * 1000 / (now - fpsT) | 0}`; frames = 0; fpsT = now; }
})();

// ---------- 张力云图 ----------
let gpuFrame = null;
function tensionOf(line, frame, seg) {
  const ids = line.nodeIds;
  const a = frame ? frame.nodes[ids[seg]] : world.nodes[ids[seg]].p;
  const b = frame ? frame.nodes[ids[seg + 1]] : world.nodes[ids[seg + 1]].p;
  const l = v3.dist(a, b);
  return Math.max(0, line.EA * (l - line.L0[seg]) / line.L0[seg]);
}
let tMax = 1;
function tensionColor(t) {
  const x = Math.min(1, t / (tMax || 1));
  return [x * 255, (1 - x * 0.7) * 200 + 40, (1 - x) * 255]; // 蓝→红
}

// ---------- 场景构建 ----------
function clearScene() {
  for (const o of [...lineObjs, ...beamObjs, ...bodyObjs]) scene.remove(o);
  lineObjs = []; beamObjs = []; bodyObjs = [];
}
function framePoint(ni) { return gpuFrame ? gpuFrame.nodes[ni] : world.nodes[ni].p; }

function buildScene(w) {
  tMax = 1;
  for (const l of w.lines) for (let i = 0; i < l.nodeIds.length - 1; i++) tMax = Math.max(tMax, tensionOf(l, null, i));
  if (gpu) {
    const gpuLines = w.lines.map(l => ({
      nodeIds: l.nodeIds, width: 3,
      color: [0.22, 0.76, 0.97],
      getPoint: framePoint,
      getSegColor: (i) => { const c = tensionColor(tensionOf(l, gpuFrame, i)); return [c[0] / 255, c[1] / 255, c[2] / 255]; },
    }));
    for (const bm of w.beams) gpuLines.push({
      nodeIds: [bm.n1, bm.n2], width: 7, color: [0.96, 0.62, 0.04],
      getPoint: framePoint,
    });
    gpu.setLines(gpuLines);
    gpu.setMeshes(w.bodies.filter(b => b.mesh).map(b => ({
      verts: b.mesh.verts, faces: b.mesh.faces,
      color: [((b.color >> 16) & 255) / 255, ((b.color >> 8) & 255) / 255, (b.color & 255) / 255, 1],
      getModel: () => ({ pos: (gpuFrame && gpuFrame.bodies.length ? gpuFrame.bodies[w.bodies.indexOf(b)].pos : b.pos), rot: b.rot }),
    })));
  } else {
    clearScene();
    for (const line of w.lines) {
      const g = new THREE.BufferGeometry();
      const n = line.nodeIds.length;
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const obj = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true }));
      scene.add(obj); lineObjs.push(obj);
    }
    for (const beam of w.beams) {
      const a = w.nodes[beam.n1].p, b = w.nodes[beam.n2].p;
      const dir = new THREE.Vector3(...v3.sub(b, a)); const len = dir.length(); dir.normalize();
      const obj = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 12),
        new THREE.MeshLambertMaterial({ color: beam.color }));
      obj.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      scene.add(obj); beamObjs.push(obj);
    }
    for (const b of w.bodies) {
      if (!b.mesh) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.mesh.verts.flat()), 3));
      geo.setIndex(b.mesh.faces.flat()); geo.computeVertexNormals();
      const obj = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: b.color, transparent: true, opacity: 0.85 }));
      scene.add(obj); bodyObjs.push(obj);
    }
  }
  // 相机定位
  const pts = w.nodes.length ? w.nodes.map(n => n.p) : (w.bodies[0] ? [w.bodies[0].pos] : [[0, 0, 0]]);
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
  const r = Math.max(...pts.map(p => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]))) * 2.2 || 100;
  if (gpu) { gpu.target = c; gpu.dist = r; }
  else {
    camera.position.set(c[0] + r * 0.7, c[1] + r * 0.55, c[2] + r * 0.9);
    controls.target.set(c[0], c[1], c[2]);
  }
  updateLegend();
}

function updateScene(frame) {
  gpuFrame = frame;
  if (!world || gpu) return;
  world.lines.forEach((line, li) => {
    const attr = lineObjs[li].geometry.attributes.position;
    const cattr = lineObjs[li].geometry.attributes.color;
    line.nodeIds.forEach((ni, i) => {
      const p = frame ? frame.nodes[ni] : world.nodes[ni].p;
      attr.setXYZ(i, p[0], p[1], p[2]);
      const t = i < line.nodeIds.length - 1 ? tensionOf(line, frame, i) : tensionOf(line, frame, i - 1);
      const c = tensionColor(t);
      cattr.setXYZ(i, c[0] / 255, c[1] / 255, c[2] / 255);
    });
    attr.needsUpdate = true; cattr.needsUpdate = true;
  });
  world.bodies.forEach((b, i) => {
    const o = bodyObjs[i]; if (!o) return;
    const bp = frame && frame.bodies.length ? frame.bodies[i].pos : b.pos;
    o.position.set(bp[0], bp[1], bp[2]);
  });
}

function updateLegend() {
  $('legend').innerHTML = world && world.lines.length
    ? `TENSION MAP (N)\n0 <i style="background:#3b82f6"></i>低 <i style="background:#f87171"></i>高 ${fmt(tMax, 0)}\n拖拽旋转 · 滚轮缩放`
    : '拖拽旋转 · 滚轮缩放';
}

// ---------- 绘图 ----------
function drawPlot(plot) {
  const c = $('plot'); if (!c) return;
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = c.clientWidth, H = c.clientHeight;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#eceee9';
  const grid = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || '#c6ccc4';
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim() || '#4a6670';
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--sounding').trim() || '#17707f';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (!plot || !plot.xs.length) { ctx.fillStyle = ink; ctx.fillText('运行分析后显示时程曲线', 12, 20); return; }
  const xs = plot.xs, ys = plot.ys;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (x) => 40 + (x - x0) / (x1 - x0 || 1) * (W - 55);
  const py = (y) => H - 26 - (y - y0) / (y1 - y0 || 1) * (H - 44);
  ctx.strokeStyle = grid; ctx.strokeRect(40, 8, W - 55, H - 34);
  ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.beginPath();
  xs.forEach((x, i) => i ? ctx.lineTo(px(x), py(ys[i])) : ctx.moveTo(px(x), py(ys[i])));
  ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = ink; ctx.font = '11px sans-serif';
  ctx.fillText(plot.label, 44, 20);
  ctx.fillText(fmt(y1, 3), 2, py(y1) + 3); ctx.fillText(fmt(y0, 3), 2, py(y0) + 3);
  ctx.fillText(fmt(x0, 1) + 's', 40, H - 12); ctx.fillText(fmt(x1, 1) + 's', W - 48, H - 12);
}

// ---------- 算例列表与参数 ----------
function renderCases() {
  const box = $('caseList'); box.innerHTML = '';
  for (const [k, c] of Object.entries(cases)) {
    const b = document.createElement('button');
    b.className = 'case';
    b.setAttribute('aria-pressed', k === currentCase ? 'true' : 'false');
    b.innerHTML = `<div class="t">${c.name}</div><div class="d">${c.desc}</div>`;
    b.onclick = () => { currentCase = k; loadCase(k); renderCases(); run(); };
    box.appendChild(b);
  }
}

function loadCase(key) {
  currentCase = key;
  const c = cases[key];
  $('solverType').value = c.solver;
  document.querySelectorAll('.dynOnly').forEach(e => e.style.display = c.solver === 'dynamic' ? 'flex' : 'none');
  params = {};
  const pp = $('params'); pp.innerHTML = '';
  for (const p of c.params) {
    params[p.k] = p.v;
    const f = document.createElement('div');
    f.className = 'field';
    f.innerHTML = `<label>${p.label} <b id="v_p_${p.k}">${p.v}</b></label>`;
    const inp = document.createElement('input');
    inp.type = 'range'; inp.step = 'any';
    const vals = c.params.find(q => q.k === p.k);
    inp.min = Math.abs(p.v) > 1000 ? p.v * 0.5 : Math.abs(p.v) > 10 ? p.v - Math.abs(p.v) * 0.5 : 0;
    inp.max = Math.abs(p.v) > 1000 ? p.v * 2 : Math.abs(p.v) > 10 ? p.v + Math.abs(p.v) * 0.5 : Math.max(1, p.v * 4);
    inp.value = p.v;
    inp.oninput = () => { params[p.k] = parseFloat(inp.value); $(`v_p_${p.k}`).textContent = inp.value; };
    f.appendChild(inp); pp.appendChild(f);
  }
  log(`加载算例: ${c.name}`);
  $('hud').textContent = c.name;
}

// ---------- 环境 ----------
function bindEnv(id) {
  const inp = $(id), lab = $('v_' + id);
  inp.oninput = () => { lab.textContent = inp.value; };
}
['envH', 'envT', 'envDir', 'envCur', 'envDepth', 'envRho', 'simTime', 'simDt'].forEach(bindEnv);

function applyEnv(w) {
  const d = parseFloat($('envDir').value) * Math.PI / 180;
  w.env.wave = { H: parseFloat($('envH').value), T: parseFloat($('envT').value), dir: d };
  w.env.current = { speed: parseFloat($('envCur').value), dir: d, profile: 'uniform' };
  w.env.depth = parseFloat($('envDepth').value);
  w.env.rho = parseFloat($('envRho').value);
}

// ---------- 运行 ----------
function run() {
  const c = cases[currentCase];
  const st = $('solverType').value;
  const p = { ...params };
  if (st === 'dynamic') { p.T = p.T || p.dur || parseFloat($('simTime').value); p.dt = p.dt || parseFloat($('simDt').value); }
  $('statLeft').textContent = '计算中…';
  log(`开始求解: ${c.name} [${st}]`);
  setTimeout(() => {
    world = c.build(p);
    applyEnv(world);
    const t0 = performance.now();
    const out = c.run(world, p);
    const ms = (performance.now() - t0).toFixed(1);
    lastOut = out;
    buildScene(world);
    histFrames = out.plot && c.solver === 'dynamic' ? c._lastHist : null;
    frameIdx = 0;
    if (histFrames) {
      $('animBar').classList.remove('hidden');
      $('scrub').max = histFrames.length - 1;
      $('scrub').value = 0;
      updateScene(histFrames[0]);
      setPlaying(true);
    } else {
      $('animBar').classList.add('hidden');
      updateScene(null);
      setPlaying(false);
    }
    // 核验结论横幅
    let nPass = 0, nQ = 0, worst = 0;
    for (const [name, num, ana] of out.results) {
      if (!isFinite(num) || !isFinite(ana) || ana === 0) continue;
      nQ++;
      const err = Math.abs((num - ana) / ana);
      if (err <= 0.25) nPass++;
      worst = Math.max(worst, err);
    }
    const cls = nQ && nPass === nQ ? 'pass' : worst <= 0.25 ? 'pass' : worst <= 0.5 ? 'warn' : 'bad';
    const mark = nQ && nPass === nQ ? '全部通过' : `${nPass}/${nQ} 项通过`;
    $('verdict').innerHTML = `<div class="verdict"><span class="mark ${cls}">${mark}</span><span>最差误差 ${(worst * 100).toFixed(1)}%（准则 ≤25%）</span></div>`;
    // 数值对照表
    const tb = $('ledgerRows'); tb.innerHTML = '';
    for (const [name, num, ana] of out.results) {
      const tr = document.createElement('tr');
      const err = isFinite(ana) && ana !== 0 && isFinite(num) ? Math.abs((num - ana) / ana) : NaN;
      const cls2 = !isFinite(err) ? '' : err < 0.02 ? 'pass' : err <= 0.25 ? 'warn' : 'bad';
      tr.innerHTML = `<td>${name}</td><td class="v">${fmt(num)}</td><td class="v">${isFinite(ana) ? fmt(ana) : '—'}</td>
        <td class="v ${cls2}">${isFinite(err) ? (err * 100).toFixed(2) + '%' : '定性'}</td>`;
      tb.appendChild(tr);
    }
    $('theory').textContent = (out.info || '') + ` · 计算耗时 ${ms} ms · 节点=${world.nodes.length} 线=${world.lines.length} 梁=${world.beams.length} 刚体=${world.bodies.length}`;
    $('hud').textContent = `${c.name}\n${out.results.filter(r => isFinite(r[2]) && r[2] !== 0).map(r => {
      const e = Math.abs((r[1] - r[2]) / r[2]) * 100; return `${r[0]}: 误差 ${e.toFixed(1)}%`;
    }).join('\n')}`;
    $('statLeft').textContent = `✔ ${c.name} · 求解完成（${ms} ms）`;
    log(`求解完成，耗时 ${ms} ms`);
    if (out.plot) $('plotTitle').textContent = '时程 · ' + out.plot.label;
    drawPlot(out.plot || null);
  }, 30);
}

// ---------- 动画 ----------
function setPlaying(v) {
  playing = v;
  $('playBtn').textContent = v ? '⏸' : '▶';
  $('btnPlay').textContent = v ? '暂停' : '播放';
  if (animTimer) clearInterval(animTimer);
  if (v && histFrames) {
    animTimer = setInterval(() => {
      frameIdx++;
      if (frameIdx >= histFrames.length - 1) frameIdx = 0;
      $('scrub').value = frameIdx;
      $('animTime').textContent = `t = ${histFrames[frameIdx].t.toFixed(2)} s`;
      updateScene(histFrames[frameIdx]);
    }, 33 / animSpeed);
  }
}
$('playBtn').onclick = () => setPlaying(!playing);
$('btnPlay').onclick = () => setPlaying(!playing);
$('scrub').oninput = (e) => {
  if (!histFrames) return;
  frameIdx = parseInt(e.target.value);
  $('animTime').textContent = `t = ${histFrames[frameIdx].t.toFixed(2)} s`;
  updateScene(histFrames[frameIdx]);
};
$('animSpeed').onchange = (e) => { animSpeed = parseFloat(e.target.value); if (playing) { setPlaying(false); setPlaying(true); } };

// ---------- 导出 / 视角 / 文档 ----------
function download(name, text, type = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$('expJsonBtn').onclick = () => {
  if (!lastOut) return log('尚无结果');
  download('marinefem_results.json', JSON.stringify({ case: currentCase, params, results: lastOut.results, info: lastOut.info }, null, 2), 'application/json');
  log('已导出结果 JSON');
};
$('expCsvBtn').onclick = () => {
  if (!lastOut || !lastOut.plot) return log('当前算例无时程数据');
  const rows = ['t,' + lastOut.plot.label.replace(/[,()]/g, '')];
  lastOut.plot.xs.forEach((x, i) => rows.push(x.toFixed(5) + ',' + lastOut.plot.ys[i].toFixed(6)));
  download('marinefem_timeseries.csv', rows.join('\n'), 'text/csv');
  log('已导出时程 CSV');
};
$('shotBtn').onclick = () => {
  if (gpu) gpu.frame(); else renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `marinefem_${currentCase}.png`; a.click();
  log('已导出视口截图 PNG');
};
$('btnFit').onclick = () => { if (world) buildScene(world); };
$('btnDoc').onclick = () => $('drawer').classList.add('on');
$('btnCloseDoc').onclick = () => $('drawer').classList.remove('on');
document.addEventListener('keydown', (e) => { if (e.code === 'Space' && histFrames) { e.preventDefault(); setPlaying(!playing); } });
$('btnSolve').onclick = run;
$('solverType').onchange = run;

log('MarineFEM 工作台就绪');
renderCases();
loadCase('catenary');
