import { Coffee, RotateCcw, Smartphone, Store } from 'lucide-react';
import { useStore } from '../../state/store.jsx';

export default function Header() {
  const { state, setView, reset } = useStore();
  const tabs = [['customer', 'Customer', Smartphone], ['barista', 'Barista', Store]];
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-espresso-700 bg-espresso-950/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-espresso-950"><Coffee size={20} aria-hidden="true" /></span>
        <div>
          <h1 className="font-display text-xl font-extrabold leading-none tracking-tight">CaféPulse</h1>
          <p className="label mt-0.5">Live queue · live room</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Switch view" className="flex rounded-xl border border-espresso-700 bg-espresso-900 p-1">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id} role="tab" aria-selected={state.view === id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${state.view === id ? 'bg-crema-100 text-espresso-950' : 'text-crema-200 hover:text-white'}`}
            >
              <Icon size={15} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={reset} aria-label="Reset demo to seed data"><RotateCcw size={14} aria-hidden="true" /><span className="hidden sm:inline">Reset demo</span></button>
      </div>
    </header>
  );
}
