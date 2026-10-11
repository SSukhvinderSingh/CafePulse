const line = (ingredientId, name, qty, unit, unitCost) => ({ ingredientId, name, qty, unit, unitCost, lineCost: +(qty * unitCost).toFixed(4) });
const MIN = 60000;

/** Active tickets staggered relative to `now` (ms). */
export function seedTickets(now) {
  const t = (id, customer, orderName, price, prep, ageMin, status, started, bom) => ({
    id, customer, orderName, bom, price, prepMinutes: prep, createdAt: now - ageMin * MIN,
    startedAt: started == null ? null : now - started * MIN,
    dueAt: now + (prep + (status === 'queued' ? 3 : 0) - (started ?? 0)) * MIN,
    status, source: 'mock',
  });
  const latte = [line('espresso-house', 'House Espresso', 2, 'shot', 0.45), line('milk-whole', 'Whole Milk', 220, 'ml', 0.0012)];
  return [
    t('T-101', 'Maya', 'Latte', 4.5, 3, 5, 'ready', 3, latte),
    t('T-102', 'Jon', 'Cappuccino', 4.25, 3, 4, 'brewing', 1.5, latte),
    t('T-103', 'Priya', 'Vanilla Oat Latte', 5.5, 3.5, 3, 'brewing', 0.5, latte),
    t('T-104', 'Sam', 'Iced Latte', 4.75, 3, 2, 'queued', null, latte),
    t('T-105', 'Lena', 'Berry Refresher', 5, 3.5, 1.5, 'queued', null, latte),
    t('T-106', 'Omar', 'Chai Latte', 4.5, 3, 1, 'queued', null, latte),
  ];
}
