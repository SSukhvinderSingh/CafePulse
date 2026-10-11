import { Bell, X } from 'lucide-react';
import { useStore } from '../../state/store.jsx';
import { SourceBadge } from '../shared/Badge.jsx';

const SEV = { high: 'border-terracotta-500 bg-terracotta-500/15', med: 'border-amber-500 bg-amber-500/10', low: 'border-espresso-700' };

export default function AlertHud() {
  const { state, dismissAlert } = useStore();
  return (
    <section className="card" aria-label="Live alerts">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold"><Bell size={18} aria-hidden="true" />Live alerts <span className="font-mono text-sm text-crema-300">{state.alerts.length}</span></h2>
      <ul aria-live="polite" className="space-y-2">
        {state.alerts.map((a) => (
          <li key={a.id} className={`rounded-xl border p-3 ${SEV[a.severity]}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="uppercase">{a.category}</span>
                <span className="rounded bg-espresso-950 px-1.5 font-mono text-[10px] uppercase">{a.severity}</span>
                <SourceBadge source={a.source} />
              </p>
              <button className="rounded p-0.5 hover:bg-espresso-800" onClick={() => dismissAlert(a.id)} aria-label={`Dismiss ${a.category} alert`}><X size={16} aria-hidden="true" /></button>
            </div>
            <p className="mt-1 text-sm text-crema-100">{a.message}</p>
            <p className="mt-1 text-xs text-crema-300">→ {a.suggestedAction}</p>
          </li>
        ))}
        {state.alerts.length === 0 && <li className="text-sm text-crema-300">All quiet. Alerts appear when a guest scores a dimension 2 or lower.</li>}
      </ul>
    </section>
  );
}
