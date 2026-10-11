import { useState } from 'react';
import { INGREDIENTS } from '../../data/ingredients.js';
import { EQUIPMENT } from '../../data/equipment.js';
import { stockStatus } from '../../engine/filter.js';
import { InventoryBadge } from '../shared/Badge.jsx';
import { useStore } from '../../state/store.jsx';

export default function InventoryManager() {
  const { state, toggleStock, toggleEquipment } = useStore();
  const [q, setQ] = useState('');
  const shown = INGREDIENTS.filter((i) => (i.name + i.category).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="card" aria-label="Inventory manager">
      <h2 className="mb-3 font-display text-xl font-extrabold">Inventory</h2>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Equipment">
        {EQUIPMENT.map((e) => (
          <button key={e.id} aria-pressed={state.equipment[e.id]} onClick={() => toggleEquipment(e.id)}
            className={`rounded-lg border px-2 py-1 text-xs ${state.equipment[e.id] ? 'border-matcha-500 text-[#b9d9a6]' : 'border-terracotta-500 text-[#f1a597] line-through'}`}>
            {e.name}: {state.equipment[e.id] ? 'on' : 'offline'}
          </button>
        ))}
      </div>
      <label htmlFor="inv-q" className="sr-only">Filter ingredients</label>
      <input id="inv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter ingredients…" className="mb-2 w-full rounded-lg border border-espresso-700 bg-espresso-950 px-2.5 py-1.5 text-sm" />
      <ul className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
        {shown.map((i) => {
          const stock = state.inventory[i.id];
          const on = stock > 0;
          return (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-espresso-800">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <span className="font-mono text-xs text-crema-300">{Math.round(stock * 100) / 100} {i.unit}</span>
              <InventoryBadge status={stockStatus({ ...i, stock })} />
              <button role="switch" aria-checked={on} aria-label={`${i.name} in stock`} onClick={() => toggleStock(i.id)}
                className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-matcha-500' : 'bg-espresso-700'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-crema-50 transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
