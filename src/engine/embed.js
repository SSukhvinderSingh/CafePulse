import { tokenize, stem } from './tokenize.js';

export const DIM = 256;

/** Concept lexicon: query word -> related concepts. Stand-in semantics for text-embedding-004. */
const RAW_LEXICON = {
  fruity: ['berry', 'citrus', 'bright', 'acid', 'fruit'],
  fruit: ['fruity', 'berry', 'citrus'],
  bright: ['citrus', 'acid', 'fruity'],
  citrus: ['acid', 'bright', 'fruity', 'orange', 'lemon'],
  berry: ['fruity', 'bright', 'tart'],
  tart: ['acid', 'berry', 'bright'],
  cozy: ['cinnamon', 'vanilla', 'warm', 'caramel'],
  warm: ['cinnamon', 'spicy', 'cozy'],
  sweet: ['caramel', 'honey', 'vanilla', 'sugar'],
  dessert: ['sweet', 'caramel', 'chocolate'],
  chocolate: ['cocoa', 'bold', 'rich'],
  chocolaty: ['chocolate', 'cocoa'],
  smoky: ['bold', 'roasted', 'dark'],
  floral: ['lavender', 'jasmine', 'honey', 'calm'],
  calm: ['floral', 'lavender', 'jasmine'],
  spicy: ['cinnamon', 'cardamom', 'chai', 'warm'],
  refreshing: ['iced', 'cold', 'bright', 'citrus'],
  iced: ['cold', 'refreshing', 'ice'],
  cold: ['iced', 'refreshing'],
  nutty: ['hazelnut', 'almond', 'toasted'],
  creamy: ['milk', 'oat', 'smooth'],
  light: ['clean', 'delicate'],
  strong: ['bold', 'espresso'],
};
const LEXICON = Object.fromEntries(
  Object.entries(RAW_LEXICON).map(([k, v]) => [stem(k), v.map(stem)]),
);

function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function features(text) {
  const toks = tokenize(text);
  const feats = [];
  for (const t of toks) {
    feats.push('w:' + t, 'c:' + t);
    for (const c of LEXICON[t] ?? []) feats.push('c:' + c);
  }
  for (let i = 0; i < toks.length - 1; i++) feats.push('b:' + toks[i] + '_' + toks[i + 1]);
  return feats;
}

/** Deterministic, L2-normalised hashed bag-of-concepts embedding. */
export function embed(text, dim = DIM) {
  const counts = new Map();
  for (const f of features(text)) counts.set(f, (counts.get(f) ?? 0) + 1);
  const v = new Float64Array(dim);
  for (const [f, n] of counts) {
    const bucket = fnv1a(f) % dim;
    const sign = (fnv1a(f, 0x9747b28c) >>> 7) & 1 ? 1 : -1;
    v[bucket] += sign * (1 + Math.log(n));
  }
  let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm === 0) return v;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Rank [{id,text}] by cosine to query; zero-similarity docs dropped. */
export function denseSearch(query, docs, k = Infinity) {
  const q = embed(query);
  return docs
    .map((d) => ({ id: d.id, score: cosine(q, embed(d.text)) }))
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
