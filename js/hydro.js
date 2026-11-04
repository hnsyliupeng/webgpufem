// 水动力与水静力：Airy 波浪运动学、扩展 Morison 方程、网格体积分浮力（DAVE 式）
import { v3 } from './math.js';

// Airy 波浪：水面高程与水质点速度/加速度（y 向上，水深 h，波向 dir）
export function airyWave(env, x, y, z, t) {
  const { H, T, dir } = env.wave;
  if (H <= 0 || T <= 0) return { eta: 0, u: [0, 0, 0], a: [0, 0, 0] };
  const h = env.depth, g = env.g, rho = env.rho;
  const w = 2 * Math.PI / T;
  let k = w * w / g; // 深水初值
  for (let i = 0; i < 30; i++) k = (w * w / g) / Math.tanh(k * h); // 色散关系迭代
  const kx = k * Math.cos(dir), kz = k * Math.sin(dir);
  const phase = kx * x + kz * z - w * t;
  const eta = (H / 2) * Math.cos(phase);
  const A = (w * H / 2) / Math.sinh(k * h);
  const ch = Math.cosh(k * (y + h)), sh = Math.sinh(k * (y + h));
  const u = [A * ch * Math.cos(phase) * Math.cos(dir), A * sh * Math.sin(phase), A * ch * Math.cos(phase) * Math.sin(dir)];
  const a = [-w * A * sh * Math.sin(phase) * Math.cos(dir), w * A * ch * Math.cos(phase), -w * A * sh * Math.sin(phase) * Math.sin(dir)];
  return { eta, u, a };
}

export function currentVel(env, y) {
  const c = env.current;
  if (!c.speed) return [0, 0, 0];
  let s = c.speed;
  if (c.profile === 'linear') s *= Math.max(0, (y + env.depth) / env.depth);
  return [s * Math.cos(c.dir), 0, s * Math.sin(c.dir)];
}

// Morison 段载荷（单位长度），返回作用在段中点的力向量
export function morisonSegment(env, pMid, vSeg, t) {
  const w = airyWave(env, pMid[0], pMid[1], pMid[2], t);
  const uc = currentVel(env, pMid[1]);
  const u = v3.add(w.u, uc), a = w.a;
  const rel = v3.sub(u, vSeg);
  return { rel, u, a };
}

// 网格水下部分体积分：返回 {V, cog}（世界坐标），用散度定理+四面体求和（含水面盖板）
export function submergedVolume(mesh, worldPos, worldRot, seaLevel = 0) {
  const wv = [];
  for (const v of mesh.verts) {
    const g = v3.add(worldPos, matMulV(worldRot, v));
    wv.push(g);
  }
  const tris = [];
  for (const f of mesh.faces) {
    const [a, b, c] = [wv[f[0]], wv[f[1]], wv[f[2]]];
    const za = a[1] - seaLevel, zb = b[1] - seaLevel, zc = c[1] - seaLevel;
    if (za <= 0 && zb <= 0 && zc <= 0) tris.push([a, b, c]);
    else if (za > 0 && zb > 0 && zc > 0) continue;
    else {
      // 裁剪：沿三角形边行走，按循环顺序产出水下多边形顶点
      const pts = [[a, za], [b, zb], [c, zc]];
      const poly = [];
      for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % 3];
        if (p1[1] <= 0) poly.push(p1[0]);
        if ((p1[1] <= 0) !== (p2[1] <= 0)) {
          const s = p1[1] / (p1[1] - p2[1]);
          poly.push(v3.add(p1[0], v3.scale(v3.sub(p2[0], p1[0]), s)));
        }
      }
      for (let i = 1; i < poly.length - 1; i++) tris.push([poly[0], poly[i], poly[i + 1]]);
    }
  }
  // 散度定理面积分（水面盖板上被积函数为零，可省略）：
  // V = (1/6)Σ a·(b×c)；V·rB = Σ (1/24) n_dS * (Σr_i² + (Σr_i)²) 分量式
  let vol = 0; const cen = [0, 0, 0];
  for (const [a, b, c] of tris) {
    const n = v3.cross(v3.sub(b, a), v3.sub(c, a)); // 2*面积*法向
    vol += v3.dot(a, v3.cross(b, c)) / 6;
    for (let d = 0; d < 3; d++) {
      const s1 = a[d] + b[d] + c[d];
      const s2 = a[d] * a[d] + b[d] * b[d] + c[d] * c[d];
      cen[d] += n[d] * (s2 + s1 * s1) / 48; // (1/2)*n_dS*(1/12)(...) , n_dS=n/2
    }
  }
  const V = Math.abs(vol);
  const cog = V > 1e-12 ? [cen[0] / vol, cen[1] / vol, cen[2] / vol] : [0, 0, 0];
  return { V, cog };
}

function matMulV(R, v) {
  return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
          R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
          R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
}

// 刚体水静力：浮力（世界坐标）+ 浮力矩（绕质心）
export function hydrostaticForce(body, env) {
  if (!body.mesh) return { F: [0, 0, 0], M: [0, 0, 0], V: 0, cog: [0, 0, 0] };
  const { V, cog } = submergedVolume(body.mesh, body.pos, body.rot, env.seaLevel);
  const F = [0, env.rho * env.g * V, 0];
  const g = v3.add(body.pos, matMulV(body.rot, body.cog)); // 质心世界坐标
  const r = v3.sub(cog, g);
  const M = v3.cross(r, F);
  return { F, M, V, cog };
}
