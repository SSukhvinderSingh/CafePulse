import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StoreProvider } from '../state/store.jsx';
import CustomerView from '../components/customer/CustomerView.jsx';
import BaristaView from '../components/barista/BaristaView.jsx';
import { reducer, initialState } from '../state/reducer.js';
import BellCurve from '../components/shared/BellCurve.jsx';
import { synthOrder } from '../engine/mock.js';
import { baseCtx } from './helpers.js';

describe('render smoke', () => {
  it('customer and barista views render seed state', () => {
    const c = renderToString(<StoreProvider><CustomerView /></StoreProvider>);
    expect(c).toContain('Room check-in');
    const b = renderToString(<StoreProvider><BaristaView /></StoreProvider>);
    for (const t of ['Ticket pipeline', 'Inventory', 'Room sentiment', 'Live alerts', 'Interventions']) expect(b).toContain(t);
  });
  it('bell curve labels the pin "{T} min · Expected" (AC13)', () => {
    const html = renderToString(<BellCurve mu={8} sigma={2} p85={10.1} promised={11} />);
    expect(html).toContain('11 min · Expected');
  });
  it('adding a ticket changes the queue curve inputs (AC13)', () => {
    const s0 = initialState(1_700_000_000_000);
    const s1 = reducer(s0, { type: 'PLACE_ORDER', order: synthOrder('latte', baseCtx()) });
    expect(s1.tickets.length).toBe(s0.tickets.length + 1);
  });
});
