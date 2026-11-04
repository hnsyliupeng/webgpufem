// 基础向量/矩阵工具（3D 向量为 [x,y,z] 数组）
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};

// 高斯消元解线性方程组 A x = b（A 为 n×n 行主序数组）
export function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (M[i][i] || 1e-14));
}

// 数值雅可比（中心差分）
export function numJacobian(f, x, eps = 1e-6) {
  const n = x.length, m = f(x).length;
  const J = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const xp = [...x], xm = [...x];
    xp[j] += eps; xm[j] -= eps;
    const fp = f(xp), fm = f(xm);
    for (let i = 0; i < m; i++) J[i][j] = (fp[i] - fm[i]) / (2 * eps);
  }
  return J;
}

// 3x3 矩阵（行主序 9 元素）
export const m3 = {
  ident: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mulV: (R, v) => [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2]],
  transpose: (R) => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]],
  mul: (A, B) => {
    const C = new Array(9).fill(0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
    return C;
  },
  rotAxis: (axis, ang) => { // Rodrigues
    const [x, y, z] = v3.norm(axis), c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
    return [
      c + x * x * C, x * y * C - z * s, x * z * C + y * s,
      y * x * C + z * s, c + y * y * C, y * z * C - x * s,
      z * x * C - y * s, z * y * C + x * s, c + z * z * C];
  },
};

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const fmt = (x, d = 4) => {
  if (!isFinite(x)) return "—";
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e6 || ax < 1e-3)) return x.toExponential(3);
  return Number(x).toFixed(d);
};
