// core/elements.js — DAVE-style element nodes (clean-room, API-compatible concepts from public DAVE docs):
//   Spring, Force, Beam, LinCon6 (LC6d), Hinge/GeometricContact, ContactBall, Tank, BallastSystem,
//   createSling (rigging), Measurement. Elements attach to bodies / fixed points / scene nodes and
//   inject forces into RigidBody6DOF.external (same channel as line end reactions), so Newton statics
//   and dynamics pick them up automatically via solvers.applyElements().
import { v3, rotVecToMat3 } from './math.js';
import { clipMeshBelowPlane, meshBBox } from './mesh.js';
import { G } from './waves.js';
import { Line } from './line.js';

// resolve an attachment to a world position:
//  { type:'fixed', pos:[..] } | { type:'body'|'vessel', body, localPoint:[..] } | { type:'node', model, nodeName }
export function attachWorld(att, model) {
  if (att.type === 'body' || att.type === 'vessel') return att.body.worldPoint(att.localPoint || [0, 0, 0]);
  if (att.type === 'node') { const n = model.scene.get(att.nodeName); return n ? model.scene.worldPosition(n) : att.pos || [0, 0, 0]; }
  return att.pos || [0, 0, 0];
}
function attachBody(att) { return (att.type === 'body' || att.type === 'vessel') ? att.body : null; }
// line-end kinematic flag: 'vessel'/'fixed'/'motion' ends are driven by their attachment
// (end node follows the attachment and the reaction is passed to the body); only 'free' ends are not
function fixedEndsFor(endA, endB) { return { A: endA.type !== 'free', B: endB.type !== 'free' }; }

export class Spring {
  // DAVE Spring / HydSpring: linear spring between two attachments, rest length L0, damping c.
  constructor(cfg) {
    this.type = 'Spring'; this.name = cfg.name || 'Spring';
    this.attA = cfg.attA; this.attB = cfg.attB;
    this.k = cfg.k ?? 1e5; this.c = cfg.c ?? 0; this.L0 = cfg.L0 ?? null;
  }
  apply(model, t) {
    const pA = attachWorld(this.attA, model), pB = attachWorld(this.attB, model);
    const d = v3.sub(pB, pA), L = Math.max(v3.len(d), 1e-9);
    const L0 = this.L0 ?? L;
    const dir = v3.scale(d, 1 / L);
    let F = this.k * (L - L0);
    if (this.c) {
      const vA = attachBody(this.attA)?.qd ? velAt(attachBody(this.attA), this.attA.localPoint) : [0, 0, 0];
      const vB = attachBody(this.attB)?.qd ? velAt(attachBody(this.attB), this.attB.localPoint) : [0, 0, 0];
      F += this.c * v3.dot(v3.sub(vB, vA), dir);
    }
    this.lastF = F; this.lastL = L;
    const bA = attachBody(this.attA), bB = attachBody(this.attB);
    const Fv = v3.scale(dir, F); // on A towards B when stretched
    if (bA) bA.external.push({ F: Fv, point: this.attA.localPoint || [0, 0, 0] });
    if (bB) bB.external.push({ F: v3.scale(Fv, -1), point: this.attB.localPoint || [0, 0, 0] });
  }
}
function velAt(b, local) {
  const r = v3.sub(b.worldPoint(local), b.worldOrigin());
  const w = [b.qd[3], b.qd[4], b.qd[5]];
  return v3.add([b.qd[0], b.qd[1], b.qd[2]], v3.cross(w, r));
}

export class Force {
  // DAVE Force node: constant force and/or moment applied at an attachment.
  constructor(cfg) {
    this.type = 'Force'; this.name = cfg.name || 'Force';
    this.att = cfg.att; this.F = cfg.F || [0, 0, 0]; this.moment = cfg.moment || [0, 0, 0];
  }
  apply(model) {
    const b = attachBody(this.att);
    if (b) b.external.push({ F: [...this.F], moment: [...this.moment], point: this.att.localPoint || [0, 0, 0] });
  }
}

export class Beam {
  // DAVE LinearBeam (2-node beam EA/EIy/EIz/GIp/L/mass) — implemented as a 2-segment lumped line
  // with axial EA and isotropic bending EI (uses EIy; torsion GIp noted but not coupled).
  // Creates the underlying Line on the model at construction.
  constructor(model, cfg) {
    this.type = 'Beam'; this.name = cfg.name || 'Beam';
    const L = cfg.L;
    this.line = new Line({
      name: this.name, nSeg: cfg.nSeg ?? 4, length: L,
      d: cfg.d ?? 0.05, massPerLen: (cfg.mass ?? 0) / L || 0.5, EA: cfg.EA ?? 1e9, buoyant: cfg.buoyant ?? false, // min 0.5 kg/m so statics residual floor stays sane
      EI: cfg.EIy ?? cfg.EI ?? 0, GJ: cfg.GIp ?? 0,
      endA: cfg.attA, endB: cfg.attB, initShape: 'straight',
      fixedEnds: fixedEndsFor(cfg.attA, cfg.attB),
    });
    model.addLine(this.line);
    this.attA = cfg.attA; this.attB = cfg.attB; this.L = L;
  }
  apply() {}
}

export class LinCon6 {
  // DAVE LC6d: 6-DOF linear spring-damper between two attachments.
  // K=[kt_x,kt_y,kt_z,kr_x,kr_y,kr_z] (N/m, N·m/rad), C likewise. Translation measured between the
  // two attachment points; rotation as relative rotVec difference (small-angle).
  constructor(cfg) {
    this.type = 'LinCon6'; this.name = cfg.name || 'LC6d';
    this.attA = cfg.attA; this.attB = cfg.attB;
    this.K = cfg.K || [0, 0, 0, 0, 0, 0]; this.C = cfg.C || [0, 0, 0, 0, 0, 0];
  }
  apply(model) {
    const pA = attachWorld(this.attA, model), pB = attachWorld(this.attB, model);
    const bA = attachBody(this.attA), bB = attachBody(this.attB);
    const dp = v3.sub(pB, pA);
    let dr = [0, 0, 0];
    if (bA && bB) dr = v3.sub(bB.rotVec(), bA.rotVec());
    if (!this.dp0) { this.dp0 = [...dp]; this.dr0 = [...dr]; } // assembled pose = zero force
    const ddp = v3.sub(dp, this.dp0), ddr = v3.sub(dr, this.dr0);
    const F = [0, 0, 0], M = [0, 0, 0];
    for (let i = 0; i < 3; i++) F[i] = -this.K[i] * ddp[i];
    for (let i = 0; i < 3; i++) M[i] = -this.K[i + 3] * ddr[i];
    this.lastF = F; this.lastM = M; this.lastDp = ddp;
    // spring pulls B back towards A: force on B = -K*(pB-pA); on A opposite
    if (bB) bB.external.push({ F: F, moment: M, point: this.attB.localPoint || [0, 0, 0] });
    if (bA) bA.external.push({ F: v3.scale(F, -1), moment: v3.scale(M, -1), point: this.attA.localPoint || [0, 0, 0] });
  }
}

export class Hinge {
  // DAVE GeometricContact "pin in hole": locks relative translation between two attachment points
  // (rigid pin), rotation free. Implemented as a stiff penalty spring (large k) — same approach as
  // seabed contact; k defaults to 1e8 N/m scaled by attached mass.
  constructor(cfg) {
    this.type = 'GeometricContact'; this.name = cfg.name || 'pin';
    this.attA = cfg.attA; this.attB = cfg.attB; this.k = cfg.k ?? 1e9; this.c = cfg.c ?? 1e4;
    this.axis = cfg.axis || null; // optional free-rotation axis (not enforced; hinge = translation lock)
  }
  apply(model) {
    const pA = attachWorld(this.attA, model), pB = attachWorld(this.attB, model);
    const d = v3.sub(pB, pA); // pin error
    const bA = attachBody(this.attA), bB = attachBody(this.attB);
    const k = this.k;
    const F = v3.scale(d, -k); // force on B towards A
    let Fd = 0;
    if (this.c) {
      const vA = bA ? velAt(bA, this.attA.localPoint) : [0, 0, 0];
      const vB = bB ? velAt(bB, this.attB.localPoint) : [0, 0, 0];
      Fd = -this.c * v3.dot(v3.sub(vB, vA), v3.len(d) > 1e-9 ? v3.scale(d, 1 / v3.len(d)) : [0, 0, 0]);
    }
    const Fv = v3.add(F, v3.scale(v3.len(d) > 1e-9 ? v3.scale(d, 1 / v3.len(d)) : [0, 0, 0], Fd));
    this.lastErr = v3.len(d); this.lastF = Fv;
    if (bB) bB.external.push({ F: Fv, point: this.attB.localPoint || [0, 0, 0] });
    if (bA) bA.external.push({ F: v3.scale(Fv, -1), point: this.attA.localPoint || [0, 0, 0] });
  }
}

export class Connector2d {
  // DAVE Connector2d: stiff (2D) connector between master and slave points — translation lock.
  // Implemented as a stiff penalty link (same as Hinge); k_linear = linear stiffness.
  constructor(cfg) {
    this.type = 'Connector2d'; this.name = cfg.name || 'connector2d';
    this.attA = cfg.master; this.attB = cfg.slave;
    this.k = cfg.k_linear ?? 1e9; this.c = cfg.c ?? 0;
  }
  apply(model) {
    const pA = attachWorld(this.attA, model), pB = attachWorld(this.attB, model);
    const d = v3.sub(pB, pA);
    const bA = attachBody(this.attA), bB = attachBody(this.attB);
    const Fv = v3.scale(d, -this.k);
    this.lastErr = v3.len(d); this.lastF = Fv;
    if (bB) bB.external.push({ F: Fv, point: this.attB.localPoint || [0, 0, 0] });
    if (bA) bA.external.push({ F: v3.scale(Fv, -1), point: this.attA.localPoint || [0, 0, 0] });
  }
}

export class ContactBall {
  // DAVE ContactBall: sphere of radius r at an attachment, contacting a plane (point + unit normal).
  constructor(cfg) {
    this.type = 'ContactBall'; this.name = cfg.name || 'contact';
    this.att = cfg.att; this.r = cfg.r ?? 0.5;
    this.planePoint = cfg.planePoint || [0, 0, 0]; this.planeNormal = cfg.planeNormal || [0, 0, 1];
    this.k = cfg.k ?? 1e7; this.mu = cfg.mu ?? 0.5; this.c = cfg.c ?? 1e3;
  }
  apply(model) {
    const c = attachWorld(this.att, model);
    const n = v3.normalize(this.planeNormal);
    const pen = v3.dot(v3.sub(c, this.planePoint), n) - this.r; // <0 = penetrating
    this.lastPen = pen;
    if (pen < 0) {
      const b = attachBody(this.att);
      const Fn = -this.k * pen; // along +n
      const F = v3.scale(n, Fn);
      if (b) {
        const v = velAt(b, this.att.localPoint);
        const vt = v3.sub(v, v3.scale(n, v3.dot(v, n)));
        const Ft = v3.scale(v3.normalize(vt), -this.mu * Fn - this.c * v3.len(vt) * 0);
        b.external.push({ F: v3.add(F, v3.scale(v3.normalize(vt), -Math.min(this.mu * Fn, this.c * v3.len(vt)))), point: this.att.localPoint || [0, 0, 0] });
      }
      this.lastF = F;
    } else this.lastF = null;
  }
}

export class Tank {
  // DAVE Tank: fluid volume V (m^3), local cog, fill fraction, fluid density.
  // Adds weight at the tank cog (shifts vessel CoG → affects stability).
  constructor(cfg) {
    this.type = 'Tank'; this.name = cfg.name || 'Tank';
    this.body = cfg.body; this.localCog = cfg.cog || [0, 0, 0];
    this.V = cfg.V ?? 100; this.fill = cfg.fill ?? 1; this.rho = cfg.rho ?? 1025;
  }
  get mass() { return this.rho * this.V * this.fill; }
  apply() {
    const m = this.mass;
    this.body.external.push({ F: [0, 0, -m * G], point: [...this.localCog] });
    this.lastF = [0, 0, -m * G];
  }
}

export class BallastSystem {
  // DAVE BallastSystem: set tank fills so a box vessel reaches a target draft (and zero trim).
  // Analytic for a box: displaced volume = L*B*draft; fill fraction per tank = needed volume / total V.
  constructor(cfg) { this.type = 'BallastSystem'; this.name = cfg.name || 'Ballast'; this.tanks = cfg.tanks || []; }
  // solve fills for target draft of a box vessel with waterplane L*B at z=0
  static solveForDraft(vessel, tanks, L, B, targetDraft, rho = 1025) {
    const needVol = L * B * targetDraft; // m^3 of (sea)water displaced
    // weight balance: vessel mass + sum(rho*V_i*fill_i) = rho * needVol
    const m0 = vessel.mass;
    let Vtot = 0; for (const t of tanks) Vtot += t.V;
    const needFluidMass = rho * needVol - m0; // kg of tank fluid
    const fill = Math.max(0, Math.min(1, needFluidMass / (rho * Vtot)));
    for (const t of tanks) t.fill = fill;
    return { fill, displaced: needVol, mass: m0 + rho * Vtot * fill };
  }
}

// DAVE rigging helper: two-leg sling from an apex point to two load points.
export function createSling(model, cfg) {
  const legs = [];
  const pts = cfg.points; // [att1, att2]
  for (let i = 0; i < pts.length; i++) {
    const l = new Line({
      name: `${cfg.name}_leg${i + 1}`, nSeg: cfg.nSeg ?? 8, length: cfg.legLength,
      d: cfg.d ?? 0.05, massPerLen: cfg.massPerLen ?? 10, EA: cfg.EA ?? 1e8, buoyant: cfg.buoyant ?? false,
      endA: cfg.apex, endB: pts[i], initShape: 'straight',
      fixedEnds: fixedEndsFor(cfg.apex, pts[i]),
    });
    model.addLine(l); legs.push(l);
  }
  return legs;
}

// DAVE Measurement: register a readout channel on the model.
export function addMeasurement(model, cfg) {
  const ch = { name: cfg.name, fn: null };
  if (cfg.kind === 'distance') {
    ch.fn = (m) => v3.dist(attachWorld(cfg.attA, m), attachWorld(cfg.attB, m));
  } else if (cfg.kind === 'force') {
    ch.fn = (m) => (cfg.element?.lastF ? v3.len(cfg.element.lastF) : 0);
  } else if (cfg.kind === 'pinError') {
    ch.fn = (m) => cfg.element?.lastErr ?? 0;
  }
  model.channels.push(ch);
  return ch;
}

// ---- DAVE Buoyancy node (box mesh) : nonlinear hydrostatics via 2D polygon clipping ----
// Cross-section (y,z) of a box B x T, origin at box center, world z of origin = heave, roll phi about x.
// Waterline at z=0. Returns submerged area A and centroid (yc, zc) in world cross-section coords.
export function submergedRect(B, T, heave, phi) {
  const c = Math.cos(phi), s = Math.sin(phi);
  // local corners (y,z), rolled about x: yw = y*c - z*s, zw = y*s + z*c + heave
  const pts = [[-B / 2, -T / 2], [B / 2, -T / 2], [B / 2, T / 2], [-B / 2, T / 2]]
    .map(([y, z]) => [y * c - z * s, y * s + z * c + heave]);
  // clip by zw <= 0 (Sutherland–Hodgman against half-plane z=0)
  let poly = pts;
  const clip = (p) => {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const ain = a[1] <= 0, bin = b[1] <= 0;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = a[1] / (a[1] - b[1]);
        out.push([a[0] + t * (b[0] - a[0]), 0]);
      }
    }
    return out;
  };
  poly = clip(poly);
  if (poly.length < 3) return { A: 0, yc: 0, zc: 0 };
  let A = 0, mx = 0, mz = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cr = a[0] * b[1] - b[0] * a[1];
    A += cr; mx += (a[0] + b[0]) * cr; mz += (a[1] + b[1]) * cr;
  }
  A /= 2; mx /= (6 * A); mz /= (6 * A);
  return { A: Math.abs(A), yc: mx, zc: mz };
}

export class BuoyancyBox {
  // DAVE "Buoyancy" node for a box mesh: injects nonlinear buoyancy force at the center of buoyancy.
  // Use with a body that has hydro=null (weight applied) and K=0 for heave/roll/pitch.
  constructor(cfg) {
    this.type = 'Buoyancy'; this.name = cfg.name || 'Buoyancy';
    this.body = cfg.body; this.L = cfg.L; this.B = cfg.B; this.T = cfg.T;
    this.rho = cfg.rho ?? 1025; this.offset = cfg.offset || [0, 0, 0]; // box center in body-local coords (DAVE trimesh offset)
  }
  apply() {
    const b = this.body;
    const c = b.worldPoint(this.offset); // world position of box center
    const phi = b.rotVec()[0];
    const { A, yc, zc } = submergedRect(this.B, this.T, c[2], phi);
    const Fz = this.rho * G * this.L * A;
    this.lastFz = Fz; this.lastA = A; this.lastCB = [yc, zc]; // world cross-section coords
    if (Fz > 0) {
      const local = worldToLocal(b, [this.offset[0], yc, zc]);
      b.external.push({ F: [0, 0, Fz], point: local });
    }
  }
}
export class BuoyancyMesh {
  // DAVE "Buoyancy" node for an arbitrary trimesh: exact clipping of the closed mesh by the
  // world waterplane (any attitude) -> displaced volume V, center of buoyancy (body-local),
  // waterplane area. Buoyancy force rho*g*V applied at the cob gives full 6DOF restoring.
  constructor(cfg) {
    this.type = 'Buoyancy'; this.name = cfg.name || 'BuoyancyMesh';
    this.body = cfg.body; this.mesh = cfg.mesh; this.rho = cfg.rho ?? 1025;
    this.meshIsMesh = true;
    const bb = meshBBox(cfg.mesh);
    this.L = bb.size[0]; this.B = bb.size[1]; this.T = bb.size[2]; // bbox (compat/reporting)
    this.offset = bb.center;
    this.lastV = 0; this.lastA = 0; this.lastCob = null;
  }
  apply() {
    const b = this.body;
    const R = rotVecToMat3(b.rotVec());
    const o = b.worldOrigin();
    // world waterplane z=0 expressed in body frame: w = o + R p, w_z = o_z + (R p)_z,
    // submerged <=> (third row of R)·p <= -o_z
    const n = [R[6], R[7], R[8]];
    const r = clipMeshBelowPlane(this.mesh, n, -o[2]);
    this.lastV = r.V; this.lastA = r.A; this.lastCob = r.c;
    if (r.V > 1e-9) {
      const Fz = this.rho * G * r.V;
      b.external.push({ F: [0, 0, Fz], point: [...r.c] });
    }
  }
}

function worldToLocal(b, w) {
  // inverse of worldPoint: local = R^T (w - origin)
  const o = b.worldOrigin();
  const d = v3.sub(w, o);
  const Rm = rotVecToMat3(b.rotVec()); // row-major; transpose for inverse
  return [Rm[0] * d[0] + Rm[3] * d[1] + Rm[6] * d[2], Rm[1] * d[0] + Rm[4] * d[1] + Rm[7] * d[2], Rm[2] * d[0] + Rm[5] * d[1] + Rm[8] * d[2]];
}
