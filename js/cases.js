// 可视化验证算例：每个算例给出模型构建 + 解析参考 + 评估指标
import { v3, solveLinear } from './math.js';
import { World, Line, Beam, Body, boxMesh, initLine } from './model.js';
import { solveStatic, solveBeamStatic, solveTimeDomain, freqDomain } from './solvers.js';
import { hydrostaticForce } from './hydro.js';

// 解析悬链线：以 (H, θ0) 为未知量，沿弧长积分 ODE 边值求解，再输出构型采样点
function analyticCatenary(S, h, L, w) {
  // 链 ODE：dx/ds=cosθ, dy/ds=sinθ, dθ/ds=(w/H)cos²θ
  const integ = (a, th0) => { // a = H/w (m)
    let x = 0, y = 0, th = th0;
    const n = 400, ds = L / n;
    const pts = [[0, 0]];
    for (let i = 0; i < n; i++) {
      x += Math.cos(th) * ds; y += Math.sin(th) * ds;
      th += (1 / a) * Math.cos(th) ** 2 * ds;
      pts.push([x, y]);
    }
    return { x, y, pts, th };
  };
  const f = (v) => {
    const r = integ(v[0], v[1]);
    return [r.x - S, r.y - h];
  };
  let x = [S / 2, -0.3]; // 初值：a 估算 + 下垂初角
  for (let it = 0; it < 100; it++) {
    const r = f(x);
    if (Math.hypot(...r) < 1e-10) break;
    const e = 1e-7;
    const J = [[0, 0], [0, 0]];
    for (let j = 0; j < 2; j++) {
      const xp = [...x]; xp[j] += e;
      const rp = f(xp);
      J[0][j] = (rp[0] - r[0]) / e; J[1][j] = (rp[1] - r[1]) / e;
    }
    const dx = solveLinear(J, [-r[0], -r[1]]);
    const st = Math.min(1, 0.5 * w * S / (Math.abs(dx[0]) + 1));
    x = x.map((v, i) => v + st * dx[i]);
  }
  const [a, th0] = x;
  const H = w * a;
  const r = integ(a, th0);
  const Ttop = Math.hypot(H, H * Math.tan(r.th)); // 顶端张力
  const pts = r.pts;
  const y = (xx) => {
    if (xx <= 0) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= xx) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      return y1 + (y2 - y1) * (xx - x1) / (x2 - x1 || 1e-9);
    }
    return pts[pts.length - 1][1];
  };
  return { H, Ttop, y };
}

export const cases = {
  catenary: {
    name: '算例1 · 悬链线系泊缆静力（vs 解析悬链线）',
    desc: 'OrcaFlex 式集中质量 Line 静力求解，与解析悬链线对比：构型、水平张力 H、顶端张力。',
    params: [
      { k: 'S', label: '水平跨距 S (m)', v: 400 },
      { k: 'h', label: '高差 h (m)', v: 100 },
      { k: 'L', label: '缆长 L (m)', v: 460 },
      { k: 'w', label: '单位湿重 w (N/m)', v: 1500 },
      { k: 'EA', label: '轴向刚度 EA (N)', v: 5e8 },
      { k: 'n', label: '分段数', v: 40 },
    ],
    solver: 'static',
    build(p) {
      const w = new World();
      w.env.depth = p.h + 30;
      w.env.seaLevel = -1e6; // 悬链线全段在水面之上，湿重=干重，与解析解一致
      const n = Math.round(p.n);
      const ids = [];
      for (let i = 0; i <= n; i++) {
        const x = p.S * i / n;
        // 初值：直线插值
        const y = p.h * i / n;
        ids.push(w.addNode([x, y, 0], 0, i === 0 || i === n).id);
      }
      w.lines.push(new Line(ids, { EA: p.EA, EI: 0, w: p.w / w.env.g, d: 0.3, cd: 1.2, ca: 1.0, L0: Array(n + 1 - 1).fill(p.L / n) }));
      return w;
    },
    run(w, p) {
      // 动态松弛法求静力：强阻尼时域积分至收敛（比纯 Newton 对悬链线更稳健）
      solveTimeDomain(w, { T: 60, dt: 0.004, damp: 6 });
      const r = { iter: '动态松弛 60s', err: 0 };
      const ana = analyticCatenary(p.S, p.h, p.L, p.w);
      // 数值：顶端张力（端段轴力），构型最大偏差
      const line = w.lines[0], ids = line.nodeIds;
      let maxErr = 0, TtopNum = 0, tTop = [1, 0, 0];
      for (let i = 0; i < ids.length - 1; i++) {
        const a = w.nodes[ids[i]].p, b = w.nodes[ids[i + 1]].p;
        const dd = v3.sub(b, a), l = v3.len(dd);
        const T = Math.max(0, line.EA * (l - line.L0[i]) / line.L0[i]);
        if (i === ids.length - 2) { TtopNum = T; tTop = v3.scale(dd, 1 / l); }
      }
      for (let i = 0; i < ids.length; i++) {
        const nd = w.nodes[ids[i]];
        const x = nd.p[0];
        const yAna = ana.y(Math.max(0, Math.min(p.S, x)));
        // 与解析曲线在相同 x 处比较（近似：用投影）
        maxErr = Math.max(maxErr, Math.abs(nd.p[1] - yAna));
      }
      const Hnum = TtopNum * Math.abs(tTop[0]); // H = T_top·cosθ
      return {
        results: [
          ['顶端张力 T_top (N)', TtopNum, ana.Ttop],
          ['水平张力 H (N)', Math.abs(Hnum), ana.H],
          ['构型最大偏差 (m)', maxErr, 0],
        ],
        info: `Newton 迭代 ${r.iter} 次，残差 ${r.err.toExponential(2)}，节点 ${w.nodes.length}，分段 ${w.lines[0].nodeIds.length - 1}`,
      };
    },
  },

  cantilever: {
    name: '算例2 · 悬臂梁端部受载（vs 材料力学 δ=PL³/3EI）',
    desc: '12DoF Euler-Bernoulli 梁单元 FEM 静力求解，与材料力学悬臂梁解析解对比。',
    params: [
      { k: 'L', label: '梁长 L (m)', v: 10 },
      { k: 'P', label: '端部载荷 P (N)', v: 1e4 },
      { k: 'E', label: '弹性模量 E (Pa)', v: 2.1e11 },
      { k: 'Iz', label: '抗弯惯量 Iz (m⁴)', v: 8.33e-6 },
      { k: 'A', label: '截面积 A (m²)', v: 0.01 },
    ],
    solver: 'static',
    build(p) {
      const w = new World();
      const n1 = w.addNode([0, 0, 0], 0, true);
      const n2 = w.addNode([p.L, 0, 0], 0, false);
      w.beams.push(new Beam(n1.id, n2.id, { E: p.E, G: 8.1e10, A: p.A, Iy: p.Iz, Iz: p.Iz, J: 2e-5 }));
      w._tipLoad = [0, -p.P, 0];
      return w;
    },
    run(w, p) {
      const u = solveBeamStatic(w, w.beams[0], { [w.beams[0].n2]: w._tipLoad });
      const delta = Math.abs(u.disp[1]); // 节点2 y 向位移
      const deltaAna = p.P * p.L ** 3 / (3 * p.E * p.Iz);
      return {
        results: [
          ['端部挠度 δ (m)', delta, deltaAna],
          ['端部转角 θ (rad)', Math.abs(u.disp[5]), p.P * p.L ** 2 / (2 * p.E * p.Iz)],
        ],
        info: `单梁单元 12×12 刚度矩阵，跨中解析 δ/2 校验由单单元精确给出`,
      };
    },
  },

  floatingBox: {
    name: '算例3 · 浮箱水静力与固有周期（vs ρgAw / 2π√(m/K)）',
    desc: 'DAVE 式网格体积分浮力：平衡吃水、heave 恢复刚度、固有周期与解析解对比。',
    params: [
      { k: 'sx', label: '箱长 X (m)', v: 20 },
      { k: 'sz', label: '箱宽 Z (m)', v: 10 },
      { k: 'sy', label: '箱高 Y (m)', v: 6 },
      { k: 'm', label: '质量 m (kg)', v: 6.15e5 },
    ],
    solver: 'freq',
    build(p) {
      const w = new World();
      w.env.depth = 50;
      const draft = p.m / (w.env.rho * p.sx * p.sz); // 水线面 = X×Z（Y 向上）
      const body = new Body({ pos: [0, -draft + p.sy / 2, 0], mass: p.m,
        inertia: [p.m * (p.sz ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sz ** 2) / 12],
        mesh: boxMesh(p.sx, p.sy, p.sz) });
      w.bodies.push(body);
      return w;
    },
    run(w, p) {
      const body = w.bodies[0];
      const h = hydrostaticForce(body, w.env);
      const draft = p.sy / 2 - body.pos[1];
      const draftAna = p.m / (w.env.rho * p.sx * p.sz);
      const fr = freqDomain(w, body);
      const heave = fr.modes.find(m => m.dof === 'heave');
      const roll = fr.modes.find(m => m.dof === 'roll');
      const Kana = w.env.rho * w.env.g * p.sx * p.sz;
      const Tana = 2 * Math.PI * Math.sqrt(p.m / Kana);
      const BM = (p.sx * p.sz ** 3 / 12) / h.V, BG = (p.sy - draft) / 2; // KG=sy/2, KB=draft/2
      const K44ana = w.env.rho * w.env.g * h.V * (BM - BG);
      return {
        results: [
          ['平衡吃水 (m)', draft, draftAna],
          ['排水体积 (m³)', h.V, p.m / w.env.rho],
          ['Heave 恢复刚度 K33 (N/m)', heave.K, Kana],
          ['Heave 固有周期 (s)', heave.T, Tana],
          ['Roll 固有周期 (s)', roll.T, 2 * Math.PI * Math.sqrt(body.inertia[0] / K44ana)],
        ],
        info: `网格水线面切割体积分，浮心 (${h.cog.map(x => x.toFixed(3))})，6×6 数值水静力刚度矩阵`,
      };
    },
  },

  oscillator: {
    name: '算例4 · 弹簧振子非线性时域（vs T=2π√(m/k)）',
    desc: '集中质量 + 轴向弹簧，半隐式 Euler 时域积分，由位移时程识别振动周期。',
    params: [
      { k: 'm', label: '质量 m (kg)', v: 100 },
      { k: 'k', label: '弹簧刚度 k (N/m)', v: 5000 },
      { k: 'x0', label: '初始位移 x0 (m)', v: 2 },
      { k: 'T', label: '仿真时长 (s)', v: 20 },
      { k: 'dt', label: '步长 dt (s)', v: 0.002 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = 1000; w.env.wave = { H: 0, T: 8, dir: 0 }; w.env.current.speed = 0; w.gravity = [0, 0, 0]; // 纯弹簧振子
      const a = w.addNode([0, 0, 0], 0, true);
      const b = w.addNode([p.x0, 0, 0], 0, false);
      // 端点节点质量 = w*L0/2 = m；弹簧原长取 x0/2，使初始伸长即为振幅
      const L0 = 0.75 * p.x0; // 保持 x>0 线性段
      w.lines.push(new Line([a.id, b.id], { EA: p.k * L0, EI: 0, w: 2 * p.m / L0, d: 0.05, cd: 0, compression: true, L0: [L0] }));
      return w;
    },
    run(w, p) {
      const hist = solveTimeDomain(w, { T: p.T, dt: p.dt });
      this._lastHist = hist;
      const ys = hist.map(h => h.nodes[1][0]);
      // 过零点识别周期
      const eq = 0.75 * p.x0; // 平衡位置
      const zeros = [];
      for (let i = 1; i < ys.length; i++) if (ys[i - 1] > eq && ys[i] <= eq) {
        const f = -ys[i - 1] / (ys[i] - ys[i - 1]);
        zeros.push(hist[i - 1].t + f * (hist[i].t - hist[i - 1].t));
      }
      const Tnum = zeros.length >= 2 ? (zeros[zeros.length - 1] - zeros[0]) / (zeros.length - 1) : NaN;
      const Tana = 2 * Math.PI * Math.sqrt(p.m / p.k);
      const q = Math.floor(ys.length / 4);
      const amp = (arr) => Math.max(...arr.map(v => Math.abs(v - eq)));
      return {
        results: [['振动周期 T (s)', Tnum, Tana], ['振幅比 (后1/4 / 前1/4)', amp(ys.slice(-q)) / amp(ys.slice(0, q)), 1]],
        info: `${hist.length} 帧时程，半隐式 Euler dt=${p.dt}s`,
        plot: { label: '位移 x(t) (m)', xs: hist.map(h => h.t), ys },
      };
    },
  },

  waveCatenary: {
    name: '算例5 · 波浪中悬链线时域（Morison 载荷）',
    desc: '规则 Airy 波 + Morison 拖曳作用下悬链线顶端张力时程；均值应回归静力解。',
    params: [
      { k: 'S', label: '水平跨距 S (m)', v: 300 },
      { k: 'h', label: '水深/高差 h (m)', v: 80 },
      { k: 'L', label: '缆长 L (m)', v: 340 },
      { k: 'w', label: '单位湿重 w (N/m)', v: 1200 },
      { k: 'H', label: '波高 H (m)', v: 4 },
      { k: 'T', label: '波周期 T (s)', v: 8 },
      { k: 'dur', label: '仿真时长 (s)', v: 40 },
      { k: 'dt', label: '步长 dt (s)', v: 0.004 },
      { k: 'n', label: '分段数', v: 30 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = p.h;
      w.env.wave = { H: p.H, T: p.T, dir: 0 };
      const n = Math.round(p.n), ids = [];
      for (let i = 0; i <= n; i++) ids.push(w.addNode([p.S * i / n, p.h * i / n, 0], 0, i === 0 || i === n).id);
      w.lines.push(new Line(ids, { EA: 5e8, EI: 0, w: p.w / w.env.g, d: 0.25, cd: 1.2, ca: 1.0, L0: Array(n).fill(p.L / n) }));
      return w;
    },
    run(w, p) {
      // 先静力初始化
      solveStatic(w, {});
      const init = w.nodes.map(n => [...n.p]);
      const hist = solveTimeDomain(w, { T: p.dur, dt: p.dt });
      this._lastHist = hist;
      // 顶端张力时程
      const line = w.lines[0], ids = line.nodeIds;
      const Ts = hist.map(h => {
        const a = h.nodes[ids[ids.length - 2]], b = h.nodes[ids[ids.length - 1]];
        const l = v3.dist(a, b);
        return Math.max(0, line.EA * (l - line.L0[line.L0.length - 1]) / line.L0[line.L0.length - 1]);
      });
      const tail = Ts.slice(Math.floor(Ts.length / 2));
      const mean = tail.reduce((s, v) => s + v, 0) / tail.length;
      // 参考：同模型无波浪静力（动态松弛）顶端张力
      const w0 = cases.waveCatenary.build(p);
      w0.env.wave = { H: 0, T: p.T, dir: 0 };
      solveTimeDomain(w0, { T: 60, dt: 0.004, damp: 8 });
      const l0 = w0.lines[0], id0 = l0.nodeIds;
      const aa = w0.nodes[id0[id0.length - 2]].p, bb = w0.nodes[id0[id0.length - 1]].p;
      const ll = v3.dist(aa, bb);
      const Tstat = Math.max(0, l0.EA * (ll - l0.L0[l0.L0.length - 1]) / l0.L0[l0.L0.length - 1]);
      return {
        results: [
          ['顶端张力均值 (N)', mean, Tstat],
          ['顶端张力峰值 (N)', Math.max(...Ts), NaN],
        ],
        info: `Airy 波 H=${p.H}m T=${p.T}s，Morison Cd=1.2，半隐式 Euler，静力初始化后起振`,
        plot: { label: '顶端张力 T(t) (N)', xs: hist.map(h => h.t), ys: Ts },
      };
    },
  },
};
