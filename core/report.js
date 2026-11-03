// core/report.js — clean-room re-implementation of DAVE's node reporting
// (DAVE-notebooks "04 Reporting / Reporting node properties.ipynb"):
//   report(node)                      -> all properties
//   report(node, ['cob','displacement']) -> selected properties
//   report(node, ['position*'])       -> '*' and '?' wildcards (fnmatch semantics)
//   s.print_node_tree()               -> indented Scene DAG listing
import { refreshExternal } from './solvers.js';
import { G } from './waves.js';
import { rotVecToMat3, mat3Vec } from './math.js';

// fnmatch-style wildcard: '*' = any sequence (incl. empty), '?' = exactly one char
export function matchWildcard(pattern, name) {
  const re = new RegExp('^' + pattern.split(/(\*|\?)/).map(t =>
    t === '*' ? '.*' : t === '?' ? '.' : t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$');
  return re.test(name);
}

// net global force/moment on a body (weight + all applied elements/lines), about body origin
export function netForceMoment(model, body) {
  refreshExternal(model, 0);
  let F = [0, 0, 0], M = [0, 0, 0];
  const o = body.worldOrigin();
  const cogW = mat3Vec(rotVecToMat3(body.rotVec()), body.cog).map((v, i) => v + o[i]);
  const add = (f, p) => {
    const r = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
    F = [F[0] + f[0], F[1] + f[1], F[2] + f[2]];
    M = [M[0] + r[1] * f[2] - r[2] * f[1], M[1] + r[2] * f[0] - r[0] * f[2], M[2] + r[0] * f[1] - r[1] * f[0]];
  };
  add([0, 0, -body.mass * G], cogW); // weight at cog
  for (const e of body.external) {
    const pw = mat3Vec(rotVecToMat3(body.rotVec()), e.point).map((v, i) => v + o[i]);
    add(e.F, pw);
    if (e.moment) M = [M[0] + e.moment[0], M[1] + e.moment[1], M[2] + e.moment[2]];
  }
  return { F, M };
}

// property table for a node, mirroring DAVE's property names where applicable
export function nodeProperties(model, node) {
  const props = {};
  if (!node) return props;
  if (node.type === 'RigidBody' || node.type === 'Frame' || node.type === 'Vessel' || node.type === 'Buoy') {
    const o = node.worldOrigin();
    const r = node.rotVec();
    props.position = [...o];
    props.position_x = o[0]; props.position_y = o[1]; props.position_z = o[2];
    props.position_global_x = o[0]; props.position_global_y = o[1]; props.position_global_z = o[2];
    props.rotation = r.map(v => v / (Math.PI / 180));
    props.rotation_x = r[0] / (Math.PI / 180); props.rotation_y = r[1] / (Math.PI / 180); props.rotation_z = r[2] / (Math.PI / 180);
    props.mass = node.mass;
    props.cog = [...node.cog];
    const { F, M } = netForceMoment(model, node);
    props.force_x = F[0]; props.force_y = F[1]; props.force_z = F[2];
    props.force_global_x = F[0]; props.force_global_y = F[1]; props.force_global_z = F[2];
    props.moment = [...M];
    props.moment_x = M[0]; props.moment_y = M[1]; props.moment_z = M[2];
  } else if (node.type === 'Buoyancy') {
    // BuoyancyBox or BuoyancyMesh
    const b = node.body;
    const o = b.worldOrigin();
    const R = rotVecToMat3(b.rotVec());
    const lastV = node.lastV ?? node.V ?? 0;
    const lastCob = node.lastCob || node.cob || [0, 0, 0];
    const cobW = mat3Vec(R, lastCob).map((v, i) => v + o[i]);
    props.displacement = lastV;
    props.displacement_kN = lastV * (node.rho ?? 1025) * G / 1000;
    props.cob = [...cobW];
    props.cob_local = [...lastCob];
    props.cob_x = cobW[0]; props.cob_y = cobW[1]; props.cob_z = cobW[2];
    props.cob_global_x = cobW[0]; props.cob_global_y = cobW[1]; props.cob_global_z = cobW[2];
    props.Awl = node.lastA ?? node.A ?? 0;
    if (node.L !== undefined) { props.L = node.L; props.B = node.B; props.T = node.T; }
  } else if (node.type === 'Tank') {
    props.volume = node.V; props.fill = node.fill; props.mass = node.rho * node.V * node.fill;
    props.cog = [...node.localCog];
  } else if (node.type === 'LinCon6') {
    props.stiffness = [...node.K];
  } else if (node.type === 'BallastSystem') {
    props.tanks = node.tanks.length;
    props.weight_kN = node.tanks.reduce((a, t) => a + t.rho * t.V * t.fill * G, 0) / 1000;
  }
  return props;
}

// report(node, properties?) -> { node, type, properties: {name: value} } filtered by wildcards
export function reportNode(model, nodeRef, patterns = null) {
  const node = typeof nodeRef === 'string' ? findNode(model, nodeRef) : nodeRef;
  if (!node) throw new Error('no such node: ' + nodeRef);
  const all = nodeProperties(model, node);
  let names = Object.keys(all);
  if (patterns) {
    const pats = Array.isArray(patterns) ? patterns : [patterns];
    names = names.filter(n => pats.some(p => matchWildcard(String(p), n)));
  }
  const properties = {};
  for (const n of names) properties[n] = all[n];
  return { node: node.name, type: node.type, properties };
}

export function findNode(model, name) {
  return model.bodies.find(b => b.name === name)
    || model.elements.find(e => e.name === name)
    || (model.meta.ballastSystem && model.meta.ballastSystem.name === name ? model.meta.ballastSystem : undefined);
}

// s.print_node_tree() equivalent
const TYPE_LABEL = {
  RigidBody: 'RigidBody', Frame: 'Axis', Axis: 'Axis', Point: 'Point',
  Buoyancy: 'Buoyancy', BuoyancyBox: 'Buoyancy', BallastSystem: 'BallastSystem',
  LinCon6: 'LC6d', Spring: 'Spring', Hinge: 'GeometricContact', Force: 'Force',
  Connector2d: 'Connector2d', Tank: 'Tank', Visual: 'Visual', WaveInteraction: 'WaveInteraction1',
};

export function printNodeTree(model) {
  const scene = model.scene;
  const lines = [];
  const bodyOf = (name) => model.bodies.find(b => b.name === name);
  const sceneNodeOf = (name) => scene.nodes.get(name);
  const visualsOf = (parentName) => (model.meta.visuals || []).filter(v => v.parent === parentName);
  const labelOf = (name, fallback) => {
    const b = bodyOf(name);
    if (b) return TYPE_LABEL[b.type] || b.type;
    const sn = sceneNodeOf(name);
    if (sn) return TYPE_LABEL[sn.type] || sn.type;
    return TYPE_LABEL[fallback] || fallback;
  };
  const roots = [...scene.nodes.values()].filter(n => !n.parent);
  const printed = new Set();
  const printChildren = (node) => {
    const kids = [...node.children];
    const b = bodyOf(node.name);
    if (b) {
      for (const e of model.elements) if (e.body === b && (e.type === 'Buoyancy')) kids.push({ name: e.name, type: 'Buoyancy' });
      if (model.meta.ballastSystem && model.meta.ballastParent === b) kids.push({ name: model.meta.ballastSystem.name, type: 'BallastSystem' });
      for (const v of visualsOf(node.name)) kids.push({ name: v.name, type: v.kind === 'wave' ? 'WaveInteraction' : 'Visual' });
    }
    for (const k of kids) {
      lines.push(` |-> ${k.name} [${labelOf(k.name, k.type)}]`);
      printed.add(k.name);
    }
  };
  for (const n of roots) {
    lines.push(`${n.name} [${labelOf(n.name, n.type)}]`);
    printed.add(n.name);
    printChildren(n);
  }
  // remaining top-level elements (connectors etc.)
  for (const e of model.elements) {
    if (printed.has(e.name)) continue;
    if (e.body) continue; // attached elements already listed under their body
    lines.push(`${e.name} [${TYPE_LABEL[e.type] || e.type}]`);
    printed.add(e.name);
  }
  return lines.join('\n');
}
