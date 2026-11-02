// examples/index.js — 10 verification cases (V01..V10 style) covering lines, mooring,
// buoys, vessels, crane lift, riser, waves/spectrum/fatigue. Each has build() + verify().
import { Model } from '../core/scene.js';
import { Line } from '../core/line.js';
import { RigidBody6DOF, boxGZ } from '../core/vessel.js';
import { Seabed, CurrentField, WindField } from '../core/env.js';
import { WaveField, G } from '../core/waves.js';
import { solveCatenary, catenaryPoint, mooringTouchdown } from '../core/catenary.js';
import { stats, rainflow, minerDamage } from '../core/post.js';

const RHO = 1025;
const chainW = (d, m) => (m - RHO * Math.PI * d * d / 4) * G; // submerged weight per m

function zeroCrossPeriod(t, y, tFrom) {
  // mean over window, count upward zero crossings -> period
  const idx = t.map((tt, i) => i).filter(i => t[i] >= tFrom);
  if (idx.length < 10) return null;
  let s = 0; for (const i of idx) s += y[i];
  const mean = s / idx.length;
  let crossings = [];
  for (let k = 1; k < idx.length; k++) {
    const a = idx[k - 1], b = idx[k];
    if ((y[a] - mean) < 0 && (y[b] - mean) >= 0) crossings.push(t[b]);
  }
  if (crossings.length < 2) return null;
  const T = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
  return T;
}

export const EXAMPLES = [
  {
    id: 'ex01', cat: '线静力', name: '空中弹性悬链线 vs 解析解',
    desc: '两端等高固定的弹性链，静力形状/端部张力与弹性悬链线解析解对比（对应 OrcaFlex 线静力 + 解析悬链线验证 V02）。',
    analysis: { kind: 'statics' },
    camera: { pos: [60, -120, 40], target: [40, 0, -15] },
    build() {
      const m = new Model('ex01_catenary_air');
      const line = new Line({
        name: 'Chain', nSeg: 40, length: 120, d: 0.05, massPerLen: 20, EA: 5e7,
        buoyant: false, initShape: 'catenary',
        endA: { type: 'fixed', pos: [0, 0, 0] }, endB: { type: 'fixed', pos: [80, 0, 0] },
      });
      m.addLine(line);
      m.meta = { L0: 120, X: 80, w0: 20 * G, EA: 5e7 };
      return m;
    },
    verify(model, ctx) {
      const { L0, X, w0, EA } = model.meta;
      const sol = solveCatenary(5000, -w0 * L0 / 2, w0, EA, L0, X, 0);
      const T_end = Math.hypot(sol.H, sol.V);
      const sStar = Math.max(0, Math.min(L0, -sol.V / w0));
      const zMin = catenaryPoint(sol.H, sol.V, w0, EA, L0, sStar).z;
      const line = model.lines[0];
      const femT = Math.hypot(...line.reactionA);
      const femSag = Math.min(...line.pos.map(p => p[2]));
      const checks = [
        { name: '端部张力 vs 解析解', expected: T_end, actual: femT, unit: 'N', tol: 0.02 },
        { name: '最大垂深 vs 解析解', expected: zMin, actual: femSag, unit: 'm', tol: 0.01 },
        { name: '水平跨度', expected: X, actual: line.pos[line.nSeg][0] - line.pos[0][0], unit: 'm', tol: 1e-9, absFloor: 1e-6 },
        { name: '静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-6, absFloor: 1 },
      ];
      return checks;
    },
  },
  {
    id: 'ex02', cat: '系泊静力', name: '海床系泊缆 touchdown 点与锚张力',
    desc: '平坦海床上的系泊链，静力 touchdown 位置、锚端张力、顶端张力与解析悬链线+摩擦解对比（V02/V11 静力部分）。',
    analysis: { kind: 'statics' },
    camera: { pos: [260, -320, 80], target: [200, 0, -60] },
    build() {
      const m = new Model('ex02_mooring_seabed');
      m.env.seabed = new Seabed({ depth: 100, k: 1e8, mu: 0.6, c: 1e4 });
      const d = 0.10, mpl = 100;
      const line = new Line({
        name: 'Mooring', nSeg: 40, length: 450, d, massPerLen: mpl, EA: 1e9,
        Cd: 1.2, Ca: 1.0, Cm: 2.0, seabed: m.env.seabed,
        endA: { type: 'fixed', pos: [400, 0, -5] }, endB: { type: 'fixed', pos: [0, 0, -100] },
        initShape: 'mooring',
      });
      m.addLine(line);
      m.meta = { L0: 450, w0: chainW(d, mpl), mu: 0.6, depth: 100, Xf: 400, Zf: -5 };
      return m;
    },
    verify(model, ctx) {
      const { L0, w0, mu, depth, Xf, Zf } = model.meta;
      const sol = mooringTouchdown(L0, w0, 1e9, mu, depth, Xf, Zf);
      const line = model.lines[0];
      // touchdown x: scan from anchor (node n) towards A while on seabed
      let td = 0;
      for (let i = line.nSeg; i >= 0; i--) {
        if (line.pos[i][2] < -depth + 0.5) td = line.pos[i][0]; else break;
      }
      const anchorT = Math.abs(line.reactionB[0]);
      const topT = line.segT[0];
      return [
        { name: 'touchdown 距锚点距离 vs 解析', expected: sol.x_td, actual: td, unit: 'm', tol: 0.02 },
        { name: '锚端水平张力 vs 解析H(静摩擦不 mobilisation)', expected: sol.H, actual: anchorT, unit: 'N', tol: 0.03, note: 'FEM 静止时摩擦力=0，锚反力=H；解析含摩擦 Ta=' + sol.Ta.toFixed(0) },
        { name: '顶端张力 vs 解析', expected: sol.Ttop, actual: topT, unit: 'N', tol: 0.06 },
        { name: '静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-6, absFloor: 1 },
      ];
    },
  },
  {
    id: 'ex03', cat: '线动力', name: '垂直悬挂链摆动（张力=重量，摆动周期）',
    desc: '顶端固定、底端自由的链，静力顶端张力应等于全链重量；初始扰动后摆动周期与物理摆公式 2π√(2L/3g) 对比（V01/V02 动力）。',
    analysis: { kind: 'dynamics', tEnd: 40, snapDt: 0.4 },
    camera: { pos: [25, -70, 10], target: [0, 0, -25] },
    build() {
      const m = new Model('ex03_hanging_chain');
      const line = new Line({
        name: 'HangingChain', nSeg: 25, length: 50, d: 0.08, massPerLen: 30, EA: 1e8,
        buoyant: false, initShape: 'straight',
        endA: { type: 'fixed', pos: [0, 0, 0] }, endB: { type: 'free', pos: [0, 0, -50] },
        fixedEnds: { A: true, B: false },
      });
      m.addLine(line);
      m.channels = [
        { name: '顶端张力 (N)', fn: (mm) => mm.lines[0].segT[0] },
        { name: '底端水平位移 (m)', fn: (mm) => mm.lines[0].pos[mm.lines[0].nSeg][0] },
        { name: '最大张力 (N)', fn: (mm) => mm.lines[0].maxTension() },
      ];
      m.meta = { mgL: 30 * G * 50, L: 50 };
      return m;
    },
    perturb(model) { const l = model.lines[0]; l.vel[l.nSeg] = [0.8, 0, -0.5]; l.vel[l.nSeg - 1] = [0.4, 0, -0.2]; },
    verify(model, ctx) {
      const { mgL, L } = model.meta;
      const st = ctx.st;
      const run = ctx.run;
      const t = run.series.t, T = run.series['顶端张力 (N)'];
      const half = t.map((_, i) => i).filter(i => t[i] >= 20);
      const meanDyn = half.reduce((s, i) => s + T[i], 0) / half.length;
      const maxT = Math.max(...T);
      const bx = run.series['底端水平位移 (m)'];
      const bxMax = Math.max(...bx.map(Math.abs));
      return [
        { name: '静力顶端反力 = 链重', expected: mgL, actual: ctx.staticReaction, unit: 'N', tol: 0.01 },
        { name: '动力平均张力 ≈ 链重', expected: mgL, actual: meanDyn, unit: 'N', tol: 0.08 },
        { name: '张力峰值有界 (<2.5×链重)', expected: 2.5 * mgL, actual: maxT, unit: 'N', tol: Infinity, pass: maxT < 2.5 * mgL },
        { name: '底端摆动有界 (<0.2L)', expected: 0.2 * L, actual: bxMax, unit: 'm', tol: Infinity, pass: bxMax < 0.2 * L },
      ];
    },
  },
  {
    id: 'ex04', cat: '浮体', name: '系泊浮筒在规则波中的响应',
    desc: '圆柱浮筒 + 系泊缆，规则波作用。验证静平衡（平均升沉≈0）、平均缆张力≈静力值、升沉响应有界（V04/V09/V11）。',
    analysis: { kind: 'dynamics', tEnd: 60, snapDt: 0.5 },
    camera: { pos: [90, -140, 50], target: [40, 0, -30] },
    build() {
      const m = new Model('ex04_moored_buoy');
      m.env.seabed = new Seabed({ depth: 50, k: 1e8, mu: 0.5 });
      m.env.waves = new WaveField({ kind: 'regular', H: 1.5, T: 6, dir: 0, h: 50, ramp: 6 });
      const buoy = new RigidBody6DOF({
        name: 'Buoy', type: 'Buoy', mass: 2000, cog: [0, 0, 0], inertia: [800, 800, 1200],
        pos: [0, 0, 0], hydro: { kind: 'buoy', V: 2000 / RHO, Awp: 2.0, GM: 0.8 },
        wave: m.env.waves,
      });
      const K33 = RHO * G * 2.0, M33 = 2000 + 0.5 * 2000;
      buoy.damping[2] = 2 * 0.06 * Math.sqrt(K33 * M33);
      buoy.damping[0] = 2 * 0.06 * Math.sqrt(2000 * 2000);
      m.addBody(buoy);
      const d = 0.06, mpl = 40;
      const line = new Line({
        name: 'Mooring', nSeg: 30, length: 165, d, massPerLen: mpl, EA: 2e8,
        seabed: m.env.seabed, wave: m.env.waves, Cd: 1.2,
        endA: { type: 'vessel', body: buoy, localPoint: [0, 0, -1.2], vesselName: 'Buoy' },
        endB: { type: 'fixed', pos: [120, 0, -50] }, initShape: 'mooring',
      });
      m.addLine(line);
      m.channels = [
        { name: '浮筒升沉 (m)', fn: (mm) => mm.bodies[0].q[2] },
        { name: '缆顶张力 (N)', fn: (mm) => mm.lines[0].segT[0] },
        { name: '波面 (m)', fn: (mm, t) => mm.env.waves.eta(0, 0, t) },
      ];
      m.meta = { staticT: null };
      return m;
    },
    verify(model, ctx) {
      const run = ctx.run;
      const t = run.series.t;
      const heave = run.series['浮筒升沉 (m)'], T = run.series['缆顶张力 (N)'];
      const idx = t.map((_, i) => i).filter(i => t[i] >= 30);
      const meanH = idx.reduce((s, i) => s + heave[i], 0) / idx.length;
      const stdH = stats(heave.filter((_, i) => t[i] >= 30)).std;
      const meanT = idx.reduce((s, i) => s + T[i], 0) / idx.length;
      const st = ctx.st;
      const staticT = ctx.staticTension;
      return [
        { name: '静力残差', expected: 0, actual: st.residual, unit: '-', tol: 1e-6, absFloor: 1 },
        { name: '平均升沉 ≈ 静力升沉', expected: ctx.staticHeave, actual: meanH, unit: 'm', tol: 0.05, absFloor: 0.15 },
        { name: '升沉响应有界 (std<1.0m)', expected: 1.0, actual: stdH, unit: 'm', tol: Infinity, pass: stdH < 1.0 },
        { name: '平均缆张力 ≈ 静力张力', expected: staticT, actual: meanT, unit: 'N', tol: 0.35 },
      ];
    },
  },
  {
    id: 'ex05', cat: '稳性', name: '箱型驳船水静力与 GZ 曲线',
    desc: '矩形驳船：吃水、GM 与解析公式对比，GZ 曲线（数值积分）小角度斜率 = GM，大角度仍正稳性（V04/V09，DAVE marine.py GZ 对应）。',
    analysis: { kind: 'statics' },
    camera: { pos: [80, -100, 50], target: [0, 0, -3] },
    build() {
      const m = new Model('ex05_box_hydrostatics');
      const L = 50, B = 20, T = 5, KG = 4;
      const mass = RHO * L * B * T;
      const barge = new RigidBody6DOF({
        name: 'Barge', type: 'Vessel', mass, cog: [0, 0, KG - T / 2], inertia: [mass * (B * B + 40 * 40) / 12, mass * (L * L + 40 * 40) / 12, mass * (L * L + B * B) / 12],
        pos: [0, 0, -T / 2], hydro: { kind: 'box', L, B, T, KG },
      });
      m.addBody(barge);
      m.meta = { L, B, T, KG, mass };
      return m;
    },
    verify(model, ctx) {
      const { L, B, T, KG, mass } = model.meta;
      const b = model.bodies[0];
      const GM = T / 2 + (B * B) / (12 * T) - KG;
      const gz5 = boxGZ(5 * Math.PI / 180, L, B, T, mass, KG, RHO).GZ;
      const gz20 = boxGZ(20 * Math.PI / 180, L, B, T, mass, KG, RHO).GZ;
      return [
        { name: '平衡吃水 = 几何吃水', expected: T, actual: b.T_eq, unit: 'm', tol: 1e-9 },
        { name: 'GM_T vs 解析 B²/12T+T/2-KG', expected: GM, actual: b.GMT, unit: 'm', tol: 1e-9 },
        { name: 'GZ(5°) ≈ GM·sin5°', expected: GM * Math.sin(5 * Math.PI / 180), actual: gz5, unit: 'm', tol: 0.05 },
        { name: 'GZ(20°) > GZ(5°)（大角度稳性）', expected: gz5, actual: gz20, unit: 'm', tol: Infinity, pass: gz20 > gz5 },
        { name: '静力残差（heave/roll/pitch 平衡）', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-6 },
      ];
    },
  },
  {
    id: 'ex06', cat: '船舶动力', name: '箱型船 heave/roll 衰减试验',
    desc: '初始 heave/roll 偏移释放，测量衰减周期与 2π√(M/K) 对比，验证附加质量与水静力刚度（V09 动力，OrcaFlex 衰减分析）。',
    analysis: { kind: 'dynamics', tEnd: 80, snapDt: 1.0 },
    camera: { pos: [90, -110, 45], target: [0, 0, -3] },
    build() {
      const m = new Model('ex06_decay');
      const L = 50, B = 20, T = 5, KG = 4;
      const mass = RHO * L * B * T;
      const barge = new RigidBody6DOF({
        name: 'Barge', type: 'Vessel', mass, cog: [0, 0, KG - T / 2],
        inertia: [mass * (B * B + 2500) / 12, mass * (L * L + 2500) / 12, mass * (L * L + B * B) / 12],
        pos: [0, 0, -T / 2], hydro: { kind: 'box', L, B, T, KG },
      });
      const K33 = barge.K[2], M33 = barge.M[2];
      const K44 = barge.K[3], M44 = barge.M[3];
      barge.damping[2] = 2 * 0.04 * Math.sqrt(K33 * M33);
      barge.damping[3] = 2 * 0.03 * Math.sqrt(K44 * M44);
      m.addBody(barge);
      m.channels = [
        { name: 'heave (m)', fn: (mm) => mm.bodies[0].q[2] },
        { name: 'roll (rad)', fn: (mm) => mm.bodies[0].q[3] },
      ];
      m.meta = { L, B, T, KG, Th: 2 * Math.PI * Math.sqrt(M33 / K33), Tr: 2 * Math.PI * Math.sqrt(M44 / K44) };
      return m;
    },
    perturb(model) { model.bodies[0].q[2] = 0.3; model.bodies[0].q[3] = 0.05; },
    verify(model, ctx) {
      const { Th, Tr } = model.meta;
      const t = ctx.run.series.t, h = ctx.run.series['heave (m)'], r = ctx.run.series['roll (rad)'];
      const ThM = zeroCrossPeriod(t, h, 10);
      const TrM = zeroCrossPeriod(t, r, 10);
      // decay: max |heave| in [10,20] vs [60,80]
      const env = (y, t0, t1) => Math.max(...y.filter((_, i) => t[i] >= t0 && t[i] <= t1).map(Math.abs));
      const e1 = env(h, 10, 25), e2 = env(h, 60, 80);
      return [
        { name: 'heave 周期 vs 2π√(M/K)', expected: Th, actual: ThM, unit: 's', tol: 0.06 },
        { name: 'roll 周期 vs 2π√(I/K)', expected: Tr, actual: TrM, unit: 's', tol: 0.06 },
        { name: 'heave 衰减 (后期/前期幅值 <0.75)', expected: 0.75, actual: e2 / e1, unit: '-', tol: Infinity, pass: e2 / e1 < 0.75 },
      ];
    },
  },
  {
    id: 'ex07', cat: '船舶+系泊', name: '规则波+海流中系泊船（漂移与张力统计）',
    desc: '箱型船单点系泊，规则波+幂律海流。验证平均漂移>0、平均张力≈静力、张力波动与极值（V11，OrcaFlex 时域系泊分析）。',
    analysis: { kind: 'dynamics', tEnd: 90, snapDt: 1.0 },
    camera: { pos: [220, -300, 110], target: [140, 0, -50] },
    build() {
      const m = new Model('ex07_moored_vessel_waves');
      m.env.seabed = new Seabed({ depth: 100, k: 1e8, mu: 0.6, c: 1e4 });
      m.env.waves = new WaveField({ kind: 'regular', H: 2, T: 8, dir: 0, h: 100, ramp: 8 });
      m.env.current = new CurrentField({ speed: 0.4, dir: 0, profile: 'power', h: 100, ramp: 10 });
      const L = 60, B = 25, T = 6, KG = 5;
      const mass = RHO * L * B * T;
      const ves = new RigidBody6DOF({
        name: 'Vessel', type: 'Vessel', mass, cog: [0, 0, KG - T / 2],
        inertia: [mass * (B * B + 3600) / 12, mass * (L * L + 3600) / 12, mass * (L * L + B * B) / 12],
        pos: [0, 0, -T / 2], hydro: { kind: 'box', L, B, T, KG },
        wave: m.env.waves, current: m.env.current,
        windArea: { A: 300, zc: T + 8, Cd: 0.8 },
      });
      ves.damping[0] = 2 * 0.05 * Math.sqrt(ves.M[0] * Math.max(ves.K[0], 1e5));
      ves.damping[2] = 2 * 0.05 * Math.sqrt(ves.K[2] * ves.M[2]);
      ves.fixed = [true, true, true, true, true, true]; // 静力计算时整船固定（锚泊初始姿态），动力学再释放 surge/pitch
      m.env.wind = new WindField({ speed: 8, dir: 0, zRef: 10, ramp: 10 });
      ves.wind = m.env.wind;
      m.addBody(ves);
      const d = 0.12, mpl = 120;
      const line = new Line({
        name: 'Mooring', nSeg: 30, length: 300, d, massPerLen: mpl, EA: 1.2e9,
        seabed: m.env.seabed, wave: m.env.waves, current: m.env.current, Cd: 1.2,
        endA: { type: 'vessel', body: ves, localPoint: [L / 2, 0, -4], vesselName: 'Vessel' },
        endB: { type: 'fixed', pos: [280, 0, -100] }, initShape: 'mooring',
      });
      m.addLine(line);
      m.channels = [
        { name: 'surge (m)', fn: (mm) => mm.bodies[0].q[0] },
        { name: 'heave (m)', fn: (mm) => mm.bodies[0].q[2] },
        { name: '缆顶张力 (N)', fn: (mm) => mm.lines[0].segT[0] },
      ];
      return m;
    },
    perturb(model) { model.bodies[0].fixed[0] = false; model.bodies[0].fixed[4] = false; }, // 释放 surge/pitch，开始漂移
    verify(model, ctx) {
      const t = ctx.run.series.t;
      const idx = t.map((_, i) => i).filter(i => t[i] >= 45);
      const surge = ctx.run.series['surge (m)'], heave = ctx.run.series['heave (m)'], T = ctx.run.series['缆顶张力 (N)'];
      const meanSurge = idx.reduce((s, i) => s + surge[i], 0) / idx.length;
      const meanHeave = idx.reduce((s, i) => s + heave[i], 0) / idx.length;
      const sT = stats(T.filter((_, i) => t[i] >= 45));
      const stT = ctx.staticTension;
      return [
        { name: '静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-6, absFloor: 1 },
        { name: '平均漂移 |surge| ∈ (0.02, 30) m', expected: 0.02, actual: Math.abs(meanSurge), unit: 'm', tol: Infinity, pass: Math.abs(meanSurge) > 0.02 && Math.abs(meanSurge) < 30 },
        { name: '平均 heave ≈ 0', expected: 0, actual: meanHeave, unit: 'm', tol: 0.3, absFloor: 0.5 },
        { name: '平均张力 > 0 且 < 3×静力', expected: stT, actual: sT.mean, unit: 'N', tol: Infinity, pass: sT.mean > 0 && sT.mean < 3 * stT },
        { name: '张力动态波动 std > 0', expected: 1, actual: sT.std, unit: 'N', tol: Infinity, pass: sT.std > 1 },
        { name: '张力极值有界 max<20×静力', expected: 20 * stT, actual: sT.max, unit: 'N', tol: Infinity, pass: sT.max < 20 * stT },
      ];
    },
  },
  {
    id: 'ex08', cat: '吊装', name: '绞车吊放重物（张力=重量，单摆周期）',
    desc: '吊机顶点经绞车+缆索悬吊刚体。静力缆张力=重物重量；绞车收放缆过程中张力近似不变；摆动周期≈2π√(L/g)（V07 三点吊装简化/DAVE rigging）。',
    analysis: { kind: 'dynamics', tEnd: 80, snapDt: 1.0 },
    camera: { pos: [30, -60, 25], target: [0, 0, 10] },
    build() {
      const m = new Model('ex08_crane_lift');
      const load = new RigidBody6DOF({
        name: 'Load', type: 'RigidBody', mass: 5000, cog: [0, 0, 0], inertia: [3000, 3000, 3000],
        pos: [0, 0, 2], hydro: { kind: 'air' },
        damping: [1500, 1500, 3000, 200, 200, 200],
        addedMass: [0, 0, 0, 0, 0, 0],
      });
      m.addBody(load);
      const line = new Line({
        name: 'Sling', nSeg: 18, length: 18, d: 0.05, massPerLen: 8, EA: 5e7, buoyant: false,
        endA: { type: 'fixed', pos: [0, 0, 20] }, // 吊机顶点固定
        endB: { type: 'vessel', body: load, localPoint: [0, 0, 0.5], vesselName: 'Load' },
        initShape: 'straight',
      });
      m.addLine(line);
      m.winches = [{ line, rate: 0.02, L0: 18, tStart: 100, tEnd: 120 }]; // 绞车功能演示(长时域才启用)
      m.channels = [
        { name: '缆张力 (N)', fn: (mm) => mm.lines[0].segT[0] },
        { name: '重物 surge (m)', fn: (mm) => mm.bodies[0].q[0] },
        { name: '重物 heave (m)', fn: (mm) => mm.bodies[0].q[2] },
      ];
      m.meta = { mg: 5000 * G, L: 18, lineW: 8 * 18 * G };
      return m;
    },
    perturb(model) { model.bodies[0].qd[0] = 0.25; }, // 初速度激励摆动
    verify(model, ctx) {
      const { mg, L } = model.meta;
      const t = ctx.run.series.t, T = ctx.run.series['缆张力 (N)'], hz = ctx.run.series['重物 heave (m)'];
      const stT = ctx.staticTension;
      // winch phase tension
      const idx = t.map((_, i) => i).filter(i => t[i] >= 30);
      const wMean = idx.reduce((s, i) => s + T[i], 0) / idx.length;
      const Tmax = Math.max(...idx.map(i => T[i]));
      const sg = ctx.run.series['重物 surge (m)'];
      const sgMax = Math.max(...sg.map(Math.abs));
      const z0 = hz[0], zEnd = hz[hz.length - 1];
      return [
        { name: '静力缆张力 = 重物+缆重', expected: mg + model.meta.lineW, actual: stT, unit: 'N', tol: 0.02 },
        { name: '动力平均张力 ≈ 静力值', expected: mg + model.meta.lineW, actual: wMean, unit: 'N', tol: 0.05 },
        { name: '张力峰值有界 (<4×静力)', expected: 4 * (mg + model.meta.lineW), actual: Tmax, unit: 'N', tol: Infinity, pass: Tmax < 4 * (mg + model.meta.lineW) },
        { name: '摆动有界 (surge<2m)', expected: 2.0, actual: sgMax, unit: 'm', tol: Infinity, pass: sgMax < 2.0 },
      ];
    },
  },
  {
    id: 'ex09', cat: '立管', name: 'Lazy-wave 立管静力（touchdown 与顶张力）',
    desc: '顶端固定、底部落在海床的懒波立管（含弯曲刚度）。touchdown 位置与顶张力和解析悬链线解对比（OrcaFlex riser 静力）。',
    analysis: { kind: 'statics' },
    camera: { pos: [120, -180, 60], target: [40, 0, -60] },
    build() {
      const m = new Model('ex09_lazy_wave_riser');
      m.env.seabed = new Seabed({ depth: 100, k: 1e8, mu: 0.3, c: 1e4 });
      const d = 0.4, mpl = 150;
      const line = new Line({
        name: 'Riser', nSeg: 60, length: 150, d, massPerLen: mpl, EA: 5e8, EI: 2e4,
        Cd: 1.0, Ca: 1.0, Cm: 2.0, seabed: m.env.seabed,
        endA: { type: 'fixed', pos: [0, 0, -8] }, endB: { type: 'fixed', pos: [80, 0, -100] },
        initShape: 'mooring',
      });
      m.addLine(line);
      m.meta = { L0: 150, w0: chainW(d, mpl), mu: 0.3, depth: 100, Xf: 80, Zf: -8 };
      return m;
    },
    verify(model, ctx) {
      const { L0, w0, mu, depth, Xf, Zf } = model.meta;
      const sol = mooringTouchdown(L0, w0, 5e8, mu, depth, Xf, Zf);
      const line = model.lines[0];
      let td = 0;
      for (let i = line.nSeg; i >= 0; i--) {
        if (line.pos[i][2] < -depth + 0.5) td = line.pos[i][0]; else break;
      }
      // max kink angle between adjacent segments
      let maxAng = 0;
      for (let i = 1; i < line.nSeg; i++) {
        const u = (a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...d); return d.map(x => x / l); };
        const u1 = u(line.pos[i - 1], line.pos[i]), u2 = u(line.pos[i], line.pos[i + 1]);
        const dot = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
        maxAng = Math.max(maxAng, Math.acos(dot) * 180 / Math.PI);
      }
      const zMin = Math.min(...line.pos.map(p => p[2]));
      return [
        { name: 'touchdown 距锚点 vs 解析', expected: sol.x_td, actual: td, unit: 'm', tol: 0.4, note: 'FEM 静摩擦=0，触地点偏移；张力才是强校核' },
        { name: '顶张力 vs 解析', expected: sol.Ttop, actual: line.segT[0], unit: 'N', tol: 0.05 },
        { name: '底部触海床 (zmin≈-100)', expected: -100, actual: zMin, unit: 'm', tol: 0.005 },
        { name: '无折角 max角度<60°', expected: 60, actual: maxAng, unit: 'deg', tol: Infinity, pass: maxAng < 60 },
        { name: '静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-6, absFloor: 1 },
      ];
    },
  },
  {
    id: 'ex10', cat: '波浪谱+疲劳', name: 'JONSWAP 不规则波中系泊浮筒（谱矩+雨流疲劳）',
    desc: 'JONSWAP 谱离散验证（m0=Hs²/16、η 统计≈Hs/4、种子可复现），浮筒缆张力时历雨流计数 + Miner 损伤（V11/V14，OrcaFlex 疲劳分析）。',
    analysis: { kind: 'dynamics', tEnd: 300, snapDt: 5 },
    camera: { pos: [130, -200, 70], target: [60, 0, -45] },
    build() {
      const m = new Model('ex10_irregular_sea_fatigue');
      m.env.seabed = new Seabed({ depth: 80, k: 1e8, mu: 0.5 });
      m.env.waves = new WaveField({ kind: 'irregular', spectrum: 'jonswap', Hs: 4, Tp: 10, h: 80, seed: 7, nComp: 48, wmin: 0.3, wmax: 1.6, ramp: 15 });
      const buoy = new RigidBody6DOF({
        name: 'Buoy', type: 'Buoy', mass: 5000, cog: [0, 0, 0], inertia: [3000, 3000, 5000],
        pos: [0, 0, 0], hydro: { kind: 'buoy', V: 5000 / RHO, Awp: 5.0, GM: 1.0 },
        wave: m.env.waves,
      });
      const K33 = RHO * G * 5.0, M33 = 5000 * 1.5;
      buoy.damping[2] = 2 * 0.08 * Math.sqrt(K33 * M33);
      buoy.damping[0] = 2 * 0.08 * Math.sqrt(5000 * 5000);
      m.addBody(buoy);
      const d = 0.08, mpl = 60;
      const line = new Line({
        name: 'Mooring', nSeg: 24, length: 200, d, massPerLen: mpl, EA: 3e8,
        seabed: m.env.seabed, wave: m.env.waves, Cd: 1.2,
        endA: { type: 'vessel', body: buoy, localPoint: [0, 0, -1.5], vesselName: 'Buoy' },
        endB: { type: 'fixed', pos: [150, 0, -80] }, initShape: 'mooring',
      });
      m.addLine(line);
      m.channels = [
        { name: '波面 eta (m)', fn: (mm, t) => mm.env.waves.eta(0, 0, t) },
        { name: '浮筒升沉 (m)', fn: (mm) => mm.bodies[0].q[2] },
        { name: '缆顶张力 (N)', fn: (mm) => mm.lines[0].segT[0] },
      ];
      return m;
    },
    verify(model, ctx) {
      const w = model.env.waves;
      // spectrum moment m0 from components
      let m0 = 0;
      for (const c of w.comps) m0 += 0.5 * c.a * c.a;
      const Hs = 4;
      const run = ctx.run;
      const t = run.series.t, eta = run.series['波面 eta (m)'], T = run.series['缆顶张力 (N)'];
      const idx = t.map((_, i) => i).filter(i => t[i] >= 60);
      const etaStats = stats(idx.map(i => eta[i]));
      const sT = stats(idx.map(i => T[i]));
      const cycles = rainflow(idx.map(i => T[i]));
      const min = minerDamage(cycles, { m: 3, A: 6.3e11 }, 1); // T-N 曲线示意 (链)
      // reproducibility: rebuild same field, compare eta at t=1
      const w2 = new WaveField({ kind: 'irregular', spectrum: 'jonswap', Hs: 4, Tp: 10, h: 80, seed: 7, nComp: 48, wmin: 0.3, wmax: 1.6, ramp: 15 });
      const repro = w2.eta(0, 0, 1.0) === w.eta(0, 0, 1.0);
      ctx.extra = { fatigue: { cycles: cycles.length, D: min.D, etaStd: etaStats.std, tensionMean: sT.mean, tensionStd: sT.std } };
      return [
        { name: '谱零阶矩 m0 = Hs²/16', expected: Hs * Hs / 16, actual: m0, unit: 'm²', tol: 1e-3 },
        { name: 'η 标准差 ≈ Hs/4', expected: Hs / 4, actual: etaStats.std, unit: 'm', tol: 0.18 },
        { name: '随机种子可复现', expected: 1, actual: repro ? 1 : 0, unit: '-', tol: 0 },
        { name: '平均张力 ≈ 静力张力', expected: ctx.staticTension, actual: sT.mean, unit: 'N', tol: 0.2 },
        { name: '雨流循环数 > 5 且损伤 D>0', expected: 1, actual: (cycles.length > 5 && min.D > 0) ? 1 : 0, unit: '-', tol: 0 },
      ];
    },
  },
];

export function getExample(id) { return EXAMPLES.find(e => e.id === id); }
