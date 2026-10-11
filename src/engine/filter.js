/** Deterministic eligibility. Retrieval and generation never see ineligible items. */

export function equipmentMap(equipment) {
  return Array.isArray(equipment) ? Object.fromEntries(equipment.map((e) => [e.id, e.available])) : equipment;
}

/** Ingredient is eligible iff stock > 0 and all required equipment is available. */
export function isEligible(ing, equip) {
  return ing.stock > 0 && ing.requiresEquipment.every((e) => equip[e] === true);
}

export function eligibleIngredients(ingredients, equip, dietary = []) {
  return ingredients.filter((i) => isEligible(i, equip) && dietary.every((d) => i.tags.dietary.includes(d)));
}

export function meetsDiet(ing, dietary) {
  return dietary.every((d) => ing.tags.dietary.includes(d));
}

/** Recipe eligible iff all of its base ingredients are eligible. */
export function eligibleRecipes(recipes, ingredients, equip) {
  const ok = new Set(ingredients.filter((i) => isEligible(i, equip)).map((i) => i.id));
  return recipes.filter((r) => r.baseRatio.every((l) => ok.has(l.ingredientId)));
}

/** Merge live stock levels into the static ingredient catalogue. */
export function withStock(ingredients, inventory) {
  return ingredients.map((i) => ({ ...i, stock: inventory[i.id] ?? i.stock }));
}

export function stockStatus(ing, lowRatio = 0.25) {
  if (ing.stock <= 0) return 'out';
  return ing.stock <= ing.parLevel * lowRatio ? 'low' : 'in';
}
