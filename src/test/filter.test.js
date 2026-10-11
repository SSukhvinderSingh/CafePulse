import { describe, it, expect } from 'vitest';
import { isEligible, eligibleIngredients, eligibleRecipes, stockStatus } from '../engine/filter.js';
import { retrieve } from '../engine/hybrid.js';
import { synthOrder } from '../engine/mock.js';
import { baseCtx } from './helpers.js';

describe('deterministic filter (AC4)', () => {
  it('rejects zero stock and unavailable equipment', () => {
    const ctx = baseCtx();
    const get = (id) => ctx.ingredients.find((i) => i.id === id);
    expect(isEligible(get('milk-coconut'), ctx.equipment)).toBe(false); // stock 0
    expect(isEligible(get('cold-brew-conc'), ctx.equipment)).toBe(false); // tap offline
    expect(isEligible(get('milk-oat'), ctx.equipment)).toBe(true);
  });
  it('drops recipes whose ingredients are ineligible', () => {
    const ctx = baseCtx();
    const ids = eligibleRecipes(ctx.recipes, ctx.ingredients, ctx.equipment).map((r) => r.id);
    expect(ids).not.toContain('cold-brew');
    expect(ids).toContain('latte');
  });
  it('applies dietary hard filters', () => {
    const ctx = baseCtx();
    const vegan = eligibleIngredients(ctx.ingredients, ctx.equipment, ['vegan']);
    expect(vegan.find((i) => i.id === 'milk-whole')).toBeUndefined();
    expect(vegan.find((i) => i.id === 'milk-oat')).toBeDefined();
  });
  it('classifies stock status', () => {
    expect(stockStatus({ stock: 0, parLevel: 10 })).toBe('out');
    expect(stockStatus({ stock: 2, parLevel: 10 })).toBe('low');
    expect(stockStatus({ stock: 9, parLevel: 10 })).toBe('in');
  });
  it('forced-zero ingredient never appears in retrieval or generated BOM', () => {
    const ctx = baseCtx({ 'syrup-raspberry': 0, 'milk-oat': 0, 'syrup-vanilla': 0, 'syrup-lavender': 0 });
    const q = 'fruity raspberry oat milk vanilla lavender latte';
    const r = retrieve(q, ctx);
    const banned = ['syrup-raspberry', 'milk-oat', 'syrup-vanilla', 'syrup-lavender'];
    for (const i of [...r.ranked, ...r.eligible]) expect(banned).not.toContain(i.id);
    const order = synthOrder(q, ctx);
    for (const l of order.bom) expect(banned).not.toContain(l.ingredientId);
  });
  it('missing equipment removes dependent ingredients from generated orders', () => {
    const ctx = baseCtx({}, { 'espresso-machine': false });
    const order = synthOrder('strong coffee', ctx);
    expect(order.bom.some((l) => l.ingredientId.startsWith('espresso'))).toBe(false);
  });
});
