import { isOrderShape, isAlertShape, CATEGORIES, SEVERITIES } from '../data/schemas.js';

export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const ORDER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    bom: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ingredientId: { type: 'STRING' }, qty: { type: 'NUMBER' } }, required: ['ingredientId', 'qty'] } },
    baristaSteps: { type: 'ARRAY', items: { type: 'STRING' } },
    prepMinutes: { type: 'NUMBER' },
  },
  required: ['name', 'description', 'bom', 'baristaSteps', 'prepMinutes'],
};

export const ALERT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: { type: 'STRING', enum: CATEGORIES },
    severity: { type: 'STRING', enum: SEVERITIES },
    message: { type: 'STRING' },
    suggestedAction: { type: 'STRING' },
  },
  required: ['category', 'severity', 'message', 'suggestedAction'],
};

/** POST a JSON-mode request; resolves to parsed JSON or throws. Key goes in a header, never logged. */
export async function callGemini({ apiKey, prompt, schema, fetchImpl = fetch, signal }) {
  const res = await fetchImpl(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.7 },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Gemini: empty response');
  return JSON.parse(text);
}

export function orderPrompt(query, ctx) {
  const list = ctx.ingredients.map((i) => `${i.id} (${i.name}, ${i.unit})`).join('; ');
  const pairs = ctx.pairings.map((p) => `- ${p.text}`).join('\n');
  return `You are a café barista inventing a custom drink.
Customer request: "${query}"
${ctx.dietary.length ? 'Hard dietary constraints: ' + ctx.dietary.join(', ') + '\n' : ''}Base recipe: ${ctx.recipe ? ctx.recipe.name + ' — ' + ctx.recipe.method : 'none'}
Pairing guidance:
${pairs}
You may ONLY use these ingredient ids (all in stock): ${list}.
Return a JSON order: name, description, bom (ingredientId + qty in the listed unit, at least 2 lines), baristaSteps (at least 3), prepMinutes.`;
}

export function alertPrompt(row, category, score) {
  return `A café guest left feedback. Category: ${category}, score ${score}/5${row.comment ? `, comment: "${row.comment}"` : ''}.
Return a JSON alert for the barista: category, severity (low|med|high), a one-line message, and one suggestedAction.`;
}

export { isOrderShape, isAlertShape };
