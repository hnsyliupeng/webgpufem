// 模型层：节点 / Line（OrcaFlex 式集中质量缆） / Beam（12DoF 线性梁 FEM） / 刚体（DAVE 式网格浮力）
import { v3, m3 } from './math.js';

export class Node {
  constructor(p, mass = 0, fixed = false) {
    this.p = [...p]; this.v = [0, 0, 0]; this.m = mass;
    this.fixed = fixed; this.f = [0, 0, 0]; this.id = -1;
  }
}

export class Line {
  // OrcaFlex 风格集中质量线：节点集中质量，段为轴向弹簧，节点间旋转弹簧抗弯
  constructor(nodeIds, { EA = 1e8, EI = 0, GJ = 0, w = 10, d = 0.1, cd = 1.0, ca = 1.0, L0 = null, color = 0x38bdf8, compression = false } = {}) {
    this.nodeIds = nodeIds;
    this.EA = EA; this.EI = EI; this.GJ = GJ;
    this.w = w; this.d = d; this.cd = cd; this.ca = ca; this.color = color;
    this.L0 = L0; // 各段原长（缺省=初始长度）
    this.compression = compression; // true=允许受压（弹簧）
  }
}

export class Beam {
  // 经典 3D Euler-Bernoulli 梁单元（两节点各 6DoF），用于 FEM 静力验证
  constructor(n1, n2, { E = 2.1e11, G = 8.1e10, A = 0.01, Iy = 1e-5, Iz = 1e-5, J = 2e-5, color = 0xf59e0b } = {}) {
    this.n1 = n1; this.n2 = n2;
    this.E = E; this.G = G; this.A = A; this.Iy = Iy; this.Iz = Iz; this.J = J; this.color = color;
  }
}

export class Body {
  // 刚体：6DoF，网格体积分浮力（DAVE Buoyancy 思路）
  constructor({ pos = [0, 0, 0], mass = 1000, inertia = [1e5, 1e5, 1e5], mesh = null, color = 0x34d399, cog = [0, 0, 0] } = {}) {
    this.pos = [...pos]; this.rot = m3.ident();
    this.vel = [0, 0, 0]; this.angVel = [0, 0, 0];
    this.mass = mass; this.inertia = [...inertia]; this.cog = [...cog];
    this.mesh = mesh; this.color = color; this.f = [0, 0, 0]; this.mom = [0, 0, 0];
  }
}

export function boxMesh(sx, sy, sz) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const v = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
  const f = [[0,1,5],[0,5,4],[2,3,7],[2,7,6],[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,7,3],[0,4,7],[1,2,6],[1,6,5]];
  return { verts: v, faces: f };
}

export class World {
  constructor() {
    this.nodes = []; this.lines = []; this.beams = []; this.bodies = [];
    this.env = {
      rho: 1025, g: 9.81, depth: 100, seaLevel: 0,
      wave: { H: 0, T: 8, dir: 0 },        // Airy 规则波 H(m), T(s), 传播方向角(rad)
      current: { speed: 0, dir: 0, profile: 'uniform' },
      wind: { speed: 0, dir: 0 },
    };
    this.gravity = [0, -9.81, 0]; // y 轴向上
  }
  addNode(p, m, fixed) { const n = new Node(p, m, fixed); n.id = this.nodes.length; this.nodes.push(n); return n; }
  nodeMass(line, i) { return 0; }
}

// 初始化 Line 节点质量（每节点=相邻半段质量和）与原长
export function initLine(world, line) {
  const ids = line.nodeIds;
  if (!line.L0) {
    line.L0 = [];
    for (let i = 0; i < ids.length - 1; i++)
      line.L0.push(v3.dist(world.nodes[ids[i]].p, world.nodes[ids[i + 1]].p));
  }
  for (let i = 0; i < ids.length; i++) {
    const n = world.nodes[ids[i]];
    let half = 0;
    if (i > 0) half += line.L0[i - 1] / 2;
    if (i < ids.length - 1) half += line.L0[i] / 2;
    n.m = line.w * half;
  }
}
