import { ChevronRight } from 'lucide-react';
import { useStore } from '../../state/store.jsx';
import { countdownSeconds } from '../../state/selectors.js';
import { SourceBadge } from '../shared/Badge.jsx';
import { fmt } from '../customer/ProgressTracker.jsx';

const NEXT = { queued: 'Start brewing', brewing: 'Mark ready', ready: 'Picked up' };
const TONE = { queued: 'text-crema-200', brewing: 'text-amber-400', ready: 'text-matcha-500' };

export default function TicketPipeline() {
  const { state, advanceTicket } = useStore();
  const live = state.tickets.filter((t) => t.status !== 'done');
  return (
    <section className="card" aria-label="Ticket pipeline">
      <h2 className="mb-3 font-display text-xl font-extrabold">Ticket pipeline <span className="font-mono text-sm text-crema-300">{live.length}</span></h2>
      <ul className="space-y-2">
        {live.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-xl border border-espresso-700 bg-espresso-950 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{t.orderName} <span className="font-normal text-crema-300">· {t.customer}</span></p>
              <p className="flex items-center gap-2 font-mono text-xs"><span className={`uppercase ${TONE[t.status]}`}>{t.status}</span><span className="text-crema-300">{t.id}</span><SourceBadge source={t.source} /></p>
            </div>
            <span className="font-mono text-lg tabular-nums" aria-label={`Due in ${fmt(countdownSeconds(t, state.now))}`}>{t.status === 'ready' ? '—' : fmt(countdownSeconds(t, state.now))}</span>
            <button className="btn-ghost whitespace-nowrap" onClick={() => advanceTicket(t.id)} aria-label={`${NEXT[t.status]}: ${t.orderName}`}>{NEXT[t.status]}<ChevronRight size={14} aria-hidden="true" /></button>
          </li>
        ))}
        {live.length === 0 && <li className="text-sm text-crema-300">Queue is clear.</li>}
      </ul>
    </section>
  );
}
