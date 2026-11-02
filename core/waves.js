// core/waves.js — wave theories, spectra, kinematics (public-domain linear wave theory)
import { rng32 } from './math.js';

export const G = 9.80665;

// dispersion relation: w^2 = g k tanh(k h); solve k(w, h) by Newton
export function waveNumber(w, h) {
  if (!(h > 0)) return w * w / G; // deep water
  let k = w * w / G;
  for (let i = 0; i < 60; i++) {
    const th = Math.tanh(k * h);
    const f = G * k * th - w * w;
    const df = G * th + G * k * h * (1 - th * th);
    const dk = f / df;
    k -= dk;
    if (Math.abs(dk) < 1e-12 * Math.max(k, 1e-9)) break;
  }
  return k;
}

// Airy (linear) wave kinematics at (x,y,z,t). z=0 at SWL, +z up, water depth h.
export function airyKinematics(w, amp, beta, h, x, y, z, t, phase = 0, rho = 1025) {
  const k = waveNumber(w, h);
  const kx = k * Math.cos(beta), ky = k * Math.sin(beta);
  const ph = kx * x + ky * y - w * t + phase;
  const eta = amp * Math.cos(ph);
  const ch = h > 0 ? Math.cosh(k * (z + h)) / Math.sinh(k * h) : Math.exp(k * z);
  const sh = h > 0 ? Math.sinh(k * (z + h)) / Math.sinh(k * h) : Math.exp(k * z);
  const chd = h > 0 ? Math.cosh(k * (z + h)) / Math.cosh(k * h) : Math.exp(k * z);
  const cp = Math.cos(ph), sp = Math.sin(ph);
  return {
    eta,
    u: amp * w * ch * cp * Math.cos(beta),
    v: amp * w * ch * cp * Math.sin(beta),
    w: amp * w * sh * sp,
    ax: amp * w * w * ch * sp * Math.cos(beta),
    ay: amp * w * w * ch * sp * Math.sin(beta),
    az: -amp * w * w * sh * cp,
    pDyn: rho * G * amp * chd * cp,
    k,
  };
}

// Stokes 2nd-order (deep/intermediate) — documented as simplified 2nd-order option
export function stokes2(w, amp, h, x, z, t) {
  const k = waveNumber(w, h);
  const ph = k * x - w * t;
  const sh = Math.sinh(k * h), th = Math.tanh(k * h);
  const eta = amp * Math.cos(ph) + (k * amp * amp * (3 - th * th) / (4 * th ** 3)) * Math.cos(2 * ph);
  const u = (amp * w * Math.cosh(k * (z + h)) / sh) * Math.cos(ph)
    + (3 * amp * amp * w * k / (4 * sh ** 2)) * Math.cosh(2 * k * (z + h)) * Math.cos(2 * ph) * sh / sh;
  const wv = amp * w * Math.sinh(k * (z + h)) * Math.sin(ph)
    + (3 * amp * amp * w * k / (4 * sh ** 2)) * Math.sinh(2 * k * (z + h)) * Math.sin(2 * ph);
  return { eta, u, w: wv, k };
}

// ---- spectra (shape functions; rescaled to match Hs) ----
export function spectrumJONSWAP(w, Hs, Tp, gamma = 3.3) {
  if (w <= 1e-6) return 0;
  const wp = 2 * Math.PI / Tp;
  const sigma = w <= wp ? 0.07 : 0.09;
  const r = Math.exp(-((w - wp) ** 2) / (2 * sigma * sigma * wp * wp));
  return (0.0081 * G * G / Math.pow(w, 5)) * Math.exp(-1.25 * Math.pow(wp / w, 4)) * Math.pow(gamma, r);
}
export function spectrumPM(w, Hs, Tp) { // ISSC/Bretschneider form in terms of peak
  if (w <= 1e-6) return 0;
  const wp = 2 * Math.PI / Tp;
  return (5 / 16) * (Hs * Hs / 16) * 0 + (8.1e-3 * G * G / Math.pow(w, 5)) * Math.exp(-1.25 * Math.pow(wp / w, 4));
}
export function spectrumOchiHubble() { return () => 0; }

// scale any shape S0 so that m0 = ∫S dw = Hs^2/16
export function scaleSpectrumToHs(S0, Hs, wmin = 0.2, wmax = 3.0, n = 2000) {
  let m0 = 0;
  const dw = (wmax - wmin) / n;
  for (let i = 0; i < n; i++) m0 += S0(wmin + (i + 0.5) * dw) * dw;
  const f = (Hs * Hs / 16) / Math.max(m0, 1e-12);
  return (w) => S0(w) * f;
}

// discretize into N components with seeded random phases (reproducible)
export function discretizeSpectrum(S, { wmin = 0.2, wmax = 3.0, n = 64, seed = 42, h = 0, direction = 0 } = {}) {
  const rnd = rng32(seed);
  const comps = [];
  const dw = (wmax - wmin) / n;
  for (let i = 0; i < n; i++) {
    const w = wmin + (i + 0.5) * dw;
    const a = Math.sqrt(2 * S(w) * dw);
    if (a < 1e-9) continue;
    comps.push({ w, a, phase: rnd() * 2 * Math.PI, k: waveNumber(w, h), dir: direction });
  }
  return comps;
}

// irregular sea: Airy superposition of components
export function irregularKinematics(comps, h, x, y, z, t, rho = 1025) {
  let eta = 0, u = 0, v = 0, w = 0, ax = 0, ay = 0, az = 0, p = 0;
  for (const c of comps) {
    const kx = c.k * Math.cos(c.dir), ky = c.k * Math.sin(c.dir);
    const ph = kx * x + ky * y - c.w * t + c.phase;
    const cp = Math.cos(ph), sp = Math.sin(ph);
    const kz = c.k * (z + h);
    const ch = h > 0 ? Math.cosh(kz) / Math.sinh(c.k * h) : Math.exp(c.k * z);
    const sh = h > 0 ? Math.sinh(kz) / Math.sinh(c.k * h) : Math.exp(c.k * z);
    const chd = h > 0 ? Math.cosh(kz) / Math.cosh(c.k * h) : Math.exp(c.k * z);
    eta += c.a * cp;
    u += c.a * c.w * ch * cp * Math.cos(c.dir);
    v += c.a * c.w * ch * cp * Math.sin(c.dir);
    w += c.a * c.w * sh * sp;
    ax += c.a * c.w * c.w * ch * sp * Math.cos(c.dir);
    ay += c.a * c.w * c.w * ch * sp * Math.sin(c.dir);
    az += -c.a * c.w * c.w * sh * cp;
    p += rho * G * c.a * chd * cp;
  }
  return { eta, u, v, w, ax, ay, az, pDyn: p };
}

// WaveField: regular (Airy) or irregular (spectrum). dir = heading (rad from +x).
export class WaveField {
  constructor(cfg) {
    this.cfg = cfg || {};
    this.h = cfg.h ?? 0;
    this.dir = cfg.dir ?? 0;
    this.rho = cfg.rho ?? 1025;
    this.ramp = cfg.ramp ?? 0;
    this.kind = cfg.kind || 'regular';
    if (this.kind === 'regular') {
      this.w = 2 * Math.PI / cfg.T;
      this.amp = cfg.H / 2;
      this.k = waveNumber(this.w, this.h);
      this.comps = null;
      this.H = cfg.H; this.T = cfg.T;
    } else {
      const shape = cfg.spectrum === 'pm' ? ((w) => spectrumPM(w, cfg.Hs, cfg.Tp)) : ((w) => spectrumJONSWAP(w, cfg.Hs, cfg.Tp, cfg.gamma ?? 3.3));
      this.Sfun = scaleSpectrumToHs(shape, cfg.Hs, cfg.wmin ?? 0.2, cfg.wmax ?? 3.0, 2000);
      this.comps = discretizeSpectrum(this.Sfun, { wmin: cfg.wmin ?? 0.2, wmax: cfg.wmax ?? 3.0, n: cfg.nComp ?? 64, seed: cfg.seed ?? 42, h: this.h, direction: this.dir });
      this.Hs = cfg.Hs; this.Tp = cfg.Tp;
    }
  }
  rampFactor(t) {
    if (!this.ramp || this.ramp <= 0) return 1;
    const x = Math.min(1, t / this.ramp);
    return x * x * (3 - 2 * x);
  }
  eta(x, y, t) {
    const rf = this.rampFactor(t);
    if (this.comps) return irregularKinematics(this.comps, this.h, x, y, 0, t, this.rho).eta * rf;
    return airyKinematics(this.w, this.amp, this.dir, this.h, x, y, 0, t, 0, this.rho).eta * rf;
  }
  kin(x, y, z, t) {
    const rf = this.rampFactor(t);
    if (this.comps) { const k = irregularKinematics(this.comps, this.h, x, y, z, t, this.rho); for (const key of ['eta', 'u', 'v', 'w', 'ax', 'ay', 'az', 'pDyn']) k[key] *= rf; return k; }
    const k = airyKinematics(this.w, this.amp, this.dir, this.h, x, y, z, t, 0, this.rho);
    for (const key of ['eta', 'u', 'v', 'w', 'ax', 'ay', 'az', 'pDyn']) k[key] *= rf;
    return k;
  }
  spectrumValue(w) { return this.Sfun ? this.Sfun(w) : 0; }
  describe() {
    return this.comps ? `不规则波 Hs=${this.Hs}m Tp=${this.Tp}s (${this.cfg.spectrum || 'jonswap'}, ${this.comps.length}分量)`
      : `规则波 H=${this.H}m T=${this.T}s Airy`;
  }
}
