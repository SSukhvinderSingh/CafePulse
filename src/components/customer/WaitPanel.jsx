import BellCurve from '../shared/BellCurve.jsx';

/** Shows a curve for a draft (preview) or placed ticket. `ghost` is the pre-lever baseline. */
export default function WaitPanel({ stats, promised, ghost, title }) {
  return (
    <section className="card space-y-2" aria-label="Wait-time estimate">
      <div className="flex items-baseline justify-between">
        <p className="label">{title}</p>
        <p className="font-display text-2xl font-extrabold text-amber-400">{promised} <span className="text-sm font-sans font-medium text-crema-200">min</span></p>
      </div>
      <BellCurve mu={stats.mu} sigma={stats.sigma} p85={stats.p85} promised={promised} ghost={ghost} />
      <dl className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
        {[['Typical', stats.p50], ['Est. Wait (85%)', stats.p85], ['Rush Peak (95%)', stats.p95]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-espresso-950 py-1.5 px-1">
            <dt className="text-[10px] sm:text-xs text-crema-300 truncate" title={k}>{k}</dt>
            <dd className="text-sm font-bold text-crema-50">{Math.max(0, v).toFixed(1)}m</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
