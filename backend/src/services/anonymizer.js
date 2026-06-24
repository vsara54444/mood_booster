const { callClaude } = require('./anthropicClient');

/** Deterministic backstop - strips obvious identifiers regex can catch reliably. */
function regexScrub(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone number]')
    .replace(/https?:\/\/\S+/g, '[link]')
    .replace(/@[A-Za-z0-9_]{2,}/g, '[handle]');
}

/**
 * Uses Claude to replace personal names, company names, team names, and other
 * identifying details with neutral terms, while keeping the story intact.
 * This runs only when a user opts in to sharing a post anonymously.
 */
async function aiAnonymize(cleanedText) {
  const system = `You anonymize short personal anecdotes before they are shown publicly.
Replace any person names, company names, product names, team names, school names, or
other identifying details with neutral generic terms such as "my manager", "my coworker",
"the company", "my kid", "my professor", "the app". Keep the sentence structure, meaning,
and tone exactly the same. Do not add commentary. Return ONLY the anonymized sentence.`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: cleanedText }],
    maxTokens: 200,
    temperature: 0.2,
  });

  return regexScrub(raw);
}

module.exports = { regexScrub, aiAnonymize };
