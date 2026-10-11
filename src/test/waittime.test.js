import { describe, it, expect } from 'vitest';
import { erf, cdf, pdf, quantile, waitStats, promisedMinutes, applyLevers, CUSTOMER_LEVERS, BARISTA_LEVERS, remainingMinutes } from '../engine/waittime.js';

describe('Gaussian math (AC12)', () => {
  it('erf error < 1.5e-7 on known values', () => {
    const known = [[0, 0], [0.5, 0.5204998778130465], [1, 0.8427007929497149], [2, 0.9953222650189527], [-1, -0.8427007929497149]];
    for (const [x, v] of known) expect(Math.abs(erf(x) - v)).toBeLessThan(1.5e-7);
  });
  it('cdf(mu)=0.5 and quantile(0.5)=mu', () => {
    expect(Math.abs(cdf(7, 7, 2) - 0.5)).toBeLessThan(1e-6);
    expect(quantile(0.5, 7, 2)).toBeCloseTo(7, 10);
  });
  it('quantile(0.8413) ≈ mu + sigma', () => {
    const mu = 10, s = 3;
    expect(Math.abs(quantile(0.8413, mu, s) - (mu + s))).toBeLessThan(0.01 * s);
  });
  it('cdf(quantile(p)) ≈ p', () => {
    for (const p of [0.05, 0.5, 0.85, 0.95]) expect(Math.abs(cdf(quantile(p, 9, 2.5), 9, 2.5) - p)).toBeLessThan(1e-3);
  });
  it('pdf integrates to ~1', () => {
    let s = 0;
    for (let x = -20; x < 40; x += 0.01) s += pdf(x, 8, 2) * 0.01;
    expect(s).toBeCloseTo(1, 3);
  });
});

describe('wait stats and levers (AC14)', () => {
  const base = { remaining: [3, 2, 3, 3], ownPrep: 4 };
  const b = waitStats(base);
  it('percentiles are ordered and P85 promise is a whole minute', () => {
    expect(b.p50).toBeLessThan(b.p85);
    expect(b.p85).toBeLessThan(b.p95);
    expect(Number.isInteger(promisedMinutes(b))).toBe(true);
    expect(promisedMinutes(b)).toBeGreaterThanOrEqual(b.p85);
  });
  it('sigma has a 0.5 floor', () => {
    expect(waitStats({ remaining: [], ownPrep: 0.1, baristas: 9 }).sigma).toBe(0.5);
  });
  it('every customer lever lowers mu or P85', () => {
    for (const l of CUSTOMER_LEVERS) {
      const s = waitStats(applyLevers(CUSTOMER_LEVERS, [l.id], base));
      expect(s.mu < b.mu || s.p85 < b.p85).toBe(true);
    }
  });
  it('add-barista lowers both mu and sigma', () => {
    const s = waitStats(applyLevers(BARISTA_LEVERS, ['add-barista'], { ...base, baristas: 1 }));
    expect(s.mu).toBeLessThan(b.mu);
    expect(s.sigma).toBeLessThan(b.sigma);
  });
  it('remainingMinutes never goes negative', () => {
    const t = { status: 'brewing', prepMinutes: 3, startedAt: 0 };
    expect(remainingMinutes(t, 10 * 60000)).toBe(0);
    expect(remainingMinutes({ status: 'queued', prepMinutes: 3 }, 0)).toBe(3);
    expect(remainingMinutes({ status: 'ready', prepMinutes: 3 }, 0)).toBe(0);
  });
});
