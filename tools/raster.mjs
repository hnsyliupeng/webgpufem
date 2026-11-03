// tools/raster.mjs — software rasterizer (painter's algorithm) -> PNG via pngjs.
// Renders the same scene description used by the browser viewport (core/render_scene.js).
// Quality pass: 2x supersampling (box downsample), directional sun + specular, depth fog,
// fine wave grid with per-quad normals, mesh/box edge outlines, seabed gradient, and a
// PASS/FAIL label stamp so each verification screenshot is self-describing.
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { v3, rotVecToMat3, mat3Vec } from '../core/math.js';
import { tensionColor } from '../core/render_scene.js';

const SS = 2; // supersample factor

// tiny 5x7 bitmap font for stamps
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01111 10000 10000 10000 10000 10000 01111', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01111 10000 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00110 01000 10000 11111', '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000', '.': '00000 00000 00000 00000 00000 01100 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000', ':': '00000 01100 01100 00000 01100 01100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000', '_': '00000 00000 00000 00000 00000 00000 11111',
};
function stampText(img, txt, color) {
  const W = img.width, H = img.height, scale = 2, x0 = 10, y0 = 10;
  const wpx = txt.length * 6 * scale + 12, hpx = 7 * scale + 10;
  for (let y = y0 - 4; y < y0 - 4 + hpx; y++) for (let x = x0 - 6; x < x0 - 6 + wpx; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const o = (y * W + x) * 4;
    img.data[o] = 6; img.data[o + 1] = 11; img.data[o + 2] = 22; img.data[o + 3] = 235;
  }
  let cx = x0;
  for (const ch of txt.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    const rows = g.split(' ');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (rows[r][c] === '1') {
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const px = cx + c * scale + dx, py = y0 + r * scale + dy;
          if (px < W && py < H) { const o = (py * W + px) * 4; img.data[o] = color[0]; img.data[o + 1] = color[1]; img.data[o + 2] = color[2]; img.data[o + 3] = 255; }
        }
      }
    }
    cx += 6 * scale;
  }
}

export function renderPNG(scene, opts = {}) {
  const W = opts.width ?? 1280, H = opts.height ?? 800;
  const W2 = W * SS, H2 = H * SS;
  const img2 = new PNG({ width: W2, height: H2 });
  const buf = img2.data;

  // sky gradient + horizon glow
  for (let y = 0; y < H2; y++) {
    const f = y / H2;
    const r = 5 + 14 * (1 - f), g = 14 + 34 * (1 - f), b = 30 + 62 * (1 - f);
    const glow = Math.max(0, 1 - Math.abs(f - 0.52) * 6) * 26;
    for (let x = 0; x < W2; x++) {
      const i = (y * W2 + x) * 4;
      buf[i] = r + glow * 0.5; buf[i + 1] = g + glow * 0.7; buf[i + 2] = b + glow; buf[i + 3] = 255;
    }
  }

  const cam = scene.camera;
  const pos = cam.pos, tgt = cam.target || [0, 0, 0];
  const fwd = v3.norm(v3.sub(tgt, pos));
  let right = v3.norm(v3.cross(fwd, [0, 0, 1]));
  if (v3.len(right) < 1e-6) right = [1, 0, 0];
  const up = v3.cross(right, fwd);
  const fov = (opts.fov ?? 50) * Math.PI / 180;
  const f = 0.5 * H2 / Math.tan(fov / 2);
  const cx = W2 / 2, cy = H2 / 2;
  const project = (p) => {
    const rel = v3.sub(p, pos);
    const z = v3.dot(rel, fwd);
    if (z < 0.5) return null;
    const x = v3.dot(rel, right), y = v3.dot(rel, up);
    return { x: cx + f * x / z, y: cy - f * y / z, z, s: f / z };
  };

  // lighting
  const L = v3.norm([-0.35, -0.55, 0.75]);
  const Hv = v3.norm(v3.add(L, fwd));
  const FOGC = [10, 24, 46];
  const fogF = (z) => Math.min(0.8, Math.max(0, (z - 90) / 700));
  const applyFog = (c, z) => {
    const k = fogF(z);
    return [c[0] * (1 - k) + FOGC[0] * k, c[1] * (1 - k) + FOGC[1] * k, c[2] * (1 - k) + FOGC[2] * k];
  };
  const shade = (n3, base, z) => {
    const diff = Math.abs(v3.dot(n3, L));
    const spec = Math.pow(Math.max(0, v3.dot(n3, Hv)), 28) * 90;
    let c = [
      base[0] * (0.44 + 0.56 * diff) + spec,
      base[1] * (0.44 + 0.56 * diff) + spec,
      base[2] * (0.44 + 0.56 * diff) + spec,
    ];
    c = applyFog(c, z);
    return c.map(v => Math.max(0, Math.min(255, Math.round(v))));
  };

  const prims = [];
  const line = (a, b, color, width, alpha = 1) => {
    const pa = project(a), pb = project(b);
    if (!pa || !pb) return;
    prims.push({ depth: (pa.z + pb.z) / 2, pa, pb, color: applyFog(color, (pa.z + pb.z) / 2), width, alpha, kind: 'line' });
  };
  const disc = (c, rWorld, color, alpha = 1) => {
    const p = project(c);
    if (!p) return;
    prims.push({ depth: p.z, p, r: rWorld * p.s, color: applyFog(color, p.z), alpha, kind: 'disc' });
  };
  const tri = (a, b, c, base, alpha = 1, edge = false) => {
    const pa = project(a), pb = project(b), pc = project(c);
    if (!pa || !pb || !pc) return;
    const z = (pa.z + pb.z + pc.z) / 3;
    const n3 = v3.norm(v3.cross(v3.sub(b, a), v3.sub(c, a)));
    const col = shade(n3, base, z);
    prims.push({ depth: z, pa, pb, pc, color: col, alpha, kind: 'tri' });
    if (edge) {
      const ec = applyFog([8, 12, 22], z);
      prims.push({ depth: z - 0.01, pa, pb, color: ec, width: 1.1 * SS, alpha: 0.85, kind: 'line' });
      prims.push({ depth: z - 0.01, pa: pb, pb: pc, color: ec, width: 1.1 * SS, alpha: 0.85, kind: 'line' });
      prims.push({ depth: z - 0.01, pa: pc, pb: pa, color: ec, width: 1.1 * SS, alpha: 0.85, kind: 'line' });
    }
  };
  const quad = (a, b, c, d, base, alpha = 1, edge = false) => { tri(a, b, c, base, alpha, edge); tri(a, c, d, base, alpha, edge); };

  // extent
  let ext = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  const acc = (p) => { for (let k = 0; k < 3; k++) { ext.min[k] = Math.min(ext.min[k], p[k]); ext.max[k] = Math.max(ext.max[k], p[k]); } };
  for (const l of scene.lines) for (const p of l.pts) acc(p);
  for (const b of scene.bodies) {
    acc(b.pos);
    if (b.meshTris) for (const t of b.meshTris) for (const p of t) acc(p);
  }
  if (ext.min[0] > 1e8) ext = { min: [-50, -50, -110], max: [150, 50, 10] };
  const pad = 30;
  ext.min = ext.min.map(v => v - pad); ext.max = ext.max.map(v => v + pad);
  const depth = scene.depth ?? 100;
  ext.min[2] = Math.min(ext.min[2], -depth - 5); ext.max[2] = Math.max(ext.max[2], 8);

  // seabed: gradient quad + grid
  {
    const z = -depth;
    const c0 = [96, 82, 58], c1 = [52, 44, 32];
    quad([ext.min[0], ext.min[1], z], [ext.max[0], ext.min[1], z], [ext.max[0], ext.max[1], z], [ext.min[0], ext.max[1], z], c0, 1);
    // fake vertical gradient: overlay darker band toward camera bottom
    const bedCol = [110, 94, 66];
    const nx = 16, ny = 12;
    for (let i = 0; i <= nx; i++) {
      const x = ext.min[0] + (ext.max[0] - ext.min[0]) * i / nx;
      line([x, ext.min[1], z], [x, ext.max[1], z], applyFog(bedCol, 250), 1, 0.55);
    }
    for (let j = 0; j <= ny; j++) {
      const y = ext.min[1] + (ext.max[1] - ext.min[1]) * j / ny;
      line([ext.min[0], y, z], [ext.max[0], y, z], applyFog(bedCol, 250), 1, 0.55);
    }
    void c1;
  }

  // water surface: fine grid, per-quad wave normal, sun specular
  {
    const gn = scene.water?.gridN ?? 36;
    const spanX = Math.max(200, (ext.max[0] - ext.min[0]) * 4), spanY = Math.max(200, (ext.max[1] - ext.min[1]) * 4);
    const cxm = (ext.min[0] + ext.max[0]) / 2, cym = (ext.min[1] + ext.max[1]) / 2;
    const wx0 = cxm - spanX / 2, wx1 = cxm + spanX / 2, wy0 = cym - spanY / 2, wy1 = cym + spanY / 2;
    const tNow = scene.water?.t ?? 0;
    const eta = (x, y) => (scene.waterGetEta ? scene.waterGetEta(x, y, tNow) : 0);
    const grid = [];
    for (let j = 0; j <= gn; j++) {
      grid.push([]);
      for (let i = 0; i <= gn; i++) {
        const x = wx0 + (wx1 - wx0) * i / gn, y = wy0 + (wy1 - wy0) * j / gn;
        grid[j].push([x, y, eta(x, y)]);
      }
    }
    const base = [34, 116, 196];
    for (let j = 0; j < gn; j++) for (let i = 0; i < gn; i++) {
      const p00 = grid[j][i], p10 = grid[j][i + 1], p11 = grid[j + 1][i + 1], p01 = grid[j + 1][i];
      // normal from finite differences of eta
      const dx = (wx1 - wx0) / gn, dy = (wy1 - wy0) / gn;
      const dEx = (eta(p10[0], p10[1]) - eta(p00[0], p00[1])) / dx;
      const dEy = (eta(p01[0], p01[1]) - eta(p00[0], p00[1])) / dy;
      const n3 = v3.norm([-dEx, -dEy, 1]);
      const z = (p00[2] + p10[2] + p11[2] + p01[2]) / 4;
      const diff = Math.abs(v3.dot(n3, L));
      const spec = Math.pow(Math.max(0, v3.dot(n3, Hv)), 60) * 150;
      let col = applyFog([
        base[0] * (0.55 + 0.75 * diff) + spec,
        base[1] * (0.55 + 0.75 * diff) + spec,
        base[2] * (0.55 + 0.75 * diff) + spec * 1.1,
      ], 120);
      col = col.map(v => Math.max(0, Math.min(255, Math.round(v))));
      const pa = project(p00), pb = project(p10), pc = project(p11), pd = project(p01);
      if (pa && pb && pc && pd) {
        // true mean depth => near water draws late and tints submerged hulls correctly
        prims.push({ depth: (pa.z + pb.z + pc.z + pd.z) / 4, pa, pb, pc, pd, color: col, alpha: 0.42, kind: 'wquad' });
      }
    }
  }

  // lines (tension colored)
  for (const l of scene.lines) {
    let tmin = Infinity, tmax = -Infinity;
    if (l.T && l.T.length) { for (const T of l.T) { tmin = Math.min(tmin, T); tmax = Math.max(tmax, T); } }
    for (let i = 0; i < l.pts.length - 1; i++) {
      const T = l.T ? l.T[Math.min(i, l.T.length - 1)] : 0;
      const col = l.T ? tensionColor(T, tmin, tmax) : [0.9, 0.85, 0.3];
      const w = Math.max(1.6, (l.d ?? 0.1) * 6);
      const c = [Math.round(col[0] * 255), Math.round(col[1] * 255), Math.round(col[2] * 255)];
      line(l.pts[i], l.pts[i + 1], c, w * SS, 1);
      disc(l.pts[i], (l.d ?? 0.1) * 0.9, c, 1);
    }
    disc(l.pts[l.pts.length - 1], (l.d ?? 0.1) * 0.9, [255, 255, 255], 1);
  }

  // bodies (mesh triangles or shaded boxes or buoy discs)
  for (const b of scene.bodies) {
    if (b.meshTris) {
      const nTri = b.meshTris.length;
      // dense real-world meshes (ships): light hull color, no per-triangle edges (too dense);
      // coarse primitive meshes: colored + edge outlines
      const dense = nTri > 4000;
      const base = b.color || (dense ? [198, 206, 219] : b.type === 'Vessel' ? [110, 160, 240] : [224, 175, 104]);
      for (const t of b.meshTris) tri(t[0], t[1], t[2], base, 0.97, !dense);
      continue;
    }
    const isBox = b.hydro === 'box' && b.L && b.B;
    if (isBox) {
      const L = b.L, B = b.B, T = b.T || 5;
      const R = rotVecToMat3(b.rot || [0, 0, 0]);
      const corners = [];
      for (const [dx, dy, dz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
        corners.push(v3.add(b.pos, mat3Vec(R, [dx * L / 2, dy * B / 2, dz * T / 2])));
      }
      const faces = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
      const base = b.type === 'Buoy' ? [220, 140, 40] : [70, 130, 200];
      for (const fc of faces) quad(corners[fc[0]], corners[fc[1]], corners[fc[2]], corners[fc[3]], base, 0.96, true);
    } else {
      const r = b.hydro === 'buoy' ? Math.sqrt((b.mass ? b.mass / 1025 : 2) / Math.PI) : 2;
      const rr = Math.max(r, 1.5);
      disc(b.pos, rr, [150, 95, 30], 1);
      disc(b.pos, rr * 0.75, [210, 140, 50], 1);
      disc(b.pos, rr * 0.45, [240, 180, 80], 1);
      disc([b.pos[0], b.pos[1], b.pos[2] - 1], rr * 0.6, [120, 75, 25], 0.9);
    }
  }

  // points of interest
  for (const p of scene.points || []) { disc(p.pos, 0.9, [255, 90, 90], 1); disc(p.pos, 0.45, [255, 200, 200], 1); }

  // axes at origin
  const alen = 12;
  line([0, 0, 0], [alen, 0, 0], [255, 60, 60], 2.5 * SS);
  line([0, 0, 0], [0, alen, 0], [60, 230, 90], 2.5 * SS);
  line([0, 0, 0], [0, 0, alen], [90, 140, 255], 2.5 * SS);

  // sort & draw (far first)
  prims.sort((a, b) => b.depth - a.depth);
  for (const p of prims) {
    if (p.kind === 'line') drawLine(buf, W2, H2, p.pa, p.pb, p.color, p.width, p.alpha);
    else if (p.kind === 'disc') drawDisc(buf, W2, H2, p.p, p.r, p.color, p.alpha);
    else if (p.kind === 'tri') drawTri(buf, W2, H2, p.pa, p.pb, p.pc, p.color, p.alpha);
    else if (p.kind === 'wquad') drawTri(buf, W2, H2, p.pa, p.pb, p.pc, p.color, p.alpha), drawTri(buf, W2, H2, p.pa, p.pc, p.pd, p.color, p.alpha);
  }

  // downsample SS x SS (box filter)
  const img = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
      const o = ((y * SS + dy) * W2 + (x * SS + dx)) * 4;
      r += buf[o]; g += buf[o + 1]; b += buf[o + 2]; n++;
    }
    const o = (y * W + x) * 4;
    img.data[o] = Math.round(r / n); img.data[o + 1] = Math.round(g / n); img.data[o + 2] = Math.round(b / n); img.data[o + 3] = 255;
  }

  if (opts.label) {
    const pass = /PASS/.test(opts.label);
    stampText(img, opts.label, pass ? [52, 211, 153] : [248, 113, 113]);
  }
  return img;
}

function setPx(buf, W, H, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = ((y | 0) * W + (x | 0)) * 4;
  if (a >= 1) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; }
  else {
    buf[i] = buf[i] * (1 - a) + c[0] * a;
    buf[i + 1] = buf[i] * (1 - a) + c[1] * a;
    buf[i + 2] = buf[i] * (1 - a) + c[2] * a;
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
