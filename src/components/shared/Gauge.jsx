const colorFor = (v) => (v >= 70 ? '#6e9b5f' : v >= 45 ? '#e59546' : '#d95d39');

/** Half-dial 0-100 sentiment gauge with deconflicted typography and needle clearance. */
export default function Gauge({ value }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const cx = 100, cy = 88, r = 68;
  const arc = (a0, a1, radius) => {
    const p = (a) => [cx + radius * Math.cos(Math.PI * (1 - a)), cy - radius * Math.sin(Math.PI * (1 - a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(1)},${y0.toFixed(1)}A${radius},${radius} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };
  const [nx, ny] = [cx + 52 * Math.cos(Math.PI * (1 - v / 100)), cy - 52 * Math.sin(Math.PI * (1 - v / 100))];
  return (
    <svg viewBox="0 0 200 135" className="w-full max-w-[240px]" role="img" aria-label={`Room sentiment ${value == null ? 'unknown' : Math.round(v) + ' out of 100'}`}>
      <path d={arc(0, 1, r)} stroke="#2d1f17" strokeWidth="12" fill="none" strokeLinecap="round" />
      {v > 0 && <path d={arc(0, v / 100, r)} stroke={colorFor(v)} strokeWidth="12" fill="none" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#f5ecdc" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4.5" fill="#f5ecdc" />
      <text x={cx} y="120" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fdfaf4" fontFamily="Fraunces, Georgia, serif">{value == null ? '–' : Math.round(v)}</text>
    </svg>
  );
}
