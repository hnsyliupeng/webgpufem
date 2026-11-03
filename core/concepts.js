// core/concepts.js — clean-room implementation of DAVE's core concepts & terminology
// (DAVE docs "Scene and nodes" / node property reference):
//   * UNITS: DAVE works in m (length), mT (mass), kN (force), kN/m & kN (stiffness), degrees (angles)
//   * NODE TYPES: the DAVE node/class registry (Axis, Point/Poi, Frame, RigidBody, Cable, Beam,
//     LC6d, Connector2d, Force, HydSpring, Buoyancy, Visual, Tank, BallastSystem, ContactBall,
//     GeometricContact, Circle, Shackle, Sling, SPMT, WindOrCurrentArea, WaveInteraction, ...)
//   * FRAMES: a node with a parent has position/rotation expressed RELATIVE to the parent;
//     world transform = parent world transform ∘ local transform (forward kinematics)
//   * ROTATION VECTOR: rotation = axis * angle, angle in degrees; tilt_x/tilt_y/heading are
//     derived from the unit local axes: heading = atan2(u_x.y, u_x.x), tilt_x = asin(u_y.z),
//     tilt_y = -asin(u_x.z)
//   * inertia_radii: Ixx = rxx^2 * mass (diagonal inertia from radii of gyration)
import { rotVecToMat3, mat3ToRotVec, mat3Vec, mat3Mul, mat3T, v3 } from './math.js';

export const DAVE_UNITS = {
  length: 'm', mass: 'mT', force: 'kN', stiffnessLinear: 'kN/m', stiffnessAngular: 'kN',
  angle: 'deg',
  // DAVE -> SI converters
  massToSI: (t) => t * 1000,        // mT -> kg
  forceToSI: (kN) => kN * 1000,      // kN -> N
  stiffToSI: (k) => k * 1000,        // kN(/m) -> N(/m)
  angleToSI: (deg) => deg * Math.PI / 180, // deg -> rad
  // SI -> DAVE
  massFromSI: (kg) => kg / 1000,
  forceFromSI: (N) => N / 1000,
  stiffFromSI: (N) => N / 1000,
  angleFromSI: (rad) => rad * 180 / Math.PI,
};

// DAVE node/class registry (from node_prop_info.csv + docs) -> this repo's implementation
export const NODE_TYPES = [
  { dave: 'Axis', impl: 'core/scene.js SNode(Axis) + RigidBody6DOF type Frame', status: 'done' },
  { dave: 'Point / Poi', impl: 'core/scene.js SNode(Point) + attachment registry in dave_import', status: 'done' },
  { dave: 'Frame', impl: 'RigidBody6DOF type Frame (parent-chained via Hinge)', status: 'done' },
  { dave: 'RigidBody', impl: 'core/vessel.js RigidBody6DOF (mass, cog, inertia_radii, footprint)', status: 'done' },
  { dave: 'Cable', impl: 'core/line.js Line (lumped-mass FEM, catenary)', status: 'done' },
  { dave: 'LinearBeam / Beam', impl: 'core/elements.js Beam', status: 'done' },
  { dave: 'LC6d', impl: 'core/elements.js LinCon6 (stiffness kN/m -> N/m)', status: 'done' },
  { dave: 'Connector2d', impl: 'core/elements.js Connector2d', status: 'done' },
  { dave: 'Force', impl: 'core/elements.js Force', status: 'done' },
  { dave: 'HydSpring', impl: 'core/davecore.js HydSpring (waterline-referenced heave spring)', status: 'done' },
  { dave: 'Buoyancy', impl: 'elements.js BuoyancyBox / BuoyancyMesh (trimesh waterline clip)', status: 'done' },
  { dave: 'TriMeshSource', impl: 'core/mesh.js parseObj/parseStlBase64/transformMesh (trimesh.load_obj/load_file)', status: 'done' },
  { dave: 'Visual', impl: 'dave_import new_visual (mesh attached to body for 3D view)', status: 'done' },
  { dave: 'Tank', impl: 'elements.js Tank (+freeFlooding/permeability/cogWhenFull)', status: 'done' },
  { dave: 'BallastSystem', impl: 'elements.js BallastSystem (+solveForDraft)', status: 'done' },
  { dave: 'ContactBall', impl: 'elements.js ContactBall', status: 'done' },
  { dave: 'ContactMesh', impl: 'core/davecore.js ContactMesh (solid-angle inside test + penalty)', status: 'done' },
  { dave: 'GeometricContact', impl: 'elements.js Hinge (rigid pin k=1e9)', status: 'done' },
  { dave: 'Circle', impl: 'scene.js SNode(Circle); sheave contact approximated by Hinge path', status: 'partial' },
  { dave: 'Shackle', impl: 'elements.js createSling (shackle/sling rigging)', status: 'done' },
  { dave: 'Sling', impl: 'elements.js createSling', status: 'done' },
  { dave: 'SPMT', impl: 'core/davecore.js SPMT (driven transporter body)', status: 'done' },
  { dave: 'WindOrCurrentArea', impl: 'core/env.js WindField/CurrentField (Cd, area)', status: 'done' },
  { dave: 'WaveInteraction', impl: 'dave_import new_waveinteraction (recorded; dhyd not simulated)', status: 'partial' },
  { dave: 'Measurement', impl: 'core/elements.js addMeasurement', status: 'done' },
];

// ---- forward kinematics: world transform of a frame with a parent ----
// local: position [x,y,z] (m, parent-relative), rotation rotation-vector (deg, parent-relative)
// parent: { pos:[..], rot:[..rad] } world pose of the parent (or null for global)
export function frameWorld(local, parent) {
  const localR = rotVecToMat3((local.rot || [0, 0, 0]).map(d => d * Math.PI / 180));
  if (!parent) return { pos: [...(local.pos || [0, 0, 0])], R: localR };
  const pR = rotVecToMat3(parent.rot || [0, 0, 0]);
  const pos = mat3Vec(pR, local.pos || [0, 0, 0]).map((v, i) => v + parent.pos[i]);
  return { pos, R: mat3Mul(pR, localR) };
}

// ---- multi-level frame chain FK: all rotations in DEGREES (DAVE convention) ----
// frames: [{ pos:[x,y,z], rot:[rx,ry,rz] deg }, ...] ordered root -> ... -> leaf.
// Equivalent to walking the Scene DAG: T_world(node) = T_world(parent) * T_local(node).
export function frameChainWorld(frames) {
  let acc = null; // world pose of current frame: { pos, rot(rad rotvec) }
  for (const f of frames) {
    const w = frameWorld({ pos: f.pos || [0, 0, 0], rot: f.rot || [0, 0, 0] }, acc);
    acc = { pos: w.pos, rot: mat3ToRotVec(w.R) };
  }
  if (!acc) return { pos: [0, 0, 0], R: rotVecToMat3([0, 0, 0]) };
  return { pos: acc.pos, R: rotVecToMat3(acc.rot) };
}

// point expressed in frame-local coordinates -> world: p_w = frame.pos + frame.R * p_local
export function pointWorld(frame, pLocal) {
  return mat3Vec(frame.R, pLocal).map((v, i) => v + frame.pos[i]);
}

// inverse FK: given parent's world pose and a node's world pose, recover the local pose
// (position + rotation vector in DEGREES) relative to the parent.
export function worldToLocal(parentWorld, worldPose) {
  const pRt = mat3T(parentWorld.R);
  const d = worldPose.pos.map((v, i) => v - parentWorld.pos[i]);
  const posLocal = mat3Vec(pRt, d);
  const Rlocal = mat3Mul(pRt, worldPose.R);
  return { pos: posLocal, rot: mat3ToRotVec(Rlocal).map(v => v * 180 / Math.PI) };
}

// ---- rotation vector <-> tilt_x / tilt_y / heading (degrees) ----
// R maps local -> world; local x axis in world = column 0 = [R0,R3,R6], local y = [R1,R4,R7]
export function rotVecToEuler(rotVecDeg) {
  const R = rotVecToMat3(rotVecDeg.map(d => d * Math.PI / 180));
  const ux = [R[0], R[3], R[6]], uy = [R[1], R[4], R[7]];
  return {
    heading: Math.atan2(ux[1], ux[0]) * 180 / Math.PI,  // heading = atan2(u_x.y, u_x.x)
    tilt_x: Math.asin(Math.max(-1, Math.min(1, uy[2]))) * 180 / Math.PI,   // asin(u_y.z)
    tilt_y: Math.asin(Math.max(-1, Math.min(1, -ux[2]))) * 180 / Math.PI,  // asin(z of unit -x)
  };
}
export function eulerToRotVec(headingDeg, tiltXDeg, tiltYDeg) {
  // compose R = Rz(heading) * Ry(tilt_y) * Rx(tilt_x)  (DAVE convention, degrees)
  const h = headingDeg * Math.PI / 180, tx = tiltXDeg * Math.PI / 180, ty = tiltYDeg * Math.PI / 180;
  const Rx = [1, 0, 0, 0, Math.cos(tx), -Math.sin(tx), 0, Math.sin(tx), Math.cos(tx)];
  const Ry = [Math.cos(ty), 0, Math.sin(ty), 0, 1, 0, -Math.sin(ty), 0, Math.cos(ty)];
  const Rz = [Math.cos(h), -Math.sin(h), 0, Math.sin(h), Math.cos(h), 0, 0, 0, 1];
  return mat3ToRotVec(mat3Mul(Rz, mat3Mul(Ry, Rx))).map(v => v * 180 / Math.PI);
}

// inertia from radii of gyration: Ixx = rxx^2 * mass (DAVE inertia_radii)
export function inertiaFromRadii(mass, radii) { return radii.map(r => mass * r * r); }
