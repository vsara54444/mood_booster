const { callClaude, parseJsonResponse } = require('./anthropicClient');
const { getPool } = require('../config/db');
const { normalizedTokenString, scoreAgainstHistory } = require('./similarityService');

const SIMILARITY_THRESHOLD = parseFloat(process.env.JOKE_SIMILARITY_THRESHOLD || '0.55');
const MAX_ATTEMPTS = 3;
const HISTORY_WINDOW = 10000;

const CATEGORY_LABELS = {
  frustrated: 'something that frustrated them',
  angry: 'something that made them angry',
  upset: 'something that upset them',
  tired: 'something that wore them out',
  funny: 'something funny that happened to them',
};

async function cleanEntry(rawText, category) {
  const system = `You clean up short daily journal entries. Fix grammar and spelling. Make it concise (1-2 sentences, under 40 words). Preserve every real detail and emotional tone. Never invent new facts.
Also assign a short topic tag (1-2 words, lowercase, e.g. "meetings", "commute", "parenting", "chores").
Respond ONLY with JSON: {"cleanedText": "...", "topicTag": "..."}`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: `Category: ${CATEGORY_LABELS[category] || category}\nEntry: ${rawText}` }],
    maxTokens: 200,
    temperature: 0.3,
  });
  const parsed = parseJsonResponse(raw);
  return { cleanedText: parsed.cleanedText.trim(), topicTag: (parsed.topicTag || 'general').toLowerCase().trim() };
}

async function generateHumorPackOnce(cleanedText, category, avoidList) {
  const avoidBlock = avoidList.length
    ? `\nDo NOT reuse the angle or punchline of these recent jokes:\n- ${avoidList.join('\n- ')}`
    : '';

  const system = `You are the comedy writer for ReLOL - a daily stress-relief app. Turn one everyday frustrating moment into:
1. "humor": one warm, observational one-liner (max 18 words) about the SITUATION, never mocking the person.
2. "perspective": one short reframe (max 20 words) that's genuinely helpful, not toxic positivity.
3. "action": one concrete small next step (max 16 words).

Rules: never mock the user, stay workplace-appropriate, make it feel fresh and specific.
Respond ONLY with JSON: {"humor": "...", "perspective": "...", "action": "..."}`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: `Category: ${CATEGORY_LABELS[category] || category}\nStory: ${cleanedText}${avoidBlock}` }],
    maxTokens: 300,
    temperature: 1,
  });
  const parsed = parseJsonResponse(raw);
  return { humor: parsed.humor.trim(), perspective: parsed.perspective.trim(), action: parsed.action.trim() };
}

async function fetchRecentJokes(pool) {
  const result = await pool.query(
    `SELECT joke_text, normalized_tokens FROM joke_history ORDER BY created_at DESC LIMIT ${HISTORY_WINDOW}`
  );
  return result.rows;
}

async function saveJoke(pool, jokeText) {
  await pool.query(
    'INSERT INTO joke_history (joke_text, normalized_tokens) VALUES ($1, $2)',
    [jokeText, normalizedTokenString(jokeText)]
  );
}

async function generateUniqueHumorPack(cleanedText, category) {
  const pool = getPool();
  const history = await fetchRecentJokes(pool);
  let avoidList = [];
  let lastPack = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const pack = await generateHumorPackOnce(cleanedText, category, avoidList);
    const { maxSimilarity, closestMatches } = scoreAgainstHistory(pack.humor, history);
    lastPack = pack;
    if (maxSimilarity <= SIMILARITY_THRESHOLD) {
      await saveJoke(pool, pack.humor);
      return { ...pack, regenerated: attempt > 1 };
    }
    avoidList = closestMatches;
  }
  await saveJoke(pool, lastPack.humor);
  return { ...lastPack, regenerated: true };
}

async function processDailyEntry(rawText, category) {
  const { cleanedText, topicTag } = await cleanEntry(rawText, category);
  const pack = await generateUniqueHumorPack(cleanedText, category);
  return { cleanedText, topicTag, ...pack };
}

module.exports = { processDailyEntry };
