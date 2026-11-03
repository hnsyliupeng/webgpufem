// core/vessel.js — 6DOF rigid body (vessel / buoy) with linear hydrostatics,
// Froude-Krylov wave excitation on a box hull, wind & current loads, line coupling.
// Small-to-moderate angle linear model: q = [surge, sway, heave, roll, pitch, yaw].
import { v3, eulerToMat3, rotVecToMat3, mat3Vec, mat3Mul } from './math.js';
import { G, waveNumber } from './waves.js';

let BODY_ID = 1;

export class RigidBody6DOF {
  constructor(cfg) {
    this.id = BODY_ID++;
    this.type = cfg.type || 'Vessel';
    this.name = cfg.name || `Body${this.id}`;
    this.mass = cfg.mass;
    this.cog = cfg.cog || [0, 0, 0];          // local, relative to body origin (reference point)
    this.inertia = cfg.inertia || [1e6, 1e6, 1e6]; // Ixx Iyy Izz about cog
    this.pos = cfg.pos ? [...cfg.pos] : [0, 0, 0];   // world position of body origin (equilibrium)
    this.rot = cfg.rot ? [...cfg.rot] : [0, 0, 0];   // rotation vector (world)
    this.q = [0, 0, 0, 0, 0, 0];               // dynamic displacement from equilibrium [x y z phi theta psi]
    this.qd = [0, 0, 0, 0, 0, 0];
    this.qdd = [0, 0, 0, 0, 0, 0];
    this.fixed = cfg.fixed || [false, false, false, false, false, false];
    this.rho = cfg.rho ?? 1025;
    // hydrostatics
    this.hydro = cfg.hydro || null; // {kind:'box', L,B,T, KG} | {kind:'buoy', V, Awp, cob}
    this.addedMass = cfg.addedMass || [0, 0, 0, 0, 0, 0]; // diag fractions handled below
    this.damping = cfg.damping || [0, 0, 0, 0, 0, 0];
    this.windArea = cfg.windArea || null;   // {A, zc, Cd}
    this.currentArea = cfg.currentArea || null; // {A, zc, Cd}
    this.wave = cfg.wave || null;
    this.current = cfg.current || null;
    this.wind = cfg.wind || null;
    this.external = []; // {F:[..], point:[local], moment:[..]} applied loads (e.g. from lines)
    this._buildHydro();
  }

  _buildHydro() {
    const rho = this.rho, g = G;
    if (this.hydro?.kind === 'box') {
      const { L, B, T } = this.hydro;
      this.L = L; this.B = B; this.T = T;
      const V = L * B * T;
      this.displacement = V;
      const Aw = L * B;
      const KB = T / 2;
      const BMT = (L * B ** 3 / 12) / V; // Iwp_transverse / V = B^2/(12T)
      const BML = (L ** 3 * B / 12) / V;
      const KG = this.hydro.KG ?? this.cog[2];
      this.KG = KG;
      this.GMT = KB + BMT - KG;
      this.GML = KB + BML - KG;
      this.K = [0, 0, rho * g * Aw, rho * g * V * this.GMT, rho * g * V * this.GML, rho * g * (L * B ** 3 + L ** 3 * B) / 12];
      // equilibrium draft from mass (for display / GZ): T_eq solves rho g L B T = m g
      this.T_eq = this.mass / (rho * L * B);
    } else if (this.hydro?.kind === 'buoy') {
      const { V, Awp } = this.hydro;
      this.displacement = V;
      this.K = [0, 0, rho * g * Awp, rho * g * V * (this.hydro.GM ?? 0.5), rho * g * V * (this.hydro.GM ?? 0.5), 0];
      this.T_eq = null;
    } else {
      this.K = this.hydro?.K || [0, 0, 0, 0, 0, 0];
      this.displacement = this.hydro?.V || 0;
    }
    // default added mass: 50% of displaced mass in heave, 30% surge/sway, small rot
    const m = this.mass;
    this.Ma = [
      (this.addedMass[0] ?? 0.2) * m, (this.addedMass[1] ?? 0.2) * m, (this.addedMass[2] ?? 0.5) * m,
      (this.addedMass[3] ?? 0.2) * this.inertia[0], (this.addedMass[4] ?? 0.2) * this.inertia[1], (this.addedMass[5] ?? 0.2) * this.inertia[2],
    ];
    this.M = this.Ma.map((a, i) => a + (i < 3 ? m : this.inertia[i - 3]));
  }

  // world transform of a local point
  worldPoint(local) {
    const R = rotVecToMat3(this.rotVec());
    const p = mat3Vec(R, local);
    const w = this.worldOrigin();
    return v3.add(w, p);
  }
  worldOrigin() { return v3.add(this.pos, [this.q[0], this.q[1], this.q[2]]); }
  rotVec() {
    // combine equilibrium rot + small dynamic angles (roll,pitch,yaw ZYX)
    const R0 = rotVecToMat3(this.rot);
    const Rd = eulerToMat3(this.q[3], this.q[4], this.q[5]);
    const R = mat3Mul(R0, Rd);
    const th = Math.acos(Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2)));
    if (th < 1e-12) return [0, 0, 0];
    const s = 2 * Math.sin(th);
    return [(R[7] - R[5]) / s * th, (R[2] - R[6]) / s * th, (R[3] - R[1]) / s * th];
  }

  // wave excitation: Froude-Krylov on box hull, or point-buoy heave force for buoys
  waveForceBox(t) {
    if (!this.wave || !this.hydro) return [0, 0, 0, 0, 0, 0];
    const w = this.wave, rho = this.rho, g = G;
    const o = this.worldOrigin();
    if (this.hydro.kind === 'buoy') {
      const eta = w.eta(o[0], o[1], t);
      const Fz = rho * g * this.hydro.Awp * eta;
      return [0, 0, Fz, 0, 0, 0];
    }
    if (this.hydro.kind !== 'box') return [0, 0, 0, 0, 0, 0];
    if (!w.comps) { const rf0 = w.rampFactor(t); return this._waveForceRegular(w.w, w.amp, w.dir, w.h, t, rho, g, 0).map(x => x * rf0); }
    let F = [0, 0, 0, 0, 0, 0];
    for (const c of w.comps) {
      const f = this._waveForceRegular(c.w, c.a, c.dir, w.h, t, rho, g, c.phase);
      for (let i = 0; i < 6; i++) F[i] += f[i];
    }
    const rf = w.rampFactor(t);
    return F.map(x => x * rf);
  }
  _waveForceRegular(om, amp, beta, h, t, rho, g, phase = 0) {
    const { L, B, T } = this;
    const k = waveNumber(om, h);
    const kx = k * Math.cos(beta), ky = k * Math.sin(beta);
    const o = this.worldOrigin();
    const sx = L / 2, sy = B / 2;
    const ch = (z) => h > 0 ? Math.cosh(k * (z + h)) / Math.cosh(k * h) : Math.exp(k * z);
    const phB = kx * o[0] + ky * o[1] - om * t + phase;
    // heave: integrate dynamic pressure over bottom (z = -T)
    const pB = rho * g * amp * ch(-T);
    const Ax = Math.abs(kx) < 1e-9 ? L : 2 * Math.sin(kx * sx) / kx;
    const Ay = Math.abs(ky) < 1e-9 ? B : 2 * Math.sin(ky * sy) / ky;
    const Fz = pB * Ax * Ay * Math.cos(phB);
    // surge/sway: integrate pressure difference over the vertical end/side faces
    const intZ = h > 0 ? (Math.sinh(k * h) - Math.sinh(k * (h - T))) / (k * Math.cosh(k * h)) : (1 - Math.exp(-k * T)) / k;
    const pF = rho * g * amp;
    const A = kx * o[0] + ky * o[1] - om * t + phase;
    const Fx = -2 * B * pF * intZ * Math.sin(kx * sx) * Math.sin(A);
    const Fy = -2 * L * pF * intZ * Math.sin(ky * sy) * Math.sin(A);
    // pitch moment: ∫ p (x - ox) dA over bottom
    const Mx_pitch = Math.abs(kx) < 1e-9 ? 0 : pB * B * (2 / (kx * kx)) * (Math.sin(kx * sx) - kx * sx * Math.cos(kx * sx)) * Math.cos(phB);
    return [Fx, Fy, Fz, 0, Mx_pitch, 0];
  }

  windForce(t) {
    if (!this.wind || !this.windArea) return [0, 0, 0, 0, 0, 0];
    const o = this.worldOrigin();
    const zc = o[2] + this.windArea.zc;
    const wv = this.wind.velocity(zc, t);
    const vb = [this.qd[0], this.qd[1], 0];
    const vr = v3.sub(wv, vb);
    const F = this.wind.force(this.windArea.A, zc, vr);
    const r = [0, 0, this.windArea.zc];
    const M = v3.cross(r, F);
    return [F[0], F[1], 0, 0, M[1], M[0] * 0 + 0];
  }

  currentForce(t) {
    if (!this.current || !this.currentArea) return [0, 0, 0, 0, 0, 0];
    const o = this.worldOrigin();
    const cv = this.current.velocity(o[0], o[1], -this.currentArea.zc, t);
    const vb = [this.qd[0], this.qd[1], 0];
    const vr = v3.sub(cv, vb);
    const s = v3.len(vr);
    const F = [0.5 * this.rho * this.currentArea.Cd * this.currentArea.A * s * vr[0], 0.5 * this.rho * this.currentArea.Cd * this.currentArea.A * s * vr[1], 0];
    const r = [0, 0, -this.currentArea.zc];
    const M = v3.cross(r, F);
    return [F[0], F[1], 0, M[1] * 0, M[1], 0];
  }

  // total generalized force at time t
  generalizedForce(t) {
    let F = [0, 0, 0, 0, 0, 0];
    // hydrostatic restoring: -K q (gravity & mean buoyancy cancel at equilibrium)
    for (let i = 0; i < 6; i++) F[i] -= this.K[i] * this.q[i];
    // body in air (no hydrostatics): plain gravity
    if (!this.hydro || this.hydro.kind === 'air') F[2] -= this.mass * G;
    // wave
    const fw = this.waveForceBox(t);
    for (let i = 0; i < 6; i++) F[i] += fw[i];
    // wind / current
    for (const f of [this.windForce(t), this.currentForce(t)]) for (let i = 0; i < 6; i++) F[i] += f[i];
    // external (line end forces etc.)
    const cogW = this.worldPoint(this.cog);
    for (const e of this.external) {
      const pW = e.point ? this.worldPoint(e.point) : cogW;
      const r = v3.sub(pW, cogW);
      const M = v3.add(v3.cross(r, e.F), e.moment || [0, 0, 0]);
      F[0] += e.F[0]; F[1] += e.F[1]; F[2] += e.F[2];
      F[3] += M[0]; F[4] += M[1]; F[5] += M[2];
    }
    this.lastForce = F;
    return F;
  }

  residual(t) {
    const F = this.generalizedForce(t);
    let r = 0;
    for (let i = 0; i < 6; i++) {
      const scale = (i < 3 ? this.mass * G : this.inertia[i - 3] * G / Math.max(this.L || 10, 1));
      if (!this.fixed[i]) r = Math.max(r, Math.abs(F[i]) / (scale + 1e-9));
    }
    return r;
  }

  step(dt, t, damp = 0) {
    const F = this.generalizedForce(t);
    for (let i = 0; i < 6; i++) {
      if (this.fixed[i]) { this.qdd[i] = 0; continue; }
      const C = this.damping[i];
      this.qdd[i] = (F[i] - C * this.qd[i]) / this.M[i];
      this.qd[i] += this.qdd[i] * dt;
      if (damp > 0) this.qd[i] *= Math.exp(-damp * dt);
      this.q[i] += this.qd[i] * dt;
    }
  }

  autoDt(safety = 0.3) {
    let wmax = 0;
    for (let i = 0; i < 6; i++) {
      if (this.fixed[i]) continue;
      const w = Math.sqrt((this.K[i] + 0) / Math.max(this.M[i], 1e-9));
      wmax = Math.max(wmax, w);
    }
    // pendulum/gravity limit
    wmax = Math.max(wmax, Math.sqrt(G / Math.max(this.L || 10, 1)));
    return wmax > 0 ? safety * 2 / wmax : 0.01;
  }
}

// ---- static GZ curve of a rectangular barge by numerical integration ----
// GZ(phi) at constant displacement: submerged wedge integration in 2D cross-section.
export function boxGZ(phi, L, B, T, mass, KG, rho = 1025) {
  const g = G;
  const targetVol = mass / rho; // displaced volume
  // heel about longitudinal axis through waterline center; find sinkage d such that submerged area = targetVol/L
  // cross-section: rectangle width B, submerged with center at (yc, zc), rotated by phi
  // integrate over y in [-B/2, B/2] (body-fixed): submerged depth at strip y: h(y) = d + y*tan(phi) (small angle, relative to WL)
  // solve d from ∫ max(h,0) dy = targetVol/L
  const tanp = Math.tan(phi);
  const solveD = () => {
    let lo = -B * Math.abs(tanp) / 2, hi = T + B * Math.abs(tanp) / 2 + 1;
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      let area = 0;
      const N = 400;
      for (let k = 0; k < N; k++) {
        const y = -B / 2 + B * (k + 0.5) / N;
        const h = mid + y * tanp;
        if (h > 0) area += Math.min(h, 1e9) * (B / N);
      }
      if (area * L > targetVol) hi = mid; else lo = mid;
    }
    return 0.5 * (lo + hi);
  };
  const d = solveD();
  // center of buoyancy (y_b, z_b) in body coords, WL at z=0, body origin at keel center
  const N = 800;
  let Ay = 0, A = 0, Mz = 0; // first moment about z (for y_b), about y-axis for z_b
  let zMoment = 0;
  for (let k = 0; k < N; k++) {
    const y = -B / 2 + B * (k + 0.5) / N;
    const h = Math.max(0, d + y * tanp);
    const dA = h * (B / N);
    A += dA;
    Ay += y * dA;
    // vertical centroid of strip ~ h/2 above keel? WL at z=0; body z measured from WL: strip spans z in [-d - y tanp, 0]... approx z centroid = -h/2 relative to WL
    zMoment += (-h / 2) * dA;
  }
  const yb = Ay / A, zb = zMoment / A;
  // CoG at (0, KG - T/2?) — define body origin at keel: CoG z = KG (from keel). Convert zb (from WL) to from keel: z = zb + d? approx.
  const cogZfromKeel = KG;
  const wlZfromKeel = d; // WL is d above keel
  const cogRelWL = cogZfromKeel - wlZfromKeel;
  const cobRelWL = zb;
  // GZ = horizontal distance between lines of action: for heel phi, GZ = (yb - 0)*cos(phi) + (cobZ - cogZ)*sin(phi)
  const GZ = yb * Math.cos(phi) + (cobRelWL - cogRelWL) * Math.sin(phi);
  return { GZ, d, yb, zb };
}
