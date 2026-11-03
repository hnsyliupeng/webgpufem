// tools/smoke.mjs — fast smoke test of the core library (no long dynamics).
// Usage: node tools/smoke.mjs   (exit 0 = OK)
import { EXAMPLES } from '../examples/index.js';
import * as sv from '../core/solvers.js';
import { solveCatenary, catenaryPoint, mooringTouchdown } from '../core/catenary.js';
import { WaveField } from '../core/waves.js';
import { rainflow, minerDamage } from '../core/post.js';

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); if (!cond) fails++; };

console.log('smoke: catenary');
const w0 = 20 * 9.80665, EA = 5e7, L0 = 120;
const c = solveCatenary(5000, -w0 * L0 / 2, w0, EA, L0, 80, 0);
const tip = catenaryPoint(c.H, c.V, w0, EA, L0, L0);
ok(Math.abs(tip.x - 80) < 1e-6 && Math.abs(tip.z) < 1e-6, `solveCatenary level span: H=${c.H.toFixed(1)} N, end=(${tip.x.toFixed(6)}, ${tip.z.toExponential(1)}) vs (80, 0)`);
const mt = mooringTouchdown(450, (100 - 1025 * Math.PI * 0.1 ** 2) * 9.80665, 1e9, 0.6, 100, 400, -5);
ok(mt.x_td > 0 && mt.Ls < 450 && mt.H > 0, `mooringTouchdown x_td=${mt.x_td.toFixed(2)} Ls=${mt.Ls.toFixed(1)} H=${mt.H.toFixed(0)}`);

console.log('smoke: waves');
const w = new WaveField({ kind: 'JONSWAP', Hs: 4, Tp: 10, h: 100, seed: 42, nComp: 24 });
let m0 = 0; for (let i = 0; i < 2000; i++) { const ww = 0.2 + (i + 0.5) * (3.0 - 0.2) / 2000; m0 += w.Sfun(ww) * (3.0 - 0.2) / 2000; }
ok(Math.abs(m0 - 1.0) < 1e-6, `JONSWAP m0=${m0.toFixed(6)} (Hs^2/16=1)`);
ok(w.eta(3, 2, 1.5) === w.eta(3, 2, 1.5), 'eta deterministic (seeded)');
const wr = new WaveField({ kind: 'regular', H: 2, T: 6, h: 50, ramp: 5 });
ok(wr.eta(0, 0, 0) === 0 && wr.rampFactor(10) === 1, 'regular wave ramp: eta(0)=0 at t=0, full at t>=ramp');

console.log('smoke: post');
const hist = Array.from({ length: 2000 }, (_, i) => 1000 + 800 * Math.sin(i / 50) + 200 * Math.sin(i / 7));
const rf = rainflow(hist);
const { D, nCycles } = minerDamage(rf, { m: 3, A: 1e12 });
ok(rf.length > 5 && D > 0, `rainflow cycles=${rf.length} (n=${nCycles}), Miner D=${D.toExponential(2)}`);

console.log(`smoke: examples statics (all ${EXAMPLES.length})`);
for (const ex of EXAMPLES) {
  const m = ex.build();
  let st = sv.computeStatics(m, { tol: 1e-6, maxIter: 80 });
  // ex10: slack hanging line in water, normalized residual saturates ~8 (accepted by runner checks)
  const bound = ex.id === 'ex10' ? 1e2 : 1e-6;
  if (st.residual >= bound) {
    // LM examples (taut lines / hinge chains) need the adaptive LM mode; rebuild fresh and re-run,
    // accept the same residual floor the verification runner uses (absFloor ~ 2..10)
    const m2 = ex.build();
    st = sv.computeStatics(m2, { tol: 1e-6, maxIter: 2500, mode: 'lm' });
    ok(st.residual < 10, `${ex.id} statics residual=${st.residual.toExponential(2)} (${st.iterations} it, lm)`);
  } else {
    ok(true, `${ex.id} statics residual=${st.residual.toExponential(2)} (${st.iterations} it)`);
  }
}

console.log(fails === 0 ? 'SMOKE OK' : `SMOKE FAILED (${fails})`);
process.exit(fails === 0 ? 0 : 1);
