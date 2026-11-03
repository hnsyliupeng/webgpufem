// core/marine.js — clean-room re-implementation of DAVE's marine hydrostatics helpers
// (src/DAVE/marine.py): calculate_linearized_buoyancy_props + carene_table.
//
// A "draft" d means: the buoyancy node's parent origin sits at world z = -d, even keel.
// All linearized properties are finite differences of the exact trimesh waterline clip
// (core/mesh.js clipMeshBelowPlane), with the same deltas as DAVE:
//   delta_draft = 1e-3 m, delta_roll = 1 deg, delta_pitch = 0.3 deg.
import { clipMeshBelowPlane, meshBBox } from './mesh.js';
import { rotVecToMat3, mat3Vec } from './math.js';

const DG = Math.PI / 180;

// world-frame hydrostatics of a body-local mesh under transform w = R v + o, waterplane z=0
export function hydroAtWorld(mesh, R, o) {
  const pos = new Array(mesh.pos.length);
  for (let i = 0; i < mesh.pos.length; i++) pos[i] = mat3Vec(R, mesh.pos[i]).map((v, k) => v + o[k]);
  return clipMeshBelowPlane({ pos, tri: mesh.tri }, [0, 0, 1], 0); // {V, A, c(world)}
}

// DAVE calculate_linearized_buoyancy_props for a single buoyancy mesh at a given draft.
// Returns { displacement, cob (parent frame = world at even keel), BMT, BML, COFX, COFY,
//           Awl, kHeave, waterline }.
export function linearizedBuoyancyProps(mesh, draft, { rho = 1025, g = 9.80665, deltaDraft = 1e-3, deltaRoll = 1, deltaPitch = 0.3 } = {}) {
  const base = [0, 0, -draft];
  const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const r0 = hydroAtWorld(mesh, I, base);
  if (r0.V < 1e-9) return null;
  const V0 = r0.V, cob0 = r0.c;

  // heave delta: increase draft by deltaDraft
  const r1 = hydroAtWorld(mesh, I, [0, 0, -draft - deltaDraft]);
  const dV = r1.V - V0;
  if (Math.abs(dV) < 1e-9) return null;
  const Awl = dV / deltaDraft;
  const kHeave = Awl * rho * g;
  // center of floatation from the cob shift: x_old*V_old + COF*dV = x_new*V_new
  const COFX = (r1.c[0] * r1.V - cob0[0] * V0) / dV;
  const COFY = (r1.c[1] * r1.V - cob0[1] * V0) / dV;

  // roll about the cob (DAVE: reparent under a frame at cob, impose roll)
  const Rr = rotVecToMat3([deltaRoll * DG, 0, 0]);
  const or_ = cob0.map((c, k) => c - mat3Vec(Rr, cob0)[k]).map((v, k) => v + base[k]);
  const r2 = hydroAtWorld(mesh, Rr, or_);
  const cob2 = r2.c;
  const dMT = cob2[1] - cob0[1];
  const BMT = -dMT / Math.sin(deltaRoll * DG);

  // pitch about the cob
  const Rp = rotVecToMat3([0, deltaPitch * DG, 0]);
  const op = cob0.map((c, k) => c - mat3Vec(Rp, cob0)[k]).map((v, k) => v + base[k]);
  const r3 = hydroAtWorld(mesh, Rp, op);
  const dML = r3.c[0] - cob0[0];
  const BML = dML / Math.sin(deltaPitch * DG);

  return {
    // DAVE reports cob in the parent (body) frame; at even keel parent sits at z=-draft,
    // so parent-frame cob = world cob + [0,0,draft]
    displacement: V0, cob: [cob0[0], cob0[1], cob0[2] + draft], BMT, BML, COFX, COFY, Awl, kHeave,
    waterline: -cob0[2], displacement_kN: V0 * rho * g / 1000,
  };
}

// DAVE carene_table(scene, buoyancy_node, draft_min, draft_max, stepsize):
// rows indexed by draft with columns BM T / BM L / CoF x / CoF y / Awl / Displacement / CoB x,y,z.
export function careneTable(mesh, { draftMin = 0.25, draftMax = 9, stepsize = 0.5, rho = 1025, g = 9.80665 } = {}) {
  const drafts = [];
  for (let d = draftMin; d < draftMax - 1e-9; d += stepsize) drafts.push(d);
  drafts.push(draftMax);
  const rows = [];
  for (const d of drafts) {
    const r = linearizedBuoyancyProps(mesh, d, { rho, g });
    if (!r) continue;
    rows.push({
      'Draft [m]': d,
      'BM T [m]': r.BMT, 'BM L [m]': r.BML,
      'CoF x [m]': r.COFX, 'CoF y [m]': r.COFY,
      'Awl [m2]': r.Awl,
      'Displacement [m3]': r.displacement,
      'CoB x [m]': r.cob[0], 'CoB y [m]': r.cob[1], 'CoB z [m]': r.cob[2],
      'kHeave [kN/m]': r.kHeave / 1000, 'waterline [m]': r.waterline,
    });
  }
  return rows;
}

// mesh extends (for DAVE-style automatic draft range)
export function meshDraftRange(mesh) {
  const bb = meshBBox(mesh);
  return { deepest: -bb.max[2], shallowest: -bb.min[2] };
}
