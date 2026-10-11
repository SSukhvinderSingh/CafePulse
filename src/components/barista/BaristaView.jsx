import TicketPipeline from './TicketPipeline.jsx';
import InventoryManager from './InventoryManager.jsx';
import SentimentPanel from './SentimentPanel.jsx';
import AlertHud from './AlertHud.jsx';
import QueueAnalytics from './QueueAnalytics.jsx';
import InterventionLevers from './InterventionLevers.jsx';

export default function BaristaView() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <TicketPipeline />
        <div className="grid gap-4 xl:grid-cols-2"><QueueAnalytics /><InterventionLevers /></div>
      </div>
      <div className="space-y-4">
        <AlertHud />
        <SentimentPanel />
        <InventoryManager />
      </div>
    </div>
  );
}
