import { callGemini, alertPrompt, ALERT_SCHEMA } from './gemini.js';
import { mockClassify, escalate } from './feedback.js';
import { isAlertShape } from '../data/schemas.js';
import { envKey, withTimeout, GEMINI_TIMEOUT_MS } from './orderService.js';

/** Resolves to Alert[]; live Gemini refines each rule-detected alert, any failure keeps the mock one. */
export async function classify(row, telemetry, now, options = {}) {
  const { apiKey, fetchImpl, timeoutMs = GEMINI_TIMEOUT_MS } = options;
  const candidates = mockClassify(row, telemetry, now);
  if (candidates.length === 0) return [];

  // Explicit apiKey option provided
  if (apiKey !== undefined) {
    if (!apiKey) return candidates;
    return Promise.all(candidates.map(async (c) => {
      try {
        const raw = await withTimeout(
          (signal) => callGemini({ apiKey, prompt: alertPrompt(row, c.category, row[c.category]), schema: ALERT_SCHEMA, fetchImpl, signal }),
          timeoutMs,
        );
        if (!isAlertShape(raw)) throw new Error('invalid alert');
        return escalate({ ...c, ...raw, source: 'gemini' }, telemetry, now);
      } catch {
        return c;
      }
    }));
  }

  // No explicit apiKey: check build-time env key first
  const key = envKey();
  if (key) {
    return Promise.all(candidates.map(async (c) => {
      try {
        const raw = await withTimeout(
          (signal) => callGemini({ apiKey: key, prompt: alertPrompt(row, c.category, row[c.category]), schema: ALERT_SCHEMA, fetchImpl, signal }),
          timeoutMs,
        );
        if (!isAlertShape(raw)) throw new Error('invalid alert');
        return escalate({ ...c, ...raw, source: 'gemini' }, telemetry, now);
      } catch {
        return c;
      }
    }));
  }

  // Production browser environment: proxy through /api/formulate
  if (typeof window !== 'undefined' || fetchImpl) {
    const fetcher = fetchImpl || globalThis.fetch;
    if (typeof fetcher === 'function') {
      return Promise.all(candidates.map(async (c) => {
        try {
          const raw = await withTimeout(
            async (signal) => {
              const res = await fetcher('/api/formulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: alertPrompt(row, c.category, row[c.category]), schema: ALERT_SCHEMA }),
                signal,
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              if (json.fallback || !json.data) throw new Error(json.error || 'fallback');
              return json.data;
            },
            timeoutMs,
          );
          if (!isAlertShape(raw)) throw new Error('invalid alert');
          return escalate({ ...c, ...raw, source: 'gemini' }, telemetry, now);
        } catch {
          return c;
        }
      }));
    }
  }

  return candidates;
}
