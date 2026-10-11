import Gauge from '../shared/Gauge.jsx';
import Radar from '../shared/Radar.jsx';
import { aggregate } from '../../engine/feedback.js';
import { useStore } from '../../state/store.jsx';

export default function SentimentPanel() {
  const { state } = useStore();
  const agg = aggregate(state.telemetry);
  return (
    <section className="card" aria-label="Room sentiment">
      <h2 className="mb-2 font-display text-xl font-extrabold">Room sentiment</h2>
      <div className="flex flex-wrap items-center justify-around gap-2">
        <div className="text-center"><Gauge value={agg.overall} /><p className="label">last 10 check-ins</p></div>
        <Radar per={agg.per} />
      </div>
    </section>
  );
}
