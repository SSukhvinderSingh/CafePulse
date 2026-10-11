import { CUSTOMER_LEVERS, applyLevers, waitStats } from '../../engine/waittime.js';
import { useStore } from '../../state/store.jsx';

/** Each lever is shown with its own "-N min" effect on P85 relative to the unleveraged baseline. */
export default function ShiftLeftLevers({ baseParams }) {
  const { state, toggleCustomerLever } = useStore();
  const baseP85 = waitStats(baseParams).p85;
  return (
    <section aria-label="Shift-left levers" className="space-y-2">
      <p className="label">Shift left — cut your wait</p>
      <ul className="grid gap-2">
        {CUSTOMER_LEVERS.map((l) => {
          const saved = baseP85 - waitStats(applyLevers(CUSTOMER_LEVERS, [l.id], baseParams)).p85;
          const on = state.customerLevers.includes(l.id);
          return (
            <li key={l.id}>
              <button
                aria-pressed={on} onClick={() => toggleCustomerLever(l.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${on ? 'border-amber-500 bg-amber-500/15' : 'border-espresso-700 hover:bg-espresso-800'}`}
              >
                <span><span className="block text-sm font-bold">{l.label}</span><span className="text-xs text-crema-300">{l.hint}</span></span>
                <span className="rounded-md bg-espresso-950 px-2 py-0.5 font-mono text-xs text-amber-400">−{saved.toFixed(1)} min</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
