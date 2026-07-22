/**
 * Lightweight, dependency-free similarity check.
 *
 * Why not a real embeddings API? Anthropic does not currently expose a public
 * embeddings endpoint - they point developers to Voyage AI for that. To keep
 * this project to a single API key, dedupe runs on a normalized token-overlap
 * (Jaccard) score instead. It's not as semantically smart as embeddings, but
 * it reliably catches near-duplicate phrasing, which is what we're guarding
 * against here. If you want smarter dedupe later, swap this module for a
 * Voyage AI embeddings call + cosine similarity - the call sites don't change.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'and', 'or',
  'but', 'to', 'of', 'in', 'on', 'for', 'with', 'your', 'my', 'it', 'its',
  'has', 'have', 'just', 'into', 'that', 'this', 'you', 'i',
]);

function normalize(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
  return [...new Set(tokens)].sort();
}

function normalizedTokenString(text) {
  return normalize(text).join(' ');
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compares a candidate joke against recent joke history.
 * @returns { maxSimilarity, closestMatches: string[] (top 3 original joke texts) }
 */
function scoreAgainstHistory(candidateText, history) {
  const candidateTokens = normalize(candidateText);
  let scored = history.map((row) => ({
    text: row.JokeText,
    score: jaccardSimilarity(candidateTokens, row.NormalizedTokens.split(' ')),
  }));
  scored.sort((a, b) => b.score - a.score);
  const maxSimilarity = scored.length ? scored[0].score : 0;
  const closestMatches = scored.slice(0, 3).map((s) => s.text);
  return { maxSimilarity, closestMatches };
}

module.exports = { normalize, normalizedTokenString, jaccardSimilarity, scoreAgainstHistory };
