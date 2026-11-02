// core/catenary.js — analytic elastic catenary (verification benchmark for the FEM line)
// Convention: s = unstretched arc coordinate from end A (0..L0).
// T(s) = sqrt(H^2 + (V + w0 s)^2);  w0 = submerged weight per unit UNSTRETCHED length.
// dx/ds = (H/T)(1 + T/EA), dz/ds = ((V + w0 s)/T)(1 + T/EA)  -> closed forms below.
import { v3 } from './math.js';

// position along catenary at unstretched coordinate s, given H (horizontal tension), V (vertical comp at s=0)
export function catenaryPoint(H, V, w0, EA, L0, s) {
  const A = V + w0 * s;
  const T = Math.hypot(H, A);
  const T0 = Math.hypot(H, V);
  const x = (H / w0) * (Math.asinh(A / H) - Math.asinh(V / H)) + H * s / EA;
  const z = (T - T0) / w0 + V * s / EA;
  return { x, z, T, strain: T / EA };
}

// Solve H, V such that catenary from (0,0) with length L0 ends at (X, Z). Newton 2x2.
export function solveCatenary(H0, V0, w0, EA, L0, X, Z, iters = 60) {
  let H = H0, V = V0;
  for (let i = 0; i < iters; i++) {
    const p = catenaryPoint(H, V, w0, EA, L0, L0);
    const rx = p.x - X, rz = p.z - Z;
    if (Math.hypot(rx, rz) < 1e-10 * Math.max(1, Math.hypot(X, Z))) break;
    const e = 1e-6 * Math.max(H, 1);
    const px = catenaryPoint(H + e, V, w0, EA, L0, L0);
    const pz = catenaryPoint(H, V + e, w0, EA, L0, L0);
    const J = [[(px.x - p.x) / e, (pz.x - p.x) / e], [(px.z - p.z) / e, (pz.z - p.z) / e]];
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    const dH = (-rx * J[1][1] + rz * J[0][1]) / det;
    const dV = (-rz * J[0][0] + rx * J[1][0]) / det;
    H += dH; V += dV;
    if (H < 1) H = 1;
  }
  return { H, V };
}

// Full catenary shape: n points from s=0..L0
export function catenaryShape(H, V, w0, EA, L0, n = 50) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = L0 * i / n;
    const p = catenaryPoint(H, V, w0, EA, L0, s);
    pts.push({ s, x: p.x, z: p.z, T: p.T });
  }
  return pts;
}

// Mooring line on flat seabed (standard assumption: at touchdown the suspended
// part is tangent to the seabed, i.e. vertical tension component V=0 at s=0).
// Anchor at (0, -depth); fairlead (top) at (Xf, Zf) in world coords (Zf > -depth).
// Bottom part: straight on seabed, unstretched length Lb ~= x_td, friction mu.
// Suspended catenary: length Ls = L0 - x_td from touchdown (x_td, -depth) to fairlead.
// Unknowns H (horizontal tension, constant along catenary) and x_td.
export function mooringTouchdown(L0, w0, EA, mu, depth, Xf, Zf) {
  const Zt = Zf + depth; // fairlead height above seabed
  let H = w0 * 30 + 1000, x_td = Math.max(1, Xf - Math.sqrt(Math.max(L0 * L0 - Zt * Zt, 1)) * 0.5);
  x_td = Math.min(Math.max(x_td, 0.01 * L0), 0.9 * L0);
  const f = (HH, XX) => {
    const Ls = L0 - XX;
    const p = catenaryPoint(HH, 0, w0, EA, Ls, Ls);
    return [p.x - (Xf - XX), p.z - Zt, Ls];
  };
  for (let it = 0; it < 100; it++) {
    const [r1, r2] = f(H, x_td);
    if (Math.hypot(r1, r2) < 1e-10) break;
    const eH = 1e-6 * H + 1e-9, eX = 1e-6 * x_td + 1e-9;
    const [r1h, r2h] = f(H + eH, x_td);
    const [r1x, r2x] = f(H, x_td + eX);
    const J = [[(r1h - r1) / eH, (r1x - r1) / eX], [(r2h - r2) / eH, (r2x - r2) / eX]];
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    if (!isFinite(det) || Math.abs(det) < 1e-12) break;
    let dH = (-r1 * J[1][1] + r2 * J[0][1]) / det;
    let dX = (-r2 * J[0][0] + r1 * J[1][0]) / det;
    // damped update
    const lim = 0.3;
    const sc = Math.max(Math.abs(dH) / (H * lim || 1), Math.abs(dX) / (x_td * lim || 1), 1);
    H += dH / sc; x_td += dX / sc;
    if (!isFinite(H) || !isFinite(x_td)) { H = w0 * 30 + 1000; x_td = 0.3 * L0; continue; }
    if (H < 1) H = 1;
    if (x_td < 0.001 * L0) x_td = 0.001 * L0;
    if (x_td > 0.98 * L0) x_td = 0.98 * L0;
  }
  const Ls = L0 - x_td;
  const pEnd = catenaryPoint(H, 0, w0, EA, Ls, Ls);
  const Ta = H + mu * w0 * x_td;          // anchor horizontal tension
  const Ttop = Math.hypot(H, w0 * Ls);     // fairlead tension
  return { H, V: 0, x_td, Ls, Lb: x_td, Ta, Ttop, topPoint: { x: Xf, z: Zf }, endT: pEnd.T };
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= 3; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[3] / M[i][i]);
}
