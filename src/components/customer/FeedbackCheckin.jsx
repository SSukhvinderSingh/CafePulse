import { useState, useEffect } from 'react';
import { useStore } from '../../state/store.jsx';
import { CheckCircle2, Send, Sparkles } from 'lucide-react';

const DIMS = [['temperature', 'Temperature'], ['noise', 'Noise'], ['cleanliness', 'Cleanliness'], ['seating', 'Seating vibe'], ['coffee', 'Coffee']];

/** One tap on any score records a Telemetry row immediately. */
export default function FeedbackCheckin() {
  const { feedback } = useStore();
  const [picked, setPicked] = useState({});
  const [note, setNote] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(timer);
  }, [notification]);

  const labelFor = (k) => DIMS.find(([dim]) => dim === k)?.[1] || k;

  const tap = (k, n) => {
    setPicked((p) => ({ ...p, [k]: n }));
    feedback({ [k]: n });
    setNotification({
      title: 'Rating Submitted!',
      desc: `Logged ${labelFor(k)}: ${n}/5 to Barista live telemetry.`,
    });
  };

  const sendNote = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    const submittedNote = note.trim();
    feedback({ comment: submittedNote });
    setNote('');
    setNotification({
      title: 'Note Sent to Barista HUD!',
      desc: `"${submittedNote}" transmitted to Barista Alert & Telemetry HUD.`,
    });
  };

  return (
    <section className="card space-y-3 relative overflow-hidden" aria-label="Room check-in">
      {/* Toast Notification Popup */}
      {notification && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-matcha-500/40 bg-matcha-950/90 p-3 text-matcha-200 shadow-lg transition-all animate-in fade-in"
        >
          <CheckCircle2 size={18} className="text-matcha-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-matcha-300">{notification.title}</p>
            <p className="text-xs text-matcha-200/90 truncate">{notification.desc}</p>
          </div>
        </div>
      )}

      <p className="label flex items-center gap-1.5">
        <Sparkles size={13} aria-hidden="true" /> Room check-in · 1 tap each
      </p>
      {DIMS.map(([k, label]) => (
        <div key={k} className="flex items-center justify-between gap-2">
          <span id={`fb-${k}`} className="text-sm text-crema-200">{label}</span>
          <div role="group" aria-labelledby={`fb-${k}`} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => tap(k, n)}
                aria-label={`${label} ${n} out of 5`}
                aria-pressed={picked[k] === n}
                className={`h-8 w-8 rounded-lg border text-sm font-bold transition active:scale-95 ${
                  picked[k] === n
                    ? 'border-amber-500 bg-amber-500 text-espresso-950 font-extrabold'
                    : 'border-espresso-700 bg-espresso-950 text-crema-100 hover:bg-espresso-800'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <form onSubmit={sendNote} className="flex gap-2 pt-1">
        <label htmlFor="fb-note" className="sr-only">Optional note</label>
        <input
          id="fb-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything else? (too loud, sticky table…)"
          className="min-w-0 flex-1 rounded-xl border border-espresso-700 bg-espresso-950 px-3 py-2 text-sm text-crema-50 placeholder:text-crema-300/40 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!note.trim()}
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm font-bold disabled:opacity-40"
        >
          <Send size={14} aria-hidden="true" /> Send
        </button>
      </form>
    </section>
  );
}
