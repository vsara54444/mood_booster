/**
 * Minimal Moonshot (Kimi) API client.
 * OpenAI-compatible chat/completions format - just fetch, no SDK.
 * Docs: https://platform.moonshot.ai/docs/api/chat
 */

const MOONSHOT_URL = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1/chat/completions';
const MODEL = process.env.MOONSHOT_MODEL || 'moonshot-v1-8k';

async function callMoonshot({ system, messages, maxTokens = 400, temperature = 1 }) {
  if (!process.env.MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY is not set. Add it to backend/.env');
  }

  const response = await fetch(MOONSHOT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Moonshot API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text.trim();
}

module.exports = { callMoonshot };
