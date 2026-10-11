import { describe, it, expect } from 'vitest';
import { BM25 } from '../engine/bm25.js';
import { tokenize, detectDietary } from '../engine/tokenize.js';

const docs = [
  { id: 'both', text: 'lemon citrus vegan' },
  { id: 'citrus-only', text: 'orange citrus dairy' },
  { id: 'vegan-only', text: 'oat milk vegan' },
  { id: 'none', text: 'espresso bold chocolate' },
];

describe('BM25 (AC5)', () => {
  it('ranks a doc matching both terms above docs matching one', () => {
    const r = new BM25(docs).search('citrus vegan');
    expect(r[0].id).toBe('both');
    expect(r.map((x) => x.id)).not.toContain('none');
    expect(r.length).toBe(3);
  });
  it('idf is higher for rarer terms', () => {
    const b = new BM25(docs);
    expect(b.idf('lemon')).toBeGreaterThan(b.idf('citru'));
    expect(b.idf('citru')).toBeCloseTo(Math.log(1 + (4 - 2 + 0.5) / (2 + 0.5)), 10);
  });
  it('length normalisation favours shorter docs for same tf', () => {
    const b = new BM25([{ id: 's', text: 'mint' }, { id: 'l', text: 'mint a b c d e f g h' }, { id: 'x', text: 'zzz' }]);
    const r = b.search('mint');
    expect(r[0].id).toBe('s');
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });
  it('tokenizer stems and drops stopwords', () => {
    expect(tokenize('The berries and cherries')).toEqual(['berri', 'cherri']);
  });
  it('detects dietary constraints', () => {
    expect(detectDietary('vegan, dairy free and no sugar please').sort()).toEqual(['dairy-free', 'sugar-free', 'vegan']);
  });
});
