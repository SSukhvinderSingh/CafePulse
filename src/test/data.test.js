import { describe, it, expect } from 'vitest';
import { INGREDIENTS } from '../data/ingredients.js';
import { EQUIPMENT } from '../data/equipment.js';
import { RECIPES } from '../data/recipes.js';
import { PAIRINGS } from '../data/pairings.js';
import { seedTickets } from '../data/seedTickets.js';
import { seedTelemetry } from '../data/seedTelemetry.js';

describe('seed data (AC3)', () => {
  it('meets minimum sizes', () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(40);
    expect(EQUIPMENT.length).toBeGreaterThanOrEqual(5);
    expect(RECIPES.length).toBeGreaterThanOrEqual(6);
    expect(PAIRINGS.length).toBeGreaterThanOrEqual(15);
    expect(seedTickets(Date.now()).length).toBeGreaterThanOrEqual(5);
    expect(seedTelemetry(Date.now()).length).toBeGreaterThanOrEqual(10);
  });
  it('has unique ids, three out-of-stock and some low-stock items', () => {
    expect(new Set(INGREDIENTS.map((i) => i.id)).size).toBe(INGREDIENTS.length);
    expect(INGREDIENTS.filter((i) => i.stock === 0).length).toBeGreaterThanOrEqual(3);
    expect(INGREDIENTS.filter((i) => i.stock > 0 && i.stock <= i.parLevel * 0.25).length).toBeGreaterThanOrEqual(3);
  });
  it('recipes reference real ingredients', () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    for (const r of RECIPES) for (const l of r.baseRatio) expect(ids.has(l.ingredientId)).toBe(true);
  });
});
