// core/env.js — environment: seabed, current, wind
import { G } from './waves.js';

export class Seabed {
  constructor(cfg = {}) {
    this.depth = cfg.depth ?? 0;      // water depth (m), seabed at z = -depth
    this.k = cfg.stiffness ?? 1.0e6;  // vertical contact stiffness per unit area * ... (N/m per node scaled)
    this.mu = cfg.friction ?? 0.5;    // Coulomb friction coefficient
    this.c = cfg.damping ?? 0;         // contact damping
    this.name = cfg.name || 'Seabed';
  }
  // normal force per unit penetration depth for a node with tributary area A (N)
  normalForce(penetration, area, vn) {
    if (penetration <= 0) return 0;
    return this.k * area * penetration + this.c * area * Math.max(0, vn);
  }
}

// Current field: profile types 'uniform' | 'power' (1/7th) | 'linear'; direction beta (rad from +x)
export class CurrentField {
  constructor(cfg = {}) {
    this.speed = cfg.speed ?? 0;      // surface speed m/s
    this.dir = cfg.dir ?? 0;
    this.profile = cfg.profile || 'uniform';
    this.h = cfg.h ?? 0;              // depth for power law
    this.ramp = cfg.ramp ?? 0;         // ramp-in time (s) so statics at t=0 sees no current
    this.name = cfg.name || 'Current';
  }
  rampFactor(t) {
    if (!this.ramp || this.ramp <= 0) return 1;
    const x = Math.min(1, Math.max(0, t / this.ramp));
    return x * x * (3 - 2 * x);
  }
  velocity(x, y, z, t) {
    const rf = this.rampFactor(t);
    const h = this.h > 0 ? this.h : 1000;
    const zz = Math.max(-h, Math.min(0, z));
    let f = 1;
    if (this.profile === 'power') f = Math.pow((zz + h) / h, 1 / 7);
    else if (this.profile === 'linear') f = (zz + h) / h;
    const s = this.speed * f * rf;
    return [s * Math.cos(this.dir), s * Math.sin(this.dir), 0];
  }
}

// Wind: power-law profile, drag on projected area
export class WindField {
  constructor(cfg = {}) {
    this.speed = cfg.speed ?? 0;      // at reference height zRef
    this.dir = cfg.dir ?? 0;
    this.zRef = cfg.zRef ?? 10;
    this.alpha = cfg.alpha ?? 0.12;   // power law exponent
    this.rhoAir = cfg.rhoAir ?? 1.225;
    this.Cd = cfg.Cd ?? 1.0;
    this.ramp = cfg.ramp ?? 0;
    this.name = cfg.name || 'Wind';
  }
  rampFactor(t) {
    if (!this.ramp || this.ramp <= 0) return 1;
    const x = Math.min(1, Math.max(0, t / this.ramp));
    return x * x * (3 - 2 * x);
  }
  velocity(z, t) {
    const f = Math.pow(Math.max(z, 0.1) / this.zRef, this.alpha);
    const rf = this.rampFactor(t);
    return [this.speed * f * rf * Math.cos(this.dir), this.speed * f * rf * Math.sin(this.dir), 0];
  }
  // force on a vertical projected area A at height zc (above SWL), relative wind speed vr
  force(A, zc, vr) {
    const s = Math.hypot(vr[0], vr[1]);
    return [0.5 * this.rhoAir * this.Cd * A * s * vr[0], 0.5 * this.rhoAir * this.Cd * A * s * vr[1], 0];
  }
}
