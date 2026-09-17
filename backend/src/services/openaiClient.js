/**
 * Minimal OpenAI (ChatGPT) API client.
 * No SDK dependency required - just fetch against /v1/chat/completions.
 * Docs: https://platform.openai.com/docs/api-reference/chat
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callOpenAI({ system, messages, maxTokens = 400, temperature = 1 }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to backend/.env');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text.trim();
}

module.exports = { callOpenAI };
