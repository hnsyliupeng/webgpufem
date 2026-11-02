// core/solvers.js — statics (damped dynamic relaxation) + explicit time-domain + modal analysis
import { v3, genEigen, solveLin } from './math.js';
import { G } from './waves.js';

// Update line end attachments from vessels / winches
export function updateAttachments(model, t) {
  for (const l of model.lines) {
    for (const end of [l.endA, l.endB]) {
      if (end.type === 'vessel' && end.body) {
        end.worldPos = end.body.worldPoint(end.localPoint || [0, 0, 0]);
      } else if (end.type === 'fixed') {
        end.worldPos = end.pos;
      } else if (end.type === 'motion' && end.motion) {
        end.worldPos = end.motion(t);
      }
    }
  }
  // winches change line unstretched length
  for (const w of model.winches) {
    const l = w.line;
    if (t >= w.tStart && t <= w.tEnd) {
      l.setLength0(w.L0 + w.rate * (t - w.tStart));
    } else if (t > w.tEnd) {
      l.setLength0(w.L0 + w.rate * (w.tEnd - w.tStart));
    }
  }
}

// attach line end forces back onto bodies as external loads
export function coupleLinesToBodies(model) {
  for (const b of model.bodies) b.external = [];
  for (const l of model.lines) {
    const ends = [
      { end: l.endA, F: l.reactionA, node: 0 },
      { end: l.endB, F: l.reactionB, node: l.nSeg },
    ];
    for (const e of ends) {
      if (e.end.type === 'vessel' && e.end.body) {
        // reaction = support force ON the line node; the body feels the opposite (Newton III)
        e.end.body.external.push({ F: v3.scale(e.F, -1), point: e.end.localPoint || [0, 0, 0] });
      }
    }
  }
}

// ---- Newton-Raphson statics on the assembled free-DOF vector ----
function gatherDOFs(model) {
  const dofs = [];
  for (const l of model.lines) {
    for (let i = 0; i <= l.nSeg; i++) {
      const fixed = (i === 0 && l.fixedEnds.A) || (i === l.nSeg && l.fixedEnds.B);
      if (!fixed) for (let k = 0; k < 3; k++) dofs.push({ kind: 'line', obj: l, node: i, k });
    }
  }
  for (const b of model.bodies) for (let i = 0; i < 6; i++) if (!b.fixed[i]) dofs.push({ kind: 'body', obj: b, i });
  return dofs;
}
function getState(model, dofs) {
  return dofs.map(d => d.kind === 'line' ? d.obj.pos[d.node][d.k] : d.obj.q[d.i]);
}
function setState(model, dofs, x) {
  dofs.forEach((d, j) => { if (d.kind === 'line') d.obj.pos[d.node][d.k] = x[j]; else d.obj.q[d.i] = x[j]; });
}
function residualVector(model, t = 0) {
  updateAttachments(model, t);
  const R = [];
  for (const l of model.lines) {
    l.computeForces(t); // updates end reactions
    for (let i = 0; i <= l.nSeg; i++) {
      const fixed = (i === 0 && l.fixedEnds.A) || (i === l.nSeg && l.fixedEnds.B);
      if (!fixed) R.push(l.F[i][0], l.F[i][1], l.F[i][2]);
    }
  }
  coupleLinesToBodies(model); // fresh reactions -> bodies
  for (const b of model.bodies) {
    const F = b.generalizedForce(t);
    for (let i = 0; i < 6; i++) if (!b.fixed[i]) R.push(F[i]);
  }
  return R;
}
function residualNorm(model, R) {
  // scale by weight-like reference
  let s = 0, j = 0;
  for (const l of model.lines) {
    l.computeForces(0);
    for (let i = 0; i <= l.nSeg; i++) {
      const fixed = (i === 0 && l.fixedEnds.A) || (i === l.nSeg && l.fixedEnds.B);
      if (fixed) continue;
      const m = Math.max(l.mEff[i], 1e-6);
      for (let k = 0; k < 3; k++) { const r = R[j++] / (m * G + 1e-9); s = Math.max(s, Math.abs(r)); }
    }
  }
  for (const b of model.bodies) {
    const F = b.generalizedForce(0);
    for (let i = 0; i < 6; i++) {
      if (b.fixed[i]) continue;
      const scale = i < 3 ? b.mass * G : b.inertia[i - 3] * G / Math.max(b.L || 10, 1);
      const r = F[i] / (scale + 1e-9);
      s = Math.max(s, Math.abs(r));
    }
  }
  return s;
}

export function computeStatics(model, opts = {}) {
  const tol = opts.tol ?? 1e-7;
  const maxIter = opts.maxIter ?? 60;
  for (const l of model.lines) l.relaxCompression = true; // linear tension during Newton
  updateAttachments(model, 0);
  for (const l of model.lines) { const [a, b] = l.endPositions(); l.init(a, b); }
  const dofs = gatherDOFs(model);
  const x0 = getState(model, dofs);
  let x = [...x0];
  let R = residualVector(model, 0);
  let res = residualNorm(model, R);
  let iter = 0;
  const hist = [res];
  for (iter = 0; iter < maxIter && res > tol; iter++) {
    // numeric Jacobian (central differences)
    const n = dofs.length;
    const J = Array.from({ length: R.length }, () => new Float64Array(n));
    for (let j = 0; j < n; j++) {
      const d = dofs[j].kind === 'line' ? 1e-6 : 1e-7;
      x[j] += d; setState(model, dofs, x);
      const Rp = residualVector(model, 0);
      x[j] -= 2 * d; setState(model, dofs, x);
      const Rm = residualVector(model, 0);
      x[j] += d; setState(model, dofs, x);
      for (let i = 0; i < R.length; i++) J[i][j] = (Rp[i] - Rm[i]) / (2 * d);
    }
    const Jrows = J.map((r, i) => { const row = Array.from(r); row[i] += 1e-7 * (1 + Math.abs(row[i])); return row; });
    let dq;
    try { dq = solveLin(Jrows, R.map(v => -v)); } catch (e) { break; }
    // trust-region: limit max position increment
    const maxDq = Math.max(...dq.map((v, j) => dofs[j].kind === 'line' ? Math.abs(v) : 0));
    const lim = opts.stepLim ?? 0.25;
    if (maxDq > lim) dq = dq.map(v => v * lim / maxDq);
    // line search
    let lam = 1, resNew = res, xNew = x;
    for (let ls = 0; ls < 24; ls++) {
      xNew = x.map((v, j) => v + lam * dq[j]);
      setState(model, dofs, xNew);
      const Rn = residualVector(model, 0);
      resNew = residualNorm(model, Rn);
      if (resNew < res || lam < 1e-6) break;
      lam *= 0.5;
    }
    x = xNew; setState(model, dofs, x);
    R = residualVector(model, 0);
    res = residualNorm(model, R);
    hist.push(res);
  }
  setState(model, dofs, x);
  for (const l of model.lines) l.relaxCompression = false;
  updateAttachments(model, 0);
  coupleLinesToBodies(model);
  for (const l of model.lines) l.computeForces(0);
  for (const b of model.bodies) b.generalizedForce(0);
  return { residual: res, iterations: iter, converged: res < tol, history: hist };
}

// explicit time-domain simulation with recording
export function runDynamics(model, opts = {}) {
  const tEnd = opts.tEnd ?? model.analysis.tEnd ?? 30;
  let dt = opts.dt || model.analysis.dt || 1e9;
  for (const l of model.lines) dt = Math.min(dt, l.autoDt(opts.safety ?? 0.25));
  for (const b of model.bodies) dt = Math.min(dt, b.autoDt(opts.safety ?? 0.25));
  dt = Math.min(dt, opts.dtMax || 0.01);
  const sampleDt = opts.sampleDt ?? 0.05;
  const sampleEvery = opts.sampleEvery ?? Math.max(1, Math.round(sampleDt / dt));
  updateAttachments(model, 0);
  if (opts.init !== false) for (const l of model.lines) { const [a, b] = l.endPositions(); l.init(a, b); }
  if (opts.staticsFirst !== false && model.analysis.staticsFirst !== false) {
    const st = computeStatics(model, { tol: 1e-6 });
    opts.onStatics && opts.onStatics(st);
  }
  const series = { t: [] };
  for (const ch of model.channels) series[ch.name] = [];
  const snapshots = []; // {t, lines:[{name, pts}], bodies:[{name, pos, rot}]}
  const snapEvery = opts.snapEvery ?? Math.max(1, Math.round((opts.snapDt ?? 0.25) / dt));
  let step = 0;
  const record = (t) => {
    series.t.push(t);
    for (const ch of model.channels) series[ch.name].push(ch.fn(model, t));
  };
  const snapshot = (t) => {
    snapshots.push({
      t,
      lines: model.lines.map(l => ({ name: l.name, pts: l.pos.map(p => [...p]), T: Array.from(l.segT) })),
      bodies: model.bodies.map(b => ({ name: b.name, type: b.type, pos: b.worldOrigin(), rot: b.rotVec(), q: [...b.q] })),
    });
  };
  record(0); snapshot(0);
  let t = 0;
  while (t < tEnd - 1e-12) {
    dt = Math.min(dt, tEnd - t);
    updateAttachments(model, t);
    coupleLinesToBodies(model);
    for (const l of model.lines) l.step(dt, t);
    for (const b of model.bodies) b.step(dt, t);
    t += dt; step++;
    if (step % sampleEvery === 0) record(t);
    if (step % snapEvery === 0) snapshot(t);
  }
  record(tEnd); snapshot(tEnd);
  return { series, snapshots, dt, steps: step, tEnd };
}

// modal analysis of free body DOFs (numeric M and K about equilibrium)
export function modalAnalysis(model) {
  const bodies = model.bodies.filter(b => b.fixed.some(f => !f));
  if (!bodies.length) return null;
  const dofs = [];
  for (const b of bodies) for (let i = 0; i < 6; i++) if (!b.fixed[i]) dofs.push({ b, i });
  const n = dofs.length;
  const q0 = bodies.map(b => [...b.q]);
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  const K = Array.from({ length: n }, () => new Array(n).fill(0));
  const d = 1e-5;
  // numeric tangent stiffness K = -dF/dq (central difference); M diagonal from body mass matrix
  for (let j = 0; j < n; j++) {
    const { b, i } = dofs[j];
    b.q[i] += d;
    const Fp = b.generalizedForce(0);
    b.q[i] -= 2 * d;
    const Fm = b.generalizedForce(0);
    b.q[i] += d;
    for (let k = 0; k < n; k++) {
      const kk = dofs[k];
      K[k][j] = -(Fp[k] - Fm[k]) / (2 * d);
      M[k][j] = (k === j) ? b.M[i] : 0;
    }
  }
  const { omega2, vectors } = genEigen(K, M);
  const modes = omega2.map((w2, i) => ({ omega: Math.sqrt(Math.max(w2, 0)), f: Math.sqrt(Math.max(w2, 0)) / (2 * Math.PI), T: w2 > 0 ? 2 * Math.PI / Math.sqrt(w2) : Infinity, vec: vectors[i], dofs: dofs.map(d => `${d.b.name}.${['surge', 'sway', 'heave', 'roll', 'pitch', 'yaw'][d.i]}`) }));
  modes.sort((a, b) => a.omega - b.omega);
  bodies.forEach((b, i) => b.q = q0[i]);
  return { modes };
}
