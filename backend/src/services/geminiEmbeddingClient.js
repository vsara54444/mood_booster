/**
 * Minimal Google Gemini embeddings client.
 * Used to turn a cleaned worry description into a vector for the humor
 * library's semantic search (see humorRepository.js) - not for chat/text
 * generation, see geminiClient.js for that.
 * Docs: https://ai.google.dev/gemini-api/docs/embeddings
 */

const GEMINI_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768; // must match the humors.embedding VECTOR(768) column in schema.sql

async function embedText(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to backend/.env');
  }

  const response = await fetch(`${GEMINI_URL_BASE}/${MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini embedding API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Gemini embedding response missing/malformed values (got ${values?.length ?? 'none'})`);
  }
  return values;
}

// pg has no native vector type - pass this string and cast with ::vector in SQL.
function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

module.exports = { embedText, toVectorLiteral, EMBEDDING_DIMENSIONS };
