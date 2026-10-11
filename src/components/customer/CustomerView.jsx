import { useState } from 'react';
import { PartyPopper, Check, Clock, X, Coffee, ListOrdered, Sparkles } from 'lucide-react';
import PhoneFrame from '../shared/PhoneFrame.jsx';
import OrderBar from './OrderBar.jsx';
import OffMenuCrafter from './OffMenuCrafter.jsx';
import WaitPanel from './WaitPanel.jsx';
import ShiftLeftLevers from './ShiftLeftLevers.jsx';
import ProgressTracker, { fmt } from './ProgressTracker.jsx';
import FeedbackCheckin from './FeedbackCheckin.jsx';
import { useStore } from '../../state/store.jsx';
import { retrieve } from '../../engine/hybrid.js';
import { RECIPES } from '../../data/recipes.js';
import { PAIRINGS } from '../../data/pairings.js';
import { draftStats, liveIngredients, myStats, myTicket, isActive, countdownSeconds } from '../../state/selectors.js';
import { remainingMinutes, BARISTA_LEVERS, applyLevers } from '../../engine/waittime.js';
import { SourceBadge } from '../shared/Badge.jsx';

const STATUS_BADGE = {
  queued: 'border-crema-300/30 bg-espresso-950 text-crema-200',
  brewing: 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold',
  ready: 'border-matcha-500/50 bg-matcha-500/20 text-matcha-400 font-extrabold animate-pulse',
};

export default function CustomerView() {
  const { state, craft } = useStore();
  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'queue' | 'feedback'
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [empty, setEmpty] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(null);

  const onCraft = async (q) => {
    setBusy(true);
    const ctx = { ingredients: liveIngredients(state), equipment: state.equipment, recipes: RECIPES, pairings: PAIRINGS };
    setCandidates(retrieve(q, ctx).ingredients.slice(0, 6));
    setEmpty((await craft(q)) === null);
    setBusy(false);
  };

  const handleOrderPlaced = (customerName, order) => {
    setShowOrderModal({
      ticketId: `T-${state.seq}`,
      name: order.name,
      customer: customerName,
      price: order.price,
    });
    // Automatically switch to the live queue tab so customer tracks their order immediately
    setActiveTab('queue');
  };

  const ticket = myTicket(state);
  const d = draftStats(state);
  const mine = myStats(state);
  const baseParams = state.draft && {
    remaining: state.tickets.filter(isActive).map((t) => remainingMinutes(t, state.now)),
    ...applyLevers(BARISTA_LEVERS, state.interventions, { ownPrep: state.draft.prepMinutes, baristas: state.baristas, kappa: 1, sumScale: 1, sigmaScale: 1 }),
  };

  const liveTickets = state.tickets.filter((t) => t.status !== 'done');
  const hasActivePersonalOrder = ticket && ticket.status !== 'done';

  return (
    <PhoneFrame>
      <div className="space-y-4 p-4 pb-8 relative">
        {/* Order Confirmation Modal / Popup */}
        {showOrderModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
          >
            <div className="relative w-full max-w-sm rounded-2xl border border-amber-500/40 bg-espresso-900 p-5 shadow-2xl text-center space-y-3.5">
              <button
                type="button"
                onClick={() => setShowOrderModal(null)}
                className="absolute top-3 right-3 rounded-full p-1 text-crema-300 hover:bg-espresso-800"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>

              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <PartyPopper size={24} aria-hidden="true" />
              </div>

              <div>
                <h3 className="font-display text-xl font-extrabold text-crema-50">Order Placed & Submitted!</h3>
                <p className="text-xs text-crema-300 mt-0.5">Sent directly to the Barista queue</p>
              </div>

              <div className="rounded-xl border border-espresso-700 bg-espresso-950 p-3 text-left space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-crema-300">Ticket #:</span>
                  <span className="font-mono font-bold text-amber-400">{showOrderModal.ticketId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-crema-300">Customer:</span>
                  <span className="font-bold text-crema-50">{showOrderModal.customer}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-crema-300">Beverage:</span>
                  <span className="font-bold text-crema-100">{showOrderModal.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-espresso-850">
                  <span className="text-crema-300">Total:</span>
                  <span className="font-mono font-extrabold text-amber-400">${Number(showOrderModal.price).toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[11px] text-matcha-400 font-medium">
                ✓ Barista queue has been updated in real-time.
              </p>

              <button
                type="button"
                onClick={() => setShowOrderModal(null)}
                className="btn w-full font-bold"
              >
                <Check size={16} aria-hidden="true" /> Track in Live Queue
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <p className="label">Good morning</p>
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            Make it <em className="text-amber-400">yours.</em>
          </h2>
        </div>

        {/* Responsive Segmented Tab Navigation */}
        <nav aria-label="Customer sections" className="flex rounded-xl bg-espresso-950 p-1 border border-espresso-800">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'order'}
            onClick={() => setActiveTab('order')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === 'order'
                ? 'bg-amber-500 text-espresso-950 shadow-sm'
                : 'text-crema-300 hover:text-crema-50 hover:bg-espresso-900/60'
            }`}
          >
            <Coffee size={14} aria-hidden="true" />
            <span>Order</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'queue'}
            onClick={() => setActiveTab('queue')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition relative ${
              activeTab === 'queue'
                ? 'bg-amber-500 text-espresso-950 shadow-sm'
                : 'text-crema-300 hover:text-crema-50 hover:bg-espresso-900/60'
            }`}
          >
            <ListOrdered size={14} aria-hidden="true" />
            <span>Live Queue</span>
            {hasActivePersonalOrder && (
              <span
                className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-extrabold ${
                  activeTab === 'queue' ? 'bg-espresso-950 text-amber-400' : 'bg-amber-500 text-espresso-950'
                }`}
              >
                1
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'feedback'}
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === 'feedback'
                ? 'bg-amber-500 text-espresso-950 shadow-sm'
                : 'text-crema-300 hover:text-crema-50 hover:bg-espresso-900/60'
            }`}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Room check-in</span>
          </button>
        </nav>

        {/* ================================================================= */}
        {/* TAB 1: Order & Crafter                                            */}
        {/* ================================================================= */}
        <div
          role="tabpanel"
          id="tab-order"
          className={activeTab === 'order' ? 'space-y-4 animate-in fade-in' : 'hidden'}
        >
          <OrderBar onCraft={onCraft} busy={busy} />
          {empty && !state.draft && <OffMenuCrafter order={null} candidates={[]} />}
          {state.draft && (
            <>
              <OffMenuCrafter
                order={state.draft}
                candidates={candidates}
                onPlace={handleOrderPlaced}
              />
              <WaitPanel
                title="If you order now"
                stats={d.now}
                promised={d.promised}
                ghost={state.customerLevers.length ? d.base : null}
              />
              <ShiftLeftLevers baseParams={baseParams} />
            </>
          )}

          {hasActivePersonalOrder && (
            <div className="rounded-xl border border-espresso-800 bg-espresso-950/60 p-3 flex items-center justify-between text-xs">
              <span className="text-crema-200">You have an order in progress!</span>
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className="font-bold text-amber-400 hover:underline"
              >
                View in Queue →
              </button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* TAB 2: Live Queue & Tracking                                      */}
        {/* ================================================================= */}
        <div
          role="tabpanel"
          id="tab-queue"
          className={activeTab === 'queue' ? 'space-y-4 animate-in fade-in' : 'hidden'}
        >
          {/* Personal Order Tracker (if customer placed an order) */}
          {ticket ? (
            <div className="space-y-3">
              <ProgressTracker
                ticket={ticket}
                now={state.now}
                onNewOrder={() => setActiveTab('order')}
              />
              {!state.draft && (ticket.status === 'queued' || ticket.status === 'brewing') && (
                <WaitPanel
                  title="Time to ready"
                  stats={mine}
                  promised={Math.max(1, Math.ceil((ticket.dueAt - state.now) / 60000))}
                />
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-espresso-700 bg-espresso-950/40 p-4 text-center space-y-2">
              <p className="text-sm text-crema-200">No active order placed yet.</p>
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className="btn text-xs font-bold py-2 px-3"
              >
                + Choose from Menu to Order
              </button>
            </div>
          )}

          {/* Live Café Queue (Dynamic Real-Time Status) */}
          <section className="card space-y-3" aria-label="Café live order queue">
            <div className="flex items-center justify-between border-b border-espresso-800 pb-2">
              <h3 className="font-display text-base font-extrabold text-crema-50 flex items-center gap-1.5">
                <Coffee size={15} className="text-amber-400" aria-hidden="true" /> Live Café Orders Queue
              </h3>
              <span className="font-mono text-xs text-crema-300">
                {liveTickets.length} orders brewing / queued
              </span>
            </div>

            <ul className="space-y-2">
              {liveTickets.map((t) => {
                const isMine = t.id === state.myTicketId || (showOrderModal && t.id === showOrderModal.ticketId);
                return (
                  <li
                    key={t.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition ${
                      isMine
                        ? 'border-amber-400/60 bg-amber-500/10 shadow-sm'
                        : 'border-espresso-700 bg-espresso-950/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-crema-50 truncate flex items-center gap-1.5">
                        <span>{t.orderName}</span>
                        <span className="font-normal text-crema-300">· {t.customer}</span>
                        {isMine && (
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                            You
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-crema-300 flex items-center gap-1.5 mt-0.5">
                        <span>{t.id}</span>
                        <SourceBadge source={t.source} />
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-crema-200">
                        {t.status === 'ready' ? (
                          <span className="font-bold text-matcha-400">READY</span>
                        ) : (
                          fmt(countdownSeconds(t, state.now))
                        )}
                      </span>
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] uppercase font-bold ${
                          STATUS_BADGE[t.status] || ''
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </li>
                );
              })}
              {liveTickets.length === 0 && (
                <li className="text-center py-3 text-xs text-crema-300">All orders complete! Queue is clear.</li>
              )}
            </ul>
          </section>
        </div>

        {/* ================================================================= */}
        {/* TAB 3: Room check-in & Feedback                                  */}
        {/* ================================================================= */}
        <div
          role="tabpanel"
          id="tab-feedback"
          className={activeTab === 'feedback' ? 'space-y-4 animate-in fade-in' : 'hidden'}
        >
          <FeedbackCheckin />
        </div>
      </div>
    </PhoneFrame>
  );
}
