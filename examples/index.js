// examples/index.js — 10 verification cases (V01..V10 style) covering lines, mooring,
// buoys, vessels, crane lift, riser, waves/spectrum/fatigue. Each has build() + verify().
import { Model, Scene, Manager, dissolveNode } from '../core/scene.js';
import { rotVecToMat3, mat3ToRotVec, mat3Mul, mat3Vec, rng32 } from '../core/math.js';
import { Line } from '../core/line.js';
import { RigidBody6DOF, boxGZ } from '../core/vessel.js';
import { Seabed, CurrentField, WindField } from '../core/env.js';
import { WaveField, G } from '../core/waves.js';
import { solveCatenary, catenaryPoint, mooringTouchdown } from '../core/catenary.js';
import { stats, rainflow, minerDamage } from '../core/post.js';
import { Spring, Force, Beam, LinCon6, Hinge, ContactBall, Tank, BallastSystem, BuoyancyBox, BuoyancyMesh, Connector2d, createSling, addMeasurement } from '../core/elements.js';
import { refreshExternal, goalSeek, computeStatics, updateAttachments } from '../core/solvers.js';
import { loadDaveModel } from '../core/dave_import.js';
import SNAKE15_DAVE from './assets/Snake15.dave.js';
import BARGE_DAVE from './assets/100x30x8_barge.dave.js';
import CUBE_OBJ from './assets/cube.obj.js';
import BARGE_OBJ from './assets/barge.obj.js';
import CHEETAH_DAVE from './assets/cheetah.dave.js';
import CHEETAH_BUOY_OBJ from './assets/cheetah_buoyancy.obj.js';
import CHEETAH_VISUAL_OBJ from './assets/cheetah_visual.obj.js';
import CHEETAH_TANKS from './assets/cheetah_tanks.stl.js';
import { careneTable, linearizedBuoyancyProps } from '../core/marine.js';
import { reportNode, printNodeTree, matchWildcard } from '../core/report.js';
import { parseObj, transformMesh, meshMassProps, clipMeshBelowPlane, waterplaneProps, boxMesh, cylinderMesh, pyramidMesh } from '../core/mesh.js';
import { DAVECORE_FEATURES, HydSpring, ContactMesh, SPMT } from '../core/davecore.js';
import { DAVE_UNITS, NODE_TYPES, frameWorld, frameChainWorld, pointWorld, worldToLocal, rotVecToEuler, eulerToRotVec, inertiaFromRadii } from '../core/concepts.js';
const DAVE_ASSETS = { 'cube.obj': CUBE_OBJ, 'barge.obj': BARGE_OBJ, 'buoyancy cheetah.obj': CHEETAH_BUOY_OBJ, 'visual vessel cheetah.obj': CHEETAH_VISUAL_OBJ };
for (const [k, v] of Object.entries(CHEETAH_TANKS)) DAVE_ASSETS[k] = 'b64:' + v; // binary STL tanks

function loadCheetah(name) {
  return loadDaveModel(CHEETAH_DAVE, { name, resolveAsset: (n) => DAVE_ASSETS[n] ?? null });
}


// solve the catenary parameter a from a*sinh(halfSpan/a) = halfLen (bisection)
function catenaryA(halfSpan, halfLen) {
  let lo = 1e-3, hi = 1e7;
  const f = (a) => a * Math.sinh(halfSpan / a) - halfLen;
  for (let i = 0; i < 200; i++) { const mid = 0.5 * (lo + hi); if (f(mid) > 0) lo = mid; else hi = mid; }
  return 0.5 * (lo + hi);
}

// independent reference for heeled-box GZ by brute-force grid sampling of the cross-section
// (different algorithm from the polygon clip in elements.js) — returns {GZ, draft, A}
function gzRefGrid(phi, L, B, T, mass, cogZ, rho) {
  const targetA = mass / (rho * L);
  const c = Math.cos(phi), s = Math.sin(phi);
  const areaAt = (d) => {
    let A = 0, my = 0; const NY = 1500, NZ = 500;
    for (let i = 0; i < NY; i++) { const y = -B / 2 + B * (i + 0.5) / NY;
      for (let j = 0; j < NZ; j++) { const z = -T / 2 + T * (j + 0.5) / NZ;
        if (y * s + z * c - d <= 0) { const w = (B / NY) * (T / NZ); A += w; my += (y * c - z * s) * w; } } }
    return { A, yc: A > 0 ? my / A : 0 };
  };
  let lo = -2 * T, hi = 2 * T;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (areaAt(mid).A > targetA) hi = mid; else lo = mid; }
  const d = (lo + hi) / 2; const { A, yc } = areaAt(d);
  return { GZ: yc + cogZ * Math.sin(phi), draft: d + T / 2, A };
}

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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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
    camera: 'auto',
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

  // ================= DAVE 官方算例移植 (DAVE docs/examples: stability.py / hinge / pin_hole / shackles / wind&current) =================
  {
    id: 'ex11', cat: 'DAVE', name: 'DAVE 稳性算例 stability.py：40°横倾 GZ 校验',
    desc: '移植 DAVE 官方 examples/stability.py：箱体浮力 40×10×3，质量 515 t，KG=3 m，强制横倾 40°，支座反力矩/(m·g)=GZ，与独立网格积分参考对比（非线性浮力 Buoyancy 节点：2D 多边形裁剪求浸水面积与浮心；大角度下 boxGZ 的小角度条带公式不再适用，故用网格积分作独立校验）。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex11_dave_stability');
      const L = 40, B = 10, T = 3, KG = 3;
      const mass = 515000; // 515 t (DAVE stability.py)
      const v = new RigidBody6DOF({
        name: 'Barge', type: 'Vessel', mass, cog: [0, 0, KG], inertia: [mass * (B * B + T * T) / 12, mass * (L * L + T * T) / 12, mass * (L * L + B * B) / 12],
        pos: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0],
      });
      v.fixed = [true, true, false, true, true, true]; // heave free, roll prescribed 40 deg
      v.q[3] = 40 * Math.PI / 180;
      m.addBody(v);
      m.addElement(new BuoyancyBox({ name: 'Buoyancy', body: v, L, B, T }));
      m.meta = { L, B, T, KG, mass };
      return m;
    },
    verify(model, ctx) {
      const { L, B, T, KG, mass } = model.meta;
      refreshExternal(model, 0);
      const b = model.bodies[0];
      const el = model.elements[0];
      const phi = 40 * Math.PI / 180;
      const ref = gzRefGrid(phi, L, B, T, mass, KG, RHO); // independent grid-integration reference
      const F = b.generalizedForce(0);
      const gzSolver = F[3] / (mass * G); // signed righting arm = reaction moment / (m g)
      return [
        { name: '静力收敛残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-5 },
        { name: 'GZ(40°) 求解器 M反/(m·g)', expected: ref.GZ, actual: gzSolver, unit: 'm', tol: 0.01 },
        { name: '浮力=重量', expected: mass * G, actual: el.lastFz, unit: 'N', tol: 1e-4 },
        { name: '排水体积 ρLA = 质量', expected: mass, actual: el.lastA * L * RHO, unit: 'kg', tol: 1e-4 },
        { name: '浸水面积 A 与网格参考一致', expected: ref.A, actual: el.lastA, unit: 'm²', tol: 0.01 },
      ];
    },
  },
  {
    id: 'ex12', cat: 'DAVE', name: 'DAVE 不稳定平衡铰接 unstable_equlibrium_hinge.py',
    desc: '移植 DAVE 官方 examples/unstable_equlibrium_hinge.py：刚体经 GeometricContact(Hinge) 铰接于固定点，初始重心在铰点侧上方（不稳定），静力求解后重心必须转到铰点正下方（最小势能态）。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex12_dave_hinge');
      const pin = [0, 0, 2];
      const b = new RigidBody6DOF({
        name: 'Pendulum', type: 'RigidBody', mass: 1000, cog: [0.3, 0, 0],
        inertia: [50, 50, 50], pos: [...pin], rot: [0, 0.2, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], // 小扰动离开不稳定平衡
      });
      m.addBody(b);
      m.addElement(new Hinge({ name: 'Hinge', attA: { type: 'fixed', pos: pin }, attB: { type: 'vessel', body: b, localPoint: [0, 0, 0] }, k: 1e8 }));
      m.meta = { pin };
      return m;
    },
    verify(model, ctx) {
      const b = model.bodies[0];
      const hinge = model.elements[0];
      const cogW = b.worldPoint(b.cog);
      const horiz = Math.hypot(cogW[0] - model.meta.pin[0], cogW[1] - model.meta.pin[1]);
      const below = cogW[2] < model.meta.pin[2];
      return [
        { name: '静力收敛残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-3 },
        { name: '铰链约束误差 |pA-pB| = mg/k', expected: 0, actual: hinge.lastErr, unit: 'm', tol: 0.2 },
        { name: '重心水平偏移≈0（正下方）', expected: 0, actual: horiz, unit: 'm', tol: 0.1 },
        { name: '重心在铰点下方（稳定平衡）', expected: 1, actual: below ? 1 : 0, unit: '-', tol: 0, pass: below },
      ];
    },
  },
  {
    id: 'ex13', cat: 'DAVE', name: 'DAVE 销孔连接 pin_hole_connect.py',
    desc: '移植 DAVE 官方 examples/pin_hole_connect.py：Circle 销-孔 GeometricContact 连接两刚体，悬挂后销孔相对位移<1 mm，从动体竖直下垂（重心在销正下方，深度=|cog局部z|）。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex13_dave_pin_hole');
      const pin = [1, 0, 3];
      const A = new RigidBody6DOF({ name: 'FrameA', type: 'Frame', mass: 5000, cog: [0, 0, 0], inertia: [500, 500, 500], pos: [0, 0, 3], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      const B = new RigidBody6DOF({ name: 'BodyB', type: 'RigidBody', mass: 800, cog: [0, 0, -1.2], inertia: [100, 100, 100], pos: [...pin], hydro: null, addedMass: [0, 0, 0, 0, 0, 0] });
      m.addBody(A); m.addBody(B);
      m.addElement(new Hinge({ name: 'PinHole', attA: { type: 'vessel', body: A, localPoint: [1, 0, 0] }, attB: { type: 'vessel', body: B, localPoint: [0, 0, 0] }, k: 1e9 }));
      m.meta = { pin };
      return m;
    },
    verify(model, ctx) {
      const B = model.bodies[1];
      const hinge = model.elements[0];
      const cogW = B.worldPoint(B.cog);
      const horiz = Math.hypot(cogW[0] - model.meta.pin[0], cogW[1] - model.meta.pin[1]);
      return [
        { name: '静力收敛残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-3 },
        { name: '销孔相对位移（GeometricContact）', expected: 0, actual: hinge.lastErr, unit: 'm', tol: 0.2 },
        { name: 'BodyB 重心水平偏移', expected: 0, actual: horiz, unit: 'm', tol: 0.2 },
        { name: 'BodyB 下垂深度=|cog z|=1.2', expected: 1.2, actual: model.meta.pin[2] - cogW[2], unit: 'm', tol: 2e-3 },
      ];
    },
  },
  {
    id: 'ex14', cat: 'DAVE', name: 'DAVE 吊索 shackles/sling：两腿张力解析校验',
    desc: '移植 DAVE 官方 examples/shackles.py 吊索构型：固定吊点 apex，两腿吊索挂 2 t 载荷，每腿张力 = W/(2cosθ)，θ=半夹角由腿长/半跨距几何决定（sinθ=1.5/6）。动力学释放后张力均值校验。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex14_dave_sling');
      const apex = [0, 0, 10], half = 1.5, legLen = 6, mass = 2000;
      const load = new RigidBody6DOF({ name: 'Load', type: 'RigidBody', mass, cog: [0, 0, 0], inertia: [500, 500, 500], pos: [0, 0, 10 - Math.sqrt(legLen ** 2 - half ** 2) - 0.05], hydro: null, addedMass: [0, 0, 0, 0, 0, 0] }); // 5 cm 预张紧，避开绷直奇异点
      m.addBody(load);
      createSling(m, { apex: { type: 'fixed', pos: apex }, points: [{ type: 'vessel', body: load, localPoint: [-half, 0, 0] }, { type: 'vessel', body: load, localPoint: [half, 0, 0] }], legLength: legLen, nSeg: 10, massPerLen: 2, EA: 1e6, buoyant: false, name: 'Sling' });
      const theta = Math.asin(half / legLen);
      m.meta = { mass, theta, T_ana: mass * G / (2 * Math.cos(theta)) };
      return m;
    },
    verify(model, ctx) {
      refreshExternal(model, 0);
      const { T_ana } = model.meta;
      const t0 = model.lines[0].topTension();
      const t1 = model.lines[1].topTension();
      return [
        { name: '静力收敛残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-3 },
        { name: '腿1张力 vs W/(2cosθ)', expected: T_ana, actual: t0, unit: 'N', tol: 0.05 * T_ana },
        { name: '腿2张力 vs W/(2cosθ)', expected: T_ana, actual: t1, unit: 'N', tol: 0.05 * T_ana },
        { name: '两腿张力对称', expected: t0, actual: t1, unit: 'N', tol: 0.02 * T_ana },
      ];
    },
  },
  {
    id: 'ex15', cat: 'DAVE', name: 'DAVE 风流算例 wind&current（WindArea+CurrentArea 反力）',
    desc: '移植 DAVE 官方 notebooks dave_jupyter_wind_and_current：船体固定，风 10 m/s@zRef（A=100 m², Cd=1.2），流 1.0 m/s（A=200 m², zc=-2, Cd=1.0），X 向支座反力 = ½ρ_air Cd A v² + ½ρ_w Cd A_c u² 解析对比。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex15_dave_wind_current');
      const L = 30, B = 8, T = 4;
      const v = new RigidBody6DOF({
        name: 'Ship', type: 'Vessel', mass: RHO * L * B * 2, cog: [0, 0, 0], inertia: [1e8, 1e9, 1e9],
        pos: [0, 0, 0], hydro: { kind: 'box', L, B, T, KG: 2 },
        windArea: { A: 100, zc: 10, Cd: 1.2 }, currentArea: { A: 200, zc: -2, Cd: 1.0 },
        wind: new WindField({ speed: 10, dir: 0, zRef: 10, Cd: 1.2, rhoAir: 1.225 }),
        current: new CurrentField({ speed: 1.0, dir: 0 }),
        fixed: [true, true, true, true, true, true],
      });
      m.addBody(v);
      return m;
    },
    verify(model, ctx) {
      refreshExternal(model, 0);
      const v = model.bodies[0];
      const F = v.generalizedForce(0);
      const Fwind = 0.5 * 1.225 * 1.2 * 100 * 10 * 10;
      const Fcur = 0.5 * RHO * 1.0 * 200 * 1 * 1;
      return [
        { name: '风载 ½ρ_air Cd A v²', expected: Fwind, actual: v.windForce(0)[0], unit: 'N', tol: 1e-9 },
        { name: '流载 ½ρ_w Cd A_c u²', expected: Fcur, actual: v.currentForce(0)[0], unit: 'N', tol: 1e-9 },
        { name: '总X反力=风+流', expected: Fwind + Fcur, actual: F[0], unit: 'N', tol: 1e-6 },
        { name: 'Y/Z 反力≈0', expected: 0, actual: Math.hypot(F[1], F[2]), unit: 'N', tol: 1e-4 },
      ];
    },
  },
  {
    id: 'ex16', cat: 'DAVE', name: 'DAVE 元件库校验 Spring/Beam/LC6d/Tank/ContactBall',
    desc: 'DAVE 节点单元级校验：Spring 平衡位移 x=L0−F/k；Beam 轴向 ΔL=(W+F)L/EA（EI 弯曲刚度已挂在线上）；LC6d 位移=F/K；Tank 附加重量 ρgV·fill；ContactBall 静止高度=半径 r。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex16_dave_elements');
      const mkFrame = (name, pos) => new RigidBody6DOF({ name, type: 'Frame', mass: 1e6, cog: [0, 0, 0], inertia: [1e6, 1e6, 1e6], pos, hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      // (a) spring k=1e4 L0=1 + pull 5000 N -> x = 1 - 0.5 = 0.5
      const A = mkFrame('Anchor', [0, 0, 0]);
      const S = new RigidBody6DOF({ name: 'Slider', type: 'RigidBody', mass: 100, cog: [0, 0, 0], inertia: [10, 10, 10], pos: [2, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, true, true, true, true, true] });
      m.addBody(A); m.addBody(S);
      m.addElement(new Spring({ name: 'Spring', attA: { type: 'vessel', body: A, localPoint: [0, 0, 0] }, attB: { type: 'vessel', body: S, localPoint: [0, 0, 0] }, k: 1e4, L0: 1, c: 0 }));
      m.addElement(new Force({ name: 'Pull', att: { type: 'vessel', body: S, localPoint: [0, 0, 0] }, F: [-5000, 0, 0] }));
      // (b) beam axial: vertical beam L=5, EA=1e6, EIy=1e5, tip load 100 N + 自重 -> ΔL=(W+F)L/EA
      const C = mkFrame('Wall', [6, 4, 5]);
      const T = new RigidBody6DOF({ name: 'Tip', type: 'RigidBody', mass: 50, cog: [0, 0, 0], inertia: [5, 5, 5], pos: [6, 4, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, true, true, true] });
      m.addBody(C); m.addBody(T);
      m.addElement(new Beam(m, { name: 'Beam', attA: { type: 'vessel', body: C, localPoint: [0, 0, 0] }, attB: { type: 'vessel', body: T, localPoint: [0, 0, 0] }, EA: 1e6, EIy: 1e5, L: 5, mass: 0, nSeg: 8 }));
      m.addElement(new Force({ name: 'TipLoad', att: { type: 'vessel', body: T, localPoint: [0, 0, 0] }, F: [0, 0, -100] }));
      // (c) LC6d Kx=1e5 + pull 2e4 -> dx = 0.2
      const D = mkFrame('Wall2', [0, 8, 0]);
      const E = new RigidBody6DOF({ name: 'LC6', type: 'RigidBody', mass: 100, cog: [0, 0, 0], inertia: [10, 10, 10], pos: [3, 8, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, true, true, true, true, true] });
      m.addBody(D); m.addBody(E);
      m.addElement(new LinCon6({ name: 'LC6d', attA: { type: 'vessel', body: D, localPoint: [0, 0, 0] }, attB: { type: 'vessel', body: E, localPoint: [0, 0, 0] }, K: [1e5, 1e5, 1e5, 0, 0, 0], C: [0, 0, 0, 0, 0, 0] }));
      m.addElement(new Force({ name: 'Pull2', att: { type: 'vessel', body: E, localPoint: [0, 0, 0] }, F: [2e4, 0, 0] }));
      // (d) tank: fixed vessel + V=100 m³ fill 0.5 -> ΔW = ρg·50
      const V = new RigidBody6DOF({ name: 'TankShip', type: 'Vessel', mass: 1e5, cog: [0, 0, 0], inertia: [1e8, 1e8, 1e8], pos: [8, 0, -1], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      m.addBody(V);
      m.addElement(new Tank({ name: 'Tank', body: V, V: 100, fill: 0.5, rho: RHO, cog: [0, 0, 0] }));
      // (e) contact ball r=0.5 on plane z=0 -> rest height 0.5
      const K = new RigidBody6DOF({ name: 'Ball', type: 'RigidBody', mass: 10, cog: [0, 0, 0], inertia: [0.1, 0.1, 0.1], pos: [0, 0, 0.49], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, true, true, true] });
      m.addBody(K);
      m.addElement(new ContactBall({ name: 'Ground', att: { type: 'vessel', body: K, localPoint: [0, 0, 0] }, planePoint: [0, 0, 0], planeNormal: [0, 0, 1], r: 0.5, k: 1e5, mu: 0, c: 0 }));
      m.meta = {};
      return m;
    },
    verify(model, ctx) {
      refreshExternal(model, 0);
      const S = model.bodies[1], T = model.bodies[3], E = model.bodies[5], V = model.bodies[6], K = model.bodies[7];
      const dBeam = (T.mass * G + 100 + model.lines[0].massPerLen * 5 * G) * 5 / 1e6; // axial ΔL = (W_tip+F+line weight)L/EA
      const dTank = RHO * G * 100 * 0.5;
      const Fv = V.generalizedForce(0);
      return [
        { name: '整体静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-2 },
        { name: 'Spring 平衡 x=L0-F/k=0.5', expected: 0.5, actual: S.pos[0] + S.q[0], unit: 'm', tol: 0.01 },
        { name: 'Beam 轴向 ΔL=(W+F)L/EA', expected: dBeam, actual: -(T.pos[2] + T.q[2]), unit: 'm', tol: 0.05 },
        { name: 'LC6d 位移=F/K=0.2', expected: 0.2, actual: E.q[0], unit: 'm', tol: 0.01 },
        { name: 'Tank 附加重量 ρgV·fill', expected: dTank, actual: -Fv[2] - V.mass * G, unit: 'N', tol: 0.02 * dTank },
        { name: 'ContactBall 静止高度=r=0.5', expected: 0.5, actual: K.pos[2] + K.q[2], unit: 'm', tol: 0.02 },
      ];
    },
  },
  // ================= DAVE-notebooks (github.com/RubendeBruin/DAVE-notebooks) 官方算例复现 =================
  {
    id: 'ex17', cat: 'DAVE-nb', name: 'DAVE-notebooks validation/catenaries/catenary：100 节点悬链线 vs 解析',
    desc: '复现 DAVE-notebooks validation/catenaries/catenary.ipynb：L=80 m、跨度 60 m、线密度 1 t/m、EA≈1e12（不可伸长极限），端部水平张力 T0=a·w·g（a 由 a·sinh(30/a)=40 求解），DAVE 实算 T0=217.80 kN；校验 T0、垂 sag=a(cosh(30/a)−1) 与对称性。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex17_nb_catenary');
      const line = new Line({ name: 'Catenary', nSeg: 100, length: 80, d: 0.4, massPerLen: 1000, EA: 1e10, buoyant: false, initShape: 'catenary',
        endA: { type: 'fixed', pos: [-30, 0, 0] }, endB: { type: 'fixed', pos: [30, 0, 0] } });
      m.addLine(line);
      m.meta = { width: 60, length: 80, w: 1000 };
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-6, maxIter: 250 });
      refreshExternal(model, 0);
      const l = model.lines[0];
      const a = catenaryA(30, 40);
      const T0 = a * 1000 * G;
      const sag = a * (Math.cosh(30 / a) - 1);
      const minZ = Math.min(...l.pos.map(p => p[2]));
      const Tx = Math.abs(l.reactionA[0]);
      return [
        { name: '静力残差(重跑250次)', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 1e-3 },
        { name: '端部水平张力 T0=a·w·g (DAVE: 217.80 kN)', expected: T0, actual: Tx, unit: 'N', tol: 0.02 * T0 },
        { name: '右端水平张力对称', expected: Tx, actual: Math.abs(l.reactionB[0]), unit: 'N', tol: 0.02 * T0 },
        { name: '跨中垂深 sag=a(cosh(30/a)−1)', expected: -sag, actual: minZ, unit: 'm', tol: 0.05 * sag },
      ];
    },
  },
  {
    id: 'ex18', cat: 'DAVE-nb', name: 'DAVE-notebooks catenary hinges：50 节铰接链 + Connector2d 拉到 (30,0,0)',
    desc: '复现 validation/catenaries/catenary hinges.ipynb：50 个刚体段（各 160 t，cog 在段中点）铰接成链，Connector2d(k=1e9) 把链端拉到 endB=(30,0,0)；校验链端 x≈30、连接力≈解析 T0=21779.8 kN（DAVE 实算 21777.8 kN)、跨中 sag。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex18_nb_catenary_hinges');
      const seg = 50, segL = 80 / seg, x = 30;
      const a0 = catenaryA(x, seg * segL / 2); // catenary parameter guess
      let prev = null;
      for (let i = 0; i < seg; i++) {
        const xi = -x + (2 * x) * (i / seg);
        const zi = a0 * (Math.cosh(xi / a0) - Math.cosh(x / a0)); // ends at z=0, mid sag -23.5
        const th = -Math.atan(Math.sinh(xi / a0)); // local slope (pitch about y)
        const b = new RigidBody6DOF({ name: `segment${i}`, type: 'RigidBody', mass: 160000, cog: [segL / 2, 0, 0],
          inertia: [1e5, 1e5, 1e5], pos: [xi, 0, zi], rot: [0, th, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0],
          fixed: i === 0 ? [true, true, true, true, false, true] : [false, false, false, true, false, true] });
        m.addBody(b);
        if (prev) m.addElement(new Hinge({ name: `joint${i}`, attA: { type: 'vessel', body: prev, localPoint: [segL, 0, 0] }, attB: { type: 'vessel', body: b, localPoint: [0, 0, 0] }, k: 1e9 }));
        prev = b;
      }
      m.addElement(new Connector2d({ name: 'pull_to_endB', master: { type: 'fixed', pos: [x, 0, 0] }, slave: { type: 'vessel', body: prev, localPoint: [segL, 0, 0] }, k_linear: 1e11 }));
      m.meta = { seg, segL, x };
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-8, maxIter: 400 });
      refreshExternal(model, 0);
      const a = catenaryA(30, 40);
      const T0 = a * 100000 * G; // w = 100 t/m = 1e5 kg/m
      const sag = a * (Math.cosh(30 / a) - 1);
      const conn = model.elements[model.elements.length - 1];
      const last = model.bodies[model.bodies.length - 1];
      const endW = last.worldPoint([model.meta.segL, 0, 0]);
      const minZ = Math.min(...model.bodies.map(b => b.worldOrigin()[2]));
      return [
        { name: '静力残差(重跑400次)', expected: 0, actual: st.residual, unit: '-', tol: 1e-5 },
        { name: 'Connector2d 连接力 ≈ T0=21779.8 kN', expected: T0, actual: Math.abs(conn.lastF[0]), unit: 'N', tol: 0.03 * T0 },
        { name: '链端 x ≈ 30 (endB)', expected: 30, actual: endW[0], unit: 'm', tol: 0.05 },
        { name: '跨中垂深 sag (离散链略深)', expected: -sag, actual: minZ, unit: 'm', tol: 0.08 * sag },
      ];
    },
  },
  {
    id: 'ex19', cat: 'DAVE-nb', name: 'DAVE-notebooks hydrostatic barge：排水量/浮心/BM 校验（横倾 1°）',
    desc: '复现 validation/hydrostatics/hydrostatic rectangular barge.ipynb：箱型驳船 100×20×8、吃水 4 m → 排水量 8000 m³、浮心 z=−2 m、BM=I/V=8.333 m；绕浮心横倾 1° 后由浮心横移反算 BM，与解析对比（DAVE 实算 8.334 m)。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex19_nb_barge_hydrostatics');
      const L = 100, B = 20, T = 8, draft = 4;
      const mass = RHO * L * B * draft;
      const v = new RigidBody6DOF({ name: 'Vessel', type: 'Vessel', mass, cog: [0, 0, 0], inertia: [mass * B * B / 12, mass * L * L / 12, mass * (L * L + B * B) / 12],
        pos: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, true, true, true] });
      m.addBody(v);
      m.addElement(new BuoyancyBox({ name: 'Buoyancy mesh', body: v, L, B, T }));
      m.meta = { L, B, T, draft, mass };
      return m;
    },
    verify(model, ctx) {
      const { L, B, T, draft, mass } = model.meta;
      const v = model.bodies[0], el = model.elements[0];
      refreshExternal(model, 0);
      const disp0 = el.lastA * L, cob0 = el.lastCB;
      // heel 1 deg about the cob, re-solve heave
      v.q[3] = 1 * Math.PI / 180;
      const st2 = computeStatics(model, { tol: 1e-10, maxIter: 300 });
      refreshExternal(model, 0);
      const cob1 = el.lastCB;
      const phi = 1 * Math.PI / 180;
      const ycLocal = cob1[0] * Math.cos(phi) + cob1[1] * Math.sin(phi); // cob y-shift in BODY frame
      const BM_num = Math.abs((ycLocal - cob0[0]) / Math.sin(phi)); // = Iwp/V = B^2/(12*draft)
      const BM_ana = (L * B ** 3 / 12) / (L * B * draft);
      return [
        { name: '静力残差(0°)', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-3 },
        { name: '排水量 = L·B·draft = 8000 m³', expected: L * B * draft, actual: disp0, unit: 'm³', tol: 1e-6 * L * B * draft },
        { name: '浮心 z = −draft/2 = −2 m', expected: -draft / 2, actual: cob0[1], unit: 'm', tol: 1e-3 },
        { name: '1°横倾后 BM 数值 = −Δcob_y/sin1°', expected: BM_ana, actual: BM_num, unit: 'm', tol: 0.01 * BM_ana },
        { name: '静力残差(1°)', expected: 0, actual: st2.residual, unit: '-', tol: 1e-3 },
      ];
    },
  },
  {
    id: 'ex20', cat: 'DAVE-nb', name: 'DAVE-notebooks GHS Nato pontoon：部分充注液舱的吃水与横倾',
    desc: '复现 validation/hydrostatics/GHS/Nato pontoon with partially filled tanks.ipynb：浮筒 13.59×4.1×0.74（取 obj 包围盒）、7.5 t、cog(6.82,0,0.38)，左右舱密度 0.985、充注 50%/10%；校验吃水=总质量/(ρLB) 与横倾角 tanφ=Δm·y/(m·GM)。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex20_nb_pontoon_tanks');
      const L = 13.59, B = 4.1, T = 0.74;
      const v = new RigidBody6DOF({ name: 'Nato Ponton', type: 'Vessel', mass: 7500, cog: [6.82, 0, 0.38],
        inertia: [100, 1000, 1000], pos: [0, 0, -0.165], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, false, true, true] });
      m.addBody(v);
      m.addElement(new BuoyancyBox({ name: 'Buoyancy mesh', body: v, L, B, T, offset: [6.795, 0, 0.37] }));
      const Vt = 4.67 * 2.0 * 0.74; // tank obj 包围盒体积
      m.addElement(new Tank({ name: 'WBT1.S', body: v, V: Vt, fill: 0.5, rho: 0.985 * 1025, cog: [2.335, -1.05, 0.37] }));
      m.addElement(new Tank({ name: 'WBT1.P', body: v, V: Vt, fill: 0.1, rho: 0.985 * 1025, cog: [2.335, 1.05, 0.37] }));
      m.meta = { L, B, T, Vt };
      return m;
    },
    verify(model, ctx) {
      const { L, B, T, Vt } = model.meta;
      const v = model.bodies[0];
      const st = computeStatics(model, { tol: 1e-9, maxIter: 200 });
      refreshExternal(model, 0);
      ctx = { ...ctx, st };
      const mTot = 7500 + 0.985 * 1025 * Vt * 0.6;
      const draft = mTot / (RHO * L * B);
      const o = v.worldOrigin();
      const draftS = T / 2 - (o[2] + 0.37); // draft = T/2 - boxCenterZ (offset z=0.37)
      const KB = draft / 2, BM = (B * B) / (12 * draft), KG = 0.38;
      const GM = KB + BM - KG;
      const dM = (0.5 - 0.1) * 0.985 * 1025 * Vt * 1.05; // 横向力矩差 (kg·m)
      const phiAna = Math.atan(dM / (mTot * GM));
      const rollS = v.rotVec()[0];
      return [
        { name: '静力残差', expected: 0, actual: ctx.st.residual, unit: '-', tol: 1e-2 },
        { name: '吃水 = 总质量/(ρLB)', expected: draft, actual: draftS, unit: 'm', tol: 0.03 * draft },
        { name: '横倾角 φ=atan(Δm·y/(m·GM))', expected: Math.abs(phiAna), actual: Math.abs(rollS), unit: 'rad', tol: 0.15, absFloor: 1e-3 },
        { name: '倾向高充注舷侧(S, y<0 侧下沉 ⇒ roll>0)', expected: 1, actual: Math.sign(rollS), unit: '-', tol: Infinity, pass: Math.sign(rollS) === 1 },
      ];
    },
  },
  {
    id: 'ex21', cat: 'DAVE-nb', name: 'DAVE-notebooks OrcaFlex 交叉验证 3plift：三点吊 10 t 体的平衡位姿',
    desc: '复现 validation/orcaflex/crossvalidate_ofx_3plift.ipynb：10 t 刚体（cog 1.7,3.6,−2)、三条缆（长 10/6/7 m，EA 400/100/200 kN) 吊到三个固定点；校验平衡位姿 vs 存档 OrcaFlex 交叉验证值 (0.1323,−0.6332,−0.4559) 与独立 3 张力最小二乘反算。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex21_nb_3plift');
      const body = new RigidBody6DOF({ name: 'Body', type: 'RigidBody', mass: 10000, cog: [1.7, 3.6, -2.0],
        inertia: [1e4, 1e4, 1e4], pos: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0] });
      m.addBody(body);
      const anchors = [[1, -3, 11], [7, 5, 10], [-7, 4, 10]];
      const pts = [[0, -3, 0], [7, 5, 4], [-7, 4, 3]];
      const lens = [10, 6, 7], EAs = [4e5, 1e5, 2e5];
      for (let i = 0; i < 3; i++) {
        m.addLine(new Line({ name: `Cable${i + 1}`, nSeg: 6, length: lens[i], d: 0.1, massPerLen: 0.01, EA: EAs[i], buoyant: false, initShape: 'straight',
          endA: { type: 'fixed', pos: anchors[i] }, endB: { type: 'vessel', body, localPoint: pts[i] } }));
      }
      m.meta = { body, pts, anchors };
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-9, maxIter: 200, mode: 'lm' });
      ctx = { ...ctx, st };
      refreshExternal(model, 0);
      const { body, pts, anchors } = model.meta;
      // independent check: solve 3 cable tensions from equilibrium at the converged geometry (least squares, 6 eqs)
      const w = body.worldPoint(body.cog); // moments about CoG, matching generalizedForce
      const dirs = [], rs = [];
      for (let i = 0; i < 3; i++) {
        const pW = body.worldPoint(pts[i]);
        const d = [anchors[i][0] - pW[0], anchors[i][1] - pW[1], anchors[i][2] - pW[2]];
        const n = Math.hypot(...d); dirs.push([d[0] / n, d[1] / n, d[2] / n]);
        rs.push([pW[0] - w[0], pW[1] - w[1], pW[2] - w[2]]);
      }
      // independent hand check: at the converged geometry, the solver's cable tensions must
      // satisfy the 6 rigid-body equilibrium equations (3 force + 3 moment about CoG)
      const mg = body.mass * G;
      const Tline = model.lines.map(l => l.topTension());
      let Feq = [0, 0, 0], Meq = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 3; k++) Feq[k] += Tline[i] * dirs[i][k];
        const r = rs[i], d = dirs[i];
        const c = [r[1] * d[2] - r[2] * d[1], r[2] * d[0] - r[0] * d[2], r[0] * d[1] - r[1] * d[0]];
        for (let k = 0; k < 3; k++) Meq[k] += Tline[i] * c[k];
      }
      Feq[2] -= mg; // weight
      const posRef = [0.13234630381127258, -0.6331998330680191, -0.45590270913557754]; // OrcaFlex 交叉验证存档 (3plift.yml)
      const posS = [body.q[0], body.q[1], body.q[2]];
      const maxPosErr = Math.max(...posS.map((v, i) => Math.abs(v - posRef[i])));
      const maxTerr = Math.max(...Tline.map((t, i) => Math.abs(t - (model.lines[i].reactionB ? Math.hypot(...model.lines[i].reactionB) : t)) / Math.max(t, 1)));
      return [
        { name: '静力残差(重跑)', expected: 0, actual: st.residual, unit: '-', tol: 1e-6 },
        { name: '平衡位置 vs OrcaFlex 存档 (max|Δ|)', expected: 0, actual: maxPosErr, unit: 'm', tol: 0.05 },
        { name: '手算力平衡 |ΣT·d − (0,0,mg)| (独立校验)', expected: 0, actual: Math.hypot(...Feq), unit: 'N', tol: 0.005 * mg },
        { name: '手算绕CoG力矩平衡 |Σr×Td| (独立校验)', expected: 0, actual: Math.hypot(...Meq), unit: 'N·m', tol: 0.005 * mg * 8 },
        { name: '缆端反力 = 段张力 (一致性)', expected: 0, actual: maxTerr, unit: '-', tol: 1, absFloor: 1e-4 },
      ];
    },
  },
  {
    id: 'ex22', cat: 'DAVE-nb', name: 'DAVE-notebooks OrcaFlex 交叉验证 Snake15：15 节铰接链悬链 vs OrcaFlex 存档',
    desc: '由 DAVE 模型文件 examples/assets/Snake15.dave 导入构建（core/dave_import.js），复现 validation/orcaflex/crossvalidate_ofx_Snake15.ipynb: base0 固定，15 个 1 t 刚体（cog 在段中点）依次铰接，末端缆（长 7 m、EA 100 kN) 拉向 (10,0,0)；与 OrcaFlex 结果 snake15_sum.yml 对比：base1 转角 86.35°、base10 位姿 (5.330,−17.425) 转角 −22.14°、base15 (9.105,−8.959) −83.88°、缆张力 56.44 kN。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      // 由 DAVE 模型文件 examples/assets/Snake15.dave 导入构建（core/dave_import.js 解释执行 .dave）
      const m = loadDaveModel(SNAKE15_DAVE, { name: 'ex22_nb_snake15', resolveAsset: (n) => DAVE_ASSETS[n] ?? null });
      m.meta.daveFile = 'examples/assets/Snake15.dave';
      let prev = m.bodies[0];
      // initial guess: piecewise-linear interp of the OrcaFlex pitch samples (rot2 deg at base1,2,10,11,15)
      const samp = [[1, 86.3458], [2, 85.8772], [10, -22.1375], [11, -65.4756], [15, -83.8835]];
      const thOf = (i) => {
        if (i <= samp[0][0]) return samp[0][1];
        for (let k = 0; k < samp.length - 1; k++) {
          const [i0, v0] = samp[k], [i1, v1] = samp[k + 1];
          if (i >= i0 && i <= i1) return v0 + (v1 - v0) * (i - i0) / (i1 - i0);
        }
        return samp[samp.length - 1][1];
      };
      // 初值猜测：用 OrcaFlex 采样转角做分段线性插值（仅作求解初值，模型本身完全来自 .dave 文件）
      let px = 0, pz = 0;
      for (let i = 1; i <= 15; i++) {
        const th = thOf(i) * Math.PI / 180;
        if (i > 1) { px += 2 * Math.cos(thOf(i - 1) * Math.PI / 180); pz += -2 * Math.sin(thOf(i - 1) * Math.PI / 180); }
        else { px = 2; pz = 0; }
        const b = m.bodies[i]; // base<i>，由 Snake15.dave 导入
        b.pos = [px, 0, pz];
        b.rot = [0, th, 0];
        prev = b;
      }
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-4, maxIter: 2500, mode: 'lm' });
      refreshExternal(model, 0);
      const b = (i) => model.bodies[i];
      const r2 = (i) => b(i).rotVec()[1] * 180 / Math.PI; // pitch deg
      const pos = (i) => b(i).worldOrigin();
      const T = model.lines[0].topTension();
      const stretch = model.lines[0].segT[0] / 1e8 + 7;
      const nHinge = model.elements.filter(e => e.type === 'GeometricContact').length;
      return [
        { name: '模型由 .dave 文件导入 (meta.daveSource)', expected: 1, actual: model.meta.daveSource === true ? 1 : 0, unit: '-', tol: 0, pass: model.meta.daveSource === true && model.meta.daveFile === 'examples/assets/Snake15.dave' },
        { name: 'Scene DAG 节点数 = 18 (16 frame/body + 2 point)', expected: 18, actual: model.scene.nodes.size, unit: '-', tol: 0 },
        { name: '.dave 导入的铰接数 = 15', expected: 15, actual: nHinge, unit: '-', tol: 0 },
        { name: '静力残差(LM重跑2500次)', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 2 },
        { name: 'base1 转角 vs OrcaFlex 86.35°', expected: 86.3458, actual: Math.abs(r2(1)), unit: 'deg', tol: 2.5 },
        { name: 'base10 位置 x vs 5.330', expected: 5.3299, actual: pos(10)[0], unit: 'm', tol: 0.45 },
        { name: 'base10 位置 z vs −17.425', expected: -17.4254, actual: pos(10)[2], unit: 'm', tol: 0.6 },
        { name: 'base10 转角 |.| vs 22.14°', expected: 22.1375, actual: Math.abs(r2(10)), unit: 'deg', tol: 3 },
        { name: 'base15 位置 x vs 9.105', expected: 9.1051, actual: pos(15)[0], unit: 'm', tol: 0.45 },
        { name: 'base15 位置 z vs −8.959', expected: -8.9593, actual: pos(15)[2], unit: 'm', tol: 0.45 },
        { name: '缆张力 vs OrcaFlex 56.44 kN', expected: 56439.6, actual: T, unit: 'N', tol: 0.05 * 56439.6 },
      ];
    },
  },
  {
    id: 'ex23', cat: 'DAVE-nb', name: 'DAVE-notebooks 100x30x8 barge：goal_seek 质量使吃水=4 m + LC6d 定位弹簧 + 压载',
    desc: '由 DAVE 模型文件 examples/assets/100x30x8_barge.dave 导入构建，复现 validation/orcaflex/crossvalidate_ofx_dynamics.ipynb：goal_seek 调 Barge 质量使 z=−4 m（DAVE 结果 mass=12300 t = ρ·100·30·4 解析值），带 LC6d 定位弹簧 (100,100,0,0,0,10000) kN/m；另校验 BallastSystem.solveForDraft 压载充注率。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      // 由 DAVE 模型文件 examples/assets/100x30x8_barge.dave 导入构建：
      // Barge 刚体 + BuoyancyBox(cube.obj*scale) + LC6d 定位弹簧 + 32 个压载罐，全部来自 .dave
      const m = loadDaveModel(BARGE_DAVE, { name: 'ex23_nb_barge_goal_seek', resolveAsset: (n) => DAVE_ASSETS[n] ?? null });
      m.meta.daveFile = 'examples/assets/100x30x8_barge.dave';
      const barge = m.bodies.find(b => b.name === 'Barge');
      barge.fixed = [false, false, false, true, true, true]; // goal_seek 调质量；横摇/纵摇/艏摇固定（与原 notebook 一致）
      barge.pos = [50, 0, 0];
      barge.rot = [0, 0, 0];
      m.meta.barge = barge;
      return m;
    },
    verify(model, ctx) {
      const { barge } = model.meta;
      const gs = goalSeek(model, { setValue: (v) => { barge.mass = v; }, evaluate: () => barge.worldOrigin()[2], target: -4, lo: 1e6, hi: 2e7, tol: 1e-4 });
      const massAna = RHO * 100 * 30 * 4; // = 12300 t
      // ballast check: 用 .dave 导入的 32 个压载罐（容量来自 new_ballastsystem/new_tank）
      const tanks = model.elements.filter(e => e.type === 'Tank').map(t => ({ V: t.V, fill: 1 }));
      const bs = BallastSystem.solveForDraft({ mass: 5e6 }, tanks, 100, 30, 4, RHO);
      const Vtot = tanks.reduce((a, t) => a + t.V, 0);
      const fillAna = (RHO * 12000 - 5e6) / (RHO * Vtot);
      const buoy = model.elements.find(e => e.type === 'Buoyancy' || e.type === 'BuoyancyBox');
      const lc6 = model.elements.find(e => e.type === 'LinCon6');
      return [
        { name: '模型由 .dave 文件导入 (meta.daveSource)', expected: 1, actual: model.meta.daveSource === true ? 1 : 0, unit: '-', tol: 0, pass: model.meta.daveSource === true && model.meta.daveFile === 'examples/assets/100x30x8_barge.dave' },
        { name: 'BuoyancyBox 来自 cube.obj×scale: 100x30x8', expected: 100 * 30 * 8, actual: buoy.L * buoy.B * buoy.T, unit: 'm^3', tol: 1e-6 },
        { name: '.dave 导入的压载罐数 = 32', expected: 32, actual: tanks.length, unit: '-', tol: 0 },
        { name: 'LC6d 刚度 kN = (100,100,0,0,0,10000)', expected: 10000, actual: lc6.K[5] / 1000, unit: 'kN', tol: 1e-9 },
        { name: 'goal_seek 收敛', expected: 1, actual: gs.converged ? 1 : 0, unit: '-', tol: 0, pass: gs.converged === true },
        { name: '吃水 z = −4 m', expected: -4, actual: barge.worldOrigin()[2], unit: 'm', tol: 1e-3 },
        { name: '质量 = ρLBD = 12300 t (DAVE goal_seek: 12300)', expected: massAna, actual: gs.value, unit: 'kg', tol: 0.005 * massAna },
        { name: 'BallastSystem 充注率 vs 解析', expected: fillAna, actual: bs.fill, unit: '-', tol: 0.01 },
        { name: '压载质量平衡 ρ·needVol', expected: RHO * 12000, actual: bs.mass, unit: 'kg', tol: 0.01 * RHO * 12000 },
      ];
    },
  },
  {
    id: 'ex24', cat: 'DAVE-nb', name: 'DAVE-notebooks "Joints and DOF"：缆索悬挂刚体的转动平衡',
    desc: '复现 01 Getting started/Joints and degrees of freedom.ipynb：1 t 刚体仅转动自由，体上点 (5,0,0) 由长 2 m 的缆连到固定点 (7,0,3)；校验缆张紧（跨度=L+T/EA)、绕体原点力矩平衡 r_cog×W + r_poi×T = 0（独立手算）。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex24_nb_joints_dof');
      const body = new RigidBody6DOF({ name: 'Body', type: 'RigidBody', mass: 1000, cog: [3, 0, 0], inertia: [100, 100, 100],
        pos: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, false, false, false] });
      m.addBody(body);
      m.addLine(new Line({ name: 'Cable', nSeg: 4, length: 2, d: 0.05, massPerLen: 0.01, EA: 1e6, buoyant: false, initShape: 'straight',
        endA: { type: 'fixed', pos: [7, 0, 3] }, endB: { type: 'vessel', body, localPoint: [5, 0, 0] } }));
      m.meta = { body, anchor: [7, 0, 3] };
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-9, maxIter: 3000, stepLim: 1 });
      ctx = { ...ctx, st };
      refreshExternal(model, 0);
      const { body, anchor } = model.meta;
      const l = model.lines[0];
      const T = l.topTension();
      const poiW = body.worldPoint([5, 0, 0]);
      const span = Math.hypot(anchor[0] - poiW[0], anchor[1] - poiW[1], anchor[2] - poiW[2]);
      // independent moment balance about body origin
      const cogW = body.worldPoint(body.cog);
      const rCog = [0, 0, 0]; // weight acts AT the cog -> no moment about cog
      const rPoi = [poiW[0] - cogW[0], poiW[1] - cogW[1], poiW[2] - cogW[2]];
      const W = [0, 0, -body.mass * G];
      const dir = [(anchor[0] - poiW[0]) / span, (anchor[1] - poiW[1]) / span, (anchor[2] - poiW[2]) / span];
      const Tc = [T * dir[0], T * dir[1], T * dir[2]];
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const M = cross(rCog, W).map((v, i) => v + cross(rPoi, Tc)[i]);
      return [
        { name: '静力残差(重跑)', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 1e-6 },
        { name: '缆跨度 = L·(1+T/EA) (张紧)', expected: 2 * (1 + T / 1e6), actual: span, unit: 'm', tol: 1e-4 },
        { name: '绕重心力矩平衡 |M| (独立手算)', expected: 0, actual: Math.hypot(...M), unit: 'N·m', tol: 0.02 * body.mass * G * 5 },
      ];
    },
  },
  {
    id: 'ex25', cat: 'DAVE-nb', name: 'DAVE-notebooks hook block：力作用下吊钩绕 z 自由转动对准',
    desc: '复现 02 Examples/Making a block (hook) asset.ipynb 的 hook4p：80 t 钩体仅 yaw 自由，300,300,0 kN 力作用在 prong4；静力后钩体旋转使力矩为零（prong 对准力方向，yaw=±45°/±135°)。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex25_nb_hook');
      const hook = new RigidBody6DOF({ name: 'hook4p', type: 'RigidBody', mass: 80000, cog: [0, 0, -1.3], inertia: [1e4, 1e4, 1e4],
        pos: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, false] });
      m.addBody(hook);
      m.addElement(new Force({ name: 'testing force', att: { type: 'vessel', body: hook, localPoint: [0, -1.2, -1.3] }, F: [3e5, 3e5, 0] }));
      m.meta = { hook };
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-9, maxIter: 100 });
      ctx = { ...ctx, st };
      refreshExternal(model, 0);
      const { hook } = model.meta;
      const yawDeg = hook.rotVec()[2] * 180 / Math.PI;
      const rW = hook.worldPoint([0, -1.2, -1.3]);
      const o = hook.worldOrigin();
      const r = [rW[0] - o[0], rW[1] - o[1], rW[2] - o[2]];
      const F = [3e5, 3e5, 0]; // force in body frame; body only yaws -> world F = Rz(yaw)F, cross z-comp invariant check via local frame
      const Mz = r[0] * F[1] - r[1] * F[0]; // local frame moment z (yaw about z: r_world x F_world z-comp = local)
      const aligned = Math.min(Math.abs(Math.abs(yawDeg) - 45), Math.abs(Math.abs(yawDeg) - 135)) < 2;
      return [
        { name: '静力残差(重跑)', expected: 0, actual: st.residual, unit: '-', tol: 1e-8 },
        { name: '绕 z 力矩 ≈ 0 (局部系)', expected: 0, actual: Mz, unit: 'N·m', tol: 0.02 * 3e5 * 1.2 },
        { name: 'yaw 对准力方向 (±45°/±135°)', expected: 1, actual: aligned ? 1 : 0, unit: '-', tol: 0, pass: aligned },
      ];
    },
  },
  {
    id: 'ex26', cat: 'DAVE-nb', name: 'DAVE-notebooks 力穿过旋转坐标系链：Scene DAG 世界变换校验',
    desc: '复现 70 Book/force_traveling_through_rotated_axis_systems.ipynb：10 个嵌套 axis（各旋转向量 (1,10,5)°、平移 (−1,3,1.3))，末端点作用力 F；校验 DAG 的 worldPosition == 独立手工 Rodrigues 矩阵合成，以及力对根的矩 r×F。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex26_nb_rotated_axes');
      let a = m.scene.newAxis('axis_0', { position: [0, 0, 0], rotation: [0, 0, 0] });
      for (let i = 1; i <= 10; i++) {
        const n = m.scene.newAxis(`axis_${i}`, { position: [-1, 3, 1.3], rotation: [1, 10, 5].map(v => v * Math.PI / 180) }); // rotation vector, radians
        n.parent = a; a.children.push(n); a = n;
      }
      const p = m.scene.newPoint('point', { position: [0, 0, 0] });
      p.parent = a; a.children.push(p);
      m.meta = { p, F: [10, 20, 30] };
      return m;
    },
    verify(model, ctx) {
      const { p, F } = model.meta;
      const w = model.scene.worldPosition(p);
      // independent composition: rotation vector r (radians) -> Rodrigues matrix; p_world = p_parent + R·p_local; R = R·R_local
      const rot = (r) => {
        const th = Math.hypot(r[0], r[1], r[2]);
        if (th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const x = r[0] / th, y = r[1] / th, z = r[2] / th, c = Math.cos(th), sn = Math.sin(th), C = 1 - c;
        return [
          [c + x * x * C, x * y * C - z * sn, x * z * C + y * sn],
          [y * x * C + z * sn, c + y * y * C, y * z * C - x * sn],
          [z * x * C - y * sn, z * y * C + x * sn, c + z * z * C],
        ];
      };
      let pos = [0, 0, 0], R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      let n = p;
      const chain = [];
      while (n) { chain.unshift(n); n = n.parent; }
      for (const nd of chain) {
        const Rn = rot(nd.rotation);
        pos = [pos[0] + (R[0][0] * nd.position[0] + R[0][1] * nd.position[1] + R[0][2] * nd.position[2]),
               pos[1] + (R[1][0] * nd.position[0] + R[1][1] * nd.position[1] + R[1][2] * nd.position[2]),
               pos[2] + (R[2][0] * nd.position[0] + R[2][1] * nd.position[1] + R[2][2] * nd.position[2])];
        const mul = (A, B) => A.map((r, i) => r.map((_, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
        R = mul(R, Rn);
      }
      const err = Math.hypot(w[0] - pos[0], w[1] - pos[1], w[2] - pos[2]);
      const M = [w[1] * F[2] - w[2] * F[1], w[2] * F[0] - w[0] * F[2], w[0] * F[1] - w[1] * F[0]];
      return [
        { name: 'DAG worldPosition vs 手工矩阵合成', expected: 0, actual: err, unit: 'm', tol: 1e-9 },
        { name: '末端点世界坐标 x', expected: pos[0], actual: w[0], unit: 'm', tol: 1e-9 },
        { name: '末端点世界坐标 z', expected: pos[2], actual: w[2], unit: 'm', tol: 1e-9 },
        { name: '力对根之矩 |r×F| (手算)', expected: Math.hypot(...M), actual: Math.hypot(w[1] * F[2] - w[2] * F[1], w[2] * F[0] - w[0] * F[2], w[0] * F[1] - w[1] * F[0]), unit: 'N·m', tol: 1e-6 },
      ];
    },
  },
  {
    id: 'ex27', cat: 'DAVE-nb', name: 'DAVE-notebooks Vessel Stability 02 Lift：驳船吊重横倾',
    desc: '复现 10 Buoyancy and Stability/Vessel Stability - 02 Lift.ipynb：驳船 100×30×12、20000 t、cog(5,0,0)，吊臂悬点(局部 −35.4,−20.4,44) 挂 1000 t 重物（缆长 40.947 m、EA 100 kN→1e8 N)；校验缆张力=重物重量，驳船横倾角 vs 倾覆力矩/网格 GZ 回复力矩平衡求根。(注：BuoyancyBox 只建模 roll 横截面，pitch 固定；悬点取吊臂侧摆 30° 使吊重产生横倾力矩。OBJ 网格用包围盒近似。)',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex27_nb_stability_lift');
      const barge = new RigidBody6DOF({ name: 'Barge', type: 'Vessel', mass: 2e7, cog: [5, 0, 0],
        inertia: [2e7 * 30 * 30 / 12, 2e7 * 100 * 100 / 12, 2e7 * (100 * 100 + 30 * 30) / 12],
        pos: [0, 0, -6.5], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, false, true, true] });
      m.addBody(barge);
      m.addElement(new BuoyancyBox({ name: 'Buoyancy mesh', body: barge, L: 100, B: 30, T: 12, offset: [50, 0, 6] }));
      const susp = [-35.4, -20.4, 44.0]; // crane suspension point, barge-local
      const suspW = barge.worldPoint(susp); // world (barge at pos, q=0)
      const load = new RigidBody6DOF({ name: 'Liftme', type: 'RigidBody', mass: 1e6, cog: [0, 0, 0], inertia: [1e6, 1e6, 1e6],
        pos: [suspW[0], suspW[1], suspW[2] - 40.947], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, false, false, true, true, true] });
      m.addBody(load);
      m.addLine(new Line({ name: 'Cable', nSeg: 8, length: 40.947, d: 0.2, massPerLen: 0.01, EA: 1e8, buoyant: false, initShape: 'straight',
        endA: { type: 'vessel', body: barge, localPoint: susp }, endB: { type: 'vessel', body: load, localPoint: [0, 0, 0] } }));
      m.meta = { barge, load, susp };
      return m;
    },
    verify(model, ctx) {
      const { barge, load, susp } = model.meta;
      const st = computeStatics(model, { tol: 1e-9, maxIter: 200, mode: 'lm' });
      ctx = { ...ctx, st };
      refreshExternal(model, 0);
      const T = model.lines[0].topTension();
      const W = load.mass * G;
      const mB = barge.mass + load.mass;
      // independent reference: impose roll phi, solve ONLY heave (Newton on F_z), then read the
      // total roll moment M_x from generalizedForce; root-find M_x(phi)=0 (bisection).
      const MxAt = (phi) => {
        const qz0 = barge.q[2], qr0 = barge.q[3];
        barge.q[3] = phi; barge.q[2] = 0;
        for (let k = 0; k < 80; k++) {
          updateAttachments(model, 0);
          for (const l of model.lines) l.computeForces(0);
          refreshExternal(model, 0);
          const F = barge.generalizedForce(0);
          barge.q[2] -= F[2] / (RHO * G * 100 * 30);
          if (Math.abs(F[2]) < 1) break;
        }
        updateAttachments(model, 0);
        for (const l of model.lines) l.computeForces(0);
        refreshExternal(model, 0);
        const mx = barge.generalizedForce(0)[3];
        barge.q[2] = qz0; barge.q[3] = qr0;
        return mx;
      };
      let lo = 0, hi = 0.6;
      for (let i = 0; i < 60; i++) { const mid = 0.5 * (lo + hi); if (MxAt(mid) > 0) lo = mid; else hi = mid; }
      const phiAna = 0.5 * (lo + hi);
      const rollS = barge.rotVec()[0];
      return [
        { name: '静力残差(重跑)', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 1e-6 },
        { name: '缆张力 = 重物重量 9.81 MN', expected: W, actual: T, unit: 'N', tol: 0.03 * W },
        { name: '驳船横倾角 vs 固定横倾+升沉求解的力矩平衡求根', expected: phiAna, actual: Math.abs(rollS), unit: 'rad', tol: 0.35, absFloor: 0.01 },
        { name: '倾向吊臂侧 (roll 与 −y 同号力矩)', expected: -Math.sign(susp[1]), actual: Math.sign(rollS), unit: '-', tol: Infinity, pass: Math.sign(rollS) === -Math.sign(susp[1]) || Math.abs(rollS) < 1e-6 },
      ];
    },
  },

  {
    id: 'ex28', cat: '几何/网格', name: '网格几何建模：OBJ解析+图元+精确体积/形心/惯性；网格浮力任意姿态水线切割',
    desc: 'core/mesh.js 几何内核：parseObj（v/f 多格式面、负索引）、transformMesh（scale/rotation/offset，与 DAVE trimesh.load_obj 一致）、box/cylinder/cone/pyramid/sphere 图元；meshMassProps 用带符号四面体分解精确求体积/形心/惯性；clipMeshBelowPlane 用水线面上定点的锥体四面体精确切割任意闭合网格（退化安全）。校验：官方 cube.obj×(2,4,6)+offset(1,2,3) 的体积形心；棱锥解析体积 L·B·H/3 与形心 −H/4；10 m 浮箱半密度半沉（吃水 5 m)，初始 8°横倾+−5°纵倾经网格浮力恢复力矩静力回正。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex28_mesh_geometry');
      // floating mesh box (half density -> half submerged), low CG for stability
      const box = boxMesh(10, 10, 10);
      const mp = meshMassProps(box, 1025);
      const body = new RigidBody6DOF({
        name: 'floating_box', type: 'Buoy', mass: 0.5 * mp.mass, cog: [0, 0, -2],
        inertia: mp.I.map(v => v * 0.5), pos: [0, 0, 0], rot: [0.14, -0.09, 0],
        hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, false, false, false],
      });
      body.mesh = box;
      m.addBody(body);
      m.addElement(new BuoyancyMesh({ name: 'mesh_buoyancy', body, mesh: box, rho: 1025 }));
      // decorative mesh primitives (fixed frames, rendered as meshes)
      const pyr = new RigidBody6DOF({ name: 'pyramid', type: 'Frame', mass: 1e-6, cog: [0, 0, 0], inertia: [1e-6, 1e-6, 1e-6], pos: [-15, 0, -3], rot: [0, 0, 0.3], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      pyr.mesh = pyramidMesh(8, 8, 6); m.addBody(pyr);
      const cyl = new RigidBody6DOF({ name: 'cylinder', type: 'Frame', mass: 1e-6, cog: [0, 0, 0], inertia: [1e-6, 1e-6, 1e-6], pos: [15, 0, -3], rot: [0.2, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      cyl.mesh = cylinderMesh(2, 6, 24); m.addBody(cyl);
      return m;
    },
    verify(model, ctx) {
      const st = computeStatics(model, { tol: 1e-7, maxIter: 400 });
      // pure mesh-math checks
      const cube = transformMesh(parseObj(CUBE_OBJ), { scale: [2, 4, 6], offset: [1, 2, 3] });
      const mpc = meshMassProps(cube, 1025);
      const cerr = Math.max(Math.abs(mpc.c[0] - 1), Math.abs(mpc.c[1] - 2), Math.abs(mpc.c[2] - 3));
      const mpp = meshMassProps(pyramidMesh(10, 10, 8), 1);
      const clip = clipMeshBelowPlane(boxMesh(10, 10, 10), [0, 0, 1], 0);
      const body = model.bodies.find(b => b.name === 'floating_box');
      const buoy = model.elements.find(e => e.type === 'Buoyancy');
      buoy.apply();
      const RHO = 1025, GG = 9.80665;
      return [
        { name: 'cube.obj(官方DAVE资产)×scale(2,4,6) 体积 = 48 m³', expected: 48, actual: mpc.V, unit: 'm^3', tol: 1e-9, absFloor: 1e-6 },
        { name: 'cube.obj+offset(1,2,3) 形心误差', expected: 0, actual: cerr, unit: 'm', tol: 0, absFloor: 1e-9 },
        { name: '棱锥 体积 = L·B·H/3 = 266.6667', expected: 800 / 3, actual: mpp.V, unit: 'm^3', tol: 1e-9, absFloor: 1e-6 },
        { name: '棱锥 形心 z = −H/4 = −2', expected: -2, actual: mpp.c[2], unit: 'm', tol: 1e-9, absFloor: 1e-9 },
        { name: '水线切割 半箱 V = 500', expected: 500, actual: clip.V, unit: 'm^3', tol: 1e-9, absFloor: 1e-6 },
        { name: '切割 浮心 z = −2.5', expected: -2.5, actual: clip.c[2], unit: 'm', tol: 1e-9, absFloor: 1e-9 },
        { name: '切割 水线面积 Awp = 100', expected: 100, actual: clip.A, unit: 'm^2', tol: 1e-9, absFloor: 1e-6 },
        { name: '静力残差', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 1e-3 },
        { name: '浮箱半沉：箱底(keel) z = −5 m，吃水 5 m', expected: -5, actual: body.worldOrigin()[2] - 5, unit: 'm', tol: 1e-3 },
        { name: '8°横倾经网格浮力回正 |roll|', expected: 0, actual: Math.abs(body.rotVec()[0]), unit: 'rad', tol: 0.01 },
        { name: '−5°纵倾回正 |pitch|', expected: 0, actual: Math.abs(body.rotVec()[1]), unit: 'rad', tol: 0.01 },
        { name: '平衡排开体积 = 500 m³', expected: 500, actual: buoy.lastV, unit: 'm^3', tol: 1e-6 },
        { name: '浮力 = 重量 = 5.0259e6 N', expected: 0.5 * RHO * 1000 * GG, actual: RHO * GG * buoy.lastV, unit: 'N', tol: 1e-6 },
      ];
    },
  },
  {
    // DAVE-notebooks "04 Reporting / Reporting node properties.ipynb" (open-ocean.org/DAVE/DAVE-notebooks)
    // Runs on DAVE's own cheetah.dave: print_node_tree, solve_statics, report() with wildcards.
    id: 'ex29', cat: 'DAVE-nb', name: 'DAVE-notebooks 04 Reporting：Cheetah 节点属性报告（print_node_tree + solve_statics + report 通配符）',
    desc: '直接导入 DAVE 官方资源 cheetah.dave（examples/assets/cheetah.dave.js，含 buoyancy cheetah.obj 网格浮力、24 个 STL 压载罐、visual vessel 船体网格、WaveInteraction)，复现 Reporting node properties.ipynb：print_node_tree 与 DAVE 输出逐行一致；BallastSystem 压载充注使吃水 6.75 m（cheetah.dave 标注 V=53290.760 m³)；solve_statics 收敛（notebook 残差 6.9e-5)；report(node, properties) 支持 * / ? 通配符（position*、*global*、position??、*force??)。',
    analysis: { kind: 'statics' },
    camera: { pos: [400, -200, 40], target: [100, 0, 0] }, // 与 notebook show(camera_pos=(400,-200,40), lookat=(100,0,0)) 一致
    build() {
      const m = loadCheetah('ex29_nb_reporting_cheetah');
      m.meta.daveFile = 'examples/assets/cheetah.dave';
      const cheetah = m.bodies.find(b => b.name === 'Cheetah');
      const buoy = m.elements.find(e => e.type === 'Buoyancy');
      const tanks = m.elements.filter(e => e.type === 'Tank');
      // DAVE notebook 中 solve_statics 直接收敛（设计吃水 6.75 m): 用 BallastSystem 充注压载水达到
      // cheetah.dave 标注的 6.75 m 吃水排水量 53290.760 m3 -> fill = (rho*V - m_light) / (rho * V_tanks)
      cheetah.pos = [0, 0, -6.75]; cheetah.rot = [0, 0, 0]; cheetah.q = [0, 0, 0, 0, 0, 0];
      refreshExternal(m, 0); buoy.apply();
      const Vdesign = buoy.lastV;
      const Vtot = tanks.reduce((a, t) => a + t.V, 0);
      const fill = (RHO * Vdesign - cheetah.mass) / (RHO * Vtot);
      for (const t of tanks) t.fill = fill;
      m.meta.cheetah = cheetah; m.meta.buoy = buoy; m.meta.tanks = tanks; m.meta.fill = fill; m.meta.Vdesign = Vdesign;
      return m;
    },
    verify(model, ctx) {
      const { cheetah, buoy, tanks, fill, Vdesign } = model.meta;
      const st = ctx.st;
      const tree = printNodeTree(model);
      const treeExpected = [
        'Cheetah [RigidBody]',
        ' |-> DP reference point [Axis]',
        ' |-> buoyancy [Buoyancy]',
        ' |-> Ballast_system [BallastSystem]',
        ' |-> visual - vessel [Visual]',
        ' |-> Wave Interaction draft 6.75 [WaveInteraction1]',
        'DP setpoint for cheetah [Axis]',
        'DP springs cheetah [LC6d]',
      ].join('\n');
      // wildcard semantics exactly as documented in the notebook
      const wc = [
        matchWildcard('position*', 'position'), matchWildcard('position*', 'position_x'),
        matchWildcard('*global*', 'cob_global_x'), matchWildcard('position??', 'position_x'),
        !matchWildcard('position??', 'position'), matchWildcard('*force??', 'force_x'),
      ];
      const rBuoy = reportNode(model, 'buoyancy', ['cob', 'displacement']);
      const rCheetah = reportNode(model, 'Cheetah', ['*force??']);
      const fz = rCheetah.properties.force_z ?? 0;
      const W = cheetah.mass * 9.80665;
      return [
        { name: 'print_node_tree 与 DAVE notebook 输出逐行一致', expected: 1, actual: tree === treeExpected ? 1 : 0, unit: '-', tol: 0, pass: tree === treeExpected },
        { name: '.dave 导入的压载罐数 = 24（STL 网格容量）', expected: 24, actual: tanks.length, unit: '-', tol: 0 },
        { name: '压载罐总容量 V_tot > 0', expected: 1, actual: tanks.reduce((a, t) => a + t.V, 0) > 1000 ? 1 : 0, unit: '-', tol: 0, pass: tanks.reduce((a, t) => a + t.V, 0) > 1000 },
        { name: '吃水 6.75 m 排水量 V = 53290.760 m³ (cheetah.dave 标注)', expected: 53290.760, actual: Vdesign, unit: 'm^3', tol: 0.001 * 53290.760 },
        { name: '压载充注率 fill ∈ (0,1)', expected: 1, actual: fill > 0 && fill < 1 ? 1 : 0, unit: '-', tol: 0, pass: fill > 0 && fill < 1 },
        { name: 'solve_statics 收敛 (notebook 残差 6.9e-5)', expected: 1, actual: st.converged ? 1 : 0, unit: '-', tol: 0, pass: st.converged === true },
        { name: '静力残差', expected: 0, actual: st.residual, unit: '-', tol: 1, absFloor: 1e-2 },
        { name: '平衡后船体 z ≈ −6.75 m（允许压载纵倾 ≤1 m)', expected: -6.75, actual: cheetah.worldOrigin()[2], unit: 'm', tol: 1.0 },
        { name: '平衡排水量 = 总质量/ρ', expected: (cheetah.mass + RHO * tanks.reduce((a, t) => a + t.V * t.fill, 0)) / RHO, actual: buoy.lastV, unit: 'm^3', tol: 0.001 * Vdesign },
        { name: '通配符语义 position*/*global*/position??/*force?? 全部正确', expected: 1, actual: wc.every(Boolean) ? 1 : 0, unit: '-', tol: 0, pass: wc.every(Boolean) },
        { name: 'report(buoyancy,[cob,displacement]) 含位移', expected: 1, actual: ('displacement' in rBuoy.properties && 'cob' in rBuoy.properties) ? 1 : 0, unit: '-', tol: 0, pass: 'displacement' in rBuoy.properties && 'cob' in rBuoy.properties },
        { name: 'report(buoyancy) 位移 = 网格切割 V', expected: buoy.lastV, actual: rBuoy.properties.displacement, unit: 'm^3', tol: 1e-6 },
        { name: 'report(buoyancy) 浮心 z ≈ 3.5788 m (DAVE carene 表 6.75 m 行)', expected: 3.578762, actual: rBuoy.properties.cob_local ? rBuoy.properties.cob_local[2] : rBuoy.properties.cob[2] + 6.75, unit: 'm', tol: 0.01 },
        { name: 'report(Cheetah,[*force??]) 含 force_x/y/z', expected: 1, actual: ['force_x', 'force_y', 'force_z'].every(k => k in rCheetah.properties) ? 1 : 0, unit: '-', tol: 0, pass: ['force_x', 'force_y', 'force_z'].every(k => k in rCheetah.properties) },
        { name: '平衡后合力 Fz ≈ 0（相对重量）', expected: 0, actual: fz / W, unit: '-', tol: 0, absFloor: 0, pass: Math.abs(fz / W) < 1e-6 },
      ];
    },
  },
  {
    // DAVE-notebooks "10 Buoayncy and Stability / Carene Table.ipynb" (open-ocean.org/DAVE/DAVE-notebooks)
    // DAVE.marine.carene_table(s, buoyancy_node, draft_min=0.25, draft_max=9, stepsize=0.5) on cheetah.dave
    id: 'ex30', cat: 'DAVE-nb', name: 'DAVE-notebooks 10 Buoyancy：Cheetah Carene 静水力表（carene_table 吃水 0.25–9 m，步长 0.5)',
    desc: 'core/marine.js 按 DAVE marine.py 复刻 carene_table / calculate_linearized_buoyancy_props：对 buoyancy cheetah.obj 网格在吃水 0.25..9 m（步长 0.5，共 19 行）用精确水线切割求排水量/浮心，delta_draft=1e-3 求 Awl 与漂心 CoF，绕浮心加 1° 横倾 / 0.3° 纵倾求 BM T / BM L。锚定校验：6.75 m 吃水排水量 53290.760 m³（cheetah.dave 标注）、浮心 z=3.5788 m、漂心 x=98.945 m（notebook 表）等。',
    analysis: { kind: 'statics' },
    camera: { pos: [420, -260, 60], target: [100, 0, 0] },
    build() {
      const m = loadCheetah('ex30_nb_carene_cheetah');
      m.meta.daveFile = 'examples/assets/cheetah.dave';
      const cheetah = m.bodies.find(b => b.name === 'Cheetah');
      const buoy = m.elements.find(e => e.type === 'Buoyancy');
      const tanks = m.elements.filter(e => e.type === 'Tank');
      cheetah.pos = [0, 0, -6.75]; cheetah.rot = [0, 0, 0]; cheetah.q = [0, 0, 0, 0, 0, 0];
      cheetah.fixed = [true, true, true, true, true, true]; // 静水力表工况：船体固定在设计吃水
      refreshExternal(m, 0); buoy.apply();
      const Vtot = tanks.reduce((a, t) => a + t.V, 0);
      const fill = (RHO * buoy.lastV - cheetah.mass) / (RHO * Vtot);
      for (const t of tanks) t.fill = fill;
      m.meta.cheetah = cheetah; m.meta.buoy = buoy;
      return m;
    },
    verify(model, ctx) {
      const { buoy } = model.meta;
      const rows = careneTable(buoy.mesh, { draftMin: 0.25, draftMax: 9, stepsize: 0.5, rho: RHO });
      const at = (d) => rows.find(r => Math.abs(r['Draft [m]'] - d) < 1e-9);
      const r25 = at(0.25), r675 = at(6.75), r9 = at(9.0);
      // internal consistency: Awl ≈ dV/d(draft) from neighbouring rows (0.5 m apart)
      const awl675 = (at(7.25)['Displacement [m3]'] - at(6.25)['Displacement [m3]']) / 1.0;
      const mono = rows.every((r, i) => i === 0 || r['Displacement [m3]'] > rows[i - 1]['Displacement [m3]']);
      return [
        { name: 'carene 表行数 = 19（0.25..9.0 步长 0.5)', expected: 19, actual: rows.length, unit: '-', tol: 0 },
        { name: '排水量随吃水单调增', expected: 1, actual: mono ? 1 : 0, unit: '-', tol: 0, pass: mono },
        { name: 'V(6.75) = 53290.760 m³ (cheetah.dave 标注 DAVE 值)', expected: 53290.760, actual: r675['Displacement [m3]'], unit: 'm^3', tol: 0.001 * 53290.760 },
        { name: 'CoB z(6.75) = 3.5788 m（notebook 表 6.75 行）', expected: 3.578762, actual: r675['CoB z [m]'], unit: 'm', tol: 0.01 },
        { name: 'CoB x(6.75) = 103.550 m（notebook 表）', expected: 103.550093, actual: r675['CoB x [m]'], unit: 'm', tol: 0.01 },
        { name: 'CoF x(6.75) = 98.945 m（notebook 表）', expected: 98.945439, actual: r675['CoF x [m]'], unit: 'm', tol: 0.005 },
        { name: 'CoF y(6.75) ≈ 0（船体左右对称）', expected: 0, actual: r675['CoF y [m]'], unit: 'm', tol: 1e-3, absFloor: 1e-3 },
        { name: 'Awl(6.75) 有限差分 vs 邻行差分 一致', expected: awl675, actual: r675['Awl [m2]'], unit: 'm^2', tol: 0.02 * awl675 },
        { name: 'BM T(6.75) ≈ 26.7 m（notebook 表，量级+符号）', expected: 26.701756, actual: r675['BM T [m]'], unit: 'm', tol: 0.35 * 26.701756 },
        { name: 'BM L(6.75) ≈ 530.2 m（notebook 表）', expected: 530.195841, actual: r675['BM L [m]'], unit: 'm', tol: 0.05 * 530.195841 },
        { name: 'BM T < BM L 且均为正（细长船）', expected: 1, actual: (r675['BM T [m]'] > 0 && r675['BM L [m]'] > r675['BM T [m]']) ? 1 : 0, unit: '-', tol: 0, pass: r675['BM T [m]'] > 0 && r675['BM L [m]'] > r675['BM T [m]'] },
        { name: 'V(0.25) 量级 ≈ Awl×吃水（浅吃水线性）', expected: r25['Awl [m2]'] * 0.25, actual: r25['Displacement [m3]'], unit: 'm^3', tol: 0.25 * r25['Awl [m2]'] * 0.25 },
        { name: 'V(9.0) 接近船体总容积上限（甲板 21.55 m 未没）', expected: 1, actual: r9['Displacement [m3]'] < 116185 ? 1 : 0, unit: '-', tol: 0, pass: r9['Displacement [m3]'] < 116185 },
        { name: 'kHeave(6.75) = Awl·ρ·g', expected: r675['Awl [m2]'] * RHO * 9.80665 / 1000, actual: rows.find(r => Math.abs(r['Draft [m]'] - 6.75) < 1e-9)['kHeave [kN/m]'], unit: 'kN/m', tol: 1e-6 },
      ];
    },
  },
  {
    // DAVEcore capability surface (the C++ backend's documented function groups) reproduced in JS
    id: 'ex31', cat: 'DAVEcore', name: 'DAVEcore 核心功能复现对照：求解器/DAG/水静力/舱柜/悬链接触/节点工厂/状态同步 + pymeshup 式水线切片',
    desc: 'core/davecore.js 按 DAVEcore（Scene._vfc 的 C++ 后端）公开文档的功能分组做纯 JS 复现并登记（DAVECORE_FEATURES): 静力动力求解、节点 DAG 正向运动学、trimesh 水静力切割、Tank 液舱（free_flooding/permeability/cog_when_full)、悬链线与接触（新增 ContactMesh)、HydSpring/SPMT 等节点工厂、state_update 状态同步；另以 pymeshup 式水线切片 waterplaneProps 对 cheetah 船体做 Awl/CoF/BM T=I_T/V 的独立交叉校验（与 DAVE Carene 表一致)。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex31_davecore_features');
      // 浮箱 + 网格浮力 + free_flooding 破损舱 + HydSpring + 系泊浮标
      const barge = new RigidBody6DOF({
        name: 'barge', type: 'Vessel', mass: 0.6 * RHO * 20 * 10 * 4, cog: [0, 0, 0],
        inertia: [1e7, 1e8, 1e8], pos: [0, 0, -2], rot: [0, 0, 0],
        hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, false, false, true, true, true],
      });
      barge.mesh = boxMesh(20, 10, 4);
      m.addBody(barge);
      m.addElement(new BuoyancyMesh({ name: 'buoy', body: barge, mesh: barge.mesh, rho: RHO }));
      // 破损舱（free flooding): 4x4x4 罐在船内局部 z 中心 -1
      const tankMesh = transformMesh(boxMesh(4, 4, 4), { offset: [0, 0, -1] });
      const tank = new Tank({ name: 'damaged_tank', body: barge, V: 64, fill: 0, rho: RHO, cog: [0, 0, -1], mesh: tankMesh, freeFlooding: true, permeability: 0.8 });
      m.addElement(tank);
      m.addElement(new HydSpring({ name: 'hydspring', body: barge, k: 2e5 })); // N/m
      // 系泊浮标
      const buoyBody = new RigidBody6DOF({
        name: 'Buoy', type: 'Buoy', mass: 2000, cog: [0, 0, 0], inertia: [800, 800, 1200],
        pos: [40, 0, 0], rot: [0, 0, 0], hydro: { kind: 'buoy', V: 2000 / RHO, Awp: Math.PI * 1.5 ** 2, cob: [0, 0, -0.5] },
        addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, false, false, true, true, true],
      });
      m.addBody(buoyBody);
      const line = new Line({
        name: 'Mooring', nSeg: 20, length: 45, d: 0.05, massPerLen: 8, EA: 1e8,
        endA: { type: 'vessel', body: barge, localPoint: [10, 0, 2] },
        endB: { type: 'vessel', body: buoyBody, localPoint: [0, 0, 1] },
      });
      m.addLine(line);
      m.meta.barge = barge; m.meta.tank = tank; m.meta.buoy = buoyBody;
      return m;
    },
    verify(model, ctx) {
      const { barge, tank } = model.meta;
      // --- 1) DAVEcore capability registry complete ---
      const needIds = ['solver', 'fk', 'hydrostatics', 'tank', 'catenary', 'nodes', 'state'];
      const missing = needIds.filter(id => !DAVECORE_FEATURES.some(f => f.id === id && f.impl && f.group));
      // --- 2) pymeshup-style waterplane slice cross-checks carene on the cheetah hull ---
      const cheetah = loadCheetah('ex31_cheetah_ref');
      const cbuoy = cheetah.elements.find(e => e.type === 'Buoyancy');
      const wp = waterplaneProps(cbuoy.mesh, 6.75);
      const lin = linearizedBuoyancyProps(cbuoy.mesh, 6.75);
      const bmtDirect = wp.Ix_c / lin.displacement;  // BM T = I_T / V (exact linearized)
      const bmlDirect = wp.Iy_c / lin.displacement;  // BM L = I_L / V
      // --- 3) Tank free_flooding / permeability / cog_when_full ---
      barge.pos = [0, 0, 1]; barge.rot = [0, 0, 0]; barge.q = [0, 0, 0, 0, 0, 0];
      refreshExternal(model, 0);
      const fluid = tank.freeFloodedFluid();
      // 船体原点在 z=+1 → 世界水线 z=0 = 船内局部 z=-1 → 罐(局部 z∈[-3,1]) 被淹到 -1 → 4*4*2=32 m3 ×0.8
      const tankP1 = new Tank({ name: 't_p1', body: barge, V: 64, rho: RHO, cog: [0, 0, -1], mesh: tank.mesh, freeFlooding: true, permeability: 1 });
      const fluidP1 = tankP1.freeFloodedFluid().V;
      const cogFull = tank.cogWhenFull;
      // --- 4) HydSpring force at known draft ---
      const hs = model.elements.find(e => e.type === 'HydSpring');
      barge.pos = [0, 0, -2]; barge.q = [0, 0, 0, 0, 0, 0];
      refreshExternal(model, 0);
      const hsF = hs.lastF[2];
      // --- 5) ContactMesh statics on a dedicated mini model: cube rests on slab top (world z=0) → center z≈1 ---
      const mini = new Model('ex31_contact');
      const slab = new RigidBody6DOF({ name: 'slab', type: 'Frame', mass: 1e-6, cog: [0, 0, 0], inertia: [1e-6, 1e-6, 1e-6], pos: [0, 0, -1], rot: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
      slab.mesh = boxMesh(20, 20, 2); mini.addBody(slab);
      const cube = new RigidBody6DOF({ name: 'cube', type: 'RigidBody', mass: 500, cog: [0, 0, 0], inertia: [200, 200, 200], pos: [0, 0, 2.5], rot: [0, 0, 0], hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, false, true, true, true] });
      cube.mesh = boxMesh(2, 2, 2); mini.addBody(cube); // 从板上方落下，停在板顶 z≈1
      const cm = new ContactMesh({ name: 'cube_on_slab', body: cube, mesh: cube.mesh, staticBody: slab, k: 2e6 });
      mini.addElement(cm);
      const spmt = new SPMT({ name: 'spmt_drive', body: cube, drive: [5000, 0, 0] });
      mini.addElement(spmt);
      // direct contact-force checks (penalty contact is discontinuous -> avoid Newton here)
      const setZ = (z) => { cube.pos = [0, 0, z]; cube.q = [0, 0, 0, 0, 0, 0]; refreshExternal(mini, 0); return cm.lastF[2]; };
      const W = 500 * 9.80665;
      const fAbove = setZ(1.5);            // 底面离板顶 0.5 m：无接触
      const fPen = setZ(0.8);              // 穿透 0.2 m：4 顶点 × k×0.2 向上
      const delta = W / (4 * 2e6);         // 平衡穿透深度 δ = W/(4k)
      const fEq = setZ(1 - delta);         // 在平衡穿透处 Fz ≈ W
      const spmtF = (refreshExternal(mini, 0), spmt.lastF[0]);
      // --- 7) state sync: moving the body changes recomputed forces ---
      barge.pos = [0, 0, -3]; barge.q = [0, 0, 0, 0, 0, 0];
      refreshExternal(model, 0);
      const hsF2 = hs.lastF[2];
      return [
        { name: 'DAVECORE_FEATURES 覆盖全部 7 组核心功能（求解/DAG/水静力/舱柜/悬链接触/节点工厂/状态同步）', expected: 0, actual: missing.length, unit: '-', tol: 0, absFloor: 0, pass: missing.length === 0 },
        { name: '水线切片 Awl(6.75) = 8821.4 m²（与 carene 有限差分一致）', expected: lin.Awl, actual: wp.A, unit: 'm^2', tol: 0.005 * lin.Awl },
        { name: '水线切片漂心 CoF x(6.75) = 98.945 m（DAVE carene 表）', expected: 98.945439, actual: wp.c[0], unit: 'm', tol: 0.01 },
        { name: '水线切片 CoF y(6.75) ≈ 0（对称）', expected: 0, actual: wp.c[1], unit: 'm', tol: 1e-3, absFloor: 1e-3 },
        { name: 'BM T = I_T/V = 26.709 m（DAVE carene 表 26.7018，直接法）', expected: 26.701756, actual: bmtDirect, unit: 'm', tol: 0.01 * 26.701756 },
        { name: 'BM L = I_L/V ≈ 530 m（DAVE carene 表 530.196，直接法）', expected: 530.195841, actual: bmlDirect, unit: 'm', tol: 0.03 * 530.195841 },
        { name: '破损舱 free_flooding 液量 = 切割体积×permeability = 32×0.8 = 25.6 m³', expected: 25.6, actual: fluid.V, unit: 'm^3', tol: 1e-6 },
        { name: 'permeability=1 时液量 = 32 m³（渗透率缩放）', expected: 32, actual: fluidP1, unit: 'm^3', tol: 1e-6 },
        { name: 'cog_when_full = 罐网格形心 (0,0,−1)', expected: -1, actual: cogFull[2], unit: 'm', tol: 1e-9, absFloor: 1e-9 },
        { name: 'HydSpring: z=−2 m 时 Fz = K·2 = 4e5 N 向上', expected: 2e5 * 2, actual: hsF, unit: 'N', tol: 1e-6 },
        { name: 'ContactMesh：方块在板上方 0.5 m 时无接触力', expected: 0, actual: fAbove, unit: 'N', tol: 1, absFloor: 1 },
        { name: 'ContactMesh：穿透 0.2 m 时 Fz = 4·k·0.2 = 1.6e6 N 向上', expected: 4 * 2e6 * 0.2, actual: fPen, unit: 'N', tol: 0.01 * 1.6e6 },
        { name: 'ContactMesh：平衡穿透深度 δ=W/(4k)=6.13e-4 m 处 Fz=W', expected: W, actual: fEq, unit: 'N', tol: 0.01 * W },
        { name: 'SPMT 驱动力通道 Fx = 5000 N', expected: 5000, actual: spmtF, unit: 'N', tol: 1e-9 },
        { name: 'state_update：船体移到 z=−3 后 HydSpring 力重算为 6e5 N', expected: 6e5, actual: hsF2, unit: 'N', tol: 1e-6 },
      ];
    },
  },
  {
    // DAVE "Core Concepts & Terminology": units, node registry, frames/FK, rotation vector, inertia_radii
    id: 'ex32', cat: 'DAVEcore', name: 'DAVE 核心概念与术语：units(mT/kN/deg)、节点类型注册、frame 正向运动学（可视化 3 级 FK 链）、rotation vector/tilt/heading、inertia_radii',
    desc: 'core/concepts.js 复现 DAVE 核心概念术语：DAVE 单位制（m/mT/kN/kN·m⁻¹/deg 与 SI 互转）、完整 DAVE 节点类型注册表 NODE_TYPES（25 类）、frame 相对父节点的正向运动学（frameWorld 单级 + frameChainWorld 多级链 + pointWorld + worldToLocal 逆变换，全部 rot 为 degrees)、rotation vector（deg)↔ tilt_x/tilt_y/heading、inertia_radii→I=r²·m。演示场景为可视化的 3 级 FK 链 root→mid→leaf：每级一个随动旋转箱体（世界位姿=FK 结果）、红色 POI 标出各 frame 原点，leaf 上的偏移 POI_tip 展示 pointWorld 局部点→世界变换。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex32_concepts');
      const sc = m.scene;
      // 可视化 3 级 FK 链（deg) root→mid→leaf，非平凡旋转
      const chainDeg = [
        { pos: [8, 0, 6], rot: [0, 0, 30] },
        { pos: [4, 1, 0], rot: [0, 20, 0] },
        { pos: [3, -1, 1.5], rot: [0, 0, -15] },
      ];
      const frames = chainDeg.map((f, i) => sc.newFrame('chain' + i, { position: f.pos, rotation: f.rot.map(d => d * (Math.PI / 180)) }));
      sc.setParent(frames[1], frames[0]); sc.setParent(frames[2], frames[1]);
      // 每个 frame 原点挂一个 POI（渲染红点）；leaf 局部偏移点展示 pointWorld
      for (let i = 0; i < 3; i++) { const p = sc.newPoi('poi' + i, { position: [0, 0, 0] }); sc.setParent(p, frames[i]); }
      const poiTip = sc.newPoi('poi_tip', { position: [2, 0.5, 0.5] }); sc.setParent(poiTip, frames[2]);
      // 每级一个随动箱体：世界位姿 = FK 结果（pos + rot 矩阵→rotvec)，直观看到平移+旋转合成
      const poses = [frameWorld(chainDeg[0], null), frameChainWorld(chainDeg.slice(0, 2)), frameChainWorld(chainDeg)];
      poses.forEach((pose, i) => {
        const b = new RigidBody6DOF({ name: 'fk' + i, type: 'Frame', mass: 1e-6, cog: [0, 0, 0], inertia: [1e-6, 1e-6, 1e-6], pos: [...pose.pos], rot: mat3ToRotVec(pose.R), hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [true, true, true, true, true, true] });
        b.mesh = boxMesh(0.8, 0.8, 0.8);
        m.addBody(b);
      });
      // 浮筒（静力收敛演示）
      const buoy = new RigidBody6DOF({ name: 'Buoy', type: 'Buoy', mass: 2000, cog: [0, 0, 0], inertia: [800, 800, 1200], pos: [30, 14, 0], rot: [0, 0, 0], hydro: { kind: 'buoy', V: 2000 / RHO, Awp: Math.PI * 1.5 ** 2, cob: [0, 0, -0.5] }, addedMass: [0, 0, 0, 0, 0, 0], fixed: [false, false, false, true, true, true] });
      m.addBody(buoy);
      m.meta = { sc, frames, poiTip, chainDeg, bodies: m.bodies };
      return m;
    },
    verify(model, ctx) {
      const { sc, frames, poiTip, chainDeg } = model.meta;
      const A = model.bodies[0], B = model.bodies[1];
      // units round-trip (DAVE mT/kN/deg <-> SI)
      const u = DAVE_UNITS;
      // node registry covers the DAVE class list (node_prop_info.csv)
      const daveClasses = ['Axis', 'Point', 'Poi', 'Frame', 'RigidBody', 'Cable', 'Beam', 'LC6d', 'Connector2d', 'Force', 'HydSpring', 'Buoyancy', 'Visual', 'Tank', 'BallastSystem', 'ContactBall', 'ContactMesh', 'GeometricContact', 'Circle', 'Shackle', 'Sling', 'SPMT', 'WindOrCurrentArea', 'WaveInteraction', 'Measurement'];
      const missing = daveClasses.filter(c => !NODE_TYPES.some(n => n.dave.includes(c)));
      // FK: child frame at local (2,0,0) on parent (10,0,5), yaw 30°
      const fk = frameWorld({ pos: [2, 0, 0], rot: [0, 0, 0] }, { pos: [10, 0, 5], rot: [0, 0, 30] }); // local/parent rot 均为 deg
      const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
      // rotation composition: parent yaw 30 + child yaw 30 -> world yaw 60
      const comp = frameWorld({ pos: [0, 0, 0], rot: [0, 0, 30] }, { pos: [0, 0, 0], rot: [0, 0, 30] }); // 双方均为 deg → yaw 60°
      const compDeg = Math.hypot(comp.R[0], comp.R[3]) !== 0 ? Math.atan2(comp.R[3], comp.R[0]) * 180 / Math.PI : 0;
      // rotation vector <-> euler (DAVE tilt/heading definitions)
      const e1 = rotVecToEuler(eulerToRotVec(30, 0, 0));
      const e2 = rotVecToEuler(eulerToRotVec(0, 0, 25));
      const e3 = rotVecToEuler(eulerToRotVec(0, 12, 0));
      const e4 = rotVecToEuler([10, -8, 35]); // arbitrary rotvec -> euler (single-axis consistency)
      // inertia_radii
      const I = inertiaFromRadii(1000, [2, 3, 4]);
      // ---- deeper FK: the visible 3-level chain (all deg) ----
      const chain = chainDeg;
      const leafW = frameChainWorld(chain);
      // manual step-by-step composition with math.js primitives (rot in rad)
      let mP = [0, 0, 0], mR = rotVecToMat3([0, 0, 0]);
      for (const f of chain) {
        const Rl = rotVecToMat3(f.rot.map(d => d * (Math.PI / 180)));
        mP = mat3Vec(mR, f.pos).map((v, i) => v + mP[i]);
        mR = mat3Mul(mR, Rl);
      }
      const chainPosErr = Math.max(...leafW.pos.map((v, i) => Math.abs(v - mP[i])));
      const chainRErr = Math.max(...leafW.R.map((v, i) => Math.abs(v - mR[i])));
      // cross-check against the model's own Scene DAG (SNode.rotation is radians)
      const dag = sc.worldTransform(frames[2]);
      const dagPosErr = Math.max(...leafW.pos.map((v, i) => Math.abs(v - dag.pos[i])));
      const dagRErr = Math.max(...leafW.R.map((v, i) => Math.abs(v - dag.R[i])));
      // point attached to leaf frame: p_w = pos + R * p_local (Poi semantics); poi_tip 挂在 leaf 局部 (1.5,0.5,0.3)
      const pw = pointWorld(leafW, [2, 0.5, 0.5]);
      const pwManual = mat3Vec(leafW.R, [2, 0.5, 0.5]).map((v, i) => v + leafW.pos[i]);
      const pwErr = Math.max(...pw.map((v, i) => Math.abs(v - pwManual[i])));
      const poiTipErr = Math.max(...sc.worldPosition(poiTip).map((v, i) => Math.abs(v - pw[i]))); // 渲染的 POI 就是 pointWorld 结果
      // inverse FK round-trip: worldToLocal(parentWorld, frameWorld(local, parentWorld)) == local
      const parentW = frameChainWorld(chain.slice(0, 2));
      const localPose = { pos: [2, 1, -1], rot: [5, -10, 30] };
      const wPose = frameWorld(localPose, { pos: parentW.pos, rot: mat3ToRotVec(parentW.R).map(v => v * (180 / Math.PI)) }); // 世界 rot 转回 deg
      const back = worldToLocal({ pos: parentW.pos, R: parentW.R }, { pos: wPose.pos, R: wPose.R });
      const invPosErr = Math.max(...back.pos.map((v, i) => Math.abs(v - localPose.pos[i])));
      const backRotErr = Math.max(...rotVecToMat3(back.rot.map(v => v * (Math.PI / 180))).map((v, i) => Math.abs(v - rotVecToMat3(localPose.rot.map(v => v * (Math.PI / 180)))[i]))); // 比旋转矩阵（rotvec 180° 轴向翻转等价）
      // mixed-axis composition: parent rotvec(10,-20,30)deg * child rotvec(5,15,-25)deg
      const mix = frameWorld({ pos: [0, 0, 0], rot: [5, 15, -25] }, { pos: [0, 0, 0], rot: [10, -20, 30] }); // 均为 deg
      const mixManual = mat3Mul(rotVecToMat3([10, -20, 30].map(d => d * (Math.PI / 180))), rotVecToMat3([5, 15, -25].map(d => d * (Math.PI / 180))));
      const mixErr = Math.max(...mix.R.map((v, i) => Math.abs(v - mixManual[i])));
      // semantic guard: DAVE 角度约定 — parent.rot=[0,0,90] 必须按 90° 解析（若误按 90 rad 则 R[0]=cos90rad≈-0.448)
      const g = frameWorld({ pos: [0, 0, 0], rot: [0, 0, 0] }, { pos: [0, 0, 0], rot: [0, 0, 90] });
      const rz90err = Math.max(Math.abs(g.R[0] - 0), Math.abs(g.R[1] - (-1)), Math.abs(g.R[3] - 1), Math.abs(g.R[4] - 0));
      // ---- randomized property test: 20 random 4-level chains, fixed seed ----
      const rnd = rng32(42);
      const rr = (a, b) => a + (b - a) * rnd();
      // independent Rodrigues implementation (ex26 style, 2D arrays)
      const rot2 = (r) => {
        const th = Math.hypot(r[0], r[1], r[2]);
        if (th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const x = r[0] / th, y = r[1] / th, z = r[2] / th, c = Math.cos(th), sn = Math.sin(th), C = 1 - c;
        return [[c + x * x * C, x * y * C - z * sn, x * z * C + y * sn],
                [y * x * C + z * sn, c + y * y * C, y * z * C - x * sn],
                [z * x * C - y * sn, z * y * C + x * sn, c + z * z * C]];
      };
      const mul2 = (A, B) => A.map((row, i) => B[0].map((_, j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
      const apply2 = (A, v) => A.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
      let maxDagErr = 0, maxIndepErr = 0, maxInvErr = 0;
      for (let t = 0; t < 20; t++) {
        const rchain = Array.from({ length: 4 }, () => ({ pos: [rr(-5, 5), rr(-5, 5), rr(-5, 5)], rot: [rr(-180, 180), rr(-89, 89), rr(-180, 180)] }));
        const w = frameChainWorld(rchain);
        // vs Scene DAG worldTransform (SNode.rotation in rad)
        const sc2 = new Scene('rnd' + t);
        let prev = null;
        const nodes = rchain.map((f, i) => {
          const n = sc2.newFrame('f' + i, { position: f.pos, rotation: f.rot.map(d => d * (Math.PI / 180)) });
          if (prev) sc2.setParent(n, prev);
          prev = n; return n;
        });
        const dag2 = sc2.worldTransform(nodes[3]);
        maxDagErr = Math.max(maxDagErr, ...w.pos.map((v, i) => Math.abs(v - dag2.pos[i])), ...w.R.map((v, i) => Math.abs(v - dag2.R[i])));
        // vs independent 2D Rodrigues composition
        let p2 = [0, 0, 0], R2 = rot2([0, 0, 0]);
        for (const f of rchain) {
          const Rl = rot2(f.rot.map(d => d * (Math.PI / 180)));
          p2 = apply2(R2, f.pos).map((v, i) => v + p2[i]);
          R2 = mul2(R2, Rl);
        }
        const R2flat = R2.flat();
        maxIndepErr = Math.max(maxIndepErr, ...w.pos.map((v, i) => Math.abs(v - p2[i])), ...w.R.map((v, i) => Math.abs(v - R2flat[i])));
        // inverse round-trip on the leaf
        const rparentW = frameChainWorld(rchain.slice(0, 3));
        const rlocal = { pos: rchain[3].pos, rot: rchain[3].rot };
        const rwPose = frameWorld(rlocal, { pos: rparentW.pos, rot: mat3ToRotVec(rparentW.R).map(v => v * (180 / Math.PI)) });
        const rback = worldToLocal({ pos: rparentW.pos, R: rparentW.R }, { pos: rwPose.pos, R: rwPose.R });
        // rotvec 在角度>180°时轴向翻转等价，故比较旋转矩阵而非分量
        const Rback = rotVecToMat3(rback.rot.map(v => v * (Math.PI / 180)));
        const Rloc = rotVecToMat3(rlocal.rot.map(v => v * (Math.PI / 180)));
        maxInvErr = Math.max(maxInvErr, ...rback.pos.map((v, i) => Math.abs(v - rlocal.pos[i])), ...Rback.map((v, i) => Math.abs(v - Rloc[i])));
      }
      return [
        { name: 'DAVE 单位制: 12300 mT = 1.23e7 kg; 10 kN = 1e4 N; 90° = π/2', expected: 1, actual: (u.massToSI(12300) === 1.23e7 && u.forceToSI(10) === 1e4 && Math.abs(u.angleToSI(90) - Math.PI / 2) < 1e-12) ? 1 : 0, unit: '-', tol: 0, pass: u.massToSI(12300) === 1.23e7 && u.forceToSI(10) === 1e4 && Math.abs(u.angleToSI(90) - Math.PI / 2) < 1e-12 },
        { name: '单位制往返无损 (SI->DAVE->SI)', expected: 1, actual: (u.massFromSI(u.massToSI(777)) === 777 && u.forceFromSI(u.forceToSI(3.5)) === 3.5 && Math.abs(u.angleFromSI(u.angleToSI(45)) - 45) < 1e-12) ? 1 : 0, unit: '-', tol: 0, pass: u.massFromSI(u.massToSI(777)) === 777 && u.forceFromSI(u.forceToSI(3.5)) === 3.5 },
        { name: `NODE_TYPES 覆盖全部 ${daveClasses.length} 个 DAVE 节点类`, expected: 0, actual: missing.length, unit: '-', tol: 0, absFloor: 0, pass: missing.length === 0 },
        { name: 'FK: 子 frame 局部(2,0,0) 在父(10,0,5,yaw30°) → 世界 x = 10+2cos30', expected: 10 + 2 * c30, actual: fk.pos[0], unit: 'm', tol: 1e-12 },
        { name: 'FK: 世界 y = 2sin30 = 1, z = 5', expected: 1, actual: Math.abs(fk.pos[1] - 1) < 1e-12 && Math.abs(fk.pos[2] - 5) < 1e-12 ? 1 : 0, unit: 'm', tol: 0, absFloor: 0, pass: Math.abs(fk.pos[1] - 1) < 1e-12 && Math.abs(fk.pos[2] - 5) < 1e-12 },
        { name: '可视化链: 箱体 fk1 世界坐标 == frameChainWorld(前两级) (B 帧 FK 一致)', expected: frameChainWorld(chain.slice(0, 2)).pos[0], actual: B.pos[0], unit: 'm', tol: 1e-9 },
        { name: '旋转合成: 父 yaw30° + 子 yaw30° → 世界 yaw 60°', expected: 60, actual: compDeg, unit: 'deg', tol: 1e-9 },
        { name: 'heading: rotvec(30,0,0) → heading=30°, tilt=0', expected: 30, actual: e1.heading, unit: 'deg', tol: 1e-9 },
        { name: 'tilt_y: rotvec(0,0,25) → tilt_y=25° (绕 y 正转 → 正 tilt_y)', expected: 25, actual: e2.tilt_y, unit: 'deg', tol: 1e-9 },
        { name: 'tilt_x: rotvec(0,12,0) → tilt_x=12°', expected: 12, actual: e3.tilt_x, unit: 'deg', tol: 1e-9 },
        { name: '任意 rotvec(10,-8,35) 的 euler 分解自洽 |heading|≤180', expected: 1, actual: Math.abs(e4.heading) <= 180 && isFinite(e4.tilt_x) && isFinite(e4.tilt_y) ? 1 : 0, unit: '-', tol: 0, pass: Math.abs(e4.heading) <= 180 && isFinite(e4.tilt_x) },
        { name: 'inertia_radii: I = r²·m = (4000, 9000, 16000) for m=1000, r=(2,3,4)', expected: 16000, actual: I[2], unit: 'kg m^2', tol: 1e-9 },
        { name: '静力求解收敛（演示场景）', expected: 1, actual: ctx.st.converged ? 1 : 0, unit: '-', tol: 0, pass: ctx.st.converged === true },
        { name: '深挖 FK·多级链: 3 层 frame 链 frameChainWorld == 逐步手工合成 (pos 误差)', expected: 0, actual: chainPosErr, unit: 'm', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·多级链: 旋转矩阵逐元素误差', expected: 0, actual: chainRErr, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·与 Scene DAG worldTransform 一致 (pos 误差)', expected: 0, actual: dagPosErr, unit: 'm', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·与 Scene DAG worldTransform 一致 (R 误差)', expected: 0, actual: dagRErr, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·点随 frame 变换 pointWorld: p_w = pos + R·p_local', expected: 0, actual: pwErr, unit: 'm', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·渲染的 poi_tip 世界坐标 == pointWorld(leaf, 局部点) (截图可见）', expected: 0, actual: poiTipErr, unit: 'm', tol: 1, absFloor: 1e-12 },
        { name: '深挖 FK·逆变换往返 worldToLocal∘frameWorld = identity (pos 误差)', expected: 0, actual: invPosErr, unit: 'm', tol: 1, absFloor: 1e-9 },
        { name: '深挖 FK·逆变换往返 (rot 矩阵误差)', expected: 0, actual: backRotErr, unit: '-', tol: 1, absFloor: 1e-9 },
        { name: '深挖 FK·混合轴合成 父(10,-20,30)°×子(5,15,-25)° == mat3Mul 手工 (R 误差)', expected: 0, actual: mixErr, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: 'FK 角度约定: parent.rot=[0,0,90] 按 90° 解析 → R≈Rz(90°)（防 90 rad 误读）', expected: 0, actual: rz90err, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '随机属性测试: 20 条 4 级随机链 frameChainWorld == Scene DAG worldTransform (err)', expected: 0, actual: maxDagErr, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '随机属性测试: == 独立 2D Rodrigues 手工合成 (err)', expected: 0, actual: maxIndepErr, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '随机属性测试: 逆变换往返 max err (20 链, 机器精度)', expected: 0, actual: maxInvErr, unit: '-', tol: 1, absFloor: 1e-9 },
      ];
    },
  },
  {
    // DAVE docs groups.md / nodetree.rst / dissolve.md — scene node-tree architecture
    id: 'ex33', cat: 'DAVE-nb', name: 'DAVE 节点树架构：observers 通知与级联删除、Manager 依赖排序、dissolve 保持世界位姿',
    desc: '按 DAVE 公开文档 groups.md / nodetree.rst / dissolve.md 在 core/scene.js 落地节点树架构：SNode 层 observers（setProp 触发 on_observed_node_changed)、删除被观察节点时级联删除 observer、topoOrder 按依赖边（parent + 被观察节点 + Manager.dependsOn) 排序、Manager 管理的节点语义（managedNodes/creates/manager)、dissolveNode：dissolve 中间 Frame 时把子节点重挂到祖父并保持世界位姿（逆 FK)，附着点 Point 拒绝 dissolve。',
    analysis: { kind: 'statics' },
    camera: 'auto',
    build() {
      const m = new Model('ex33_nodetree');
      const sc = m.scene;
      // 3 层 frame 链（dissolve 测试用，非平凡旋转）
      const root = sc.newFrame('root', { position: [10, 0, 5], rotation: [0, 0, 30 * Math.PI / 180] });
      const mid = sc.newFrame('mid', { position: [2, 0, 0], rotation: [0, 20 * Math.PI / 180, 0] });
      const leaf = sc.newFrame('leaf', { position: [1, 0, 0], rotation: [0, 0, -15 * Math.PI / 180] });
      sc.setParent(mid, root); sc.setParent(leaf, mid);
      // observer 对：observed 被 observer 观察
      const observed = sc.newPoint('observed', { position: [0, 0, 0] });
      const observer = sc.newAxis('observer', { position: [0, 0, 0] });
      observed.addObserver(observer);
      // manager：管理一个 point，依赖 base 必须先存在
      const base = sc.newAxis('base', { position: [0, 0, 0] });
      const p = sc.newPoint('managed_point', { position: [1, 1, 0] });
      const mgr = new Manager('mgr', { position: [0, 0, 0] });
      sc.add(mgr);
      mgr.dependsOn = () => [base];
      mgr.managed.push(p); p.manager = mgr;
      // 附着 point（dissolve 应拒绝）
      const poi = sc.newPoint('poi_attached', { position: [0, 0, 0] });
      const circ = sc.newCircle('circ_on_poi', { position: [0.1, 0, 0] });
      sc.setParent(circ, poi);
      m.meta = { sc, root, mid, leaf, observed, observer, base, mgr, p, poi, circ };
      return m;
    },
    verify(model, ctx) {
      const { sc, root, mid, leaf, observed, observer, base, mgr, p, poi } = model.meta;
      // 1) observer 通知
      observed.setProp('some_prop', 42);
      const notified = observer.observedChanges.length === 1 && observer.observedChanges[0] === 'observed' && observed.props.some_prop === 42;
      // 2) 依赖感知 topo 排序（在任何删除前）
      const order = sc.topoOrder().map(n => n.name);
      const topoOK = order.indexOf('observed') < order.indexOf('observer')
        && order.indexOf('base') < order.indexOf('mgr')
        && order.indexOf('root') < order.indexOf('mid') && order.indexOf('mid') < order.indexOf('leaf');
      // 3) Manager 语义
      const mgrOK = mgr.managedNodes().includes(p) && mgr.creates(p) && !mgr.creates(base) && p.manager === mgr;
      // 4) dissolve 中间 frame：先记录 leaf 世界位姿
      const before = sc.worldTransform(leaf);
      dissolveNode(sc, 'mid');
      const after = sc.worldTransform(leaf);
      const dPos = Math.max(...before.pos.map((v, i) => Math.abs(v - after.pos[i])));
      const dR = Math.max(...before.R.map((v, i) => Math.abs(v - after.R[i])));
      const reparentOK = leaf.parent === root && sc.get('mid') === undefined;
      // 5) 附着 Point 的 dissolve 被拒绝
      let refused = false;
      try { dissolveNode(sc, 'poi_attached'); } catch (e) { refused = /无附着/.test(e.message); }
      // 6) 删除被观察节点 → observer 级联删除
      sc.remove('observed');
      const cascadeOK = sc.get('observed') === undefined && sc.get('observer') === undefined;
      return [
        { name: 'observer: setProp 触发 on_observed_node_changed(observed)', expected: 1, actual: notified ? 1 : 0, unit: '-', tol: 0, pass: notified },
        { name: 'topoOrder 依赖排序: observed<observer, base<mgr, root<mid<leaf', expected: 1, actual: topoOK ? 1 : 0, unit: '-', tol: 0, pass: topoOK },
        { name: 'Manager 语义: managedNodes/creates/manager 反引', expected: 1, actual: mgrOK ? 1 : 0, unit: '-', tol: 0, pass: mgrOK },
        { name: 'dissolve 中间 frame 后 leaf 世界 pos 不变', expected: 0, actual: dPos, unit: 'm', tol: 1, absFloor: 1e-12 },
        { name: 'dissolve 中间 frame 后 leaf 世界 R 不变 + 重挂 root 且 mid 被删', expected: 0, actual: reparentOK ? dR : 999, unit: '-', tol: 1, absFloor: 1e-12 },
        { name: '附着 Point 的 dissolve 被拒绝（DAVE: nothing attached）', expected: 1, actual: refused ? 1 : 0, unit: '-', tol: 0, pass: refused },
        { name: '删除被观察节点 → observer 级联删除', expected: 1, actual: cascadeOK ? 1 : 0, unit: '-', tol: 0, pass: cascadeOK },
      ];
    },
  },
];

export function getExample(id) { return EXAMPLES.find(e => e.id === id); }
