import { tokenize } from './tokenize.js';

const K1 = 1.5;
const B = 0.75;

/** Okapi BM25 over {id,text} docs. */
export class BM25 {
  constructor(docs) {
    this.docs = docs.map((d) => {
      const tokens = tokenize(d.text);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      return { id: d.id, tf, len: tokens.length };
    });
    this.N = this.docs.length;
    this.avgdl = this.N ? this.docs.reduce((s, d) => s + d.len, 0) / this.N : 0;
    this.df = new Map();
    for (const d of this.docs) for (const t of d.tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  idf(term) {
    const df = this.df.get(term) ?? 0;
    return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
  }

  /** Ranked [{id,score}] with score > 0, descending; ties keep corpus order. */
  search(query, k = Infinity) {
    const q = tokenize(query);
    return this.docs
      .map((d) => {
        let score = 0;
        for (const t of q) {
          const f = d.tf.get(t);
          if (!f) continue;
          score += (this.idf(t) * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / (this.avgdl || 1)));
        }
        return { id: d.id, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
