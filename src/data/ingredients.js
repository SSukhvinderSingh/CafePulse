/** @typedef {import('./schemas.js').Ingredient} Ingredient */

const ALL = ['vegan', 'dairy-free', 'gluten-free', 'nut-free'];
const DAIRY = ['gluten-free', 'nut-free'];

// [id, name, category, unit, stock, par, cost, price, taste[], dietary[], requiresEquipment[], flavorNotes]
const rows = [
  // espresso / base
  ['espresso-house', 'House Espresso', 'espresso', 'shot', 80, 100, 0.45, 1.2, ['bold', 'chocolate', 'nutty'], ALL, ['espresso-machine'], 'Dark chocolate, toasted nut, low acidity'],
  ['espresso-ethiopia', 'Ethiopia Single Origin Espresso', 'espresso', 'shot', 40, 60, 0.7, 1.8, ['fruity', 'bright', 'floral', 'berry'], ALL, ['espresso-machine'], 'Blueberry, jasmine, bright acidity'],
  ['espresso-decaf', 'Decaf Espresso', 'espresso', 'shot', 30, 40, 0.5, 1.2, ['smooth', 'caramel'], ALL, ['espresso-machine'], 'Smooth caramel, mellow'],
  ['cold-brew-conc', 'Cold Brew Concentrate', 'base', 'ml', 900, 1000, 0.01, 0.03, ['smooth', 'chocolate', 'bold'], ALL, ['cold-brew-tap'], 'Silky, low acid, cocoa'],
  ['water-hot', 'Filtered Hot Water', 'base', 'ml', 9999, 9999, 0.0005, 0, ['neutral'], ALL, ['kettle'], 'Neutral'],
  ['ice', 'Ice', 'base', 'g', 5000, 5000, 0.001, 0, ['cold', 'refreshing'], ALL, [], 'Cold, refreshing'],
  ['sparkling-water', 'Sparkling Water', 'base', 'ml', 600, 800, 0.003, 0.01, ['refreshing', 'crisp'], ALL, [], 'Crisp, bubbly'],
  // milks
  ['milk-whole', 'Whole Milk', 'milk', 'ml', 5000, 6000, 0.0012, 0.004, ['creamy', 'sweet'], DAIRY, [], 'Creamy, naturally sweet'],
  ['milk-skim', 'Skim Milk', 'milk', 'ml', 2500, 3000, 0.0011, 0.004, ['light'], DAIRY, [], 'Light, clean'],
  ['milk-oat', 'Oat Milk', 'milk', 'ml', 3500, 4000, 0.0021, 0.006, ['creamy', 'oaty', 'mild'], ALL, [], 'Cereal sweetness, creamy body'],
  ['milk-almond', 'Almond Milk', 'milk', 'ml', 200, 2500, 0.0022, 0.006, ['nutty', 'light'], ['vegan', 'dairy-free', 'gluten-free'], [], 'Toasted almond, light'],
  ['milk-soy', 'Soy Milk', 'milk', 'ml', 2200, 2500, 0.0018, 0.005, ['creamy', 'beany'], ['vegan', 'dairy-free', 'gluten-free', 'nut-free'], [], 'Rich, slightly beany'],
  ['milk-coconut', 'Coconut Milk', 'milk', 'ml', 0, 2000, 0.0025, 0.007, ['tropical', 'creamy', 'sweet'], ALL, [], 'Tropical, rich'],
  ['milk-lactosefree', 'Lactose-Free Milk', 'milk', 'ml', 1800, 2000, 0.0018, 0.005, ['creamy', 'sweet'], DAIRY, [], 'Creamy, sweeter than whole'],
  ['cream-heavy', 'Heavy Cream', 'milk', 'ml', 900, 1000, 0.004, 0.012, ['rich', 'creamy'], DAIRY, [], 'Rich, luxurious'],
  // syrups
  ['syrup-vanilla', 'Vanilla Syrup', 'syrup', 'ml', 900, 1000, 0.006, 0.02, ['sweet', 'vanilla', 'cozy', 'warm'], ALL, [], 'Warm vanilla bean'],
  ['syrup-caramel', 'Caramel Syrup', 'syrup', 'ml', 800, 1000, 0.006, 0.02, ['sweet', 'caramel', 'cozy'], ALL, [], 'Burnt sugar, buttery'],
  ['syrup-hazelnut', 'Hazelnut Syrup', 'syrup', 'ml', 0, 800, 0.007, 0.02, ['sweet', 'nutty', 'cozy'], ['vegan', 'dairy-free', 'gluten-free'], [], 'Toasted hazelnut'],
  ['syrup-lavender', 'Lavender Syrup', 'syrup', 'ml', 400, 600, 0.008, 0.025, ['floral', 'sweet', 'calm'], ALL, [], 'Floral, herbal, soft'],
  ['syrup-honey', 'Honey Syrup', 'syrup', 'ml', 500, 600, 0.008, 0.025, ['sweet', 'floral', 'warm'], ['dairy-free', 'gluten-free', 'nut-free'], [], 'Wildflower honey'],
  ['syrup-raspberry', 'Raspberry Syrup', 'syrup', 'ml', 120, 700, 0.007, 0.022, ['fruity', 'berry', 'tart', 'sweet'], ALL, [], 'Tart raspberry'],
  ['syrup-peach', 'Peach Syrup', 'syrup', 'ml', 500, 700, 0.007, 0.022, ['fruity', 'sweet', 'stone-fruit'], ALL, [], 'Ripe peach, juicy'],
  ['syrup-brownsugar', 'Brown Sugar Syrup', 'syrup', 'ml', 700, 800, 0.005, 0.018, ['sweet', 'molasses', 'cozy'], ALL, [], 'Molasses, toffee'],
  ['syrup-mocha', 'Dark Chocolate Sauce', 'syrup', 'ml', 700, 800, 0.009, 0.025, ['chocolate', 'rich', 'sweet'], ['gluten-free', 'nut-free'], [], 'Dark cocoa'],
  ['syrup-sf-vanilla', 'Sugar-Free Vanilla Syrup', 'syrup', 'ml', 450, 500, 0.008, 0.022, ['vanilla', 'light', 'low-sugar'], [...ALL, 'sugar-free'], [], 'Vanilla, no sugar'],
  // fruit / spice
  ['fruit-strawberry', 'Strawberry Puree', 'fruit', 'g', 600, 800, 0.01, 0.03, ['fruity', 'berry', 'sweet', 'bright'], ALL, ['blender'], 'Ripe strawberry'],
  ['fruit-mango', 'Mango Puree', 'fruit', 'g', 0, 800, 0.012, 0.035, ['fruity', 'tropical', 'sweet'], ALL, ['blender'], 'Tropical mango'],
  ['fruit-orange', 'Fresh Orange Juice', 'fruit', 'ml', 700, 1000, 0.006, 0.02, ['citrus', 'bright', 'acid', 'fruity'], ALL, [], 'Orange zest, sweet acid'],
  ['fruit-lemon', 'Lemon Juice', 'fruit', 'ml', 350, 500, 0.008, 0.025, ['citrus', 'tart', 'acid', 'bright'], ALL, [], 'Sharp, clean citrus'],
  ['fruit-blueberry', 'Blueberry Compote', 'fruit', 'g', 420, 600, 0.014, 0.04, ['fruity', 'berry', 'sweet'], ALL, [], 'Jammy blueberry'],
  ['spice-cinnamon', 'Cinnamon', 'spice', 'g', 15, 200, 0.03, 0.08, ['cinnamon', 'warm', 'spicy', 'cozy'], ALL, [], 'Warm baking spice'],
  ['spice-cardamom', 'Cardamom', 'spice', 'g', 120, 150, 0.06, 0.15, ['spicy', 'floral', 'warm'], ALL, [], 'Floral, eucalyptus spice'],
  ['spice-nutmeg', 'Nutmeg', 'spice', 'g', 100, 120, 0.05, 0.12, ['warm', 'spicy', 'cozy'], ALL, [], 'Sweet woody spice'],
  // tea
  ['tea-chai', 'Masala Chai Concentrate', 'tea', 'ml', 1500, 2000, 0.005, 0.015, ['spicy', 'warm', 'cozy', 'sweet'], ['vegan', 'dairy-free', 'gluten-free', 'nut-free'], [], 'Black tea, ginger, clove'],
  ['tea-matcha', 'Ceremonial Matcha', 'tea', 'g', 90, 150, 0.15, 0.4, ['grassy', 'earthy', 'umami'], ALL, ['kettle'], 'Vegetal, umami'],
  ['tea-earlgrey', 'Earl Grey Tea', 'tea', 'ml', 3000, 3000, 0.002, 0.008, ['citrus', 'floral', 'bergamot'], ALL, ['kettle'], 'Bergamot, black tea'],
  ['tea-hibiscus', 'Hibiscus Tea', 'tea', 'ml', 2500, 3000, 0.002, 0.008, ['tart', 'fruity', 'berry', 'bright'], ALL, ['kettle'], 'Tart cranberry-like'],
  ['tea-greenjasmine', 'Jasmine Green Tea', 'tea', 'ml', 2800, 3000, 0.002, 0.008, ['floral', 'light', 'calm'], ALL, ['kettle'], 'Jasmine, delicate'],
  // toppings
  ['top-whip', 'Whipped Cream', 'topping', 'g', 600, 800, 0.01, 0.03, ['creamy', 'sweet'], DAIRY, [], 'Light sweet cream'],
  ['top-cocoa', 'Cocoa Dust', 'topping', 'g', 250, 300, 0.02, 0.06, ['chocolate', 'bitter'], ALL, [], 'Bitter cocoa'],
  ['top-caramel-drizzle', 'Caramel Drizzle', 'topping', 'g', 400, 500, 0.012, 0.04, ['caramel', 'sweet'], DAIRY, [], 'Buttery caramel'],
  ['top-cinnamon-sugar', 'Cinnamon Sugar', 'topping', 'g', 300, 300, 0.008, 0.03, ['cinnamon', 'sweet'], ALL, [], 'Sweet spice crunch'],
  ['top-coldfoam', 'Vanilla Cold Foam', 'topping', 'g', 350, 500, 0.014, 0.05, ['creamy', 'vanilla', 'sweet'], DAIRY, [], 'Silky vanilla foam'],
];

/** @type {Ingredient[]} */
export const INGREDIENTS = rows.map(([id, name, category, unit, stock, parLevel, costPerUnit, pricePerUnit, taste, dietary, requiresEquipment, flavorNotes]) => ({
  id, name, category, unit, stock, parLevel, costPerUnit, pricePerUnit,
  tags: { taste, dietary, notes: [category] },
  requiresEquipment, flavorNotes,
}));

/** Stock at or below this fraction of par is "low". */
export const LOW_STOCK_RATIO = 0.25;
