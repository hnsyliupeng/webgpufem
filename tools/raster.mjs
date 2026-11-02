// tools/raster.mjs — tiny software rasterizer (painter's algorithm) -> PNG via pngjs.
// Renders the same scene description used by the browser viewport (core/render_scene.js).
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { v3, rotVecToMat3, mat3Vec } from '../core/math.js';
import { tensionColor } from '../core/render_scene.js';

export function renderPNG(scene, opts = {}) {
  const W = opts.width ?? 1280, H = opts.height ?? 800;
  const img = new PNG({ width: W, height: H });
  const buf = img.data;
  // background: deep sea gradient
  for (let y = 0; y < H; y++) {
    const f = y / H;
    const r = 8 + 20 * (1 - f), g = 20 + 40 * (1 - f), b = 40 + 70 * (1 - f);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  const cam = scene.camera;
  const pos = cam.pos, tgt = cam.target || [0, 0, 0];
  const fwd = v3.norm(v3.sub(tgt, pos));
  let right = v3.norm(v3.cross(fwd, [0, 0, 1]));
  if (v3.len(right) < 1e-6) right = [1, 0, 0];
  const up = v3.cross(right, fwd);
  const fov = (opts.fov ?? 50) * Math.PI / 180;
  const f = 0.5 * H / Math.tan(fov / 2);
  const cx = W / 2, cy = H / 2;
  const project = (p) => {
    const rel = v3.sub(p, pos);
    const z = v3.dot(rel, fwd);
    if (z < 0.5) return null;
    const x = v3.dot(rel, right), y = v3.dot(rel, up);
    return { x: cx + f * x / z, y: cy - f * y / z, z, s: f / z };
  };

  const prims = []; // {depth, draw()}
  const line = (a, b, color, width, alpha = 1) => {
    const pa = project(a), pb = project(b);
    if (!pa || !pb) return;
    prims.push({ depth: (pa.z + pb.z) / 2, pa, pb, color, width, alpha, kind: 'line' });
  };
  const disc = (c, rWorld, color, alpha = 1) => {
    const p = project(c);
    if (!p) return;
    prims.push({ depth: p.z, p, r: rWorld * p.s, color, alpha, kind: 'disc' });
  };
  const tri = (a, b, c, color, alpha = 1) => {
    const pa = project(a), pb = project(b), pc = project(c);
    if (!pa || !pb || !pc) return;
    prims.push({ depth: (pa.z + pb.z + pc.z) / 3, pa, pb, pc, color, alpha, kind: 'tri' });
  };
  const quad = (a, b, c, d, color, alpha = 1) => { tri(a, b, c, color, alpha); tri(a, c, d, color, alpha); };

  // extent
  let ext = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  const acc = (p) => { for (let k = 0; k < 3; k++) { ext.min[k] = Math.min(ext.min[k], p[k]); ext.max[k] = Math.max(ext.max[k], p[k]); } };
  for (const l of scene.lines) for (const p of l.pts) acc(p);
  for (const b of scene.bodies) acc(b.pos);
  if (ext.min[0] > 1e8) { ext = { min: [-50, -50, -110], max: [150, 50, 10] }; }
  const pad = 30;
  ext.min = ext.min.map(v => v - pad); ext.max = ext.max.map(v => v + pad);
  const depth = scene.depth ?? 100;
  ext.min[2] = Math.min(ext.min[2], -depth - 5); ext.max[2] = Math.max(ext.max[2], 8);

  // seabed grid
  const bedCol = [96, 82, 60];
  const nx = 14, ny = 10;
  for (let i = 0; i <= nx; i++) {
    const x = ext.min[0] + (ext.max[0] - ext.min[0]) * i / nx;
    line([x, ext.min[1], -depth], [x, ext.max[1], -depth], bedCol, 1, 0.9);
  }
  for (let j = 0; j <= ny; j++) {
    const y = ext.min[1] + (ext.max[1] - ext.min[1]) * j / ny;
    line([ext.min[0], y, -depth], [ext.max[0], y, -depth], bedCol, 1, 0.9);
  }

  // water surface
  const wcol = [40, 120, 200];
  const gn = scene.water?.gridN ?? 20;
  const wx0 = ext.min[0], wx1 = ext.max[0], wy0 = ext.min[1], wy1 = ext.max[1];
  const wave = scene.water?.wave;
  const tNow = scene.water?.t ?? 0;
  const etaAt = wave ? null : null;
  const grid = [];
  for (let j = 0; j <= gn; j++) {
    grid.push([]);
    for (let i = 0; i <= gn; i++) {
      const x = wx0 + (wx1 - wx0) * i / gn, y = wy0 + (wy1 - wy0) * j / gn;
      let z = 0;
      if (scene.waterGetEta) z = scene.waterGetEta(x, y, tNow);
      grid[j].push([x, y, z]);
    }
  }
  for (let j = 0; j < gn; j++) for (let i = 0; i < gn; i++) {
    quad(grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i], wcol, 0.28);
  }

  // lines (tension colored)
  for (const l of scene.lines) {
    let tmin = Infinity, tmax = -Infinity;
    if (l.T && l.T.length) { for (const T of l.T) { tmin = Math.min(tmin, T); tmax = Math.max(tmax, T); } }
    for (let i = 0; i < l.pts.length - 1; i++) {
      const T = l.T ? l.T[Math.min(i, l.T.length - 1)] : 0;
      const col = l.T ? tensionColor(T, tmin, tmax) : [0.9, 0.85, 0.3];
      const w = Math.max(1.5, (l.d ?? 0.1) * 6);
      const c = [Math.round(col[0] * 255), Math.round(col[1] * 255), Math.round(col[2] * 255)];
      line(l.pts[i], l.pts[i + 1], c, w, 1);
      disc(l.pts[i], (l.d ?? 0.1) * 0.9, c, 1);
    }
    disc(l.pts[l.pts.length - 1], (l.d ?? 0.1) * 0.9, [255, 255, 255], 1);
  }

  // bodies
  for (const b of scene.bodies) {
    const isBox = b.hydro === 'box' && b.L && b.B;
    if (isBox) {
      const L = b.L, B = b.B, T = b.T || 5;
      const R = rotVecToMat3(b.rot || [0, 0, 0]);
      const corners = [];
      for (const [dx, dy, dz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
        const local = [dx * L / 2, dy * B / 2, dz * T / 2];
        corners.push(v3.add(b.pos, mat3Vec(R, local)));
      }
      const faces = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
      const base = b.type === 'Buoy' ? [220, 140, 40] : [70, 130, 200];
      for (const fc of faces) {
        const n = v3.norm(v3.cross(v3.sub(corners[fc[1]], corners[fc[0]]), v3.sub(corners[fc[2]], corners[fc[0]])));
        const light = 0.55 + 0.45 * Math.abs(n[2]);
        const col = base.map(c => Math.min(255, Math.round(c * light)));
        quad(corners[fc[0]], corners[fc[1]], corners[fc[2]], corners[fc[3]], col, 0.95);
      }
    } else {
      // buoy / lumped body: sphere-ish disc + draft mark
      const r = b.hydro === 'buoy' ? Math.sqrt((b.mass ? b.mass / 1025 : 2) / Math.PI) : 2;
      disc(b.pos, Math.max(r, 1.5), [230, 150, 50], 1);
      disc([b.pos[0], b.pos[1], b.pos[2] - 1], Math.max(r, 1.5) * 0.6, [180, 110, 30], 1);
    }
  }

  // points of interest
  for (const p of scene.points || []) disc(p.pos, 0.6, [255, 80, 80], 1);

  // axes at origin
  const alen = 12;
  line([0, 0, 0], [alen, 0, 0], [255, 0, 0], 2);
  line([0, 0, 0], [0, alen, 0], [0, 255, 0], 2);
  line([0, 0, 0], [0, 0, alen], [80, 80, 255], 2);

  // sort & draw (far first)
  prims.sort((a, b) => b.depth - a.depth);
  for (const p of prims) {
    if (p.kind === 'line') drawLine(buf, W, H, p.pa, p.pb, p.color, p.width, p.alpha);
    else if (p.kind === 'disc') drawDisc(buf, W, H, p.p, p.r, p.color, p.alpha);
    else if (p.kind === 'tri') drawTri(buf, W, H, p.pa, p.pb, p.pc, p.color, p.alpha);
  }
  return img;
}

function setPx(buf, W, H, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = ((y | 0) * W + (x | 0)) * 4;
  if (a >= 1) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; }
  else {
    buf[i] = buf[i] * (1 - a) + c[0] * a;
    buf[i + 1] = buf[i + 1] * (1 - a) + c[1] * a;
    buf[i + 2] = buf[i + 2] * (1 - a) + c[2] * a;
  }
}
function drawLine(buf, W, H, a, b, c, w, alpha) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
  const r = Math.max(0.6, w / 2);
  for (let s = 0; s <= steps; s++) {
    const x = a.x + (b.x - a.x) * s / steps, y = a.y + (b.y - a.y) * s / steps;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) setPx(buf, W, H, x + dx, y + dy, c, alpha);
    }
  }
}
function drawDisc(buf, W, H, p, r, c, alpha) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r * r) setPx(buf, W, H, p.x + dx, p.y + dy, c, alpha);
  }
}
function drawTri(buf, W, H, a, b, c, col, alpha) {
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const d = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(d) < 1e-9) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const w0 = ((b.x - x) * (c.y - y) - (b.y - y) * (c.x - x)) / d;
    const w1 = ((c.x - x) * (a.y - y) - (c.y - y) * (a.x - x)) / d;
    const w2 = 1 - w0 - w1;
    if (w0 >= -0.01 && w1 >= -0.01 && w2 >= -0.01) setPx(buf, W, H, x, y, col, alpha);
  }
}

export function savePNG(img, path) {
  mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  writeFileSync(path, PNG.sync.write(img));
}
