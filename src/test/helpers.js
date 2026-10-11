import { INGREDIENTS } from '../data/ingredients.js';
import { EQUIPMENT } from '../data/equipment.js';
import { RECIPES } from '../data/recipes.js';
import { PAIRINGS } from '../data/pairings.js';
import { equipmentMap } from '../engine/filter.js';

export const baseCtx = (stockOverrides = {}, equipOverrides = {}) => ({
  ingredients: INGREDIENTS.map((i) => ({ ...i, stock: stockOverrides[i.id] ?? i.stock })),
  equipment: { ...equipmentMap(EQUIPMENT), ...equipOverrides },
  recipes: RECIPES,
  pairings: PAIRINGS,
});
