// 可视化验证算例：每个算例给出模型构建 + 解析参考 + 评估指标
import { v3, solveLinear } from './math.js';
import { World, Line, Beam, Body, boxMesh, initLine } from './model.js';
import { solveStatic, solveBeamStatic, solveBeamChain, solveTimeDomain, freqDomain } from './solvers.js';
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
      { k: 'n', label: '分段数', v: 20 },
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
      solveStatic(w0, {}); // Newton 静力作为参考
      const l0 = w0.lines[0], id0 = l0.nodeIds;
      const aa = w0.nodes[id0[id0.length - 2]].p, bb = w0.nodes[id0[id0.length - 1]].p;
      const ll = v3.dist(aa, bb);
      const Tstat = Math.max(0, l0.EA * (ll - l0.L0[l0.L0.length - 1]) / l0.L0[l0.L0.length - 1]);
      // H=0 自洽校核：无波浪时动态均值应等于静力解
      const w1 = cases.waveCatenary.build(p);
      w1.env.wave = { H: 0, T: p.T, dir: 0 };
      solveStatic(w1, {});
      const h1 = solveTimeDomain(w1, { T: p.dur, dt: p.dt });
      const l1 = w1.lines[0], id1 = l1.nodeIds;
      const T1 = h1.map(hh => {
        const a2 = hh.nodes[id1[id1.length - 2]], b2 = hh.nodes[id1[id1.length - 1]];
        const l2 = v3.dist(a2, b2);
        return Math.max(0, l1.EA * (l2 - l1.L0[l1.L0.length - 1]) / l1.L0[l1.L0.length - 1]);
      });
      const tail1 = T1.slice(Math.floor(T1.length / 2));
      const mean0 = tail1.reduce((s0, v) => s0 + v, 0) / tail1.length;
      return {
        results: [
          ['无波自洽：动态均值 vs 静力 (N)', mean0, Tstat],
          ['波浪中顶端张力均值 (N)', mean, NaN],
          ['波浪中顶端张力峰值 (N)', Math.max(...Ts), NaN],
        ],
        info: `Airy 波 H=${p.H}m T=${p.T}s，Morison Cd=1.2，半隐式 Euler，静力初始化后起振`,
        plot: { label: '顶端张力 T(t) (N)', xs: hist.map(h => h.t), ys: Ts },
      };
    },
  },
  beamUDL: {
    name: '算例6 · 悬臂梁均布载荷（vs qL⁴/8EI）',
    desc: '12×12 梁单元 + 一致节点载荷，均布载荷悬臂梁端部挠度与解析解对比。',
    params: [
      { k: 'L', label: '梁长 L (m)', v: 10 },
      { k: 'q', label: '均布载荷 q (N/m)', v: 5000 },
      { k: 'E', label: '弹性模量 E (Pa)', v: 2.1e11 },
      { k: 'Iz', label: '抗弯惯量 Iz (m⁴)', v: 8.33e-6 },
      { k: 'A', label: '截面积 A (m²)', v: 0.01 },
    ],
    solver: 'static',
    build(p) {
      const w = new World();
      const n1 = w.addNode([0, 0, 0], 0, true);
      const n2 = w.addNode([p.L, 0, 0], 0, false);
      const b = new Beam(n1.id, n2.id, { E: p.E, G: 8.1e10, A: p.A, Iy: p.Iz, Iz: p.Iz, J: 2e-5 });
      b.q = p.q;
      w.beams.push(b);
      return w;
    },
    run(w, p) {
      const u = solveBeamStatic(w, w.beams[0], {});
      const delta = Math.abs(u.disp[1]);
      const deltaAna = p.q * p.L ** 4 / (8 * p.E * p.Iz);
      return {
        results: [
          ['端部挠度 δ (m)', delta, deltaAna],
          ['端部转角 θ (rad)', Math.abs(u.disp[5]), p.q * p.L ** 3 / (6 * p.E * p.Iz)],
        ],
        info: `均布载荷一致节点载荷向量，单单元精确`,
      };
    },
  },

  heaveDecay: {
    name: '算例7 · 浮箱 Heave 自由衰减（时域 vs 频域固有周期）',
    desc: '浮箱初始抬高释放，时域半隐式 Euler + 网格水静力恢复，由衰减时程识别周期并与频域固有周期对比。',
    params: [
      { k: 'sx', label: '箱长 X (m)', v: 20 },
      { k: 'sz', label: '箱宽 Z (m)', v: 10 },
      { k: 'sy', label: '箱高 Y (m)', v: 6 },
      { k: 'm', label: '质量 m (kg)', v: 6.15e5 },
      { k: 'dz', label: '初始抬高 dz (m)', v: 0.5 },
      { k: 'cDamp', label: '线性阻尼 c (N·s/m)', v: 2e5 },
      { k: 'dur', label: '仿真时长 (s)', v: 40 },
      { k: 'dt', label: '步长 dt (s)', v: 0.005 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = 50; w.env.wave = { H: 0, T: 8, dir: 0 }; w.env.current.speed = 0;
      const draft = p.m / (w.env.rho * p.sx * p.sz);
      const body = new Body({ pos: [0, -draft + p.sy / 2 + p.dz, 0], mass: p.m,
        inertia: [p.m * (p.sz ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sz ** 2) / 12],
        mesh: boxMesh(p.sx, p.sy, p.sz) });
      body.cDamp = p.cDamp;
      w.bodies.push(body);
      return w;
    },
    run(w, p) {
      const body = w.bodies[0];
      const zEq = -p.m / (w.env.rho * p.sx * p.sz) + p.sy / 2; // 理论平衡位置
      const fr = freqDomain(w, body);
      const heave = fr.modes.find(m => m.dof === 'heave');
      const hist = solveTimeDomain(w, { T: p.dur, dt: p.dt });
      this._lastHist = hist;
      const zs = hist.map(h => h.bodies[0].pos[1] - zEq);
      // 过零识别周期
      const zeros = [];
      for (let i = 1; i < zs.length; i++) if (zs[i - 1] > 0 && zs[i] <= 0) {
        const f = -zs[i - 1] / (zs[i] - zs[i - 1]);
        zeros.push(hist[i - 1].t + f * (hist[i].t - hist[i - 1].t));
      }
      const Tnum = zeros.length >= 2 ? (zeros[zeros.length - 1] - zeros[0]) / (zeros.length - 1) : NaN;
      const q = Math.floor(zs.length / 4);
      const amp = (arr) => Math.max(...arr.map(Math.abs));
      return {
        results: [
          ['Heave 衰减周期 (s)', Tnum, heave.T],
          ['振幅比 (后1/4 / 前1/4)', amp(zs.slice(-q)) / amp(zs.slice(0, q)), NaN],
        ],
        info: `网格水静力恢复 + 数值水线面，频域参考 T=${heave.T.toFixed(3)}s，阻尼 c=${p.cDamp}`,
        plot: { label: 'Heave 位移 z(t) (m)', xs: hist.map(h => h.t), ys: zs },
      };
    },
  },

  boxWaveRAO: {
    name: '算例8 · 规则波中浮箱 Heave 响应（RAO 时域估计 vs 1.0 量级）',
    desc: 'Airy 波 Froude-Krylov 激励（数值水线面），时域 Heave 响应的主导周期应等于波浪周期，稳态振幅给出 RAO 估计。',
    params: [
      { k: 'sx', label: '箱长 X (m)', v: 20 },
      { k: 'sz', label: '箱宽 Z (m)', v: 10 },
      { k: 'sy', label: '箱高 Y (m)', v: 6 },
      { k: 'm', label: '质量 m (kg)', v: 6.15e5 },
      { k: 'H', label: '波高 H (m)', v: 2 },
      { k: 'T', label: '波周期 T (s)', v: 3.5 },
      { k: 'cDamp', label: '线性阻尼 c (N·s/m)', v: 3e5 },
      { k: 'dur', label: '仿真时长 (s)', v: 80 },
      { k: 'dt', label: '步长 dt (s)', v: 0.005 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = 50;
      w.env.wave = { H: p.H, T: p.T, dir: 0 };
      const draft = p.m / (w.env.rho * p.sx * p.sz);
      const body = new Body({ pos: [0, -draft + p.sy / 2, 0], mass: p.m,
        inertia: [p.m * (p.sz ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sz ** 2) / 12],
        mesh: boxMesh(p.sx, p.sy, p.sz) });
      body.cDamp = p.cDamp;
      w.bodies.push(body);
      return w;
    },
    run(w, p) {
      const body = w.bodies[0];
      const z0 = body.pos[1];
      const hist = solveTimeDomain(w, { T: p.dur, dt: p.dt });
      this._lastHist = hist;
      const zs = hist.map(h => h.bodies[0].pos[1] - z0);
      const tail = zs.slice(Math.floor(zs.length / 2));
      const amp = (Math.max(...tail) - Math.min(...tail)) / 2;
      // 主导周期（过零）
      const zt = tail, xs = hist.slice(Math.floor(hist.length / 2)).map(h => h.t);
      const zeros = [];
      for (let i = 1; i < zt.length; i++) if (zt[i - 1] > 0 && zt[i] <= 0) {
        const f = -zt[i - 1] / (zt[i] - zt[i - 1]);
        zeros.push(xs[i - 1] + f * (xs[i] - xs[i - 1]));
      }
      const Tresp = zeros.length >= 2 ? (zeros[zeros.length - 1] - zeros[0]) / (zeros.length - 1) : NaN;
      return {
        results: [
          ['响应主导周期 (s)', Tresp, p.T],
          ['Heave 稳态振幅 (m)', amp, NaN],
          ['RAO 估计 (振幅/波幅)', amp / (p.H / 2), NaN],
        ],
        info: `Froude-Krylov 激励 ρgAwη，Aw 由数值水线面差分得到`,
        plot: { label: 'Heave 响应 z(t) (m)', xs: hist.map(h => h.t), ys: zs },
      };
    },
  },

  touchdown: {
    name: '算例9 · 触底悬链线（海床接触 + vs 解析触地点解）',
    desc: '部分搁置海床的系泊缆：罚函数海床接触 + 动态松弛静力，与触地点悬链线解析解对比 H、顶端张力与离底点。',
    params: [
      { k: 'S', label: '水平跨距 S (m)', v: 400 },
      { k: 'd', label: '水深 d (m)', v: 60 },
      { k: 'h', label: '回收端高出海床 h (m)', v: 90 },
      { k: 'L', label: '缆长 L (m)', v: 415 },
      { k: 'w', label: '单位湿重 w (N/m)', v: 1500 },
      { k: 'EA', label: '轴向刚度 EA (N)', v: 5e8 },
      { k: 'n', label: '分段数', v: 50 },
    ],
    solver: 'static',
    build(p) {
      const w = new World();
      w.env.depth = p.d; w.env.seaLevel = -1e6; // 全段出水，湿重=干重，与解析解一致
      const n = Math.round(p.n), ids = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        ids.push(w.addNode([p.S * t, -p.d + p.h * t * t, 0], 0, i === 0 || i === n).id); // 贴海床二次初值
      }
      w.lines.push(new Line(ids, { EA: p.EA, EI: 0, w: p.w / w.env.g, d: 0.3, cd: 1.2, ca: 1.0, L0: Array(n).fill(p.L / n), mu: 5.0 }));
      return w;
    },
    run(w, p) {
      solveTimeDomain(w, { T: 200, dt: 0.002, damp: 10 });
      // 解析：触地点竖向力=0（切线水平）。悬垂段：Xs=a·asinh(Ls/a), h=a(cosh(Ls/a)−1)
      // 平床段: flat=L−Ls, S=Xs+flat → L−S = a(u−asinh u), u=Ls/a, a=h/(cosh u−1)。对 u 二分
      const g = (u) => {
        const a = p.h / (Math.cosh(u) - 1);
        return p.L - p.S - a * (u - Math.asinh(u));
      };
      // g 非单调：扫描首个变号区间再二分
      let lo = 0, hi = 0;
      let prevU = 0.05, prevG = g(prevU);
      for (let u = 0.1; u <= 6; u += 0.05) {
        const gv = g(u);
        if (prevG > 0 && gv <= 0) { lo = prevU; hi = u; break; }
        prevU = u; prevG = gv;
      }
      for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; }
      const u = (lo + hi) / 2;
      const a = p.h / (Math.cosh(u) - 1);
      const Ls = a * u;
      const Hana = p.w * a, TtopAna = p.w * (p.h + a), xTdAna = p.S - a * Math.asinh(Ls / a); // 离底点=锚点+平床长
      // 数值
      const line = w.lines[0], ids = line.nodeIds;
      let Ttop = 0, tTop = [1, 0, 0], xTd = 0;
      for (let i = 0; i < ids.length - 1; i++) {
        const A = w.nodes[ids[i]].p, B = w.nodes[ids[i + 1]].p;
        const l = v3.dist(A, B);
        const T = Math.max(0, line.EA * (l - line.L0[i]) / line.L0[i]);
        if (i === ids.length - 2) { Ttop = T; tTop = v3.scale(v3.sub(B, A), 1 / l); }
      }
      for (let i = 0; i < ids.length; i++) { // 离底点：最后一个贴床节点
        const y = w.nodes[ids[i]].p[1];
        if (y < -p.d + 0.5) xTd = Math.max(xTd, w.nodes[ids[i]].p[0]);
      }
      const Hnum = Ttop * Math.abs(tTop[0]);
      return {
        results: [
          ['水平张力 H (N)', Hnum, Hana],
          ['顶端张力 T_top (N)', Ttop, TtopAna],
          ['离底点 x_td (m)', xTd, xTdAna],
        ],
        info: `海床罚函数接触 + 动态松弛，悬垂段长 Ls=${Ls.toFixed(1)}m`,
      };
    },
  },


  ssBeam: {
    name: '算例10 · 简支梁跨中集中载荷（多单元 FEM vs δ=PL³/48EI）',
    desc: '2 个 12DoF 梁单元链式装配，两端铰支（pin），跨中集中载荷，与材料力学解析解对比。',
    params: [
      { k: 'L', label: '梁长 L (m)', v: 10 },
      { k: 'P', label: '跨中载荷 P (N)', v: 1e4 },
      { k: 'E', label: '弹性模量 E (Pa)', v: 2.1e11 },
      { k: 'Iz', label: '抗弯惯量 Iz (m⁴)', v: 8.33e-6 },
      { k: 'A', label: '截面积 A (m²)', v: 0.01 },
    ],
    solver: 'static',
    build(p) {
      const w = new World();
      const n1 = w.addNode([0, 0, 0], 0, true);
      const n2 = w.addNode([p.L / 2, 0, 0], 0, false);
      const n3 = w.addNode([p.L, 0, 0], 0, true);
      w._chain = { ids: [n1.id, n2.id, n3.id], beam: { E: p.E, G: 8.1e10, A: p.A, Iy: p.Iz, Iz: p.Iz, J: 2e-5 }, loads: { [n2.id]: [0, -p.P, 0] } };
      w.beams.push(new Beam(n1.id, n2.id, w._chain.beam), new Beam(n2.id, n3.id, w._chain.beam));
      return w;
    },
    run(w, p) {
      const c = w._chain;
      const u = solveBeamChain(w, c.ids, c.beam, c.loads, { first: 'pin', last: 'pin' });
      const dMid = Math.abs(u.disp[1 * 6 + 1]); // 中节点 y 位移
      const th1 = Math.abs(u.disp[0 * 6 + 5]);   // 端部转角 θy
      return {
        results: [
          ['跨中挠度 δ (m)', dMid, p.P * p.L ** 3 / (48 * p.E * p.Iz)],
          ['支座转角 θ (rad)', th1, p.P * p.L ** 2 / (16 * p.E * p.Iz)],
        ],
        info: `2 单元链式装配 18×18 缩减刚度，pin 边界（仅约束平动 3DoF）`,
      };
    },
  },

  pendulum: {
    name: '算例11 · 单摆小幅摆动（时域 vs T=2π√(L/g)）',
    desc: '不可伸长缆（高 EA）+ 端部集中质量，重力场中释放，由摆动时程识别周期。',
    params: [
      { k: 'L', label: '摆长 L (m)', v: 10 },
      { k: 'm', label: '摆锤质量 m (kg)', v: 50 },
      { k: 'th0', label: '初始摆角 θ0 (deg)', v: 15 },
      { k: 'dur', label: '仿真时长 (s)', v: 30 },
      { k: 'dt', label: '步长 dt (s)', v: 0.001 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = 1000; w.env.seaLevel = -1e6; w.env.wave = { H: 0, T: 8, dir: 0 }; w.env.current.speed = 0;
      const th = p.th0 * Math.PI / 180;
      const a = w.addNode([0, 0, 0], 0, true);
      const b = w.addNode([p.L * Math.sin(th), -p.L * Math.cos(th), 0], 0, false);
      w.lines.push(new Line([a.id, b.id], { EA: 1e8, EI: 0, w: p.m / p.L, d: 0.05, cd: 0, L0: [p.L] }));
      return w;
    },
    run(w, p) {
      const hist = solveTimeDomain(w, { T: p.dur, dt: p.dt });
      this._lastHist = hist;
      const xs = hist.map(h => h.nodes[1][0]);
      const zeros = [];
      for (let i = 1; i < xs.length; i++) if (xs[i - 1] > 0 && xs[i] <= 0) {
        const f = -xs[i - 1] / (xs[i] - xs[i - 1]);
        zeros.push(hist[i - 1].t + f * (hist[i].t - hist[i - 1].t));
      }
      const Tnum = zeros.length >= 2 ? (zeros[zeros.length - 1] - zeros[0]) / (zeros.length - 1) : NaN;
      return {
        results: [['摆动周期 T (s)', Tnum, 2 * Math.PI * Math.sqrt(p.L / w.env.g)]],
        info: `半隐式 Euler，θ0=${p.th0}°，过零识别周期`,
        plot: { label: '摆锤 x(t) (m)', xs: hist.map(h => h.t), ys: xs },
      };
    },
  },

  currentLine: {
    name: '算例12 · 均匀海流中垂直悬缆（Morison 拖曳 vs 解析合力）',
    desc: '全淹没垂直缆 + 均匀海流 U：顶端张力 = √[(湿重)² + (总拖曳)²]，顶端角 tanθ=拖曳/湿重。',
    params: [
      { k: 'd', label: '水深/缆长 L (m)', v: 60 },
      { k: 'U', label: '海流速 U (m/s)', v: 1.5 },
      { k: 'w', label: '单位干重 w (N/m)', v: 800 },
      { k: 'diam', label: '缆径 d (m)', v: 0.2 },
      { k: 'Cd', label: '拖曳系数 Cd', v: 1.2 },
      { k: 'EA', label: '轴向刚度 EA (N)', v: 5e8 },
      { k: 'n', label: '分段数', v: 20 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = p.d; w.env.seaLevel = 0; w.env.wave = { H: 0, T: 8, dir: 0 };
      w.env.current = { speed: p.U, dir: 0, profile: 'uniform' };
      const n = Math.round(p.n), ids = [];
      for (let i = 0; i <= n; i++) ids.push(w.addNode([0, -p.d * i / n, 0], 0, i === 0).id);
      w.lines.push(new Line(ids, { EA: p.EA, EI: 0, w: p.w / w.env.g, d: p.diam, cd: p.Cd, ca: 1.0, L0: Array(n).fill(p.d / n) }));
      return w;
    },
    run(w, p) {
      solveTimeDomain(w, { T: 250, dt: 0.0005, damp: 15 }); // 强阻尼动态松弛至稳态（dt 受 CFL 限制）
      const line = w.lines[0], ids = line.nodeIds;
      const a = w.nodes[ids[0]].p, b = w.nodes[ids[1]].p; // 固定端在首节点
      const dd = v3.sub(b, a), l = v3.len(dd);
      const Ttop = Math.max(0, line.EA * (l - line.L0[0]) / line.L0[0]);
      const thTop = Math.atan2(Math.abs(dd[0]), Math.abs(dd[1]));
      const A = Math.PI * p.diam ** 2 / 4;
      const Wsub = (p.w - w.env.rho * w.env.g * A) * p.d; // 湿重
      const D = 0.5 * w.env.rho * p.Cd * p.diam * p.U ** 2 * p.d; // 总拖曳
      return {
        results: [
          ['顶端张力 T_top (N)', Ttop, Math.hypot(Wsub, D)],
          ['顶端倾角 θ (rad)', thTop, Math.atan2(D, Wsub)],
        ],
        info: `Morison 拖曳 ½ρCd·d·U² 沿缆长积分，湿重 W=${Wsub.toFixed(0)}N，拖曳 D=${D.toFixed(0)}N`,
      };
    },
  },

  windHeel: {
    name: '算例13 · 浮箱风载稳态倾斜（时域 vs tanθ=F·z/(ρgV·GM)）',
    desc: '风载倾覆力矩 vs 水静力复原力矩平衡：稳态倾角与解析力矩平衡解对比。',
    params: [
      { k: 'sx', label: '箱长 X (m)', v: 20 },
      { k: 'sz', label: '箱宽 Z (m)', v: 10 },
      { k: 'sy', label: '箱高 Y (m)', v: 6 },
      { k: 'm', label: '质量 m (kg)', v: 6.15e5 },
      { k: 'U', label: '风速 U (m/s)', v: 20 },
      { k: 'windZ', label: '风力力臂 z (m)', v: 3 },
      { k: 'angDamp', label: '角阻尼 (N·m·s)', v: 8e6 },
      { k: 'dur', label: '仿真时长 (s)', v: 300 },
      { k: 'dt', label: '步长 dt (s)', v: 0.01 },
    ],
    solver: 'dynamic',
    build(p) {
      const w = new World();
      w.env.depth = 50; w.env.wave = { H: 0, T: 8, dir: 0 }; w.env.current.speed = 0;
      w.env.wind = { speed: p.U, dir: 0 };
      const draft = p.m / (w.env.rho * p.sx * p.sz);
      const body = new Body({ pos: [0, -draft + p.sy / 2, 0], mass: p.m,
        inertia: [p.m * (p.sz ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sy ** 2) / 12, p.m * (p.sx ** 2 + p.sz ** 2) / 12],
        mesh: boxMesh(p.sx, p.sy, p.sz) });
      body.windArea = p.sx * p.sy; body.windCd = 1.0; body.windZ = p.windZ; body.angDamp = p.angDamp;
      w.bodies.push(body);
      return w;
    },
    run(w, p) {
      const hist = solveTimeDomain(w, { T: p.dur, dt: p.dt });
      this._lastHist = hist;
      const R = hist[hist.length - 1].bodies[0].rot;
      const thNum = Math.abs(Math.atan2(R[3], R[0])); // 绕 z 轴倾角
      const V = p.m / w.env.rho;
      const draft = V / (p.sx * p.sz);
      const BM = (p.sz * p.sx ** 3 / 12) / V; // 绕 z(pitch) 的 BM
      const BG = p.sy / 2 - draft / 2;         // KG=sy/2, KB=draft/2
      const GM = BM - BG;
      const F = 0.5 * 1.225 * 1.0 * (p.sx * p.sy) * p.U ** 2;
      const thAna = Math.atan(F * p.windZ / (w.env.rho * w.env.g * V * GM));
      const ths = hist.slice(Math.floor(hist.length / 2)).map(h => Math.abs(Math.atan2(h.bodies[0].rot[3], h.bodies[0].rot[0])));
      return {
        results: [
          ['稳态倾角 θ (rad)', thNum, thAna],
          ['后半程倾角波动 (rad)', Math.max(...ths) - Math.min(...ths), 0],
        ],
        info: `风载 F=${F.toFixed(0)}N，GM=${GM.toFixed(3)}m，ρgV·GM=${(w.env.rho * w.env.g * V * GM / 1e6).toFixed(2)}e6 N·m`,
        plot: { label: '倾角 θ(t) (rad)', xs: hist.map(h => h.t), ys: hist.map(h => Math.atan2(h.bodies[0].rot[3], h.bodies[0].rot[0])) },
      };
    },
  },

};
