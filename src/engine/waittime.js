/** Gaussian wait-time model. Minutes throughout. */

const SQRT2 = Math.SQRT2;

/** Abramowitz & Stegun 7.1.26, |error| < 1.5e-7. */
export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592;
  return sign * (1 - poly * t * Math.exp(-ax * ax));
}

export const pdf = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
export const cdf = (x, mu, sigma) => 0.5 * (1 + erf((x - mu) / (sigma * SQRT2)));

/** Acklam's inverse normal CDF (rel. error ~1e-9). */
export function invNorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export const quantile = (p, mu, sigma) => mu + sigma * invNorm(p);

/** Minutes of work left on a ticket at time `now` (ms). */
export function remainingMinutes(ticket, now) {
  if (ticket.status === 'ready' || ticket.status === 'done') return 0;
  if (ticket.status === 'brewing' && ticket.startedAt != null) {
    return Math.max(0, ticket.prepMinutes - (now - ticket.startedAt) / 60000);
  }
  return ticket.prepMinutes;
}

/**
 * @param {{remaining:number[], ownPrep:number, baristas?:number, kappa?:number, sumScale?:number, sigmaScale?:number}} p
 */
export function waitStats({ remaining, ownPrep, baristas = 1, kappa = 1, sumScale = 1, sigmaScale = 1 }) {
  const m = Math.max(1, baristas);
  const sumR = remaining.reduce((s, r) => s + r, 0) * sumScale;
  const mu = (sumR / m) * kappa + ownPrep;
  const varSum = remaining.reduce((s, r) => s + (0.25 * r + 0.3) ** 2, 0) + (0.25 * ownPrep + 0.3) ** 2;
  const sigma = Math.max(0.5, (Math.sqrt(varSum) / Math.sqrt(m)) * sigmaScale);
  return {
    mu, sigma,
    p50: quantile(0.5, mu, sigma),
    p85: quantile(0.85, mu, sigma),
    p95: quantile(0.95, mu, sigma),
  };
}

/** Promised time: P85 rounded up to a whole minute. */
export const promisedMinutes = (stats) => Math.max(1, Math.ceil(stats.p85 - 1e-9));

export const CUSTOMER_LEVERS = [
  { id: 'simplify', label: 'Drop one add-on', hint: 'Skip a topping or extra', apply: (p) => ({ ...p, ownPrep: Math.max(0.5, p.ownPrep - 0.7) }) },
  { id: 'base-menu', label: 'Use a menu base', hint: 'Skip the off-menu build', apply: (p) => ({ ...p, ownPrep: Math.max(0.5, p.ownPrep * 0.7) }) },
  { id: 'mobile-pay', label: 'Pre-pay in app', hint: 'No till time', apply: (p) => ({ ...p, ownPrep: Math.max(0.5, p.ownPrep - 0.5) }) },
  { id: 'quiet-window', label: 'Order in a lull', hint: '10% less queue ahead', apply: (p) => ({ ...p, sumScale: (p.sumScale ?? 1) * 0.9 }) },
];

export const BARISTA_LEVERS = [
  { id: 'add-barista', label: 'Add a barista', hint: 'Second pair of hands', apply: (p) => ({ ...p, baristas: (p.baristas ?? 1) + 1 }) },
  { id: 'batch', label: 'Batch similar drinks', hint: 'Group by milk and temp', apply: (p) => ({ ...p, kappa: (p.kappa ?? 1) * 0.9 }) },
  { id: 'pause-offmenu', label: 'Pause off-menu orders', hint: 'Fewer surprises in the queue', apply: (p) => ({ ...p, sigmaScale: (p.sigmaScale ?? 1) * 0.85, ownPrep: Math.max(0.5, p.ownPrep - 0.5) }) },
  { id: 'prioritise-ready', label: 'Prioritise ready-to-go', hint: 'Short drinks first', apply: (p) => ({ ...p, sumScale: (p.sumScale ?? 1) * 0.92 }) },
];

export const applyLevers = (levers, ids, params) =>
  levers.filter((l) => ids.includes(l.id)).reduce((p, l) => l.apply(p), params);
