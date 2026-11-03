// core/render_scene.js — turn a Model + snapshot into a plain renderable scene description.
// Used by the browser (three.js) and by the Node software rasterizer (screenshots).
import { rotVecToMat3, mat3Vec } from './math.js';

// world-space triangles of a body-local mesh under (pos, rot)
function meshTrisWorld(mesh, pos, rot) {
  const R = rotVecToMat3(rot || [0, 0, 0]);
  return mesh.tri.map(t => t.map(i => {
    const w = mat3Vec(R, mesh.pos[i]);
    return [w[0] + pos[0], w[1] + pos[1], w[2] + pos[2]];
  }));
}

// automatic framing: center on the scene content, distance from its extent
export function autoCamera(scene) {
  const pts = [];
  for (const b of scene.bodies || []) { pts.push(b.pos); if (b.meshTris) for (const t of b.meshTris) for (const p of t) pts.push(p); }
  for (const l of scene.lines || []) for (const p of l.pts) pts.push(p);
  for (const p of scene.points || []) pts.push(p.pos);
  if (!pts.length) return { pos: [120, -160, 90], target: [0, 0, -30] };
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2], 8);
  const dist = Math.max(ext * 1.12, 12);
  const d = [0.72, -1.0, 0.52];
  const n = Math.hypot(...d);
  return { pos: [c[0] + d[0] / n * dist, c[1] + d[1] / n * dist, c[2] + d[2] / n * dist], target: c };
}

export function describeScene(model, snap, opts = {}) {
  const scene = {
    camera: opts.camera || { pos: [120, -160, 90], target: [0, 0, -30] },
    depth: model.env.seabed ? model.env.seabed.depth : (opts.depth ?? 100),
    water: { level: 0, wave: model.env.waves ? model.env.waves.cfg : null, t: snap ? snap.t : 0, gridN: opts.waveGridN ?? 24 },
    lines: [],
    bodies: [],
    points: [],
    labels: [],
  };
  if (snap) {
    for (const ls of snap.lines) {
      scene.lines.push({ name: ls.name, pts: ls.pts, T: ls.T, d: model.lines.find(l => l.name === ls.name)?.d ?? 0.1 });
    }
    for (const bs of snap.bodies) {
      const b = model.bodies.find(x => x.name === bs.name);
      scene.bodies.push({
        name: bs.name, type: bs.type, pos: bs.pos, rot: bs.rot, q: bs.q,
        L: b?.L, B: b?.B, T: b?.hydro?.T ?? b?.T_eq, mass: b?.mass, Awp: b?.hydro?.Awp,
        hydro: b?.hydro?.kind,
        meshTris: b?.mesh ? meshTrisWorld(b.mesh, bs.pos, bs.rot) : null,
      });
    }
  } else {
    for (const l of model.lines) scene.lines.push({ name: l.name, pts: l.pos.map(p => [...p]), T: Array.from(l.segT), d: l.d });
    for (const b of model.bodies) scene.bodies.push({ name: b.name, type: b.type, pos: b.worldOrigin(), rot: b.rotVec(), L: b.L, B: b.B, T: b.hydro?.T ?? b.T_eq, Awp: b.hydro?.Awp, hydro: b.hydro?.kind, meshTris: b.mesh ? meshTrisWorld(b.mesh, b.worldOrigin(), b.rotVec()) : null });
  }
  // scene-graph POIs for display
  for (const n of model.scene.nodes.values()) {
    if (n.type === 'Point' || n.type === 'Poi') {
      const w = model.scene.worldPosition(n);
      scene.points.push({ name: n.name, pos: w });
    }
  }
  return scene;
}

// tension -> color (blue low -> green -> yellow -> red high)
export function tensionColor(T, Tmin, Tmax) {
  const t = Tmax > Tmin ? (T - Tmin) / (Tmax - Tmin) : 0.5;
  const c = Math.max(0, Math.min(1, t));
  // jet-like
  const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * c - 3)));
  const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * c - 2)));
  const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * c - 1)));
  return [r, g, b];
}
