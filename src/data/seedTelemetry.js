const MIN = 60000;
/** 12 rows, newest last; a couple of poor scores (noise, temperature). */
export function seedTelemetry(now) {
  const r = (i, ageMin, temperature, noise, cleanliness, seating, coffee, comment) =>
    ({ id: `F-${i}`, ts: now - ageMin * MIN, temperature, noise, cleanliness, seating, coffee, ...(comment ? { comment } : {}) });
  return [
    r(1, 55, 4, 4, 5, 4, 5), r(2, 50, 4, 4, 4, 4, 4), r(3, 46, 5, 3, 5, 4, 5), r(4, 41, 4, 4, 4, 3, 4),
    r(5, 37, 4, 3, 4, 4, 5), r(6, 33, 3, 3, 4, 3, 4), r(7, 28, 4, 2, 4, 3, 4, 'a bit loud'),
    r(8, 23, 4, 3, 5, 3, 4), r(9, 18, 2, 3, 4, 3, 4, 'room is cold'), r(10, 13, 4, 4, 4, 4, 5),
    r(11, 8, 4, 3, 4, 3, 4), r(12, 3, 4, 4, 5, 4, 5),
  ];
}
