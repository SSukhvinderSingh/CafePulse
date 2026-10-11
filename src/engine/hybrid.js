import { BM25 } from './bm25.js';
import { denseSearch } from './embed.js';
import { detectDietary } from './tokenize.js';
import { eligibleIngredients, eligibleRecipes, equipmentMap } from './filter.js';

/** Reciprocal Rank Fusion: score(id) = sum 1/(k + rank), rank 1-based. */
export function rrf(lists, k = 60) {
  const score = new Map();
  for (const list of lists) {
    list.forEach((item, idx) => score.set(item.id, (score.get(item.id) ?? 0) + 1 / (k + idx + 1)));
  }
  return [...score].map(([id, s]) => ({ id, score: s })).sort((a, b) => b.score - a.score);
}

export const ingredientDoc = (i) => ({ id: i.id, text: [i.name, ...i.tags.taste, ...i.tags.dietary, ...i.tags.notes].join(' ') });
const recipeDoc = (r) => ({ id: r.id, text: `${r.name} ${r.text}` });
const pairingDoc = (p) => ({ id: p.id, text: `${p.text} ${p.tags.join(' ')}` });

function fuse(query, docs) {
  if (!docs.length) return [];
  return rrf([new BM25(docs).search(query), denseSearch(query, docs)]);
}

/**
 * Hybrid retrieval restricted to feasible items.
 * `ranked` lists matched eligible ingredients (best first) and is the only source for generation.
 */
export function retrieve(query, { ingredients, equipment, recipes, pairings }, { topIngredients = 8, topPairings = 3 } = {}) {
  const equip = equipmentMap(equipment);
  const dietary = detectDietary(query);
  const pool = eligibleIngredients(ingredients, equip, dietary);
  const byId = new Map(pool.map((i) => [i.id, i]));

  const ranked = fuse(query, pool.map(ingredientDoc)).map((r) => byId.get(r.id));
  const feasibleRecipes = eligibleRecipes(recipes, ingredients, equip);
  const rankedRecipes = fuse(query, feasibleRecipes.map(recipeDoc))
    .map((r) => feasibleRecipes.find((x) => x.id === r.id));
  const recipeOrder = [...rankedRecipes, ...feasibleRecipes.filter((r) => !rankedRecipes.includes(r))];
  const pairingById = new Map(pairings.map((p) => [p.id, p]));
  const topPairs = fuse(query, pairings.map(pairingDoc)).slice(0, topPairings).map((r) => pairingById.get(r.id));

  return {
    dietary,
    eligible: pool,
    ranked,
    ingredients: ranked.slice(0, topIngredients),
    pairings: topPairs,
    recipes: recipeOrder,
    recipe: recipeOrder[0] ?? null,
  };
}
