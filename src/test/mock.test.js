import { describe, it, expect, vi } from 'vitest';
import { synthOrder } from '../engine/mock.js';
import { craft, validateOrder } from '../engine/orderService.js';
import { baseCtx } from './helpers.js';

const QUERY = 'something fruity, oat milk, not too sweet';

function assertValid(o, ctx) {
  expect(o.bom.length).toBeGreaterThanOrEqual(2);
  expect(o.price).toBeGreaterThan(0);
  expect(o.baristaSteps.length).toBeGreaterThanOrEqual(3);
  expect(o.prepMinutes).toBeGreaterThan(0);
  expect(o.bom.reduce((s, l) => s + l.lineCost, 0)).toBeCloseTo(o.cost, 3);
  for (const l of o.bom) expect(ctx.ingredients.find((i) => i.id === l.ingredientId).stock).toBeGreaterThanOrEqual(l.qty);
}

describe('mock engine (AC7, AC8)', () => {
  it('produces a valid order quickly', () => {
    const ctx = baseCtx();
    const t0 = performance.now();
    const o = synthOrder(QUERY, ctx);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(o.source).toBe('mock');
    assertValid(o, ctx);
  });
  it('honours the requested milk', () => {
    const o = synthOrder(QUERY, baseCtx());
    expect(o.bom.some((l) => l.ingredientId === 'milk-oat')).toBe(true);
  });
  it('vegan constraint excludes dairy', () => {
    const o = synthOrder('vegan cappuccino', baseCtx());
    expect(o.allergens).not.toContain('dairy');
    expect(o.bom.some((l) => l.ingredientId === 'milk-whole')).toBe(false);
  });
  it('is deterministic', () => {
    expect(synthOrder(QUERY, baseCtx())).toEqual(synthOrder(QUERY, baseCtx()));
  });
  it('handles empty query and gibberish', () => {
    assertValid(synthOrder('', baseCtx()), baseCtx());
    assertValid(synthOrder('xyzzy qwerty', baseCtx()), baseCtx());
  });
});

describe('orderService fallback (AC7)', () => {
  it('no key => mock without any fetch', async () => {
    const fetchImpl = vi.fn();
    const t0 = performance.now();
    const o = await craft(QUERY, baseCtx(), { apiKey: '', fetchImpl });
    expect(performance.now() - t0).toBeLessThan(50);
    expect(o.source).toBe('mock');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('key + network failure => identical mock result', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const o = await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(o).toEqual(synthOrder(QUERY, baseCtx()));
  });
  it('non-200 and schema-invalid JSON fall back', async () => {
    const bad = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    expect((await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl: bad })).source).toBe('mock');
    const junk = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"name":"x"}' }] } }] }) });
    expect((await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl: junk })).source).toBe('mock');
  });
  it('timeout falls back', async () => {
    const hang = vi.fn(() => new Promise(() => {}));
    const o = await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl: hang, timeoutMs: 20 });
    expect(o.source).toBe('mock');
  });
  it('valid Gemini JSON is accepted and repriced; out-of-stock ingredient rejected', async () => {
    const good = { name: 'Peach Oat Latte', description: 'd', bom: [{ ingredientId: 'espresso-house', qty: 2 }, { ingredientId: 'milk-oat', qty: 200 }], baristaSteps: ['a', 'b', 'c'], prepMinutes: 3 };
    const mk = (obj) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
    const o = await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl: mk(good) });
    expect(o.source).toBe('gemini');
    expect(o.cost).toBeGreaterThan(0);
    const oos = { ...good, bom: [...good.bom, { ingredientId: 'milk-coconut', qty: 10 }] };
    expect(() => validateOrder(oos, baseCtx())).toThrow(/ineligible/);
    expect((await craft(QUERY, baseCtx(), { apiKey: 'k', fetchImpl: mk(oos) })).source).toBe('mock');
  });
  it('never sends the key in the URL', async () => {
    const f = vi.fn().mockRejectedValue(new Error('x'));
    await craft(QUERY, baseCtx(), { apiKey: 'SECRET', fetchImpl: f });
    expect(f.mock.calls[0][0]).not.toContain('SECRET');
  });
});
