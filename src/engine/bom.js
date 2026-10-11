/** BOM construction, pricing, atomic inventory deduction. */

export const PRICE_MARKUP = 3.2;
const round4 = (n) => Math.round(n * 1e4) / 1e4;
export const roundQuarter = (n) => Math.round(n * 4) / 4;

export function makeBom(lines, byId) {
  return lines.map(({ ingredientId, qty }) => {
    const ing = byId.get(ingredientId);
    return { ingredientId, name: ing.name, qty, unit: ing.unit, unitCost: ing.costPerUnit, lineCost: round4(qty * ing.costPerUnit) };
  });
}

export const bomCost = (bom) => round4(bom.reduce((s, l) => s + l.lineCost, 0));

export const priceFor = (cost, basePrice = 0) => Math.max(basePrice, roundQuarter(cost * PRICE_MARKUP));

export function allergensOf(bom, byId) {
  const out = new Set();
  for (const l of bom) {
    const d = byId.get(l.ingredientId)?.tags.dietary ?? [];
    if (!d.includes('dairy-free')) out.add('dairy');
    if (!d.includes('nut-free')) out.add('tree nuts');
    if (!d.includes('gluten-free')) out.add('gluten');
  }
  return [...out];
}

/** Total qty needed per ingredient (a BOM may repeat an ingredient). */
function needs(bom) {
  const m = new Map();
  for (const l of bom) m.set(l.ingredientId, (m.get(l.ingredientId) ?? 0) + l.qty);
  return m;
}

/** Returns first shortage, or null if the BOM can be fully supplied. */
export function findShortage(bom, inventory) {
  for (const [id, qty] of needs(bom)) {
    const have = inventory[id] ?? 0;
    if (have < qty) return { ingredientId: id, need: qty, have };
  }
  return null;
}

/** Atomic: either every line is deducted or inventory is returned untouched. */
export function deduct(inventory, bom) {
  const shortage = findShortage(bom, inventory);
  if (shortage) return { ok: false, inventory, shortage };
  const next = { ...inventory };
  for (const [id, qty] of needs(bom)) next[id] = round4(next[id] - qty);
  return { ok: true, inventory: next, shortage: null };
}
