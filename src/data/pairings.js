/** Pairing guidelines, flavor-wheel docs, and ratio notes used by the dense retriever. */
const d = (id, kind, text, tags) => ({ id, kind, text, tags });

export const PAIRINGS = [
  d('p1', 'pairing', 'Citrus and berry notes in light roast espresso pair with a touch of honey or peach for a bright fruity drink', ['fruity', 'citrus', 'berry']),
  d('p2', 'pairing', 'Chocolate and nutty espresso pairs with caramel, hazelnut or brown sugar for a cozy dessert-like latte', ['chocolate', 'nutty', 'caramel', 'cozy']),
  d('p3', 'pairing', 'Oat milk adds cereal sweetness so less syrup is needed for a not too sweet drink', ['oat', 'less-sweet', 'dairy-free']),
  d('p4', 'pairing', 'Cinnamon and nutmeg warm a vanilla or brown sugar latte, a cozy autumn profile', ['cinnamon', 'warm', 'cozy', 'vanilla']),
  d('p5', 'pairing', 'Lavender and honey with oat milk create a floral calming latte', ['floral', 'calm', 'honey']),
  d('p6', 'pairing', 'Raspberry and dark chocolate are a classic tart plus rich pairing for mocha', ['berry', 'chocolate', 'tart']),
  d('p7', 'pairing', 'Hibiscus tea with strawberry or orange makes a tart bright iced refresher without caffeine', ['tart', 'fruity', 'bright', 'refreshing']),
  d('p8', 'pairing', 'Cardamom and chai spices complement steamed milk and brown sugar, spicy and sweet', ['spicy', 'warm', 'cardamom']),
  d('p9', 'pairing', 'Orange juice and espresso make a sparkling coffee tonic: citrus acid lifts fruity Ethiopian beans', ['citrus', 'acid', 'bright', 'refreshing']),
  d('p10', 'pairing', 'Matcha pairs with vanilla and oat milk, earthy and creamy and low sugar', ['earthy', 'vanilla', 'low-sugar']),
  d('p11', 'flavor-wheel', 'Flavor wheel fruity branch: berry, citrus, stone fruit, tropical; associated with bright acidity', ['fruity', 'berry', 'citrus', 'bright']),
  d('p12', 'flavor-wheel', 'Flavor wheel sweet branch: caramel, honey, vanilla, molasses, brown sugar', ['sweet', 'caramel', 'honey', 'vanilla']),
  d('p13', 'flavor-wheel', 'Flavor wheel nutty and cocoa branch: almond, hazelnut, dark chocolate, toasted', ['nutty', 'chocolate', 'bold']),
  d('p14', 'flavor-wheel', 'Flavor wheel floral branch: jasmine, lavender, honeysuckle, delicate and aromatic', ['floral', 'calm', 'jasmine']),
  d('p15', 'flavor-wheel', 'Flavor wheel spice branch: cinnamon, cardamom, clove, ginger, nutmeg, warming', ['spicy', 'warm', 'cinnamon']),
  d('p16', 'flavor-wheel', 'Smoky and roasted notes: dark roast, burnt sugar, ash; pair with chocolate and cream', ['smoky', 'bold', 'chocolate']),
  d('p17', 'ratio', 'Syrup ratio: 10 ml per 12 oz drink is standard; use 5 ml for a not too sweet drink, 15 ml for extra sweet', ['sweet', 'less-sweet', 'ratio']),
  d('p18', 'ratio', 'Espresso to milk ratio 1 to 4 for latte, 1 to 2 for cappuccino, 1 to 3 water for americano', ['ratio', 'latte', 'cappuccino']),
  d('p19', 'ratio', 'Fruit puree 40 to 60 g per 12 oz iced drink; keep milk out of acidic fruit drinks to avoid curdling', ['fruity', 'ratio', 'acid']),
  d('p20', 'pairing', 'Vegan or dairy-free: pick oat, soy or coconut milk; oat steams best, soy is richest in protein', ['vegan', 'dairy-free', 'oat', 'soy']),
  d('p21', 'pairing', 'Sugar-free: use sugar-free vanilla syrup, cinnamon or cardamom for sweetness perception without sugar', ['sugar-free', 'vanilla', 'cinnamon']),
  d('p22', 'pairing', 'Peach and vanilla over iced oat latte gives a soft summery fruity drink', ['fruity', 'peach', 'iced', 'summer']),
];
