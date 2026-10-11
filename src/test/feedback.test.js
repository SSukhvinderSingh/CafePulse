import { describe, it, expect, vi } from 'vitest';
import { mockClassify, aggregate, escalate } from '../engine/feedback.js';
import { classify } from '../engine/classifier.js';

const now = 1_700_000_000_000;
const row = (o = {}) => ({ id: 'r' + Math.random(), ts: now, ...o });

describe('alert classification (AC16–17)', () => {
  it('score <=2 creates alert; 1 is high, 2 is med', () => {
    const r1 = row({ noise: 1 });
    const a = mockClassify(r1, [r1], now);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ category: 'noise', severity: 'high', source: 'mock' });
    expect(a[0].suggestedAction.length).toBeGreaterThan(5);
    const r2 = row({ coffee: 2 });
    expect(mockClassify(r2, [r2], now)[0].severity).toBe('med');
  });
  it('score >=3 creates nothing', () => {
    const r = row({ coffee: 3, noise: 5 });
    expect(mockClassify(r, [r], now)).toEqual([]);
  });
  it('keywords map to categories', () => {
    for (const [word, cat] of [['too cold', 'temperature'], ['so loud', 'noise'], ['sticky table', 'cleanliness'], ['crowded', 'seating'], ['bitter', 'coffee']]) {
      const r = row({ comment: word });
      expect(mockClassify(r, [r], now)[0].category).toBe(cat);
    }
  });
  it('3+ lows in 10 minutes escalate severity', () => {
    const rows = [1, 2, 3].map((i) => row({ ts: now - i * 60000, seating: 2 }));
    const a = mockClassify(rows[0], rows, now)[0];
    expect(a.severity).toBe('high'); // med -> high
    const few = rows.slice(0, 2);
    expect(mockClassify(few[0], few, now)[0].severity).toBe('med');
    expect(escalate({ category: 'seating', severity: 'low' }, rows, now).severity).toBe('med');
  });
  it('old lows do not count toward escalation', () => {
    const rows = [1, 2, 3].map((i) => row({ ts: now - i * 11 * 60000, seating: 2 }));
    expect(mockClassify(row({ ts: now, seating: 2 }), [...rows, row({ ts: now, seating: 2 })], now)[0].severity).toBe('med');
  });
  it('aggregate normalises last 10 to 0-100 ignoring nulls', () => {
    const rows = [row({ noise: 5 }), row({ noise: 1, coffee: 3 })];
    const g = aggregate(rows);
    expect(g.per.noise).toBe(50);
    expect(g.per.coffee).toBe(50);
    expect(g.per.seating).toBeNull();
    expect(aggregate([row({ noise: 5, coffee: 5 })]).overall).toBe(100);
    expect(aggregate([]).overall).toBeNull();
  });
  it('classify falls back to mock when Gemini fails, and uses Gemini when valid', async () => {
    const r = row({ noise: 1 });
    const failing = vi.fn().mockRejectedValue(new Error('x'));
    expect((await classify(r, [r], now, { apiKey: 'k', fetchImpl: failing }))[0].source).toBe('mock');
    const alert = { category: 'noise', severity: 'high', message: 'm', suggestedAction: 's' };
    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(alert) }] } }] }) });
    expect((await classify(r, [r], now, { apiKey: 'k', fetchImpl: ok }))[0].source).toBe('gemini');
    expect(await classify(row({ noise: 5 }), [], now, { apiKey: 'k', fetchImpl: ok })).toEqual([]);
  });
});
