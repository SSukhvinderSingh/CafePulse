const AXIS_CONFIG = [
  { key: 'temperature', label: 'Temp',   angleIdx: 0, textAnchor: 'middle', dx: 0,   dy: -14 },
  { key: 'noise',       label: 'Noise',  angleIdx: 1, textAnchor: 'start',  dx: 12,  dy: 3 },
  { key: 'cleanliness', label: 'Clean',  angleIdx: 2, textAnchor: 'start',  dx: 12,  dy: 6 },
  { key: 'seating',     label: 'Seats',  angleIdx: 3, textAnchor: 'end',    dx: -12, dy: 6 },
  { key: 'coffee',      label: 'Coffee', angleIdx: 4, textAnchor: 'end',    dx: -12, dy: 3 },
];

/** Five-axis radar of per-dimension 0-100 scores with generous label padding. */
export default function Radar({ per }) {
  const cx = 120, cy = 112, R = 64;
  const pt = (i, r) => [cx + r * Math.sin((2 * Math.PI * i) / 5), cy - r * Math.cos((2 * Math.PI * i) / 5)];
  const poly = (f) => AXIS_CONFIG.map(({ key, angleIdx }) => pt(angleIdx, R * f(key)).map((n) => n.toFixed(1)).join(',')).join(' ');

  return (
    <svg viewBox="0 0 240 220" className="w-full max-w-[260px]" role="img" aria-label={'Per-dimension scores: ' + AXIS_CONFIG.map(({ key, label }) => `${label} ${per[key] == null ? 'n/a' : Math.round(per[key])}`).join(', ')}>
      {AXIS_CONFIG.map(({ angleIdx }) => {
        const [x, y] = pt(angleIdx, R);
        return <line key={angleIdx} x1={cx} y1={cy} x2={x} y2={y} stroke="#32231b" strokeWidth="1" strokeDasharray="2 2" />;
      })}
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={poly(() => f)} fill="none" stroke="#463227" strokeWidth="1" />
      ))}
      <polygon points={poly((k) => (per[k] ?? 0) / 100)} fill="#e59546" fillOpacity="0.3" stroke="#e59546" strokeWidth="2" />
      {AXIS_CONFIG.map(({ key, angleIdx }) => {
        const [x, y] = pt(angleIdx, R * ((per[key] ?? 0) / 100));
        return <circle key={key} cx={x} cy={y} r="3" fill="#e59546" stroke="#120d0a" strokeWidth="1" />;
      })}
      {AXIS_CONFIG.map(({ key, label, angleIdx, textAnchor, dx, dy }) => {
        const [x, y] = pt(angleIdx, R);
        return (
          <text
            key={key}
            x={x + dx}
            y={y + dy}
            textAnchor={textAnchor}
            fontSize="11"
            fontWeight="600"
            fill="#e6d6c3"
            fontFamily="DM Mono, monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
