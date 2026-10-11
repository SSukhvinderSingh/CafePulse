import { pdf } from '../../engine/waittime.js';

const W = 380, H = 175, PAD = { l: 20, r: 24, t: 36, b: 28 };

/** Hand-rolled SVG normal curve: mean line, shading up to P85, pin at promised time T. */
export default function BellCurve({ mu, sigma, p85, promised, ghost }) {
  const maxX = Math.max(mu + 4 * sigma, (promised ?? 0) + 2, 6);
  const xs = (x) => PAD.l + (x / maxX) * (W - PAD.l - PAD.r);
  const peak = pdf(mu, mu, sigma);
  const ys = (y) => H - PAD.b - (y / peak) * (H - PAD.b - PAD.t);
  const pts = (m, s, to = maxX) => {
    const out = [];
    for (let i = 0; i <= 80; i++) {
      const x = (to * i) / 80;
      out.push([xs(x), ys(pdf(x, m, s))]);
    }
    return out;
  };
  const line = (p) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const curve = pts(mu, sigma);
  const shade = pts(mu, sigma, Math.min(p85, maxX));
  const area = `${line(shade)}L${shade.at(-1)[0].toFixed(1)},${H - PAD.b}L${xs(0)},${H - PAD.b}Z`;
  const pinX = xs(Math.min(promised ?? p85, maxX));
  const ticks = Array.from({ length: Math.floor(maxX / 5) + 1 }, (_, i) => i * 5);
  const label = `${promised ?? Math.ceil(p85)} min · Expected`;
  const anchor = pinX > W - 110 ? 'end' : 'start';
  const textX = anchor === 'end' ? pinX - 8 : pinX + 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Wait time distribution: mean ${mu.toFixed(1)} minutes, ${label}`}>
      <path d={area} fill="#e59546" opacity="0.25" />
      {ghost && <path d={line(pts(ghost.mu, ghost.sigma))} fill="none" stroke="#e6d6c3" strokeOpacity="0.35" strokeDasharray="3 3" strokeWidth="1.5" />}
      <path d={line(curve)} fill="none" stroke="#fdfaf4" strokeWidth="2" />
      <line x1={xs(0)} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#463227" />
      {ticks.map((t) => (
        <text key={t} x={xs(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="#c5b29c" fontFamily="DM Mono, monospace">{t}</text>
      ))}
      <line x1={xs(mu)} x2={xs(mu)} y1={24} y2={H - PAD.b} stroke="#e6d6c3" strokeDasharray="4 3" />
      <text x={xs(mu)} y={18} textAnchor="middle" fontSize="10" fill="#e6d6c3" fontFamily="DM Mono, monospace">Avg {mu.toFixed(1)}m</text>
      <line x1={pinX} x2={pinX} y1={32} y2={H - PAD.b} stroke="#e59546" strokeWidth="2" />
      <circle cx={pinX} cy={32} r={4.5} fill="#e59546" />
      <text x={textX} y={36} textAnchor={anchor} fontSize="11" fontWeight="700" fill="#e59546" fontFamily="DM Sans, sans-serif">{label}</text>
    </svg>
  );
}
