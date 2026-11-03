// core/line.js — OrcaFlex-style lumped-mass line (有限元线)
// Discretization follows the public OrcaFlex line theory:
//  - a line is divided into model segments; nodes sit at segment ends
//  - segments are straight, massless structural elements carrying axial (EA) and torsional (GJ) action
//  - mass, weight, buoyancy, drag are lumped 50/50 to the two end nodes
//  - bending is represented by rotational springs at the nodes (EI)
import { v3 } from './math.js';
import { G } from './waves.js';
import { solveCatenary, catenaryPoint, mooringTouchdown } from './catenary.js';

let LINE_ID = 1;

export class Line {
  constructor(cfg) {
    this.id = LINE_ID++;
    this.type = 'Line';
    this.name = cfg.name || `Line${this.id}`;
    this.nSeg = cfg.nSeg ?? 40;
    this.length0 = cfg.length ?? 100;          // unstretched total length L0
    this.d = cfg.d ?? 0.1;                      // outer diameter
    this.massPerLen = cfg.massPerLen ?? 10;     // kg/m (in air)
    this.EA = cfg.EA ?? 1e8;                    // N
    this.EI = cfg.EI ?? 0;                      // N m^2 bending
    this.GJ = cfg.GJ ?? 0;
    this.Cd = cfg.Cd ?? 1.0;                    // normal drag
    this.CdAxial = cfg.CdAxial ?? 0.05;
    this.Ca = cfg.Ca ?? 1.0;                    // added mass coeff (normal)
    this.Cm = cfg.Cm ?? 2.0;
    this.allowCompression = cfg.allowCompression ?? false;
    this.rho = cfg.rho ?? 1025;
    this.bendDamp = cfg.bendDamp ?? 0;          // rotational damping
    this.axialDamp = cfg.axialDamp ?? 0;        // N s/m per segment
    this.endA = cfg.endA || { type: 'fixed', pos: [0, 0, 0] };  // top / A end
    this.endB = cfg.endB || { type: 'fixed', pos: [50, 0, -10] };
    this.seabed = cfg.seabed ?? null;
    this.wave = cfg.wave ?? null;
    this.current = cfg.current ?? null;
    this.fixedEnds = cfg.fixedEnds ?? { A: true, B: true };
    this.initShape = cfg.initShape || 'straight';
    this.buoyant = cfg.buoyant !== false; // false = in-air (no buoyancy/drag/added mass)
    this.relaxCompression = false;        // during Newton statics: keep tension linear

    this.pos = []; this.vel = []; this.acc = []; this.F = []; this.mEff = [];
    this.segT = new Float64Array(this.nSeg);
    this.reactionA = [0, 0, 0]; this.reactionB = [0, 0, 0];
    this._alloc(cfg.endA.pos || [0, 0, 0], cfg.endB.pos || [0, 0, 0]);
  }

  _alloc(pA, pB) {
    const n = this.nSeg;
    this.segL0 = this.length0 / n;
    const A = Math.PI * this.d * this.d / 4;
    this.area = A;
    this.pos = []; this.vel = []; this.acc = []; this.F = []; this.mEff = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.pos.push(v3.lerp(pA, pB, t));
      this.vel.push([0, 0, 0]);
      this.acc.push([0, 0, 0]);
      this.F.push([0, 0, 0]);
      const trib = (i === 0 || i === n) ? 0.5 : 1.0;
      this.mEff.push(this.massPerLen * this.segL0 * trib);
    }
  }

  // set total unstretched length (winch payout / recover)
  setLength0(L) {
    this.length0 = L;
    this.segL0 = L / this.nSeg;
    for (let i = 0; i <= this.nSeg; i++) {
      const trib = (i === 0 || i === this.nSeg) ? 0.5 : 1.0;
      this.mEff[i] = this.massPerLen * this.segL0 * trib + 0 * this.mEff[i];
    }
  }

  n() { return this.nSeg; }
  nodePos(i) { return this.pos[i]; }

  // world positions of the two ends (from attachments, set by the model each step)
  endPositions() {
    return [this.endA.worldPos || this.endA.pos || [0, 0, 0], this.endB.worldPos || this.endB.pos || [0, 0, 0]];
  }

  // initialize geometry: straight | sag | catenary (analytic elastic catenary in the end plane)
  init(pA, pB) {
    const n = this.nSeg;
    const span = v3.dist(pA, pB);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let p = v3.lerp(pA, pB, t);
      if (this.initShape === 'mooring' && this.seabed) {
        // analytic mooring initial shape. Node 0 = end A (fairlead/top), node n = end B (anchor).
        // Suspended catenary occupies s in [0, Ls] from the fairlead; bottom part s in [Ls, L0].
        const w0m = (this.massPerLen - this.rho * this.area) * G;
        const fairX = Math.hypot(pA[0] - pB[0], pA[1] - pB[1]);
        const dirx = fairX > 1e-9 ? [(pA[0] - pB[0]) / fairX, (pA[1] - pB[1]) / fairX] : [1, 0];
        const sol = mooringTouchdown(this.length0, w0m, this.EA, this.seabed.mu, this.seabed.depth, fairX, pA[2]);
        const td = sol.x_td; // distance from anchor to touchdown (along seabed)
        const Ls = sol.Ls;
        const tdPos = [pB[0] + dirx[0] * td, pB[1] + dirx[1] * td, -this.seabed.depth];
        for (let i = 0; i <= n; i++) {
          const sArc = this.length0 * i / n; // unstretched arc from end A (fairlead)
          if (sArc <= Ls) {
            const cp = catenaryPoint(sol.H, 0, w0m, this.EA, Ls, Ls - sArc); // from touchdown backwards
            this.pos[i] = [tdPos[0] + dirx[0] * cp.x, tdPos[1] + dirx[1] * cp.x, -this.seabed.depth + cp.z];
          } else {
            const d = sArc - Ls; // distance from touchdown towards anchor
            this.pos[i] = [tdPos[0] - dirx[0] * d, tdPos[1] - dirx[1] * d, -this.seabed.depth];
          }
          this.vel[i] = [0, 0, 0];
        }
        return;
      }
      if ((this.initShape === 'sag' || this.initShape === 'catenary') && span < this.length0) {
        if (this.initShape === 'catenary') {
          const hz = v3.norm([pB[0] - pA[0], pB[1] - pA[1], 0]);
          const hzv = v3.len(hz) < 1e-9 ? [1, 0, 0] : hz;
          const X = v3.len([pB[0] - pA[0], pB[1] - pA[1], 0]);
          const Z = pB[2] - pA[2];
          const w0 = this.buoyant ? (this.massPerLen - this.rho * this.area) * G : this.massPerLen * G;
          try {
            const sol = solveCatenary(w0 * Math.max(X, 1) / 2 + 1, -w0 * this.length0 / 2, Math.max(w0, 1e-6), this.EA, this.length0, X, Z);
            const s = this.length0 * t;
            const cp = catenaryPoint(sol.H, sol.V, Math.max(w0, 1e-6), this.EA, this.length0, s);
            p = [pA[0] + hzv[0] * cp.x, pA[1] + hzv[1] * cp.x, pA[2] + cp.z];
          } catch (e) { /* fall through to sag */ }
        }
        if (this.initShape === 'sag') {
          const c = span;
          const sagH = Math.sqrt(Math.max(3 * c * (this.length0 - c) / 8, 0));
          p = [p[0], p[1], p[2] - 4 * sagH * t * (1 - t)];
        }
      }
      this.pos[i] = p;
      this.vel[i] = [0, 0, 0];
    }
  }

  // water velocity & acceleration at a point (wave + current)
  waterVel(x, y, z, t) {
    let u = [0, 0, 0], a = [0, 0, 0];
    if (this.current) { const c = this.current.velocity(x, y, z, t); u = v3.add(u, c); }
    if (this.wave && z < this.wave.eta(x, y, t) + 0.001 && z > -1e9) {
      const k = this.wave.kin(x, y, z, t);
      u = [u[0] + k.u, u[1] + k.v, u[2] + k.w];
      a = [a[0] + k.ax, a[1] + k.ay, a[2] + k.az];
    } else if (this.wave) {
      // above surface: no wave kinematics (spray zone ignored)
    }
    return { u, a };
  }

  // compute nodal forces at time t. env: {seabed}. Returns max |F|/ (m g) residual metric.
  computeForces(t) {
    const n = this.nSeg, rho = this.rho, g = G;
    // fixed ends follow their attachments FIRST (so Jacobian sees them immediately)
    {
      const [pA, pB] = this.endPositions();
      if (this.fixedEnds.A) { this.pos[0] = [...pA]; this.vel[0] = [0, 0, 0]; }
      if (this.fixedEnds.B) { this.pos[n] = [...pB]; this.vel[n] = [0, 0, 0]; }
    }
    const depth = this.seabed ? this.seabed.depth : 0;
    const mu = this.seabed ? this.seabed.mu : 0;
    const kBed = this.seabed ? this.seabed.k : 0;
    const cBed = this.seabed ? this.seabed.c : 0;
    for (let i = 0; i <= n; i++) this.F[i] = [0, 0, 0];
    this.segT.fill(0);

    // segment directions & lengths
    const L = new Float64Array(n), U = [];
    for (let j = 0; j < n; j++) {
      const d = v3.sub(this.pos[j + 1], this.pos[j]);
      L[j] = Math.max(v3.len(d), 1e-9);
      U.push(v3.scale(d, 1 / L[j]));
    }

    // --- axial tension (segment springs, chord-based, OrcaFlex "straight segment" theory) ---
    for (let j = 0; j < n; j++) {
      const strain = (L[j] - this.segL0) / this.segL0;
      let T = this.EA * strain;
      if (!this.allowCompression && !this.relaxCompression && T < 0) T = 0;
      // axial damping
      const vrel = v3.dot(v3.sub(this.vel[j + 1], this.vel[j]), U[j]);
      T += this.axialDamp * vrel;
      this.segT[j] = T;
      this.F[j] = v3.add(this.F[j], v3.scale(U[j], T));
      this.F[j + 1] = v3.sub(this.F[j + 1], v3.scale(U[j], T));
    }

    // --- bending (rotational springs at nodes), energy-consistent ---
    // U_i = 0.5 * EI / Lbar * theta_i^2, F = -dU/dr (analytic gradient)
    if (this.EI > 0) {
      for (let i = 1; i < n; i++) {
        const ua = U[i - 1], ub = U[i];
        const La = Math.max(L[i - 1], 1e-9), Lb = Math.max(L[i], 1e-9);
        const c = Math.max(-1, Math.min(1, v3.dot(ua, ub)));
        const sth = Math.sqrt(Math.max(1 - c * c, 1e-12));
        const th = Math.atan2(sth, c);
        const Lbar = 0.5 * (La + Lb);
        const k = this.EI / Lbar * th / sth; // dU/dtheta = EI/Lbar * theta ; dtheta handled via sth
        // projectors P = I - u u^T ; gradients:
        // dtheta/dr_{i-1} = +(Pa ub)/(La sin), dtheta/dr_{i+1} = -(Pb ua)/(Lb sin), dtheta/dr_i = -sum
        const Pa_ub = v3.sub(ub, v3.scale(ua, v3.dot(ua, ub)));
        const Pb_ua = v3.sub(ua, v3.scale(ub, v3.dot(ub, ua)));
        const gA = v3.scale(Pa_ub, k / La);   // dU/dr_{i-1}
        const gB = v3.scale(Pb_ua, -k / Lb);  // dU/dr_{i+1}
        const gI = v3.sub(v3.scale(gB, -1), gA); // = -(gA+gB)? -> dU/dr_i = -(gA + gB)
        // F = -dU/dr
        this.F[i - 1] = v3.sub(this.F[i - 1], gA);
        this.F[i + 1] = v3.sub(this.F[i + 1], gB);
        this.F[i] = v3.add(this.F[i], v3.add(gA, gB));
      }
    }

    // --- per-node: weight, buoyancy, added mass, Morison (lumped from segments), seabed ---
    const A = this.area;
    for (let i = 0; i <= n; i++) {
      const p = this.pos[i];
      const trib = (i === 0 || i === n) ? 0.5 : 1.0;
      const L0 = this.segL0 * trib;
      const m = this.massPerLen * L0;
      // submerged fraction of node (node below SWL z=0 -> fully submerged, node-based)
      const fsub = (this.buoyant && p[2] < 0) ? 1 : 0;
      const Vdisp = A * L0 * fsub;
      // gravity & buoyancy
      this.F[i][2] += -m * g + rho * g * Vdisp;
      // added mass (stored separately via mEff adjustment)
      // Morison from adjacent segments
      for (const j of (i === 0 ? [0] : i === n ? [n - 1] : [i - 1, i])) {
        const wgt = i === 0 || i === n ? 0.5 : (j === i - 1 || j === i ? 0.5 : 0.5);
        const pMid = v3.scale(v3.add(this.pos[j], this.pos[j + 1]), 0.5);
        const vMid = v3.scale(v3.add(this.vel[j], this.vel[j + 1]), 0.5);
        if (!this.buoyant) continue;
        let fsubSeg = pMid[2] < 0 ? 1 : 0;
        if (!fsubSeg && this.wave) fsubSeg = pMid[2] < this.wave.eta(pMid[0], pMid[1], t) ? 1 : 0;
        if (!fsubSeg) continue;
        const wv = this.waterVel(pMid[0], pMid[1], pMid[2], t);
        const vrel = v3.sub(wv.u, vMid);
        const u = U[j];
        const vt = v3.dot(vrel, u);
        const vn = v3.sub(vrel, v3.scale(u, vt));
        const Lseg = L[j];
        const Fn = 0.5 * rho * this.Cd * this.d * Lseg * v3.len(vn);
        const Ftv = 0.5 * rho * this.CdAxial * A * Lseg * Math.abs(vt) * vt; // tangential drag vector along u
        let Fseg = v3.add(v3.scale(vn, Fn), v3.scale(u, Ftv));
        // Froude-Krylov inertia (normal component of water acceleration)
        const an = v3.sub(wv.a, v3.scale(u, v3.dot(wv.a, u)));
        Fseg = v3.add(Fseg, v3.scale(an, this.Cm * rho * A * Lseg * 0.5));
        this.F[i] = v3.add(this.F[i], Fseg);
      }
      // seabed contact
      if (this.seabed && p[2] < -depth) {
        const pen = -depth - p[2];
        const area = A * L0;
        const N = kBed * area * pen + cBed * area * Math.max(0, -this.vel[i][2]);
        this.F[i][2] += N;
        const vt = [this.vel[i][0], this.vel[i][1], 0];
        const sp = v3.len(vt);
        if (sp > 1e-9 && N > 0) {
          this.F[i][0] -= mu * N * vt[0] / sp;
          this.F[i][1] -= mu * N * vt[1] / sp;
        }
      }
    }

    // --- fix ends: store reactions, zero nodal force ---
    if (this.fixedEnds.A) { this.reactionA = v3.scale(this.F[0], -1); this.F[0] = [0, 0, 0]; }
    if (this.fixedEnds.B) { this.reactionB = v3.scale(this.F[n], -1); this.F[n] = [0, 0, 0]; }

    // residual metric: max |F| / (m g)
    let res = 0;
    for (let i = 0; i <= n; i++) {
      const m = Math.max(this.mEff[i], 1e-6);
      res = Math.max(res, v3.len(this.F[i]) / (m * g + 1e-9));
    }
    this.lastResidual = res;
    return res;
  }

  // effective mass per node (structural + added mass when submerged)
  effMass(i, t) {
    const p = this.pos[i];
    const trib = (i === 0 || i === this.nSeg) ? 0.5 : 1.0;
    const L0 = this.segL0 * trib;
    let fsub = (this.buoyant && p[2] < 0) ? 1 : 0;
    if (this.buoyant && !fsub && this.wave) fsub = p[2] < this.wave.eta(p[0], p[1], t) ? 1 : 0;
    return this.massPerLen * L0 + this.Ca * this.rho * this.area * L0 * fsub;
  }

  // semi-implicit Euler step
  step(dt, t) {
    this.computeForces(t);
    const n = this.nSeg;
    for (let i = 0; i <= n; i++) {
      if ((i === 0 && this.fixedEnds.A) || (i === n && this.fixedEnds.B)) { this.acc[i] = [0, 0, 0]; continue; }
      const m = this.effMass(i, t);
      this.acc[i] = v3.scale(this.F[i], 1 / m);
      this.vel[i] = v3.add(this.vel[i], v3.scale(this.acc[i], dt));
      this.pos[i] = v3.add(this.pos[i], v3.scale(this.vel[i], dt));
    }
  }

  // stability-limited time step
  autoDt(safety = 0.3) {
    const c = Math.sqrt(this.EA / Math.max(this.massPerLen, 1e-9)); // axial wave speed
    let dt = this.segL0 / c;
    if (this.EI > 0) {
      const m = this.massPerLen * this.segL0;
      dt = Math.min(dt, Math.sqrt(m * this.segL0 ** 3 / Math.max(this.EI, 1e-12)) * 0.5);
    }
    // gravity wave (pendulum) limit
    dt = Math.min(dt, 0.1 * 2 * Math.PI / Math.sqrt(G / Math.max(this.segL0, 0.1)));
    return Math.max(dt * safety, 1e-5);
  }

  arcLength() { let s = 0; for (let j = 0; j < this.nSeg; j++) s += v3.dist(this.pos[j], this.pos[j + 1]); return s; }
  topTension() { return this.segT[0]; }
  bottomTension() { return this.segT[this.nSeg - 1]; }
  maxTension() { return Math.max(...this.segT); }
  minTension() { return Math.min(...this.segT); }

  // range profile along line: tension vs arc length
  rangeProfile() {
    const out = []; let s = 0;
    for (let j = 0; j < this.nSeg; j++) {
      out.push({ s: s + 0.5 * v3.dist(this.pos[j], this.pos[j + 1]), T: this.segT[j] });
      s += v3.dist(this.pos[j], this.pos[j + 1]);
    }
    return out;
  }
  depthProfile() {
    const out = []; let s = 0;
    for (let j = 0; j <= this.nSeg; j++) { out.push({ s, z: this.pos[j][2] }); s += j < this.nSeg ? v3.dist(this.pos[j], this.pos[j + 1]) : 0; }
    return out;
  }
}
