import { callGemini, orderPrompt, ORDER_SCHEMA } from './gemini.js';
import { synthOrder } from './mock.js';
import { retrieve } from './hybrid.js';
import { isOrderShape } from '../data/schemas.js';
import { equipmentMap, isEligible, meetsDiet } from './filter.js';
import { makeBom, bomCost, priceFor, allergensOf, findShortage } from './bom.js';

export const GEMINI_TIMEOUT_MS = 6000;

export function envKey() {
  try { return import.meta.env?.VITE_GEMINI_API_KEY || ''; } catch { return ''; }
}

export function withTimeout(factory, ms) {
  const ctl = new AbortController();
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => { ctl.abort(); rej(new Error('timeout')); }, ms); });
  return Promise.race([factory(ctl.signal), timeout]).finally(() => clearTimeout(timer));
}

/**
 * Check a model order against live inventory/equipment and rebuild it with our own prices.
 * Returns a CustomOrder (source 'gemini') or throws.
 */
export function validateOrder(raw, { ingredients, equipment }, dietary = []) {
  if (!isOrderShape(raw)) throw new Error('invalid order shape');
  const equip = equipmentMap(equipment);
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const merged = new Map();
  for (const l of raw.bom) merged.set(l.ingredientId, (merged.get(l.ingredientId) ?? 0) + l.qty);
  const lines = [...merged].map(([ingredientId, qty]) => ({ ingredientId, qty }));
  if (lines.length < 2) throw new Error('bom too small');
  for (const l of lines) {
    const ing = byId.get(l.ingredientId);
    if (!ing) throw new Error('unknown ingredient ' + l.ingredientId);
    if (!isEligible(ing, equip)) throw new Error('ineligible ingredient ' + l.ingredientId);
    if (!meetsDiet(ing, dietary)) throw new Error('diet violation ' + l.ingredientId);
  }
  const bom = makeBom(lines, byId);
  const inventory = Object.fromEntries(ingredients.map((i) => [i.id, i.stock]));
  if (findShortage(bom, inventory)) throw new Error('insufficient stock');
  const cost = bomCost(bom);
  return {
    name: raw.name, description: raw.description, bom, cost,
    price: priceFor(cost, 3.5), baristaSteps: raw.baristaSteps,
    prepMinutes: raw.prepMinutes, allergens: allergensOf(bom, byId), source: 'gemini',
  };
}

/**
 * Craft a custom order. `ctx` = {ingredients (with live stock), equipment, recipes, pairings}.
 * Live Gemini when a key exists; any failure falls back to the mock engine. Resolves null if nothing is makeable.
 */
export async function craft(query, ctx, options = {}) {
  const { apiKey, fetchImpl, timeoutMs = GEMINI_TIMEOUT_MS } = options;

  // Explicit apiKey option provided
  if (apiKey !== undefined) {
    if (apiKey) {
      try {
        const r = retrieve(query, ctx);
        const raw = await withTimeout(
          (signal) => callGemini({ apiKey, prompt: orderPrompt(query, r), schema: ORDER_SCHEMA, fetchImpl, signal }),
          timeoutMs,
        );
        return validateOrder(raw, ctx, r.dietary);
      } catch {
        /* fall through to mock */
      }
    }
    return synthOrder(query, ctx);
  }

  // No explicit apiKey: check build-time env key first
  const key = envKey();
  if (key) {
    try {
      const r = retrieve(query, ctx);
      const raw = await withTimeout(
        (signal) => callGemini({ apiKey: key, prompt: orderPrompt(query, r), schema: ORDER_SCHEMA, fetchImpl, signal }),
        timeoutMs,
      );
      return validateOrder(raw, ctx, r.dietary);
    } catch {
      /* fall through to mock */
    }
  } else if (typeof window !== 'undefined' || fetchImpl) {
    // Production browser environment: proxy through /api/formulate
    try {
      const r = retrieve(query, ctx);
      const fetcher = fetchImpl || globalThis.fetch;
      if (typeof fetcher === 'function') {
        const raw = await withTimeout(
          async (signal) => {
            const res = await fetcher('/api/formulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: orderPrompt(query, r), schema: ORDER_SCHEMA }),
              signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.fallback || !json.data) throw new Error(json.error || 'fallback');
            return json.data;
          },
          timeoutMs,
        );
        return validateOrder(raw, ctx, r.dietary);
      }
    } catch {
      /* fall through to mock */
    }
  }

  return synthOrder(query, ctx);
}
