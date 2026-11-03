// core/math.js — minimal 3D math (no dependencies, runs in browser and Node)
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  normalize: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  zero: () => [0, 0, 0],
};

// Rotation vector (axis*angle) -> 3x3 matrix (row-major array of 9)
export function rotVecToMat3(r) {
  const th = Math.hypot(r[0], r[1], r[2]);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const x = r[0] / th, y = r[1] / th, z = r[2] / th, c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
}
export function mat3ToRotVec(m) {
  const th = Math.acos(Math.max(-1, Math.min(1, (m[0] + m[4] + m[8] - 1) / 2)));
  if (th < 1e-9) return [0, 0, 0];
  const s = 2 * Math.sin(th);
  return [(m[7] - m[5]) / s * th, (m[2] - m[6]) / s * th, (m[3] - m[1]) / s * th];
}
export function mat3Mul(a, b) {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
}
export function mat3Vec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}
export function mat3T(m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }
// Euler angles roll(phi),pitch(theta),yaw(psi) ZYX convention -> mat3
export function eulerToMat3(phi, theta, psi) {
  const cf = Math.cos(phi), sf = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta), cp = Math.cos(psi), sp = Math.sin(psi);
  return [
    ct * cp, sf * st * cp - cf * sp, cf * st * cp + sf * sp,
    ct * sp, sf * st * sp + cf * cp, cf * st * sp - sf * cp,
    -st, sf * ct, cf * ct,
  ];
}

// ---- small dense linear algebra ----
export function solveLin(A, b) { // Gaussian elimination with partial pivoting, A n x n (array of rows), b n
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) throw new Error('singular matrix');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}
export function jacobiEigen(A) { // symmetric eigen, returns {values, vectors(columns)}
  const n = A.length;
  const a = A.map(r => [...r]);
  const V = Array.from({ length: n }, (_, i) => { const v = new Array(n).fill(0); v[i] = 1; return v; });
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-16) continue;
      const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
      const c = Math.cos(theta), s = Math.sin(theta);
      for (let k = 0; k < n; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const values = a.map((row, i) => row[i]);
  return { values, vectors: V };
}
// generalized eigen K phi = w^2 M phi via Cholesky of M
export function genEigen(K, M) {
  const n = M.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = M[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = (i === j) ? Math.sqrt(Math.max(s, 1e-30)) : s / L[j][j];
  }
  const Linv = (v) => { const x = new Array(n).fill(0); for (let i = 0; i < n; i++) { let s = v[i]; for (let k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; } return x; };
  // A = L^-1 K L^-T  (symmetric)
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const ej = new Array(n).fill(0); ej[j] = 1;
    const col = Linv(ej); // L^-1 e_j
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += K[i][k] * col[k];
      A[i][j] = s;
    }
  }
  // symmetrize A = L^-1 K L^-T : row i of A currently L^-1 K e_j... redo properly:
  const A2 = Array.from({ length: n }, () => new Array(n).fill(0));
  const cols = [];
  for (let j = 0; j < n; j++) { const ej = new Array(n).fill(0); ej[j] = 1; cols.push(Linv(ej)); }
  for (let i = 0; i < n; i++) {
    const row = Linv(Array.from({ length: n }, (_, j) => K[i][j])); // not used; compute A = C^T K C with C=L^-1
  }
  // simpler: A = C^T K C where C = L^-1
  const C = Array.from({ length: n }, (_, j) => cols[j]);
  const KC = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < n; k++) s += K[i][k] * C[k][j]; KC[i][j] = s; }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < n; k++) s += C[k][i] * KC[k][j]; A2[i][j] = s; }
  const { values, vectors } = jacobiEigen(A2);
  const phi = vectors.map(row => row.map((v, i) => { let s = 0; for (let k = 0; k < n; k++) s += C[k][i] * v; return s; }));
  // phi stored row-wise per eigenvector -> transpose
  const vecs = Array.from({ length: n }, (_, i) => values.map((_, j) => phi[j][i]));
  return { omega2: values, vectors: vecs };
}

// seeded RNG (mulberry32) for reproducible wave phases
export function rng32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const deg = (r) => r * 180 / Math.PI;
export const rad = (d) => d * Math.PI / 180;
