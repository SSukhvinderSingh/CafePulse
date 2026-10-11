import { retrieve } from './hybrid.js';
import { makeBom, bomCost, priceFor, allergensOf } from './bom.js';
import { meetsDiet } from './filter.js';
import { tokenize } from './tokenize.js';

const MILK_WORDS = { oat: 'milk-oat', almond: 'milk-almond', soy: 'milk-soy', coconut: 'milk-coconut', skim: 'milk-skim', whole: 'milk-whole', lactose: 'milk-lactosefree' };
const SPICE_CUES = new Set(['cozi', 'cozy', 'warm', 'spic', 'spici', 'spicy', 'cinnamon', 'cardamom', 'nutmeg', 'chai', 'autumn']);
const LESS_SWEET = /(not too sweet|less sweet|low sugar|barely sweet|lightly sweet|not sweet|subtle)/i;
const shortName = (n) => n.replace(/\b(Syrup|Puree|Milk|Juice|Compote|Concentrate|Sauce)\b/g, '').replace(/\s+/g, ' ').trim();

function defaultQty(ing) {
  return { shot: 1, ml: 120, g: 30, pc: 1 }[ing.unit] ?? 1;
}

/** Try to build a feasible BOM from one recipe; returns lines or null. */
function tryRecipe(recipe, query, r, byId) {
  const lines = recipe.baseRatio.map((l) => ({ ...l }));
  const eligibleIds = new Set(r.eligible.map((i) => i.id));
  const qTokens = new Set(tokenize(query, { keepStop: true }));
  const milkIdx = lines.findIndex((l) => byId.get(l.ingredientId)?.category === 'milk');
  const extras = [];

  if (milkIdx >= 0) {
    const asked = Object.entries(MILK_WORDS).find(([w, id]) => qTokens.has(w) && eligibleIds.has(id));
    const current = byId.get(lines[milkIdx].ingredientId);
    if (asked) lines[milkIdx].ingredientId = asked[1];
    else if (!eligibleIds.has(current.id) || !meetsDiet(current, r.dietary)) {
      const alt = r.ranked.find((i) => i.category === 'milk') ?? r.eligible.find((i) => i.category === 'milk');
      if (!alt) return null;
      lines[milkIdx].ingredientId = alt.id;
    }
  }
  // Every base line must still be eligible (stock, equipment, diet).
  if (!lines.every((l) => eligibleIds.has(l.ingredientId))) return null;

  const hasMilk = milkIdx >= 0;
  const used = new Set(lines.map((l) => l.ingredientId));
  const pick = (cat) => r.ranked.find((i) => i.category === cat && !used.has(i.id));
  const add = (ing, qty) => {
    if (!ing || ing.stock < qty) return;
    used.add(ing.id);
    lines.push({ ingredientId: ing.id, qty });
    extras.push(ing);
  };

  // r.ranked is already diet-filtered, so a sugar-free request only sees sugar-free syrups.
  add(pick('syrup'), LESS_SWEET.test(query) ? 5 : 10);
  if (hasMilk) {
    const spice = pick('spice');
    if (spice && [...qTokens].some((t) => SPICE_CUES.has(t))) add(spice, 1);
  } else {
    const fruit = pick('fruit');
    if (fruit) add(fruit, 30);
  }

  const supplied = lines.every((l) => (byId.get(l.ingredientId)?.stock ?? 0) >= l.qty);
  return supplied ? { lines, extras } : null;
}

function buildOrder(query, recipe, lines, extras, byId, r) {
  const bom = makeBom(lines, byId);
  const cost = bomCost(bom);
  const swapped = lines.find((l, i) => recipe.baseRatio[i] && l.ingredientId !== recipe.baseRatio[i].ingredientId);
  const nameBits = [
    ...extras.slice(0, 2).map((e) => shortName(e.name)),
    ...(swapped ? [shortName(byId.get(swapped.ingredientId).name)] : []),
  ];
  const name = [...new Set(nameBits), recipe.name].join(' ');
  const steps = [
    `Check stations and ticket: ${recipe.name}${swapped ? ' with ' + shortName(byId.get(swapped.ingredientId).name) + ' milk' : ''}.`,
    recipe.method,
    ...extras.map((e) => `Add ${bom.find((l) => l.ingredientId === e.id).qty} ${e.unit} ${e.name}.`),
    'Stir, taste-check for balance, lid and call the name.',
  ];
  return {
    name,
    description: `${/^[aeiou]/i.test(recipe.name) ? 'An' : 'A'} ${recipe.name.toLowerCase()} built for “${query.trim() || 'house taste'}”${r.pairings[0] ? ': ' + r.pairings[0].text.split(/[,:;]/)[0].toLowerCase() : ''}.`,
    bom, price: priceFor(cost, recipe.basePrice), cost,
    baristaSteps: steps,
    prepMinutes: +(recipe.prepMinutes + 0.5 * extras.length).toFixed(1),
    allergens: allergensOf(bom, byId),
    source: 'mock',
  };
}

/**
 * Deterministic order synthesis from retrieval output. Never throws, never touches the network.
 * Returns null only when nothing at all can be made.
 */
export function synthOrder(query, ctx) {
  const r = retrieve(query, ctx);
  const byId = new Map(ctx.ingredients.map((i) => [i.id, i]));
  const qTokens = new Set(tokenize(query, { keepStop: true }));
  const wantsMilk = Object.keys(MILK_WORDS).some((w) => qTokens.has(w)) || qTokens.has('milk');
  const milky = (rec) => rec.baseRatio.some((l) => byId.get(l.ingredientId)?.category === 'milk');
  const recipes = wantsMilk ? [...r.recipes.filter(milky), ...r.recipes.filter((x) => !milky(x))] : r.recipes;

  for (const recipe of recipes) {
    const built = tryRecipe(recipe, query, r, byId);
    if (built && built.lines.length >= 2) return buildOrder(query, recipe, built.lines, built.extras, byId, r);
  }
  // Improvise from the two best eligible, differently-categorised ingredients.
  const pool = r.ranked.length ? [...r.ranked, ...r.eligible] : r.eligible;
  const first = pool[0];
  const second = pool.find((i) => first && i.category !== first.category);
  if (!first || !second) return null;
  const lines = [first, second].map((i) => ({ ingredientId: i.id, qty: Math.min(defaultQty(i), i.stock) }));
  const bom = makeBom(lines, byId);
  const cost = bomCost(bom);
  return {
    name: 'House Improvisation',
    description: `Improvised from what is on the shelf for “${query.trim()}”.`,
    bom, price: priceFor(cost, 3.5), cost,
    baristaSteps: ['Gather the two components.', `Combine ${first.name} with ${second.name} to taste.`, 'Serve and call the name.'],
    prepMinutes: 2.5, allergens: allergensOf(bom, byId), source: 'mock',
  };
}
