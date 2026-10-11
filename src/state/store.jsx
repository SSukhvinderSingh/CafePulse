import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { initialState, reducer } from './reducer.js';
import { craft } from '../engine/orderService.js';
import { classify } from '../engine/classifier.js';

import { RECIPES } from '../data/recipes.js';
import { PAIRINGS } from '../data/pairings.js';
import { liveIngredients } from './selectors.js';

export const STORAGE_KEY = 'cafepulse.v1';
const SPEED = typeof location !== 'undefined' && /[?&]fast=1/.test(location.search) ? 10 : 1;
const Ctx = createContext(null);

function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.state?.inventory && saved.state.tickets) {
      return { ...saved.state, draft: null, now: saved.state.now + (Date.now() - saved.savedAt) };
    }
  } catch { /* corrupt storage: start fresh */ }
  return initialState();
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', ms: 1000 * SPEED }), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state })); } catch { /* quota */ }
  }, [state]);

  const actions = useMemo(() => ({
    setView: (view) => dispatch({ type: 'SET_VIEW', view }),
    reset: () => { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } dispatch({ type: 'RESET' }); },
    async craft(query) {
      const s = ref.current;
      const order = await craft(query, { ingredients: liveIngredients(s), equipment: s.equipment, recipes: RECIPES, pairings: PAIRINGS });
      dispatch({ type: 'SET_DRAFT', order });
      return order;
    },
    place: (order, customer) => dispatch({ type: 'PLACE_ORDER', order, customer }),
    toggleCustomerLever: (id) => dispatch({ type: 'TOGGLE_CUSTOMER_LEVER', id }),
    toggleIntervention: (id) => dispatch({ type: 'TOGGLE_INTERVENTION', id }),
    toggleStock: (id) => dispatch({ type: 'TOGGLE_STOCK', id }),
    toggleEquipment: (id) => dispatch({ type: 'TOGGLE_EQUIPMENT', id }),
    advanceTicket: (id) => dispatch({ type: 'ADVANCE_TICKET', id }),
    completePickup: (id) => dispatch({ type: 'COMPLETE_PICKUP', id }),
    dismissMyTicket: () => dispatch({ type: 'DISMISS_MY_TICKET' }),
    dismissAlert: (id) => dispatch({ type: 'DISMISS_ALERT', id }),
    /** One tap records a row for that dimension, then classification runs in the background. */
    async feedback(partial) {
      const s = ref.current;
      const row = { id: `F-${s.now}-${s.telemetry.length}`, ts: s.now, ...partial };
      dispatch({ type: 'ADD_TELEMETRY', row });
      const alerts = await classify(row, [...s.telemetry, row], s.now);
      if (alerts.length) dispatch({ type: 'ADD_ALERTS', alerts });
    },
  }), []);

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

