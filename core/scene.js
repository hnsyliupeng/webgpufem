// core/scene.js — DAVE-style Scene & Node DAG (clean-room, API-compatible in spirit)
// A Scene is a collection of nodes. A node has a parent, a local position/rotation,
// and type-specific properties. World transform = compose parent chain.
import { v3, rotVecToMat3, mat3Vec, mat3Mul } from './math.js';

let NODE_ID = 1;

export class SNode {
  constructor(type, name, props = {}) {
    this.id = NODE_ID++;
    this.type = type;
    this.name = name;
    this.parent = null;          // SNode or null
    this.position = props.position || [0, 0, 0];  // local
    this.rotation = props.rotation || [0, 0, 0];  // local rotation vector
    this.props = props;
    this.children = [];
    this.dofs = props.dofs || [true, true, true, true, true, true]; // for Frame-like
    this.fixed = props.fixed || false;
  }
  toJSON() {
    return {
      id: this.id, type: this.type, name: this.name,
      parent: this.parent ? this.parent.name : null,
      position: this.position, rotation: this.rotation,
      dofs: this.dofs, fixed: this.fixed, props: this.props,
    };
  }
}

export class Scene {
  constructor(name = 'Scene') {
    this.name = name;
    this.nodes = new Map();
  }
  add(node) { this.nodes.set(node.name, node); return node; }
  get(name) { return this.nodes.get(name); }
  remove(name) {
    const n = this.nodes.get(name);
    if (!n) return;
    for (const c of [...n.children]) c.parent = null;
    if (n.parent) n.parent.children = n.parent.children.filter(c => c !== n);
    this.nodes.delete(name);
  }
  setParent(child, parent) {
    if (child.parent) child.parent.children = child.parent.children.filter(c => c !== child);
    child.parent = parent;
    if (parent) parent.children.push(child);
  }
  // factory methods mirroring DAVE's Scene.new_* API
  newFrame(name, props) { return this.add(new SNode('Frame', name, props)); }
  newAxis(name, props) { return this.add(new SNode('Axis', name, props)); }
  newPoint(name, props) { return this.add(new SNode('Point', name, props)); }
  newPoi(name, props) { return this.add(new SNode('Poi', name, props)); }
  newRigidBody(name, props) { return this.add(new SNode('RigidBody', name, props)); }
  newCircle(name, props) { return this.add(new SNode('Circle', name, props)); }
  newCable(name, props) { return this.add(new SNode('Cable', name, props)); }
  newBeam(name, props) { return this.add(new SNode('Beam', name, props)); }
  newBuoyancy(name, props) { return this.add(new SNode('Buoyancy', name, props)); }
  newHydSpring(name, props) { return this.add(new SNode('HydSpring', name, props)); }
  newForce(name, props) { return this.add(new SNode('Force', name, props)); }
  newWinch(name, props) { return this.add(new SNode('Winch', name, props)); }
  newVisual(name, props) { return this.add(new SNode('Visual', name, props)); }
  newContactBall(name, props) { return this.add(new SNode('ContactBall', name, props)); }

  worldTransform(node) {
    let R = [1, 0, 0, 0, 1, 0, 0, 0, 1], p = [0, 0, 0];
    const chain = [];
    let n = node;
    while (n) { chain.unshift(n); n = n.parent; }
    for (const c of chain) {
      const Rl = rotVecToMat3(c.rotation);
      p = v3.add(p, mat3Vec(R, c.position));
      R = mat3Mul(R, Rl);
    }
    return { pos: p, R };
  }
  worldPosition(node) { return this.worldTransform(node).pos; }
  topoOrder() {
    const out = []; const seen = new Set();
    const visit = (n) => { if (seen.has(n.id)) return; seen.add(n.id); if (n.parent) visit(n.parent); out.push(n); };
    for (const n of this.nodes.values()) visit(n);
    return out;
  }
  toJSON() {
    return { name: this.name, nodes: [...this.nodes.values()].map(n => n.toJSON()) };
  }
  static fromJSON(data) {
    const s = new Scene(data.name);
    for (const nd of data.nodes) {
      const n = new SNode(nd.type, nd.name, nd.props);
      n.id = nd.id; n.position = nd.position; n.rotation = nd.rotation; n.dofs = nd.dofs; n.fixed = nd.fixed;
      s.nodes.set(n.name, n);
    }
    for (const nd of data.nodes) {
      const n = s.nodes.get(nd.name);
      if (nd.parent) s.setParent(n, s.nodes.get(nd.parent) || null);
    }
    return s;
  }
}

// ---------------- Model: scene + environment + analysis objects ----------------
export class Model {
  constructor(name = 'model') {
    this.name = name;
    this.scene = new Scene(name + '_scene');
    this.env = { seabed: null, waves: null, current: null, wind: null, rho: 1025, g: 9.80665 };
    this.lines = [];
    this.bodies = [];   // RigidBody6DOF
    this.winches = [];  // {line, rate, L0, tStart, tEnd}
    this.elements = []; // DAVE-style elements: Spring/Force/Beam/LinCon6/Hinge/ContactBall/Tank/... (core/elements.js)
    this.analysis = { type: 'time', tEnd: 30, dt: 0, sampleEvery: 10, staticsFirst: true };
    this.channels = []; // {name, fn(model, t) -> number}
    this.meta = {};
  }
  addLine(line) { this.lines.push(line); return line; }
  addBody(b) { this.bodies.push(b); return b; }
  addElement(e) { this.elements.push(e); return e; }
  toJSON() {
    return {
      name: this.name, env: {
        rho: this.env.rho,
        seabed: this.env.seabed ? { depth: this.env.seabed.depth, k: this.env.seabed.k, mu: this.env.seabed.mu, c: this.env.seabed.c } : null,
        wave: this.env.waves ? this.env.waves.cfg : null,
        current: this.env.current ? { speed: this.env.current.speed, dir: this.env.current.dir, profile: this.env.current.profile, h: this.env.current.h } : null,
        wind: this.env.wind ? { speed: this.env.wind.speed, dir: this.env.wind.dir, zRef: this.env.wind.zRef, alpha: this.env.wind.alpha, Cd: this.env.wind.Cd } : null,
      },
      scene: this.scene.toJSON(),
      lines: this.lines.map(l => ({
        name: l.name, nSeg: l.nSeg, length: l.length0, d: l.d, massPerLen: l.massPerLen,
        EA: l.EA, EI: l.EI, GJ: l.GJ, Cd: l.Cd, CdAxial: l.CdAxial, Ca: l.Ca, Cm: l.Cm,
        allowCompression: l.allowCompression,
        endA: { type: l.endA.type, pos: l.endA.pos, vessel: l.endA.vesselName || null, point: l.endA.localPoint || null },
        endB: { type: l.endB.type, pos: l.endB.pos, vessel: l.endB.vesselName || null, point: l.endB.localPoint || null },
        fixedEnds: l.fixedEnds, initShape: l.initShape,
      })),
      bodies: this.bodies.map(b => ({
        name: b.name, type: b.type, mass: b.mass, cog: b.cog, inertia: b.inertia,
        pos: b.pos, rot: b.rot, fixed: b.fixed, hydro: b.hydro,
        addedMass: b.addedMass, damping: b.damping, windArea: b.windArea, currentArea: b.currentArea,
      })),
      winches: this.winches.map(w => ({ line: w.line.name, rate: w.rate, L0: w.L0, tStart: w.tStart, tEnd: w.tEnd })),
      elements: this.elements.map(e => ({ type: e.type, name: e.name })),
      analysis: this.analysis,
      meta: this.meta,
    };
  }
  saveJSON() { return JSON.stringify(this.toJSON(), null, 1); }

  // ---- OrcaFlex-compatible YAML export (subset, DAVE io/orcaflex.py analogue) ----
  exportOrcaFlexYAML() {
    const L = [];
    L.push(`# Exported by WebGPUFEM (clean-room OrcaFlex-style model)`);
    L.push(`# Model: ${this.name}`);
    L.push(`General:`);
    L.push(`  simulation duration: ${this.analysis.tEnd} s`);
    L.push(`  time step: ${this.analysis.dt || 'auto'} s`);
    L.push(`Environment:`);
    if (this.env.seabed) L.push(`  Seabed: flat, depth ${this.env.seabed.depth} m, friction ${this.env.seabed.mu}`);
    if (this.env.waves) {
      const w = this.env.waves;
      if (w.cfg.kind === 'regular') L.push(`  Waves: regular Airy, H ${w.cfg.H} m, T ${w.cfg.T} s, dir ${w.cfg.dir} rad`);
      else L.push(`  Waves: irregular ${w.cfg.spectrum || 'JONSWAP'}, Hs ${w.cfg.Hs} m, Tp ${w.cfg.Tp} s, seed ${w.cfg.seed ?? 42}`);
    }
    if (this.env.current) L.push(`  Current: ${this.env.current.profile} profile, surface ${this.env.current.speed} m/s dir ${this.env.current.dir} rad`);
    if (this.env.wind) L.push(`  Wind: ${this.env.wind.speed} m/s at ${this.env.wind.zRef} m, dir ${this.env.wind.dir} rad`);
    let i = 0;
    for (const l of this.lines) {
      i++;
      L.push(`LineTypes:`);
      L.push(`  "${l.name}Type":`);
      L.push(`    diameter: ${l.d} m`);
      L.push(`    mass per unit length: ${l.massPerLen} kg/m`);
      L.push(`    EA: ${l.EA} N`);
      if (l.EI > 0) L.push(`    EI: ${l.EI} N m^2`);
      L.push(`    Cd (normal): ${l.Cd}, Ca: ${l.Ca}, Cm: ${l.Cm}`);
      L.push(`Lines:`);
      L.push(`  "${l.name}":`);
      L.push(`    line type: "${l.name}Type"`);
      L.push(`    unstretched length: ${l.length0} m`);
      L.push(`    segments: ${l.nSeg}`);
      const a = l.endA.worldPos || l.endA.pos, b = l.endB.worldPos || l.endB.pos;
      L.push(`    end A: [${a.map(x => x.toFixed(3))}] ${l.endA.type === 'vessel' ? '(attached to ' + (l.endA.vesselName || 'vessel') + ')' : ''}`);
      L.push(`    end B: [${b.map(x => x.toFixed(3))}] ${l.endB.type === 'vessel' ? '(attached to ' + (l.endB.vesselName || 'vessel') + ')' : ''}`);
    }
    for (const b of this.bodies) {
      L.push(`Vessels:`);
      L.push(`  "${b.name}":`);
      L.push(`    mass: ${b.mass} kg, CoG: [${b.cog}]`);
      L.push(`    inertia: [${b.inertia}]`);
      if (b.hydro?.kind === 'box') L.push(`    box: L ${b.L} m, B ${b.B} m, draft ${b.hydro.T} m, KG ${b.KG} m, GM_T ${b.GMT.toFixed(3)} m, GM_L ${b.GML.toFixed(3)} m`);
      L.push(`    hydrostatic stiffness K33,K44,K55: ${b.K[2]}, ${b.K[3]}, ${b.K[4]}`);
    }
    return L.join('\n') + '\n';
  }

  // ---- DAVE-style python script export ----
  exportDavePy() {
    const L = [];
    L.push(`# Auto-generated DAVE scene script (WebGPUFEM export)`);
    L.push(`from DAVE import *`);
    L.push(`s = Scene()`);
    for (const n of this.scene.topoOrder()) {
      const p = n.parent ? `'${n.parent.name}'` : 'None';
      L.push(`s.new_${n.type.toLowerCase() === 'poi' ? 'poi' : n.type.toLowerCase()}('${n.name}', parent=${p}, position=${JSON.stringify(n.position)})`);
    }
    for (const l of this.lines) {
      L.push(`s.new_cable('${l.name}', length=${l.length0}, EA=${l.EA}, connections=[...])  # nSeg=${l.nSeg}`);
    }
    return L.join('\n') + '\n';
  }
}
