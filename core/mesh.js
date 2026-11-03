// core/mesh.js — triangle-mesh geometry: OBJ parsing, transforms, procedural primitives,
// exact volume/centroid/inertia by signed-tetrahedron decomposition, and exact clipping of a
// closed mesh by a plane (used for mesh-accurate buoyancy: displaced volume + center of
// buoyancy of the part below the waterline, arbitrary hull shape and attitude).
import { rotVecToMat3, mat3Vec } from './math.js';

const EPS = 1e-12;

// ---------- OBJ ----------
// Supports: v / vt / vn / f (with a, a/b, a//c, a/b/c forms, negative indices), groups ignored.
// Faces are triangulated as a fan. Returns { pos: [[x,y,z]..], tri: [[i,j,k]..] } (0-based).
export function parseObj(text) {
  const pos = [];
  const tri = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === 'v') {
      pos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (tag === 'f') {
      const idx = parts.slice(1).map(tok => {
        let s = tok.split('/')[0];
        let i = parseInt(s, 10);
        if (i < 0) i = pos.length + i + 1;
        return i - 1;
      });
      for (let k = 1; k + 1 < idx.length; k++) tri.push([idx[0], idx[k], idx[k + 1]]);
    }
  }
  return { pos, tri };
}

// ---------- STL (binary or ASCII), as used by DAVE trimesh.load_file for tank meshes ----------
export function parseStl(text) {
  // returns { pos, tri } like parseObj
  if (/^\s*solid/i.test(text) && text.includes('facet')) {
    const pos = []; const tri = [];
    const verts = [];
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('vertex')) {
        const p = line.split(/\s+/).slice(1).map(Number);
        verts.push(pos.length); pos.push(p);
        if (verts.length === 3) { tri.push([...verts]); verts.length = 0; }
      }
    }
    return { pos, tri };
  }
  throw new Error('parseStl expects ASCII STL text; use parseStlBase64 for binary');
}

export function parseStlBase64(b64) {
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > 84 && buf.toString('latin1', 0, 5) === 'solid' && buf.includes('facet')) {
    return parseStl(buf.toString('latin1'));
  }
  const n = buf.readUInt32LE(80);
  if (buf.length < 84 + 50 * n) throw new Error('bad binary STL');
  const pos = []; const tri = [];
  for (let f = 0; f < n; f++) {
    const o = 84 + 50 * f + 12; // skip normal
    const base = pos.length;
    for (let k = 0; k < 3; k++) {
      pos.push([buf.readFloatLE(o + 12 * k), buf.readFloatLE(o + 12 * k + 4), buf.readFloatLE(o + 12 * k + 8)]);
    }
    tri.push([base, base + 1, base + 2]);
  }
  return { pos, tri };
}

// DAVE trimesh.load_obj transform: v' = R(rotation deg) * (v * scale) + offset
export function transformMesh(m, { scale = [1, 1, 1], rotation = [0, 0, 0], offset = [0, 0, 0] } = {}) {
  const R = rotVecToMat3(rotation.map(v => v * Math.PI / 180));
  const pos = m.pos.map(p => {
    const s = [p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]];
    const r = mat3Vec(R, s);
    return [r[0] + offset[0], r[1] + offset[1], r[2] + offset[2]];
  });
  return { pos, tri: m.tri.map(t => [...t]) };
}

export function meshBBox(m) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of m.pos) for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
  return { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] };
}

// signed tetra volume of (0, a, b, c)
function tetVol(a, b, c) { return (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }

// ---------- exact volume / centroid / inertia of a closed mesh (signed tetrahedra) ----------
// Returns { V, c:[x,y,z], I:[Ixx,Iyy,Izz] about c, watertight } (orientation auto-corrected).
export function meshMassProps(m, rho = 1) {
  let V = 0, cx = 0, cy = 0, cz = 0;
  // second moments S_ab = ∫ x_a x_b dV via simplex formula: V_t/20 * Σ_{i,j} v_i^a v_j^b (v0=0)
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const [i, j, k] of m.tri) {
    const a = m.pos[i], b = m.pos[j], c = m.pos[k];
    const vt = tetVol(a, b, c);
    V += vt;
    const c4 = [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]; // 4 * tet centroid
    cx += vt * c4[0]; cy += vt * c4[1]; cz += vt * c4[2];
    const verts = [a, b, c]; // 4th vertex is the origin, contributes 0
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) {
      let s = 0;
      for (const u of verts) for (const w of verts) s += u[p] * w[q]; // Σ_{i,j} v_i v_j
      for (const u of verts) s += u[p] * u[q];                            // + Σ_i v_i v_i
      S[p][q] += vt / 20 * s; // ∫ x_p x_q dV = V_t/20 * (Σ_{i,j} + Σ_i)
    }
  }
  if (Math.abs(V) < EPS) return { V: 0, c: [0, 0, 0], I: [0, 0, 0], mass: 0, watertight: false };
  const sgn = V > 0 ? 1 : -1;
  const c = [cx / (4 * V), cy / (4 * V), cz / (4 * V)]; // sign of vt cancels in the ratio
  V = Math.abs(V);
  const mass = rho * V;
  const Ss = S.map(row => row.map(v => v * sgn / V)); // normalized second moments ∫x_a x_b / V
  const I = [
    mass * (Ss[1][1] + Ss[2][2] - (c[1] * c[1] + c[2] * c[2])),
    mass * (Ss[0][0] + Ss[2][2] - (c[0] * c[0] + c[2] * c[2])),
    mass * (Ss[0][0] + Ss[1][1] - (c[0] * c[0] + c[1] * c[1])),
  ];
  return { V, c, I, mass, watertight: true };
}

// ---------- exact clipping of a closed mesh by plane n·p <= d ----------
// Uses cones from a fixed point p0 ON the plane: the submerged solid's signed volume/centroid
// are the sum of signed tetrahedra (p0, q0, qi, qi+1) over each face's clipped polygon.
// This is exact for any attitude and degenerate-safe (faces lying in the plane contribute
// zero-volume cones). Also returns the waterplane cap area A when no face is coplanar
// (A=null otherwise).
export function clipMeshBelowPlane(m, n, d) {
  const nn = Math.hypot(n[0], n[1], n[2]) || 1;
  const nv = [n[0] / nn, n[1] / nn, n[2] / nn];
  const dd = d / nn;
  const p0 = [nv[0] * dd, nv[1] * dd, nv[2] * dd];
  const dist = p => nv[0] * p[0] + nv[1] * p[1] + nv[2] * p[2] - dd;
  const tet = (a, b, c) => {
    const ax = a[0] - p0[0], ay = a[1] - p0[1], az = a[2] - p0[2];
    const bx = b[0] - p0[0], by = b[1] - p0[1], bz = b[2] - p0[2];
    const cx = c[0] - p0[0], cy = c[1] - p0[1], cz = c[2] - p0[2];
    return (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  };
  const clipPoly = (poly) => {
    const out = [];
    let prev = poly[poly.length - 1], dp = dist(prev);
    for (const cur of poly) {
      const dc = dist(cur);
      if ((dc <= 1e-12) !== (dp <= 1e-12)) {
        const t = dp / (dp - dc);
        out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1]), prev[2] + t * (cur[2] - prev[2])]);
      }
      if (dc <= 1e-12) out.push(cur);
      prev = cur; dp = dc;
    }
    return out;
  };
  let V = 0, cx = 0, cy = 0, cz = 0;
  const capSegs = [];
  let degenerate = false;
  for (const [i, j, k] of m.tri) {
    const vs = [m.pos[i], m.pos[j], m.pos[k]];
    const ds = vs.map(dist);
    const coplanar = ds.every(x => Math.abs(x) <= 1e-9);
    if (coplanar) degenerate = true;
    const poly = clipPoly(vs);
    if (poly.length < 3) continue;
    if (!coplanar) {
      for (let a = 0; a < poly.length; a++) {
        const p = poly[a], q = poly[(a + 1) % poly.length];
        if (Math.abs(dist(p)) <= 1e-9 && Math.abs(dist(q)) <= 1e-9) capSegs.push([p, q]);
      }
    }
    for (let a = 1; a + 1 < poly.length; a++) {
      const vt = tet(poly[0], poly[a], poly[a + 1]);
      V += vt;
      cx += vt * (p0[0] + poly[0][0] + poly[a][0] + poly[a + 1][0]);
      cy += vt * (p0[1] + poly[0][1] + poly[a][1] + poly[a + 1][1]);
      cz += vt * (p0[2] + poly[0][2] + poly[a][2] + poly[a + 1][2]);
    }
  }
  if (Math.abs(V) < EPS) return { V: 0, c: [0, 0, 0], A: degenerate ? null : 0, capC: null };
  const c = [cx / (4 * V), cy / (4 * V), cz / (4 * V)];
  V = Math.abs(V);
  // waterplane cap area from chained boundary loops (only when non-degenerate)
  let A = null, capC = null;
  if (!degenerate && capSegs.length) {
    const key = p => p.map(v => v.toFixed(9)).join(',');
    const unused = capSegs.map(sg => [...sg]);
    const map = new Map();
    unused.forEach((sg, i) => { const k = key(sg[0]); if (!map.has(k)) map.set(k, []); map.get(k).push(i); });
    let acx = 0, acy = 0, acz = 0, nL = 0;
    while (unused.some(sg => sg)) {
      const s0 = unused.findIndex(sg => sg);
      if (s0 < 0) break;
      const loop = [unused[s0][0]];
      let cur = unused[s0][1];
      unused[s0] = null;
      for (let guard = 0; guard < 100000; guard++) {
        if (key(cur) === key(loop[0])) break;
        loop.push(cur);
        const cands = (map.get(key(cur)) || []).filter(i => unused[i]);
        if (!cands.length) break;
        const seg = unused[cands[0]];
        cur = key(seg[0]) === key(cur) ? seg[1] : seg[0];
        unused[cands[0]] = null;
      }
      if (loop.length < 3) continue;
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i], q = loop[(i + 1) % loop.length];
        nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
      }
      A = (A ?? 0) + Math.hypot(nx, ny, nz) / 2;
      for (const p of loop) { acx += p[0]; acy += p[1]; acz += p[2]; nL += 1; }
    }
    if (nL) capC = [acx / nL, acy / nL, acz / nL];
  }
  return { V, c, A, capC };
}

// ---------- procedural primitives (centered at origin, z up) ----------
export function boxMesh(L, B, T) {
  const x = L / 2, y = B / 2, z = T / 2;
  const pos = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const tri = [
    [0, 2, 1], [0, 3, 2], // bottom (normal -z)
    [4, 5, 6], [4, 6, 7], // top +z
    [0, 1, 5], [0, 5, 4], // -y
    [2, 3, 7], [2, 7, 6], // +y
    [1, 2, 6], [1, 6, 5], // +x
    [3, 0, 4], [3, 4, 7], // -x
  ];
  return { pos, tri };
}

export function cylinderMesh(r, h, seg = 24) {
  const pos = [], tri = [];
  const z0 = -h / 2, z1 = h / 2;
  for (let i = 0; i < seg; i++) {
    const a = 2 * Math.PI * i / seg, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    pos.push([ca, sa, z0], [ca, sa, z1]);
  }
  pos.push([0, 0, z0], [0, 0, z1]); // centers: 2*seg, 2*seg+1
  const cb = 2 * seg, ct = 2 * seg + 1;
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    tri.push([2 * i, 2 * j, 2 * j + 1], [2 * i, 2 * j + 1, 2 * i + 1]); // side
    tri.push([cb, 2 * j, 2 * i]);       // bottom (-z)
    tri.push([ct, 2 * i + 1, 2 * j + 1]); // top (+z)
  }
  return { pos, tri };
}

export function coneMesh(r, h, seg = 24) {
  const pos = [], tri = [];
  const z0 = -h / 2, z1 = h / 2;
  for (let i = 0; i < seg; i++) {
    const a = 2 * Math.PI * i / seg;
    pos.push([Math.cos(a) * r, Math.sin(a) * r, z0]);
  }
  pos.push([0, 0, z0], [0, 0, z1]); // base center, apex
  const cb = seg, apex = seg + 1;
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    tri.push([i, j, apex]);
    tri.push([cb, j, i]);
  }
  return { pos, tri };
}

export function pyramidMesh(L, B, H) {
  // rectangular base at z=-H/2, apex at z=+H/2
  const x = L / 2, y = B / 2, z0 = -H / 2, z1 = H / 2;
  const pos = [[-x, -y, z0], [x, -y, z0], [x, y, z0], [-x, y, z0], [0, 0, z1]];
  const tri = [
    [0, 2, 1], [0, 3, 2],       // base (-z)
    [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], // sides
  ];
  return { pos, tri };
}

export function sphereMesh(r, segU = 16, segV = 12) {
  const pos = [], tri = [];
  for (let i = 0; i <= segV; i++) {
    const phi = Math.PI * i / segV; // 0..pi from +z
    for (let j = 0; j <= segU; j++) {
      const th = 2 * Math.PI * j / segU;
      pos.push([r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi)]);
    }
  }
  const idx = (i, j) => i * (segU + 1) + j;
  for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) {
    const a = idx(i, j), b = idx(i + 1, j), c = idx(i + 1, j + 1), d = idx(i, j + 1);
    if (i > 0) tri.push([a, b, d]);
    if (i < segV - 1) tri.push([b, c, d]);
  }
  return { pos, tri };
}
