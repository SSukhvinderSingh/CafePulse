import { useState } from 'react';
import { Sparkles, Coffee } from 'lucide-react';

const POPULAR_MENU = [
  { name: 'Latte', tag: '$4.50 · 3m', query: 'classic latte with whole milk' },
  { name: 'Iced Latte', tag: '$4.75 · 3m', query: 'refreshing iced latte with milk over ice' },
  { name: 'Cold Brew', tag: '$4.50 · 1.5m', query: 'smooth cold brew over ice' },
  { name: 'Cappuccino', tag: '$4.25 · 3m', query: 'cappuccino with equal parts espresso and thick foam' },
  { name: 'Chai Latte', tag: '$4.50 · 3m', query: 'warm spiced chai latte with steamed milk' },
  { name: 'Berry Refresher', tag: '$5.00 · 3.5m', query: 'bright berry hibiscus refresher over ice' },
];

const IDEAS = ['something fruity, oat milk, not too sweet', 'cozy vegan cinnamon latte', 'bright iced citrus refresher'];

export default function OrderBar({ onCraft, busy }) {
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    onCraft(q);
  };

  const handleSelectMenu = (query) => {
    setQ(query);
    onCraft(query);
  };

  return (
    <div className="space-y-4">
      {/* Quick Menu Selection */}
      <section aria-label="Popular café menu">
        <div className="flex items-center justify-between mb-2">
          <p className="label flex items-center gap-1.5"><Coffee size={13} aria-hidden="true" />Choose from Menu</p>
          <span className="text-[11px] text-crema-300">Tap to customize</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {POPULAR_MENU.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleSelectMenu(item.query)}
              disabled={busy}
              className="flex flex-col items-start rounded-xl border border-espresso-700 bg-espresso-950/80 p-2.5 text-left transition hover:border-amber-400/50 hover:bg-espresso-900 active:scale-[0.98]"
            >
              <span className="text-sm font-bold text-crema-50">{item.name}</span>
              <span className="font-mono text-[11px] text-amber-400">{item.tag}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Custom Drink Crafter */}
      <form onSubmit={submit} className="space-y-2.5">
        <label htmlFor="craft-q" className="label block">Or describe your custom drink</label>
        <textarea
          id="craft-q"
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. oat milk flat white with cinnamon and vanilla..."
          className="w-full resize-none rounded-xl border border-espresso-700 bg-espresso-950 px-3 py-2.5 text-[15px] text-crema-50 placeholder:text-crema-300/50 focus:border-amber-400 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setQ(i); onCraft(i); }}
              className="rounded-full border border-espresso-700 px-2.5 py-1 text-xs text-crema-200 transition hover:bg-espresso-800"
            >
              {i}
            </button>
          ))}
        </div>
        <button className="btn w-full" disabled={busy || !q.trim()}>
          <Sparkles size={16} aria-hidden="true" />
          {busy ? 'Crafting beverage…' : 'Craft & review drink'}
        </button>
      </form>
    </div>
  );
}
