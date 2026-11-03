// core/post.js — post-processing: statistics, range graphs, rainflow + Miner, extremes
export function stats(y) {
  const n = y.length;
  if (!n) return { n: 0, mean: 0, std: 0, min: 0, max: 0 };
  let s = 0, s2 = 0, mn = Infinity, mx = -Infinity;
  for (const v of y) { s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const mean = s / n;
  const std = Math.sqrt(Math.max(s2 / n - mean * mean, 0));
  return { n, mean, std, min: mn, max: mx, range: mx - mn };
}

// standard 3-point rainflow counting (ASTM E1049 style)
export function rainflow(y) {
  // turning points
  const tp = [y[0]];
  for (let i = 1; i < y.length - 1; i++) {
    if ((y[i] - y[i - 1]) * (y[i + 1] - y[i]) < 0) tp.push(y[i]);
  }
  tp.push(y[y.length - 1]);
  const S = [];
  const cycles = [];
  for (const x of tp) {
    S.push(x);
    while (S.length >= 3) {
      const r1 = Math.abs(S[S.length - 2] - S[S.length - 3]); // previous range
      const r2 = Math.abs(S[S.length - 1] - S[S.length - 2]); // newest range
      if (r2 <= r1) {
        // the pair (S[-3], S[-2]) closes a full hysteresis loop
        cycles.push({ range: r1, mean: (S[S.length - 3] + S[S.length - 2]) / 2, count: 1 });
        S.splice(S.length - 3, 2); // remove the closed loop, keep S[-1]
      } else break;
    }
  }
  // residuals count as half cycles
  for (let i = 0; i < S.length - 1; i++) {
    cycles.push({ range: Math.abs(S[i + 1] - S[i]), mean: (S[i] + S[i + 1]) / 2, count: 0.5 });
  }
  return cycles;
}

// Miner damage with S-N curve: N = A * S^-m  (S = tension/stress range)
export function minerDamage(cycles, { m = 3, A = 1e12 }, scale = 1) {
  let D = 0, nCycles = 0;
  for (const c of cycles) {
    const S = c.range * scale;
    nCycles += c.count;
    if (S <= 0) continue;
    const N = A * Math.pow(S, -m);
    D += c.count / N;
  }
  return { D, nCycles };
}

export function extremes(y, { method = 'max' } = {}) {
  const s = stats(y);
  return { max: s.max, min: s.min, mean3sigma: s.mean + 3 * s.std, std: s.std };
}

// Gumbel plotting-position estimate of e.g. 1-yr extreme (needs nYears of data)
export function gumbelExtreme(y, returnPeriodYears, yearsOfData) {
  const s = stats(y);
  const p = 1 - 1 / (returnPeriodYears / Math.max(yearsOfData, 1e-9));
  // reduced variate
  const yr = -Math.log(-Math.log(Math.min(Math.max(p, 1e-9), 1 - 1e-9)));
  // approximate with normal quantile scaled
  return s.mean + s.std * yr * 0.9;
}

export function downsample(t, y, maxPts = 2000) {
  if (y.length <= maxPts) return { t, y };
  const k = Math.ceil(y.length / maxPts);
  const tt = [], yy = [];
  for (let i = 0; i < y.length; i += k) { tt.push(t[i]); yy.push(y[i]); }
  return { t: tt, y: yy };
}
