/**
 * Minimal Groq API client - OpenAI-compatible chat completions format.
 * Free tier, no billing required. Docs: https://console.groq.com/docs/api-reference
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq({ system, messages, maxTokens = 400, temperature = 1 }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Add it to backend/.env');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      // gpt-oss models on Groq spend part of max_tokens on hidden
      // "reasoning" tokens before the visible answer - at 'medium' (the
      // default) that reliably ate the whole budget on our longer prompts
      // and truncated the JSON mid-array. 'low' keeps reasoning short so
      // the actual response fits.
      reasoning_effort: 'low',
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text.trim();
}

module.exports = { callGroq };
