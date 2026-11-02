// core/render_scene.js — turn a Model + snapshot into a plain renderable scene description.
// Used by the browser (three.js) and by the Node software rasterizer (screenshots).
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
      });
    }
  } else {
    for (const l of model.lines) scene.lines.push({ name: l.name, pts: l.pos.map(p => [...p]), T: Array.from(l.segT), d: l.d });
    for (const b of model.bodies) scene.bodies.push({ name: b.name, type: b.type, pos: b.worldOrigin(), rot: b.rotVec(), L: b.L, B: b.B, T: b.hydro?.T ?? b.T_eq, Awp: b.hydro?.Awp, hydro: b.hydro?.kind });
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
