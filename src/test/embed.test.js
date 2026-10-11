import { describe, it, expect } from 'vitest';
import { embed, cosine, DIM } from '../engine/embed.js';
import { rrf } from '../engine/hybrid.js';

describe('embed (AC6)', () => {
  it('is deterministic with unit norm', () => {
    const a = embed('fruity bright'), b = embed('fruity bright');
    expect([...a]).toEqual([...b]);
    expect(a.length).toBe(DIM);
    expect(Math.sqrt(a.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 10);
  });
  it('places related concepts closer', () => {
    const q = embed('fruity bright');
    expect(cosine(q, embed('citrus berry'))).toBeGreaterThan(cosine(q, embed('smoky chocolate')));
  });
});

describe('RRF fusion', () => {
  it('sums reciprocal ranks with k=60', () => {
    const r = rrf([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]]);
    expect(r[0].id).toBe('b');
    expect(r[0].score).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(r.find((x) => x.id === 'a').score).toBeCloseTo(1 / 61, 12);
  });
  it('item in both lists beats item topping only one', () => {
    const r = rrf([[{ id: 'x' }, { id: 'both' }], [{ id: 'y' }, { id: 'both' }]]);
    expect(r[0].id).toBe('both');
  });
  it('handles empty lists', () => {
    expect(rrf([[], []])).toEqual([]);
  });
});
