import { DIMENSIONS } from '../data/schemas.js';

const MIN = 60000;
const KEYWORDS = [
  ['temperature', /\b(cold|freezing|hot|stuffy|warm room|chilly)\b/i],
  ['noise', /\b(loud|noisy|noise|music)\b/i],
  ['cleanliness', /\b(sticky|dirty|messy|trash|smell)\b/i],
  ['seating', /\b(crowded|packed|no seats?|seat|cramped)\b/i],
  ['coffee', /\b(bitter|sour|burnt|weak|cold coffee|watery)\b/i],
];
const ACTIONS = {
  temperature: 'Check thermostat and door; adjust HVAC.',
  noise: 'Lower the music volume and check the grinder cadence.',
  cleanliness: 'Send a runner to wipe tables and reset the floor.',
  seating: 'Clear abandoned cups and rebalance seating.',
  coffee: 'Dial in the grinder and pull a taste shot.',
  other: 'Review the comment and follow up with the guest.',
};
let uid = 0;
const nextId = (ts) => `A-${ts}-${++uid}`;

const sevFor = (score) => (score <= 1 ? 'high' : 'med');
const bump = (s) => (s === 'low' ? 'med' : 'high');

/** Last-10 mean, normalised to 0-100 (null scores ignored). */
export function aggregate(telemetry, n = 10) {
  const rows = telemetry.slice(-n);
  const per = {};
  const all = [];
  for (const d of DIMENSIONS) {
    const v = rows.map((r) => r[d]).filter((x) => Number.isFinite(x));
    per[d] = v.length ? (v.reduce((a, b) => a + b, 0) / v.length - 1) * 25 : null;
    all.push(...v);
  }
  const overall = all.length ? (all.reduce((a, b) => a + b, 0) / all.length - 1) * 25 : null;
  return { overall, per };
}

/** 3+ lows (<=2) on the same category within 10 minutes (including this one) bump severity. */
export function escalate(alert, telemetry, now) {
  if (!DIMENSIONS.includes(alert.category)) return alert;
  const lows = telemetry.filter((r) => now - r.ts <= 10 * MIN && Number.isFinite(r[alert.category]) && r[alert.category] <= 2).length;
  return lows >= 3 ? { ...alert, severity: bump(alert.severity) } : alert;
}

/** Candidate alerts for one feedback row (rule-based). `telemetry` must already include `row`. */
export function mockClassify(row, telemetry, now = row.ts) {
  const out = [];
  const seen = new Set();
  const push = (category, severity, message) => {
    if (seen.has(category)) return;
    seen.add(category);
    out.push(escalate({ id: nextId(row.ts), ts: now, category, severity, message, suggestedAction: ACTIONS[category], source: 'mock' }, telemetry, now));
  };
  for (const d of DIMENSIONS) {
    if (Number.isFinite(row[d]) && row[d] <= 2) push(d, sevFor(row[d]), `Guest rated ${d} ${row[d]}/5${row.comment ? `: “${row.comment}”` : ''}`);
  }
  if (row.comment) {
    for (const [cat, re] of KEYWORDS) if (re.test(row.comment)) push(cat, 'med', `Comment mentions ${cat}: “${row.comment}”`);
  }
  return out;
}
