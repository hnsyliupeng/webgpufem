// core/davecore.js — clean-room re-implementation of the DAVEcore capability surface.
//
// DAVEcore is DAVE's C++ backend (`import DAVEcore as DC`, held by Scene._vfc). It is a
// compiled binary, so we reproduce its *documented* function groups in pure JS:
//   1. background static/dynamics solving      -> core/solvers.js (computeStatics / runDynamics)
//   2. node DAG geometry & forward kinematics   -> core/scene.js + RigidBody6DOF world transforms
//   3. trimesh hydrostatics (displacement/cob)  -> core/mesh.js clipMeshBelowPlane + BuoyancyMesh
//   4. tank filling (cog, free_flooding, permeability) -> Tank in core/elements.js (mesh clip)
//   5. catenary & contact (Cable, ContactBall, ContactMesh, GeometricContact)
//                                               -> core/line.js + elements.js + ContactMesh below
//   6. core node factories new_* (RigidBody, Beam, Force, HydSpring, LC6d, Connector2d,
//      SPMT, WindArea/CurrentArea, SupportPoint) -> core/elements.js + core/dave_import.js
//   7. state sync (Scene.update -> _vfc.state_update: recompute all forces) -> refreshExternal
// Mesh-side operations mirror pymeshup (load/transform/slice/clip/mass properties):
//   -> core/mesh.js parseObj/parseStl/transformMesh/clipMeshBelowPlane/waterplaneProps/meshMassProps
import { rotVecToMat3, mat3Vec, mat3T, v3 } from './math.js';
import { G } from './waves.js';

// capability registry: the DAVEcore function groups and where each lives in this repo
export const DAVECORE_FEATURES = [
  { id: 'solver', group: '1. 静力/动力平衡求解 (BackgroundSolver)', impl: 'core/solvers.js: computeStatics, runDynamics, goalSeek' },
  { id: 'fk', group: '2. 节点 DAG 几何与正向运动学 (DC.Axis 图)', impl: 'core/scene.js (SNode DAG) + core/vessel.js worldOrigin/rotVec' },
  { id: 'hydrostatics', group: '3. Buoyancy 网格水线切割 → displacement/cob', impl: 'core/mesh.js clipMeshBelowPlane + elements.js BuoyancyMesh' },
  { id: 'tank', group: '4. Tank 液面切割/cog/free_flooding/permeability', impl: 'core/elements.js Tank (freeFloodedFluid, cogWhenFull)' },
  { id: 'catenary', group: '5. 悬链线与接触 (Cable/ContactBall/ContactMesh/GeometricContact)', impl: 'core/line.js + elements.js Hinge/ContactBall + davecore.js ContactMesh' },
  { id: 'nodes', group: '6. 核心节点工厂 (RigidBody/Beam/Force/HydSpring/LC6d/Connector2d/SPMT/WindArea/CurrentArea/SupportPoint)', impl: 'core/elements.js + core/env.js + davecore.js HydSpring/SPMT + dave_import.js new_*' },
  { id: 'state', group: '7. 状态同步 state_update (重算力/浮心/舱液重心)', impl: 'core/solvers.js refreshExternal/applyElements' },
  { id: 'mesh', group: 'pymeshup 网格操作 (load/transform/slice/clip/mass props)', impl: 'core/mesh.js parseObj/parseStlBase64/transformMesh/waterplaneProps/meshMassProps' },
];

// ---------- HydSpring: linear heave spring referenced to the waterline (DAVE HydSpring) ----------
// pulls the body origin toward z=0 with F_z = -K * z_world (upward when submerged)
export class HydSpring {
  constructor(cfg) {
    this.type = 'HydSpring'; this.name = cfg.name || 'HydSpring';
    this.body = cfg.body; this.K = (cfg.k ?? cfg.stiffness ?? 0); // N/m (DAVE kN/m *1000 at import)
  }
  apply() {
    const o = this.body.worldOrigin();
    const F = [0, 0, -this.K * o[2]];
    this.body.external.push({ F, point: [0, 0, 0] });
    this.lastF = F;
  }
}

// ---------- SPMT: self-propelled modular transporter (driven rigid body) ----------
export class SPMT {
  constructor(cfg) {
    this.type = 'SPMT'; this.name = cfg.name || 'SPMT';
    this.body = cfg.body;
    this.driveForce = cfg.drive ?? [0, 0, 0]; // [N] applied at body origin
  }
  apply() {
    this.body.external.push({ F: [...this.driveForce], point: [0, 0, 0] });
    this.lastF = [...this.driveForce];
  }
}

// ---------- ContactMesh: penalty contact between a moving mesh and a static mesh ----------
// for each vertex of meshA (world), test inside-meshB by solid-angle winding; on penetration
// push along the nearest (outward-oriented) triangle normal of B with F = k * depth
// signed solid angle of triangle (a,b,c) seen from p (van Oosterom–Strackee)
function solidAngle(p, a, b, c) {
  const va = v3.sub(a, p), vb = v3.sub(b, p), vc = v3.sub(c, p);
  const la = v3.len(va), lb = v3.len(vb), lc = v3.len(vc);
  const num = v3.dot(va, v3.cross(vb, vc));
  const den = la * lb * lc + v3.dot(va, vb) * lc + v3.dot(vb, vc) * la + v3.dot(vc, va) * lb;
  return 2 * Math.atan2(num, den);
}
// point-in-closed-mesh via total solid angle (|sum| = 4π inside) — robust, no ray degeneracies
function pointInMesh(p, trisOut) {
  let w = 0;
  for (const t of trisOut) w += solidAngle(p, t.a, t.b, t.c);
  return Math.abs(w) > 2 * Math.PI;
}

export class ContactMesh {
  constructor(cfg) {
    this.type = 'ContactMesh'; this.name = cfg.name || 'ContactMesh';
    this.body = cfg.body;          // moving body (mesh in body-local coords)
    this.mesh = cfg.mesh;          // body-local mesh of the moving body
    this.staticMesh = cfg.staticMesh      // world-space mesh of the obstacle
      ?? (cfg.staticBody ? { pos: cfg.staticBody.mesh.pos.map(p => mat3Vec(rotVecToMat3(cfg.staticBody.rot), p).map((v, i) => v + cfg.staticBody.pos[i])), tri: cfg.staticBody.mesh.tri } : null);
    this.k = cfg.k ?? 1e6;         // penalty N/m
    // orient all obstacle triangle normals outward (via mesh centroid) once
    const pos = this.staticMesh.pos, tris = this.staticMesh.tri;
    let C = [0, 0, 0]; for (const p of pos) { C[0] += p[0]; C[1] += p[1]; C[2] += p[2]; }
    C = C.map(v => v / pos.length);
    this.trisOut = tris.map(([i, j, k]) => {
      const a = pos[i], bb = pos[j], c = pos[k];
      let n = v3.norm(v3.cross(v3.sub(bb, a), v3.sub(c, a)));
      if (v3.dot(n, v3.sub(a, C)) < 0) n = v3.scale(n, -1);
      return { a, b: bb, c, n };
    });
  }
  apply() {
    const b = this.body;
    const R = rotVecToMat3(b.rotVec());
    const o = b.worldOrigin();
    let F = [0, 0, 0];
    for (const p of this.mesh.pos) {
      const w = mat3Vec(R, p).map((v, i) => v + o[i]);
      if (!pointInMesh(w, this.trisOut)) continue; // outside the obstacle
      // nearest triangle (any side) -> penetration depth = |dist|, push along its outward normal
      let best = null;
      for (const t of this.trisOut) {
        const dist = Math.abs(v3.dot(v3.sub(w, t.a), t.n));
        if (!best || dist < best.dist) best = { dist, n: t.n };
      }
      if (!best) continue;
      const f = this.k * best.dist;
      F = v3.add(F, v3.scale(best.n, f));
    }
    if (v3.len(F) > 0) b.external.push({ F, point: [0, 0, 0] });
    this.lastF = F;
  }
}
