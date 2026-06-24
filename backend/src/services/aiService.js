const { callClaude, parseJsonResponse } = require('./anthropicClient');
const { getPool, sql } = require('../config/db');
const { normalizedTokenString, scoreAgainstHistory } = require('./similarityService');

const SIMILARITY_THRESHOLD = parseFloat(process.env.JOKE_SIMILARITY_THRESHOLD || '0.55');
const MAX_GENERATION_ATTEMPTS = 3;
const HISTORY_WINDOW = 10000;

const CATEGORY_LABELS = {
  frustrated: 'something that frustrated them',
  angry: 'something that made them angry',
  upset: 'something that upset them',
  tired: 'something that wore them out / made them tired',
  funny: 'something funny that happened to them',
};

/**
 * Step 1: fix grammar, make it concise, preserve the real story.
 * Also returns a short topic tag used later for "most common frustration category" reporting.
 */
async function cleanEntry(rawText, category) {
  const system = `You clean up short daily journal entries about everyday life (work, parenting,
school, commute, chores, etc). Fix grammar and spelling. Make it concise - one or two short
sentences, under 40 words. Preserve every real detail and the original emotional tone. Never
invent new facts. Never add commentary or advice here.
Also assign a short topic tag (1-2 words, lowercase, e.g. "meetings", "commute", "parenting",
"chores", "tech support", "coworkers", "sleep") describing what the entry is really about.

Respond ONLY with JSON in this exact shape, nothing else:
{"cleanedText": "...", "topicTag": "..."}`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: `Category: ${CATEGORY_LABELS[category] || category}\nEntry: ${rawText}` }],
    maxTokens: 200,
    temperature: 0.3,
  });

  const parsed = parseJsonResponse(raw);
  return { cleanedText: parsed.cleanedText.trim(), topicTag: (parsed.topicTag || 'general').toLowerCase().trim() };
}

/**
 * Step 2: ask Claude for one humor line + one perspective + one practical action,
 * optionally steering away from a list of recent jokes that scored too similar.
 */
async function generateHumorPackOnce(cleanedText, category, avoidList) {
  const avoidBlock = avoidList.length
    ? `\nDo not reuse the angle, wording, or punchline structure of these recent jokes:\n- ${avoidList.join('\n- ')}`
    : '';

  const system = `You are the comedy writer for ReLOL, an app that helps people laugh off everyday
stress instead of stewing in it. You take one frustrating, annoying, or tiring everyday moment
and turn it into:

1. "humor": one short, warm, observational one-liner (max ~18 words) that gently jokes about the
   SITUATION, never about the person, their competence, their body, their identity, or anyone
   named in the story. Think "relatable stand-up bit", not roast. It should feel specific to
   their story, not a generic stock joke.
2. "perspective": one short, genuinely useful reframe (max ~20 words) that helps them see the
   situation in a less stressful, more accurate light. No toxic positivity, no "just be grateful",
   no dismissing the feeling.
3. "action": one concrete, realistic, small next step they could actually take (max ~16 words).

Rules: never mock the user, never minimize real distress, keep it workplace-appropriate, avoid
anything that could read as harassment or sarcasm aimed at the reader, and make this feel like a
fresh joke - not a recycled meme.

Respond ONLY with JSON in this exact shape, nothing else:
{"humor": "...", "perspective": "...", "action": "..."}`;

  const userMsg = `Category: ${CATEGORY_LABELS[category] || category}\nToday's story: ${cleanedText}${avoidBlock}`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 300,
    temperature: 1,
  });

  const parsed = parseJsonResponse(raw);
  return {
    humor: parsed.humor.trim(),
    perspective: parsed.perspective.trim(),
    action: parsed.action.trim(),
  };
}

/** Fetches the most recent N jokes for the similarity check (default: last 10,000). */
async function fetchRecentJokes(pool, limit = HISTORY_WINDOW) {
  const result = await pool.request().query(
    `SELECT TOP ${limit} JokeText, NormalizedTokens FROM JokeHistory ORDER BY CreatedAt DESC`
  );
  return result.recordset;
}

async function saveJokeToHistory(pool, jokeText) {
  await pool
    .request()
    .input('jokeText', sql.NVarChar(500), jokeText)
    .input('tokens', sql.NVarChar(1000), normalizedTokenString(jokeText))
    .query('INSERT INTO JokeHistory (JokeText, NormalizedTokens) VALUES (@jokeText, @tokens)');
}

/**
 * Step 3: generate a humor pack, re-rolling if it's too similar to recent jokes.
 * Compares against the last 10,000 generated jokes; rejects anything above the
 * similarity threshold and asks the model to try again, up to MAX_GENERATION_ATTEMPTS.
 */
async function generateUniqueHumorPack(cleanedText, category) {
  const pool = await getPool();
  const history = await fetchRecentJokes(pool);

  let avoidList = [];
  let lastPack = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const pack = await generateHumorPackOnce(cleanedText, category, avoidList);
    const { maxSimilarity, closestMatches } = scoreAgainstHistory(pack.humor, history);

    lastPack = pack;
    if (maxSimilarity <= SIMILARITY_THRESHOLD) {
      await saveJokeToHistory(pool, pack.humor);
      return { ...pack, regenerated: attempt > 1 };
    }
    avoidList = closestMatches;
  }

  // Ran out of attempts - accept the last attempt rather than block the user's check-in,
  // but still log it so similarity thresholds/prompting can be tuned over time.
  console.warn('[aiService] Accepted a humor line above the similarity threshold after max attempts.');
  await saveJokeToHistory(pool, lastPack.humor);
  return { ...lastPack, regenerated: true };
}

/** Full pipeline used by the /api/entries route. */
async function processDailyEntry(rawText, category) {
  const { cleanedText, topicTag } = await cleanEntry(rawText, category);
  const pack = await generateUniqueHumorPack(cleanedText, category);
  return { cleanedText, topicTag, ...pack };
}

module.exports = { processDailyEntry, cleanEntry, generateUniqueHumorPack };
