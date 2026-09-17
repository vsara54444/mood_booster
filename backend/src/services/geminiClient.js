/**
 * Minimal Google Gemini API client.
 * No SDK dependency required - just fetch against the generateContent endpoint.
 * Docs: https://ai.google.dev/api/generate-content
 */

const GEMINI_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function callGemini({ system, messages, maxTokens = 400, temperature = 1 }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to backend/.env');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(`${GEMINI_URL_BASE}/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('');
  return text.trim();
}

module.exports = { callGemini };
