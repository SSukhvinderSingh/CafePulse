import { useState } from 'react';
import { Check, Clock, TriangleAlert, User } from 'lucide-react';
import { SourceBadge, InventoryBadge } from '../shared/Badge.jsx';
import { stockStatus } from '../../engine/filter.js';
import { liveIngredients } from '../../state/selectors.js';
import { useStore } from '../../state/store.jsx';

export default function OffMenuCrafter({ order, candidates, onPlace }) {
  const { state, place } = useStore();
  const [customerName, setCustomerName] = useState('');
  const byId = new Map(liveIngredients(state).map((i) => [i.id, i]));
  if (order === null) {
    return <p role="status" className="card text-sm text-crema-200">Nothing can be made right now with the current stock and equipment. Try again after a restock.</p>;
  }

  const handlePlace = () => {
    const finalName = customerName.trim() || 'Guest';
    place(order, finalName);
    if (onPlace) onPlace(finalName, order);
  };

  return (
    <div className="space-y-3">
      {candidates.length > 0 && (
        <section aria-label="Ranked in-stock candidates">
          <p className="label mb-1.5">Best matches in stock</p>
          <ul className="flex flex-wrap gap-1.5">
            {candidates.map((c, i) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-lg border border-espresso-700 bg-espresso-950 px-2 py-1 text-xs">
                <span className="font-mono text-amber-400">{i + 1}</span>{c.name}<InventoryBadge status={stockStatus(c)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <article className="card space-y-3 border-amber-500/20">
        <header className="flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl font-extrabold leading-tight text-crema-50">{order.name}</h3>
          <SourceBadge source={order.source} />
        </header>
        <p className="text-sm text-crema-200">{order.description}</p>
        <table className="w-full text-sm">
          <caption className="sr-only">Bill of materials</caption>
          <tbody>
            {order.bom.map((l) => (
              <tr key={l.ingredientId} className="border-t border-espresso-700">
                <td className="py-1.5 pr-2">{l.name}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-crema-200">{l.qty} {l.unit}</td>
                <td className="py-1.5 text-right"><InventoryBadge status={stockStatus(byId.get(l.ingredientId))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-crema-200">
          {order.baristaSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        {order.allergens.length > 0 && <p className="text-xs text-crema-300">Contains: {order.allergens.join(', ')}</p>}

        {/* Customer Name Input */}
        <div className="space-y-1.5 border-t border-espresso-700 pt-3">
          <label htmlFor="customer-name" className="label flex items-center gap-1 text-xs">
            <User size={13} aria-hidden="true" /> Name for order (displayed on barista board)
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Sukhvinder, Shawn..."
            className="w-full rounded-xl border border-espresso-700 bg-espresso-950 px-3 py-2 text-sm text-crema-50 placeholder:text-crema-300/40 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between border-t border-espresso-700 pt-3">
          <div>
            <p className="font-display text-3xl font-extrabold text-amber-400">${order.price.toFixed(2)}</p>
            <p className="flex items-center gap-1 text-xs text-crema-300"><Clock size={12} aria-hidden="true" />{order.prepMinutes} min prep</p>
          </div>
          <button className="btn font-bold px-4 py-2.5" onClick={handlePlace}>
            <Check size={16} aria-hidden="true" /> Confirm & place order
          </button>
        </div>
        {state.error && <p role="alert" className="flex gap-2 rounded-lg border border-terracotta-500 bg-terracotta-500/15 p-2.5 text-sm text-[#f1a597]"><TriangleAlert size={16} className="shrink-0" aria-hidden="true" />{state.error}</p>}
      </article>
    </div>
  );
}
