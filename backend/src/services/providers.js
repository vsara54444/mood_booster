const { callClaude } = require('./anthropicClient');
const { callOpenAI } = require('./openaiClient');
const { callMoonshot } = require('./moonshotClient');
const { callGroq } = require('./groqClient');

// Order also doubles as the deterministic judge-rotation order and the
// fallback pick order when grading is skipped/fails.
// Gemini is intentionally excluded from joke writing - its key is used for
// the meme-image feature instead (see geminiImageClient.js). Groq was
// previously dropped for lower joke quality but is back in rotation as a
// writer (not a judge) per product request - the dual-judge gate in
// templateAuthoring.js still filters its output the same as every other
// provider's.
const PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic', call: callClaude, envKey: 'ANTHROPIC_API_KEY' },
  { key: 'openai', label: 'OpenAI', call: callOpenAI, envKey: 'OPENAI_API_KEY' },
  { key: 'moonshot', label: 'Moonshot', call: callMoonshot, envKey: 'MOONSHOT_API_KEY' },
  { key: 'groq', label: 'Groq', call: callGroq, envKey: 'GROQ_API_KEY' },
];

/** Providers that currently have an API key configured. */
function availableProviders() {
  return PROVIDERS.filter((p) => !!process.env[p.envKey]);
}

module.exports = { PROVIDERS, availableProviders };
