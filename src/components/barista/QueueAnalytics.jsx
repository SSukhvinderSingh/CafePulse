import BellCurve from '../shared/BellCurve.jsx';
import { queueStats } from '../../state/selectors.js';
import { promisedMinutes } from '../../engine/waittime.js';
import { useStore } from '../../state/store.jsx';

export default function QueueAnalytics() {
  const { state } = useStore();
  const { before, after } = queueStats(state);
  const changed = state.interventions.length > 0;
  const Stat = ({ k, a, b, unit = '' }) => (
    <div className="rounded-lg bg-espresso-950 p-2 text-center font-mono">
      <dt className="text-[11px] text-crema-300 truncate" title={k}>{k}</dt>
      <dd className="text-base font-bold text-crema-50">{a.toFixed(1)}{unit}</dd>
      {changed && <dd className="text-[11px] text-crema-300">was {b.toFixed(1)}{unit}</dd>}
    </div>
  );
  return (
    <section className="card space-y-2" aria-label="Queue analytics">
      <h2 className="font-display text-xl font-extrabold">Wait for the next order</h2>
      <BellCurve mu={after.mu} sigma={after.sigma} p85={after.p85} promised={promisedMinutes(after)} ghost={changed ? before : null} />
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat k="Avg Wait" a={after.mu} b={before.mu} unit="m" />
        <Stat k="Variation" a={after.sigma} b={before.sigma} unit="m" />
        <Stat k="Est. Wait (85%)" a={after.p85} b={before.p85} unit="m" />
        <Stat k="Rush Peak (95%)" a={after.p95} b={before.p95} unit="m" />
      </dl>
    </section>
  );
}
