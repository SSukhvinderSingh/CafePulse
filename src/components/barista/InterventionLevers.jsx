import { BARISTA_LEVERS, applyLevers, waitStats } from '../../engine/waittime.js';
import { useStore } from '../../state/store.jsx';
import { isActive } from '../../state/selectors.js';
import { remainingMinutes } from '../../engine/waittime.js';

export default function InterventionLevers() {
  const { state, toggleIntervention } = useStore();
  const base = { remaining: state.tickets.filter(isActive).map((t) => remainingMinutes(t, state.now)), ownPrep: 3, baristas: state.baristas, kappa: 1, sumScale: 1, sigmaScale: 1 };
  const b = waitStats(base);
  return (
    <section className="card space-y-2" aria-label="Intervention levers">
      <h2 className="font-display text-xl font-extrabold">Interventions</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {BARISTA_LEVERS.map((l) => {
          const a = waitStats(applyLevers(BARISTA_LEVERS, [l.id], base));
          const on = state.interventions.includes(l.id);
          return (
            <li key={l.id}>
              <button aria-pressed={on} onClick={() => toggleIntervention(l.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${on ? 'border-copper-500 bg-copper-500/15' : 'border-espresso-700 hover:bg-espresso-800'}`}>
                <span className="block text-sm font-bold">{l.label}</span>
                <span className="block text-xs text-crema-300">{l.hint}</span>
                <span className="mt-1 block font-mono text-xs text-amber-400">Avg {b.mu.toFixed(1)}m → {a.mu.toFixed(1)}m · Est. {b.p85.toFixed(1)}m → {a.p85.toFixed(1)}m</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
