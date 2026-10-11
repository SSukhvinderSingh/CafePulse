import { BARISTA_LEVERS, CUSTOMER_LEVERS, applyLevers, remainingMinutes, waitStats, promisedMinutes } from '../engine/waittime.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { withStock } from '../engine/filter.js';

export const isActive = (t) => t.status === 'queued' || t.status === 'brewing';

export const effectiveBaristas = (s) =>
  applyLevers(BARISTA_LEVERS, s.interventions, { ownPrep: 0, baristas: s.baristas }).baristas;

export const liveIngredients = (s) => withStock(INGREDIENTS, s.inventory);

/** Wait stats for a prospective or existing order. `levers` are interventions to include. */
export function statsFor(s, { ownPrep, aheadOf = Infinity, customerLevers = [], interventions = s.interventions }) {
  const remaining = s.tickets.filter((t) => isActive(t) && t.createdAt < aheadOf).map((t) => remainingMinutes(t, s.now));
  let p = { remaining, ownPrep, baristas: s.baristas, kappa: 1, sumScale: 1, sigmaScale: 1 };
  p = applyLevers(BARISTA_LEVERS, interventions, p);
  p = applyLevers(CUSTOMER_LEVERS, customerLevers, p);
  return waitStats(p);
}

export function draftStats(s) {
  if (!s.draft) return null;
  const base = statsFor(s, { ownPrep: s.draft.prepMinutes });
  const withLevers = statsFor(s, { ownPrep: s.draft.prepMinutes, customerLevers: s.customerLevers });
  return { base, now: withLevers, promised: promisedMinutes(withLevers) };
}

export const myTicket = (s) => s.tickets.find((t) => t.id === s.myTicketId) ?? null;

export function myStats(s) {
  const t = myTicket(s);
  if (!t) return null;
  if (t.status === 'ready' || t.status === 'done') return { mu: 0, sigma: 0.5, p50: 0, p85: 0, p95: 0 };
  return statsFor(s, { ownPrep: remainingMinutes(t, s.now), aheadOf: t.createdAt, interventions: [] });
}

/** Typical incoming order (3 min) for queue-level analytics, with and without interventions. */
export function queueStats(s, typicalPrep = 3) {
  return {
    before: statsFor(s, { ownPrep: typicalPrep, interventions: [] }),
    after: statsFor(s, { ownPrep: typicalPrep }),
  };
}

export const countdownSeconds = (ticket, now) => Math.max(0, Math.ceil((ticket.dueAt - now) / 1000));
