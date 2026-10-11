const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'with', 'of', 'for', 'to', 'in', 'on', 'my', 'me', 'i', 'it', 'is', 'that', 'this', 'want', 'like', 'please', 'some', 'something', 'but', 'not', 'too', 'no', 'little', 'bit', 'over', 'per', 'at', 'as', 'be', 'can', 'than', 'so']);

/** Light suffix stemmer: ing|ed|es|s stripped, trailing y -> i. */
export function stem(w) {
  let s = w;
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith('es')) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith('y')) s = s.slice(0, -1) + 'i';
  return s;
}

export function tokenize(text, { keepStop = false } = {}) {
  return String(text ?? '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((t) => t && (keepStop || !STOP.has(t)))
    .map(stem);
}

const DIET_PATTERNS = [
  ['vegan', /\bvegan\b/],
  ['dairy-free', /\b(dairy[\s-]?free|non[\s-]?dairy|no dairy|lactose[\s-]?free)\b/],
  ['gluten-free', /\bgluten[\s-]?free\b/],
  ['nut-free', /\b(nut[\s-]?free|no nuts?|nut allergy)\b/],
  ['sugar-free', /\b(sugar[\s-]?free|no sugar|unsweetened)\b/],
];

/** Dietary constraints expressed in the query; these act as hard filters. */
export function detectDietary(query) {
  const q = String(query ?? '').toLowerCase();
  return DIET_PATTERNS.filter(([, re]) => re.test(q)).map(([tag]) => tag);
}
