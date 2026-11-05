// 求解器：静力（Newton）、梁 FEM 静力、非线性时域（半隐式 Euler）、线性频域
import { v3, m3, solveLinear, numJacobian } from './math.js';
import { initLine } from './model.js';
import { airyWave, currentVel, hydrostaticForce } from './hydro.js';

// ---------- 线内力（集中质量：段轴向弹簧 + 节点弯曲弹簧） ----------
export function lineInternalForces(world, line, out) {
  const ids = line.nodeIds, N = world.nodes;
  const P = ids.map(i => N[i].p);
  // 轴向
  for (let i = 0; i < ids.length - 1; i++) {
    const a = N[ids[i]], b = N[ids[i + 1]];
    const d = v3.sub(P[i + 1], P[i]); const l = v3.len(d) || 1e-9;
    const t = v3.scale(d, 1 / l);
    let T = line.EA * (l - line.L0[i]) / line.L0[i];
    if (T < 0 && !line.compression) T = 0; // 缆不可受压 → 松弛（弹簧算例允许受压）
    const F = v3.scale(t, T);
    out[ids[i]] = v3.add(out[ids[i]], F);
    out[ids[i + 1]] = v3.sub(out[ids[i + 1]], F);
  }
  // 弯曲（节点旋转弹簧，离散曲率）
  if (line.EI > 0) {
    const kb = line.EI;
    for (let i = 1; i < ids.length - 1; i++) {
      const l1 = v3.len(v3.sub(P[i], P[i - 1])) || 1e-9;
      const l2 = v3.len(v3.sub(P[i + 1], P[i])) || 1e-9;
      const t1 = v3.scale(v3.sub(P[i], P[i - 1]), 1 / l1);
      const t2 = v3.scale(v3.sub(P[i + 1], P[i]), 1 / l2);
      const f = v3.scale(v3.sub(t1, t2), kb / ((l1 + l2) / 2));
      out[ids[i]] = v3.add(out[ids[i]], f);
      out[ids[i - 1]] = v3.sub(out[ids[i - 1]], v3.scale(f, 0.5));
      out[ids[i + 1]] = v3.sub(out[ids[i + 1]], v3.scale(f, 0.5));
    }
  }
}

// 线节点外力：重力 + 浮力 + Morison + 海床
function lineExternalForces(world, line, t, out, withHydro = true) {
  const env = world.env, ids = line.nodeIds, N = world.nodes;
  const A = Math.PI * line.d * line.d / 4;
  for (let i = 0; i < ids.length; i++) {
    const n = N[ids[i]];
    let f = v3.add(out[ids[i]], v3.scale(world.gravity, n.m));
    let half = 0;
    if (i > 0) half += line.L0[i - 1] / 2;
    if (i < ids.length - 1) half += line.L0[i] / 2;
    // 浮力（节点在水下）
    if (n.p[1] < env.seaLevel) f = v3.add(f, [0, env.rho * env.g * A * half, 0]);
    // Morison（段中点）
    if (withHydro && half > 0 && n.p[1] < env.seaLevel + 3) {
      const w = airyWave(env, n.p[0], Math.min(n.p[1], env.seaLevel), n.p[2], t);
      const uc = currentVel(env, n.p[1]);
      const u = v3.add(w.u, uc);
      const rel = v3.sub(u, n.v);
      const seg = v3.norm(v3.sub(N[ids[Math.min(i + 1, ids.length - 1)]].p, N[ids[Math.max(i - 1, 0)]].p));
      const relN = v3.sub(rel, v3.scale(seg, v3.dot(rel, seg)));
      const drag = v3.scale(relN, 0.5 * env.rho * line.cd * line.d * half * v3.len(relN));
      f = v3.add(f, drag);
      // 附加质量（Froude-Krylov+Ca）作为节点等效质量增量处理见动力求解
      n._waveA = w.a; n._ca = line.ca; n._half = half; n._area = A; n._seg = seg;
    }
    // 海床接触（罚函数法向 + Coulomb 切向摩擦）
    const bed = -env.depth;
    if (n.p[1] < bed) {
      const pen = bed - n.p[1];
      const N = 1e6 * pen * line.d; // 法向反力
      f = v3.add(f, [0, N, 0]);
      if (line.mu) { // Coulomb 静摩擦：切向力需求内取 min(μN, |F_t|)，静平衡(v=0)亦成立
        const ft = [f[0], 0, f[2]];
        const ftn = v3.len(ft);
        if (ftn > 1e-9) {
          const Ft = Math.min(line.mu * N, ftn);
          f = v3.sub(f, v3.scale(ft, Ft / ftn));
        }
      }
    }
    out[ids[i]] = f;
  }
}

export function totalLineForces(world, line, t, withHydro = true) {
  const out = world.nodes.map(() => [0, 0, 0]);
  lineInternalForces(world, line, out);
  lineExternalForces(world, line, t, out, withHydro);
  return out;
}

// ---------- 静力求解（Newton + 数值雅可比，仅自由节点） ----------
export function solveStatic(world, { maxIter = 300, tol = 1e-6, hydro = false } = {}) {
  for (const line of world.lines) initLine(world, line);
  const free = [];
  world.nodes.forEach((n, i) => { if (!n.fixed) free.push(i); });
  const x0 = [];
  free.forEach(i => x0.push(...world.nodes[i].p));
  const F = (x) => {
    free.forEach((ni, k) => { world.nodes[ni].p = [x[3 * k], x[3 * k + 1], x[3 * k + 2]]; });
    const res = [];
    for (const line of world.lines) {
      const f = totalLineForces(world, line, 0, hydro);
      free.forEach(ni => res.push(f[ni][0], f[ni][1], f[ni][2]));
    }
    return res;
  };
  let x = [...x0];
  let iter = 0, err = Infinity, scale = 1;
  for (iter = 0; iter < maxIter; iter++) {
    const r = F(x);
    err = Math.max(...r.map(Math.abs));
    scale = Math.max(...r.map(Math.abs), 1) / 1e3 + 1;
    if (err < tol * scale) break;
    const J = numJacobian(F, x, 1e-5);
    const dx = solveLinear(J, r.map(v => -v));
    const step = Math.min(1, 3 / (Math.max(...dx.map(Math.abs)) || 1));
    x = x.map((v, i) => v + step * dx[i]);
  }
  F(x);
  return { converged: err < tol * scale * 10, err, iter };
}

// ---------- 3D 梁 FEM 静力（12×12 单元刚度） ----------
export function beamStiffLocal(L, E, A, G, J, Iy, Iz) {
  const k = new Array(12).fill(0).map(() => new Array(12).fill(0));
  const EA = E * A / L, GJ = G * J / L;
  k[0][0] = EA; k[0][6] = -EA; k[6][0] = -EA; k[6][6] = EA;
  const EIz = E * Iz / L ** 3, EIy = E * Iy / L ** 3;
  const bz = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]];
  const idx = [1, 5, 7, 11]; // w, θy 平面 (xz)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) k[idx[i]][idx[j]] = EIz * bz[i][j];
  const by = [[12, -6 * L, -12, -6 * L], [-6 * L, 4 * L * L, 6 * L, 2 * L * L], [-12, 6 * L, 12, 6 * L], [-6 * L, 2 * L * L, 6 * L, 4 * L * L]];
  const idy = [2, 4, 8, 10]; // v, θz 平面 (xy)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) k[idy[i]][idy[j]] = EIy * by[i][j];
  k[3][3] = GJ; k[3][9] = -GJ; k[9][3] = -GJ; k[9][9] = GJ;
  return k;
}

// 单个梁单元的全局 12×12 刚度 + 单元长度
function beamElemGlobal(p1, p2, beam) {
  const L = v3.dist(p1, p2);
  const ex = v3.norm(v3.sub(p2, p1));
  let ey = Math.abs(ex[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
  const ez = v3.norm(v3.cross(ex, ey)); ey = v3.cross(ez, ex);
  const T = [
    [ex[0], ey[0], ez[0], 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ex[1], ey[1], ez[1], 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ex[2], ey[2], ez[2], 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, ex[0], ey[0], ez[0], 0, 0, 0, 0, 0, 0],
    [0, 0, 0, ex[1], ey[1], ez[1], 0, 0, 0, 0, 0, 0],
    [0, 0, 0, ex[2], ey[2], ez[2], 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, ex[0], ey[0], ez[0], 0, 0, 0],
    [0, 0, 0, 0, 0, 0, ex[1], ey[1], ez[1], 0, 0, 0],
    [0, 0, 0, 0, 0, 0, ex[2], ey[2], ez[2], 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, ex[0], ey[0], ez[0]],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, ex[1], ey[1], ez[1]],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, ex[2], ey[2], ez[2]]];
  const kl = beamStiffLocal(L, beam.E, beam.A, beam.G, beam.J, beam.Iy, beam.Iz);
  const Tt = T[0].map((_, c) => T.map(r => r[c]));
  const kg = Array.from({ length: 12 }, () => new Array(12).fill(0));
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++)
    for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++)
      kg[i][j] += T[i][a] * kl[a][b] * Tt[b][j];
  return { kg, L, T };
}

// 多单元梁链 FEM 静力装配：ids 节点链，bc={first:'pin'|'fixed', last:'pin'|'fixed'|'free'}
// loads: {nodeId:[Fx,Fy,Fz]}；beam.q 为全局 -y 均布载荷(N/m)（每单元一致节点载荷，沿梁轴 x 假设）
export function solveBeamChain(world, ids, beam, loads, bc = { first: 'pin', last: 'pin' }) {
  const ne = ids.length - 1, ndof = ids.length * 6;
  const K = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
  const F = new Array(ndof).fill(0);
  for (let e = 0; e < ne; e++) {
    const { kg, L } = beamElemGlobal(world.nodes[ids[e]].p, world.nodes[ids[e + 1]].p, beam);
    const dofs = [];
    for (let n = 0; n < 2; n++) for (let d = 0; d < 6; d++) dofs.push((e + n) * 6 + d);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) K[dofs[i]][dofs[j]] += kg[i][j];
    if (beam.q) { // 一致节点载荷（局部 w,θ 平面 → 全局 y 向，假设梁沿 x）
      const p = -beam.q;
      for (const n of [e, e + 1]) {
        F[n * 6 + 1] += p * L / 2;
      }
      F[e * 6 + 5] += p * L * L / 12;
      F[(e + 1) * 6 + 5] += -p * L * L / 12;
    }
  }
  for (const idStr in loads) {
    const gi = ids.indexOf(Number(idStr));
    if (gi < 0) continue;
    const l = loads[idStr];
    F[gi * 6] += l[0] || 0; F[gi * 6 + 1] += l[1] || 0; F[gi * 6 + 2] += l[2] || 0;
    F[gi * 6 + 3] += l[3] || 0; F[gi * 6 + 4] += l[4] || 0; F[gi * 6 + 5] += l[5] || 0;
  }
  // 边界条件
  const fixedDofs = new Set();
  const applyBC = (gi, mode) => {
    if (mode === 'fixed') for (let d = 0; d < 6; d++) fixedDofs.add(gi * 6 + d);
    else if (mode === 'pin') for (let d = 0; d < 3; d++) fixedDofs.add(gi * 6 + d);
  };
  applyBC(0, bc.first || 'pin');
  applyBC(ids.length - 1, bc.last || 'pin');
  const free = [];
  for (let d = 0; d < ndof; d++) if (!fixedDofs.has(d)) free.push(d);
  const Kred = free.map(i => free.map(j => K[i][j]));
  const bred = free.map(i => F[i]);
  const u = solveLinear(Kred, bred);
  const disp = new Array(ndof).fill(0);
  free.forEach((d, k) => disp[d] = u[k]);
  return { disp, ids };
}

export function solveBeamStatic(world, beam, loads) {
  // loads: {nodeId: [Fx,Fy,Fz]}；n1 全固定；beam.q 为均布载荷(N/m, 沿 -y)
  const n1 = world.nodes[beam.n1], n2 = world.nodes[beam.n2];
  const p1 = n1.p, p2 = n2.p;
  const L = v3.dist(p1, p2);
  const { kg } = beamElemGlobal(p1, p2, beam);
  // 自由度：节点2的6个；节点1固定
  const free = [6, 7, 8, 9, 10, 11];
  const F = new Array(12).fill(0);
  const l2 = loads[beam.n2] || [0, 0, 0];
  F[6] = l2[0]; F[7] = l2[1]; F[8] = l2[2];
  if (beam.q) { // 均布载荷 p=-q 的一致节点载荷（平面 dofs [w1,θ1,w2,θ2]=[1,5,7,11]）
    const p = -beam.q;
    F[1] += p * L / 2; F[5] += p * L * L / 12;
    F[7] += p * L / 2; F[11] += -p * L * L / 12;
  }
  const K = free.map(i => free.map(j => kg[i][j]));
  const b = free.map(i => F[i]);
  const u = solveLinear(K, b);
  return { disp: u, L };
}

// ---------- 非线性时域动力（半隐式 Euler，集中质量） ----------
export function solveTimeDomain(world, { T = 20, dt = 0.005, damp = 0 } = {}) {
  for (const line of world.lines) initLine(world, line);
  const nSteps = Math.floor(T / dt);
  const hist = [];
  let t = 0;
  // 刚体-缆耦合：附着节点（line.attach={body,end,offset}）位姿跟随刚体
  const attachNodes = [];
  world.lines.forEach((line, li) => {
    if (!line.attach) return;
    const id = line.attach.end === 'first' ? line.nodeIds[0] : line.nodeIds[line.nodeIds.length - 1];
    attachNodes.push({ line, li, id });
  });
  const syncAttach = () => {
    for (const a of attachNodes) {
      const b = world.bodies[a.line.attach.body];
      const R = b.rot, off = a.line.attach.offset;
      const r = [R[0]*off[0]+R[1]*off[1]+R[2]*off[2], R[3]*off[0]+R[4]*off[1]+R[5]*off[2], R[6]*off[0]+R[7]*off[1]+R[8]*off[2]];
      const n = world.nodes[a.id];
      n.p = v3.add(b.pos, r);
      n.v = v3.add(b.vel, v3.cross(b.angVel, r));
      n._attachR = r;
    }
  };
  syncAttach();
  for (let s = 0; s <= nSteps; s++) {
    syncAttach();
    const forces = world.nodes.map(() => [0, 0, 0]);
    for (const line of world.lines) {
      lineInternalForces(world, line, forces);
      lineExternalForces(world, line, t, forces, true);
    }
    // 附着节点反力回传到刚体（力+力矩）
    for (const a of attachNodes) {
      const b = world.bodies[a.line.attach.body];
      const f = forces[a.id];
      b.f = v3.sub(b.f, f);
      b.mom = v3.sub(b.mom, v3.cross(world.nodes[a.id]._attachR || [0,0,0], f));
    }
    if (damp > 0) for (const n of world.nodes)
      if (!n.fixed) forces[n.id] = v3.sub(forces[n.id], v3.scale(n.v, damp * n.m));
    for (const body of world.bodies) {
      const h = hydrostaticForce(body, world.env);
      body._hydF = h.F; body._hydM = h.M; body._dispV = h.V;
      body.f = v3.add(body.f, v3.scale(world.gravity, body.mass));
      // 规则波 Froude-Krylov 垂向激励（水线面近似）
      if (world.env.wave.H > 0 && body.mesh) {
        const Aw = waterplaneArea(body, world.env);
        const eta = airyWave(world.env, body.pos[0], world.env.seaLevel, body.pos[2], t).eta;
        body.f = v3.add(body.f, [0, world.env.rho * world.env.g * Aw * eta, 0]);
        body._eta = eta; body._Aw = Aw;
      }
      // 线性辐射阻尼（可选，body.cDamp）
      if (body.cDamp) body.f = v3.sub(body.f, v3.scale(body.vel, body.cDamp));
      // 风载：F=½ρ_air·Cd·A·U²，作用于质心上方 windZ 处（产生倾覆力矩）
      if (world.env.wind.speed > 0 && body.windArea) {
        const Fw = 0.5 * 1.225 * (body.windCd || 1) * body.windArea * world.env.wind.speed ** 2;
        const dir = [Math.cos(world.env.wind.dir), 0, Math.sin(world.env.wind.dir)];
        const F = v3.scale(dir, Fw);
        body.f = v3.add(body.f, F);
        body.mom = v3.add(body.mom, v3.cross([0, body.windZ || 0, 0], F));
      }
    }
    // 积分
    for (const n of world.nodes) {
      if (n.fixed) continue;
      let mEff = n.m;
      if (n._waveA) mEff += world.env.rho * n._ca * n._area * n._half; // 附加质量
      const a = v3.scale(forces[n.id], 1 / mEff);
      if (n._waveA) { // 流体加速度项
        const fa = v3.scale(n._waveA, world.env.rho * (1 + n._ca) * n._area * n._half / mEff);
        n.v = v3.add(n.v, v3.scale(v3.add(a, fa), dt));
      } else n.v = v3.add(n.v, v3.scale(a, dt));
      n.p = v3.add(n.p, v3.scale(n.v, dt));
    }
    for (const b of world.bodies) {
      const a = v3.scale(v3.add(b.f, b._hydF || [0, 0, 0]), 1 / b.mass);
      b.vel = v3.add(b.vel, v3.scale(a, dt));
      b.pos = v3.add(b.pos, v3.scale(b.vel, dt));
      if (b.angDamp) b.mom = v3.sub(b.mom, v3.scale(b.angVel, b.angDamp)); // 角阻尼
      const I = b.inertia;
      const Mtot = v3.add(b.mom, b._hydM || [0, 0, 0]);
      const am = [Mtot[0] / (I[0] || 1), Mtot[1] / (I[1] || 1), Mtot[2] / (I[2] || 1)];
      b.angVel = v3.add(b.angVel, v3.scale(am, dt));
      const w = b.angVel, R = b.rot;
      const W = [0, -w[2], w[1], w[2], 0, -w[0], -w[1], w[0], 0];
      const dR = W.map((wv, i) => wv * R[Math.floor(i / 3) * 3 + (i % 3)] * 0);
      // dR/dt = [w]x R
      const wx = [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        b.rot[i * 3 + j] += dt * (wx[i][0] * R[j] + wx[i][1] * R[3 + j] + wx[i][2] * R[6 + j]);
      b.f = [0, 0, 0]; b.mom = [0, 0, 0];
    }
    if (s % Math.max(1, Math.floor(nSteps / 400)) === 0) {
      hist.push({
        t, nodes: world.nodes.map(n => [...n.p]),
        bodies: world.bodies.map(b => ({ pos: [...b.pos], rot: [...b.rot], V: b._dispV || 0 })),
      });
    }
    t += dt;
  }
  return hist;
}

// ---------- 线性频域：数值水静力刚度 → 固有频率 ----------
export function freqDomain(world, body) {
  const env = world.env;
  const pose0 = { pos: [...body.pos], rot: [...body.rot] };
  const dofs = ['surge', 'sway', 'heave', 'roll', 'pitch', 'yaw'];
  const genIdx = [0, 2, 1, 3, 5, 4]; // 广义力 [Fx,Fz,Fy,Mx,Mz,My]
  const C = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const eps = [0.05, 0.05, 0.05, 0.01, 0.01, 0.01];
  // 基线广义力（平衡点可能有常值偏置，需扣除）
  const h0 = hydrostaticForce(body, env);
  const F0 = v3.add(h0.F, v3.scale(world.gravity, body.mass));
  const gen0 = [...F0, ...h0.M];
  for (let j = 0; j < 6; j++) {
    const save = { pos: [...body.pos], rot: [...body.rot] };
    if (j === 0) body.pos[0] += eps[j];
    else if (j === 1) body.pos[2] += eps[j];
    else if (j === 2) body.pos[1] += eps[j];
    else {
      const axis = j === 3 ? [1, 0, 0] : j === 4 ? [0, 0, 1] : [0, 1, 0];
      body.rot = m3.mul(m3.rotAxis(axis, eps[j]), body.rot);
    }
    const h = hydrostaticForce(body, env);
    const F = v3.add(h.F, v3.scale(world.gravity, body.mass)); // 浮力 + 重力
    const genFull = [...F, ...h.M];
    for (let i = 0; i < 6; i++) C[i][j] = -(genFull[genIdx[i]] - gen0[genIdx[i]]) / eps[j];
    body.pos = save.pos; body.rot = save.rot;
  }
  body.pos = pose0.pos; body.rot = pose0.rot;
  // 固有频率 ωn = sqrt(C_ii / M_ii)（对角近似）
  const M = [body.mass, body.mass, body.mass, body.inertia[0], body.inertia[2], body.inertia[1]];
  const modes = dofs.map((d, i) => {
    const k = C[i][i], m = M[i];
    if (k <= 0 || m <= 0) return { dof: d, wn: 0, T: Infinity, K: k };
    const wn = Math.sqrt(k / m);
    return { dof: d, wn, T: 2 * Math.PI / wn, K: k };
  });
  return { C, modes };
}

// 数值水线面面积：dV/dz 有限差分
export function waterplaneArea(body, env) {
  if (!body.mesh) return 0;
  const eps = 0.02;
  const save = [...body.pos];
  body.pos[1] += eps;
  const V1 = hydrostaticForce(body, env).V;
  body.pos[1] = save[1] - eps;
  const V0 = hydrostaticForce(body, env).V;
  body.pos[1] = save[1];
  return Math.abs(V1 - V0) / (2 * eps);
}
