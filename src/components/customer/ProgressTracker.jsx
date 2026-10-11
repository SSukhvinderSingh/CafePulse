import { Check, Sparkles, Coffee, PartyPopper } from 'lucide-react';
import { countdownSeconds } from '../../state/selectors.js';
import { SourceBadge } from '../shared/Badge.jsx';
import { useStore } from '../../state/store.jsx';

const STEPS = [['queued', 'Queued'], ['brewing', 'Brewing'], ['ready', 'Ready']];
export const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function ProgressTracker({ ticket, now, onNewOrder }) {
  const store = useStore();
  const completePickup = store?.completePickup;
  const dismissMyTicket = store?.dismissMyTicket;

  const isDone = ticket.status === 'done';
  const isReady = ticket.status === 'ready';
  const isBrewing = ticket.status === 'brewing';
  const idx = Math.min(2, STEPS.findIndex(([k]) => k === (isDone ? 'ready' : ticket.status)));
  const sec = countdownSeconds(ticket, now);
  const pct = Math.min(100, Math.max(0, ((now - ticket.createdAt) / (ticket.promisedMin * 60000)) * 100));

  const handlePickup = () => {
    if (completePickup) completePickup(ticket.id);
  };

  const handleNewOrder = () => {
    if (onNewOrder) {
      onNewOrder();
    } else if (dismissMyTicket) {
      dismissMyTicket();
    }
  };

  return (
    <section className="card space-y-3.5 border-amber-500/30 bg-espresso-900/60" aria-label="Order progress">
      {/* Confirmation Badge */}
      <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-1.5 border border-amber-500/20">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <PartyPopper size={14} aria-hidden="true" />
          {isDone ? 'Order Completed' : isReady ? 'Drink Ready at Counter' : 'Order Placed & Confirmed'}
        </span>
        <span className="font-mono text-xs text-crema-300 font-bold">{ticket.id}</span>
      </div>

      {/* Drink Title & Meta */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label">Order receipt · {ticket.customer}</p>
          <h3 className="font-display text-2xl font-extrabold text-crema-50">{ticket.orderName}</h3>
          {ticket.price && (
            <p className="font-mono text-sm text-amber-400 font-semibold mt-0.5">
              ${Number(ticket.price).toFixed(2)} · {ticket.prepMinutes}m prep
            </p>
          )}
        </div>
        <SourceBadge source={ticket.source} />
      </div>

      {/* Bill of materials summary */}
      {ticket.bom && ticket.bom.length > 0 && (
        <div className="rounded-lg bg-espresso-950/60 p-2.5 text-xs text-crema-200">
          <p className="font-semibold text-crema-300 mb-1 flex items-center gap-1">
            <Coffee size={12} aria-hidden="true" /> Ingredients included:
          </p>
          <p className="text-crema-100">
            {ticket.bom.map((b) => `${b.qty} ${b.unit} ${b.name}`).join(' · ')}
          </p>
        </div>
      )}

      {/* Stepper */}
      <ol className="flex items-center pt-1">
        {STEPS.map(([k, label], i) => (
          <li key={k} className="flex flex-1 items-center last:flex-none" aria-current={i === idx ? 'step' : undefined}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${i <= idx ? 'border-copper-500 bg-copper-500 text-espresso-950' : 'border-espresso-700 text-crema-300'}`}>
              {i < idx || (i === 2 && idx === 2) ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`ml-1.5 text-xs ${i === idx ? 'font-bold text-crema-50' : 'text-crema-300'}`}>{label}</span>
            {i < 2 && <span className={`mx-2 h-px flex-1 ${i < idx ? 'bg-copper-500' : 'bg-espresso-700'}`} />}
          </li>
        ))}
      </ol>

      {/* Progress Bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-espresso-950" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Elapsed vs promised time">
        <div className={`h-full transition-all duration-500 ${isReady || isDone ? 'bg-matcha-500' : 'bg-copper-500'}`} style={{ width: (isReady || isDone ? 100 : pct) + '%' }} />
      </div>

      {/* Live Status Message & CTAs */}
      <div className="pt-1">
        {isDone ? (
          <div className="space-y-3">
            <p className="text-sm text-matcha-400 font-medium">✨ Drink picked up! Please share your experience below.</p>
            <button type="button" onClick={handleNewOrder} className="btn w-full">
              <Sparkles size={16} aria-hidden="true" /> Place another order
            </button>
          </div>
        ) : isReady ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-matcha-400 animate-pulse">
              🎉 Your drink is ready at the pickup counter!
            </p>
            <button type="button" onClick={handlePickup} className="btn w-full bg-matcha-600 hover:bg-matcha-500 text-espresso-950 font-bold">
              <Check size={16} aria-hidden="true" /> Pick up drink
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm text-crema-200">
            <span>
              {isBrewing ? '☕ Barista is brewing now' : '⏳ Queued for preparation'}
            </span>
            <span>
              Promised in <span className="font-mono font-bold text-amber-400">{fmt(sec)}</span> · {ticket.promisedMin} min · Expected
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
