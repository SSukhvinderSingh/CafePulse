import { describe, it, expect } from 'vitest';
import { makeBom, bomCost, deduct, findShortage, priceFor, roundQuarter } from '../engine/bom.js';
import { baseCtx } from './helpers.js';
import { reducer, initialState, advanceTickets } from '../state/reducer.js';
import { synthOrder } from '../engine/mock.js';
import { countdownSeconds } from '../state/selectors.js';

const byId = new Map(baseCtx().ingredients.map((i) => [i.id, i]));

describe('BOM and deduction (AC8–10)', () => {
  const bom = makeBom([{ ingredientId: 'espresso-house', qty: 2 }, { ingredientId: 'milk-oat', qty: 200 }], byId);
  it('line costs sum to cost', () => {
    expect(bomCost(bom)).toBeCloseTo(bom.reduce((s, l) => s + l.qty * l.unitCost, 0), 6);
  });
  it('rounds price to quarters', () => {
    expect(roundQuarter(4.37)).toBe(4.25);
    expect(priceFor(0.1, 3.5)).toBe(3.5);
    expect(priceFor(3, 3.5)).toBe(9.5);
  });
  it('deducts exactly qty', () => {
    const inv = { 'espresso-house': 10, 'milk-oat': 500 };
    const r = deduct(inv, bom);
    expect(r.ok).toBe(true);
    expect(r.inventory).toEqual({ 'espresso-house': 8, 'milk-oat': 300 });
    expect(inv['milk-oat']).toBe(500); // input untouched
  });
  it('rejects with no partial deduction', () => {
    const inv = { 'espresso-house': 10, 'milk-oat': 100 };
    const r = deduct(inv, bom);
    expect(r.ok).toBe(false);
    expect(r.inventory).toBe(inv);
    expect(findShortage(bom, inv).ingredientId).toBe('milk-oat');
  });
});

describe('PLACE_ORDER reducer', () => {
  const now = 1_700_000_000_000;
  const s0 = initialState(now);
  const order = synthOrder('oat latte', baseCtx());

  it('deducts stock, adds ticket, sets myTicket', () => {
    const s1 = reducer(s0, { type: 'PLACE_ORDER', order });
    for (const l of order.bom) expect(s1.inventory[l.ingredientId]).toBeCloseTo(s0.inventory[l.ingredientId] - l.qty, 6);
    expect(s1.tickets.length).toBe(s0.tickets.length + 1);
    expect(s1.myTicketId).toBe(s1.tickets.at(-1).id);
    expect(s1.tickets.at(-1).promisedMin).toBeGreaterThan(0);
  });
  it('rejects oversize order with message and unchanged inventory', () => {
    const big = { ...order, bom: order.bom.map((l) => ({ ...l, qty: 1e9 })) };
    const s1 = reducer(s0, { type: 'PLACE_ORDER', order: big });
    expect(s1.error).toMatch(/Not enough/);
    expect(s1.inventory).toEqual(s0.inventory);
    expect(s1.tickets.length).toBe(s0.tickets.length);
  });
  it('restock toggle sets par or zero', () => {
    const off = reducer(s0, { type: 'TOGGLE_STOCK', id: 'milk-oat' });
    expect(off.inventory['milk-oat']).toBe(0);
    expect(reducer(off, { type: 'TOGGLE_STOCK', id: 'milk-oat' }).inventory['milk-oat']).toBe(4000);
  });
  it('clock advances queued -> brewing -> ready and countdown is never negative', () => {
    let s = reducer(s0, { type: 'PLACE_ORDER', order });
    const id = s.myTicketId;
    const seen = new Set();
    for (let i = 0; i < 1200; i++) {
      s = reducer(s, { type: 'TICK', ms: 1000 });
      const t = s.tickets.find((x) => x.id === id);
      seen.add(t.status);
      expect(countdownSeconds(t, s.now)).toBeGreaterThanOrEqual(0);
    }
    expect(seen.has('brewing')).toBe(true);
    expect(seen.has('ready')).toBe(true);
  });
  it('advanceTickets respects barista capacity', () => {
    const s = advanceTickets({ ...s0, tickets: s0.tickets.map((t) => ({ ...t, status: 'queued', startedAt: null })) });
    expect(s.tickets.filter((t) => t.status === 'brewing').length).toBe(1);
  });
});
