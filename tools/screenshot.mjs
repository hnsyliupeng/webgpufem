// 视口截图工具：用应用自身的模型/求解器数据，软件光栅化 3D 视口（与 WebGPU 渲染器同一相机），输出 PNG
import { cases } from '../js/cases.js';
import { v3 } from '../js/math.js';
import zlib from 'node:zlib';
import fs from 'node:fs';

// ---------- 极简 PNG 编码 ----------
function crc32(buf) {
  let table = crc32.t;
  if (!table) { table = crc32.t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; } }
  let c = -1; for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 255];
  return (c ^ -1) >>> 0;
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  const idat = zlib.deflateSync(raw);
  const chunk = (type, data) => {
    const b = Buffer.alloc(8 + data.length + 4);
    b.writeUInt32BE(data.length, 0); b.write(type, 4); data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- 5x7 点阵字体（ASCII 大写+数字+符号） ----------
const FONT = {
  'A': [14,17,17,31,17,17,17], 'B': [30,17,17,30,17,17,30], 'C': [14,17,16,16,16,17,14], 'D': [30,17,17,17,17,17,30],
  'E': [31,16,16,30,16,16,31], 'F': [31,16,16,30,16,16,16], 'G': [14,17,16,23,17,17,15], 'H': [17,17,17,31,17,17,17],
  'I': [14,4,4,4,4,4,14], 'J': [7,2,2,2,2,18,12], 'K': [17,18,20,24,20,18,17], 'L': [16,16,16,16,16,16,31],
  'M': [17,27,21,21,17,17,17], 'N': [17,25,21,19,17,17,17], 'O': [14,17,17,17,17,17,14], 'P': [30,17,17,30,16,16,16],
  'Q': [14,17,17,17,21,18,13], 'R': [30,17,17,30,20,18,17], 'S': [15,16,16,14,1,1,30], 'T': [31,4,4,4,4,4,4],
  'U': [17,17,17,17,17,17,14], 'V': [17,17,17,17,17,10,4], 'W': [17,17,17,21,21,27,17], 'X': [17,17,10,4,10,17,17],
  'Y': [17,17,10,4,4,4,4], 'Z': [31,1,2,4,8,16,31], '0': [14,17,19,21,25,17,14], '1': [4,12,4,4,4,4,14],
  '2': [14,17,1,2,4,8,31], '3': [31,2,4,2,1,17,14], '4': [2,6,10,18,31,2,2], '5': [31,16,30,1,1,17,14],
  '6': [6,8,16,30,17,17,14], '7': [31,1,2,4,8,8,8], '8': [14,17,17,14,17,17,14], '9': [14,17,17,15,1,2,12],
  ' ': [0,0,0,0,0,0,0], '.': [0,0,0,0,0,12,12], '%': [25,26,2,4,8,11,19], '-': [0,0,0,31,0,0,0],
  ':': [0,12,12,0,12,12,0], '/': [1,1,2,4,8,16,16], '(': [2,4,8,8,8,4,2], ')': [8,4,2,2,2,4,8],
  '=': [0,0,31,0,31,0,0], ',': [0,0,0,0,12,4,8], '_': [0,0,0,0,0,0,31], '+': [0,4,4,31,4,4,0],
};
function drawText(img, W, x, y, str, scale, color) {
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
      if (g[r] & (16 >> c)) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const px = x + c * scale + dx, py = y + r * scale + dy;
        if (px >= 0 && px < W && py >= 0 && py < img.length / (W * 4)) {
          const o = (py * W + px) * 4; img[o] = color[0]; img[o + 1] = color[1]; img[o + 2] = color[2]; img[o + 3] = 255;
        }
      }
    x += 6 * scale;
  }
}

// ---------- 软件光栅化 ----------
function render(world, title, lines, extra) {
  const W = 1280, H = 800;
  const img = Buffer.alloc(W * H * 4);
  const zb = new Float32Array(W * H).fill(Infinity);
  const setpx = (x, y, z, c) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = y * W + x;
    if (z < zb[i]) { zb[i] = z; const o = i * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; }
  };
  // 背景渐变
  for (let y = 0; y < H; y++) { const t = y / H; const c = [7 + 10 * t, 13 + 22 * t, 24 + 40 * t];
    for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; } }

  // 相机（与 app/renderer 相同）
  const pts = world.nodes.length ? world.nodes.map(n => n.p) : world.bodies.map(b => b.pos);
  let c0 = pts.length ? pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]) : (world.bodies[0] ? [...world.bodies[0].pos] : [0, 0, 0]);
  let R = 100;
  if (pts.length) R = Math.max(...pts.map(p => Math.hypot(p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]))) * 2.2;
  else if (world.bodies.length && world.bodies[0].mesh) R = Math.max(...world.bodies[0].mesh.verts.flatMap(v => v.map(Math.abs))) * 6;
  const dist = R, theta = 0.9, phi = 1.05;
  const eye = [c0[0] + dist * Math.sin(phi) * Math.sin(theta), c0[1] + dist * Math.cos(phi), c0[2] + dist * Math.sin(phi) * Math.cos(theta)];
  const f = 1 / Math.tan(50 * Math.PI / 360), aspect = W / H;
  const fwd = v3.norm(v3.sub(c0, eye));            // 指向目标
  const xax = v3.norm(v3.cross(fwd, [0, 1, 0]));    // 右
  const yax = v3.cross(xax, fwd);                   // 上
  const proj = (p) => {
    const d = v3.sub(p, eye);
    const cz = v3.dot(d, fwd);
    if (cz < 0.1) return null;
    const cx = v3.dot(d, xax), cy = v3.dot(d, yax);
    return [W / 2 + (f / aspect) * cx / cz * W / 2, H / 2 - f * cy / cz * H / 2, cz];
  };
  const drawSeg = (a, b, color, width) => {
    const pa = proj(a), pb = proj(b);
    if (!pa || !pb) return;
    const steps = Math.ceil(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = pa[0] + (pb[0] - pa[0]) * t, y = pa[1] + (pb[1] - pa[1]) * t, z = pa[2] + (pb[2] - pa[2]) * t;
      for (let dy = -width; dy <= width; dy++) for (let dx = -width; dx <= width; dx++)
        if (dx * dx + dy * dy <= width * width) setpx(Math.round(x + dx), Math.round(y + dy), z, color);
    }
  };
  // 海面网格
  const seaC = [10, 45, 74];
  for (let i = -10; i <= 10; i++) {
    const o = R * 1.2;
    drawSeg([i * o / 10 - o / 2, 0, -o / 2], [i * o / 10 - o / 2, 0, o / 2], [20, 40, 70], 0);
    drawSeg([-o / 2, 0, i * o / 10 - o / 2], [o / 2, 0, i * o / 10 - o / 2], [20, 40, 70], 0);
  }
  // 海面
  {
    const o = R * 1.2, corners = [[-o, 0, -o], [o, 0, -o], [o, 0, o], [-o, 0, o]].map(proj);
    if (corners.every(Boolean)) {
      for (let y = Math.max(0, Math.min(...corners.map(c => c[1])) | 0); y < Math.min(H, Math.max(...corners.map(c => c[1]))); y++)
        for (let x = 0; x < W; x++) {
          // 简化：四边形内判定
          const z = Math.min(...corners.map(c => c[2]));
          const o2 = (y * W + x) * 4;
          if (zb[y * W + x] > z) { zb[y * W + x] = z; img[o2] = 10; img[o2 + 1] = 45; img[o2 + 2] = 74; img[o2 + 3] = 255; }
        }
    }
  }
  // 刚体（三角形，painter 按平均深度）
  for (const b of world.bodies) {
    if (!b.mesh) continue;
    const tris = b.mesh.faces.map(f => f.map(i => v3.add(b.pos, b.mesh.verts[i])));
    tris.sort((t1, t2) => v3.dot(v3.sub(t2[0], eye), fwd) - v3.dot(v3.sub(t1[0], eye), fwd));
    for (const t of tris) {
      const ps = t.map(proj); if (ps.some(p => !p)) continue;
      const n = v3.norm(v3.cross(v3.sub(t[1], t[0]), v3.sub(t[2], t[0])));
      const ndl = Math.max(0, v3.dot(n, v3.norm([0.5, 0.8, 0.4])));
      const base = [((b.color >> 16) & 255) / 255 * 255, ((b.color >> 8) & 255) / 255 * 255, (b.color & 255) / 255 * 255];
      const col = base.map(v => v * (0.35 + 0.65 * ndl));
      const z = (ps[0][2] + ps[1][2] + ps[2][2]) / 3;
      const minx = Math.max(0, Math.floor(Math.min(...ps.map(p => p[0])))), maxx = Math.min(W - 1, Math.ceil(Math.max(...ps.map(p => p[0]))));
      const miny = Math.max(0, Math.floor(Math.min(...ps.map(p => p[1])))), maxy = Math.min(H - 1, Math.ceil(Math.max(...ps.map(p => p[1]))));
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        // 重心判定
        const d = ((ps[1][0] - ps[0][0]) * (ps[2][1] - ps[0][1]) - (ps[2][0] - ps[0][0]) * (ps[1][1] - ps[0][1])) || 1e-9;
        const w1 = ((ps[1][0] - x) * (ps[2][1] - y) - (ps[2][0] - x) * (ps[1][1] - y)) / d;
        const w2 = ((ps[2][0] - x) * (ps[0][1] - y) - (ps[0][0] - x) * (ps[2][1] - y)) / d;
        if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) setpx(x, y, z, col);
      }
    }
  }
  // 梁（粗线）
  for (const bm of world.beams) {
    const a = world.nodes[bm.n1].p, b = world.nodes[bm.n2].p;
    drawSeg(a, b, [245, 158, 11], 3);
  }
  // 线（张力云图 蓝→红）
  let tMax = 1;
  for (const l of world.lines) for (let i = 0; i < l.nodeIds.length - 1; i++) {
    const a = world.nodes[l.nodeIds[i]].p, b = world.nodes[l.nodeIds[i + 1]].p;
    tMax = Math.max(tMax, Math.max(0, l.EA * (v3.dist(a, b) - l.L0[i]) / l.L0[i]));
  }
  for (const l of world.lines) {
    for (let i = 0; i < l.nodeIds.length - 1; i++) {
      const a = world.nodes[l.nodeIds[i]].p, b = world.nodes[l.nodeIds[i + 1]].p;
      const t = Math.max(0, l.EA * (v3.dist(a, b) - l.L0[i]) / l.L0[i]);
      const x = Math.min(1, t / tMax);
      drawSeg(a, b, [x * 255, (1 - x * 0.7) * 200 + 40, (1 - x) * 255], 1);
    }
  }
  // 标题栏
  drawText(img, W, 16, 12, title, 2, [56, 189, 248]);
  if (extra) drawText(img, W, 16, H - 24, extra, 2, [143, 163, 192]);
  return png(W, H, img);
}

// ---------- 跑全部算例并截图 ----------
fs.mkdirSync(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
const outDir = new URL('../docs/screenshots/', import.meta.url).pathname;
const names = { catenary: 'CASE1_CATENARY', cantilever: 'CASE2_CANTILEVER_BEAM', floatingBox: 'CASE3_FLOATING_BOX', oscillator: 'CASE4_OSCILLATOR', waveCatenary: 'CASE5_WAVE_CATENARY', beamUDL: 'CASE6_BEAM_UDL', heaveDecay: 'CASE7_HEAVE_DECAY', boxWaveRAO: 'CASE8_BOX_WAVE_RAO', touchdown: 'CASE9_TOUCHDOWN', ssBeam: 'CASE10_SS_BEAM', pendulum: 'CASE11_PENDULUM', currentLine: 'CASE12_CURRENT_LINE', windHeel: 'CASE13_WIND_HEEL' };
for (const key of Object.keys(cases)) {
  const c = cases[key];
  const p = {}; c.params.forEach(q => p[q.k] = q.v);
  const w = c.build(p);
  const out = c.run(w, p);
  const errs = out.results.map(([n, num, ana]) => {
    const e = isFinite(ana) && ana !== 0 ? Math.abs((num - ana) / ana) * 100 : null;
    return e === null ? null : e.toFixed(2) + '%';
  }).filter(Boolean).join(' ');
  const pngBuf = render(w, names[key] + '  MARINEFEM WEBGPU VIEW', w.lines, 'TENSION MAP  ERR: ' + (errs || 'QUALITATIVE'));
  fs.writeFileSync(outDir + names[key] + '.png', pngBuf);
  console.log('已输出', names[key] + '.png', '误差:', errs || '定性');
  if (out.plot) { // 时程曲线单独出图
    const W2 = 1280, H2 = 360, img = Buffer.alloc(W2 * H2 * 4);
    for (let i = 0; i < W2 * H2; i++) { img[i * 4] = 10; img[i * 4 + 1] = 19; img[i * 4 + 2] = 34; img[i * 4 + 3] = 255; }
    const xs = out.plot.xs, ys = out.plot.ys;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const px = (x) => 50 + (x - x0) / (x1 - x0 || 1) * (W2 - 70);
    const py = (y) => H2 - 40 - (y - y0) / (y1 - y0 || 1) * (H2 - 70);
    const set = (x, y, c) => { if (x >= 0 && x < W2 && y >= 0 && y < H2) { const o = (y * W2 + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; } };
    for (let x = 50; x < W2 - 20; x++) set(x, H2 - 40, [34, 49, 79]);
    for (let y = 10; y < H2 - 40; y++) set(50, y, [34, 49, 79]);
    for (let i = 1; i < xs.length; i++) {
      const xa = px(xs[i - 1]), ya = py(ys[i - 1]), xb = px(xs[i]), yb = py(ys[i]);
      const steps = Math.ceil(Math.hypot(xb - xa, yb - ya));
      for (let k = 0; k <= steps; k++) set(Math.round(xa + (xb - xa) * k / steps), Math.round(ya + (yb - ya) * k / steps), [56, 189, 248]);
    }
    drawText(img, W2, 56, 14, 'TIME HISTORY  T(S) VS VALUE', 2, [143, 163, 192]);
    fs.writeFileSync(outDir + names[key] + '_PLOT.png', png(W2, H2, img));
    console.log('已输出', names[key] + '_PLOT.png');
  }
}
console.log('全部截图完成 → docs/screenshots/');
