import { INGREDIENTS } from '../data/ingredients.js';
import { EQUIPMENT } from '../data/equipment.js';
import { seedTickets } from '../data/seedTickets.js';
import { seedTelemetry } from '../data/seedTelemetry.js';
import { deduct } from '../engine/bom.js';
import { promisedMinutes, applyLevers, CUSTOMER_LEVERS } from '../engine/waittime.js';
import { effectiveBaristas, statsFor } from './selectors.js';

const READY_HOLD_MS = 90000;
const toggle = (arr, id) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export function initialState(now = Date.now()) {
  return {
    inventory: Object.fromEntries(INGREDIENTS.map((i) => [i.id, i.stock])),
    equipment: Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.available])),
    tickets: seedTickets(now),
    telemetry: seedTelemetry(now),
    alerts: [],
    view: 'customer',
    baristas: 1,
    interventions: [],
    customerLevers: [],
    draft: null,
    myTicketId: null,
    error: null,
    seq: 107,
    now,
  };
}

/** Clock-driven pipeline: start queued tickets when a barista is free, finish brewing, retire ready ones. */
export function advanceTickets(s) {
  const capacity = effectiveBaristas(s);
  let brewing = s.tickets.filter((t) => t.status === 'brewing').length;
  const tickets = s.tickets
    .map((t) => {
      if (t.status === 'brewing' && s.now - t.startedAt >= t.prepMinutes * 60000) {
        brewing--;
        return { ...t, status: 'ready', readyAt: s.now };
      }
      if (t.status === 'ready' && t.readyAt == null) return { ...t, readyAt: s.now };
      if (t.status === 'ready' && s.now - t.readyAt >= READY_HOLD_MS && t.id !== s.myTicketId) return { ...t, status: 'done' };
      return t;
    })
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((t) => {
      if (t.status === 'queued' && brewing < capacity) {
        brewing++;
        return { ...t, status: 'brewing', startedAt: s.now };
      }
      return t;
    });
  return { ...s, tickets };
}

function manualAdvance(t, now) {
  if (t.status === 'queued') return { ...t, status: 'brewing', startedAt: now };
  if (t.status === 'brewing') return { ...t, status: 'ready', readyAt: now };
  if (t.status === 'ready') return { ...t, status: 'done' };
  return t;
}

export function reducer(s, a) {
  switch (a.type) {
    case 'TICK':
      return advanceTickets({ ...s, now: s.now + a.ms });
    case 'SET_VIEW':
      return { ...s, view: a.view };
    case 'SET_DRAFT':
      return { ...s, draft: a.order, customerLevers: [], error: null };
    case 'CLEAR_ERROR':
      return { ...s, error: null };
    case 'TOGGLE_CUSTOMER_LEVER':
      return { ...s, customerLevers: toggle(s.customerLevers, a.id) };
    case 'TOGGLE_INTERVENTION':
      return advanceTickets({ ...s, interventions: toggle(s.interventions, a.id) });
    case 'TOGGLE_STOCK': {
      const par = INGREDIENTS.find((i) => i.id === a.id)?.parLevel ?? 0;
      return { ...s, inventory: { ...s.inventory, [a.id]: (s.inventory[a.id] ?? 0) > 0 ? 0 : par } };
    }
    case 'TOGGLE_EQUIPMENT':
      return { ...s, equipment: { ...s.equipment, [a.id]: !s.equipment[a.id] } };
    case 'PLACE_ORDER': {
      const { order, customer = 'You' } = a;
      const res = deduct(s.inventory, order.bom);
      if (!res.ok) {
        const name = order.bom.find((l) => l.ingredientId === res.shortage.ingredientId)?.name ?? res.shortage.ingredientId;
        return { ...s, error: `Not enough ${name}: need ${res.shortage.need}, have ${res.shortage.have}. Nothing was charged or deducted.` };
      }
      const draft = s.draft && s.draft.name === order.name ? s.draft : null;
      const levers = draft ? s.customerLevers : [];
      const stats = statsFor(s, { ownPrep: order.prepMinutes, customerLevers: levers });
      const promisedMin = promisedMinutes(stats);
      const ownPrep = levers.length ? statsOwnPrep(s, order.prepMinutes, levers) : order.prepMinutes;
      const id = `T-${s.seq}`;
      const ticket = {
        id, customer, orderName: order.name, bom: order.bom, price: order.price,
        prepMinutes: ownPrep, createdAt: s.now, startedAt: null,
        dueAt: s.now + promisedMin * 60000, promisedMin, status: 'queued', source: order.source,
      };
      return advanceTickets({
        ...s, inventory: res.inventory, tickets: [...s.tickets, ticket], seq: s.seq + 1,
        myTicketId: id, draft: null, customerLevers: [], error: null,
      });
    }
    case 'ADVANCE_TICKET':
      return { ...s, tickets: s.tickets.map((t) => (t.id === a.id ? manualAdvance(t, s.now) : t)) };
    case 'ADD_TELEMETRY':
      return { ...s, telemetry: [...s.telemetry, a.row] };
    case 'ADD_ALERTS':
      return { ...s, alerts: [...a.alerts, ...s.alerts].slice(0, 30) };
    case 'DISMISS_ALERT':
      return { ...s, alerts: s.alerts.filter((x) => x.id !== a.id) };
    case 'COMPLETE_PICKUP':
      return {
        ...s,
        tickets: s.tickets.map((t) => (t.id === a.id ? { ...t, status: 'done' } : t)),
      };
    case 'DISMISS_MY_TICKET':
      return { ...s, myTicketId: null };
    case 'RESET':
      return { ...initialState(a.now ?? Date.now()), view: s.view };
    default:
      return s;
  }
}

function statsOwnPrep(s, prep, levers) {
  return applyLevers(CUSTOMER_LEVERS, levers, { ownPrep: prep }).ownPrep;
}
