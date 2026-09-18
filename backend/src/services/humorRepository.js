const { toVectorLiteral } = require('./geminiEmbeddingClient');
const { normalizedTokenString, scoreAgainstHistory } = require('./similarityService');

// How close a worry's embedding must be to a stored humor's worry embedding
// (cosine similarity, 1 = identical) to reuse it instead of calling an AI
// writer. Tunable via env without a code change as real traffic shows what
// threshold actually feels "the same worry" vs "close but not quite".
const REUSE_SIMILARITY_THRESHOLD = parseFloat(process.env.HUMOR_REUSE_SIMILARITY_THRESHOLD || '0.86');
// Level 1 (findExactWorryMatch) is near-duplicate wording, not semantic
// closeness, so this is intentionally much stricter than the embedding
// threshold above.
const EXACT_MATCH_THRESHOLD = parseFloat(process.env.HUMOR_EXACT_MATCH_THRESHOLD || '0.82');
// Never reuse a stored joke that scored below this with the offline/live
// judge - a close semantic match on a mediocre joke isn't worth reusing.
const MIN_QUALITY_TO_REUSE = parseFloat(process.env.HUMOR_MIN_QUALITY_TO_REUSE || '6');
// Mirrors templateSelector.js's RECENT_HISTORY_DAYS - a single user won't be
// shown the same stored humor twice within this window; a different user can.
const RECENT_HISTORY_DAYS = 60;

/**
 * LEVEL 1 of the lookup cascade (see humorService.js): near-exact/normalized
 * worry match within the same mother_tongue+category+subcategory+mechanism
 * bucket, using the same token-overlap scorer templateAuthoring.js already
 * uses for joke dedupe (similarityService.js) - reused here, not
 * reimplemented. Deliberately runs BEFORE any embedding call: a literal
 * repeat ("interview tomorrow, nervous" typed by two different users) gets
 * caught here with zero extra API cost.
 */
async function findExactWorryMatch(pool, { userId, motherTongue, category, subcategory, mechanism, cleanedText }) {
  const result = await pool.query(
    `SELECT h.id, h.humor_text, h.perspective_text, h.action_text, h.song_text, h.humor_style,
            h.worry_text, h.normalized_worry_tokens
     FROM humors h
     WHERE h.active = true
       AND h.mother_tongue = $1
       AND h.category = $2
       AND h.subcategory = $3
       AND h.humor_style IS NOT DISTINCT FROM $4
       AND h.quality_score >= $5
       AND h.id NOT IN (
         SELECT humor_id FROM user_humor_history
         WHERE user_id = $6 AND created_at > NOW() - make_interval(days => $7)
       )`,
    [motherTongue, category, subcategory, mechanism || null, MIN_QUALITY_TO_REUSE, userId, RECENT_HISTORY_DAYS]
  );
  if (!result.rows.length) return null;

  const history = result.rows.map((r) => ({ joke_text: r.worry_text, normalized_tokens: r.normalized_worry_tokens }));
  const { maxSimilarity, closestMatches } = scoreAgainstHistory(cleanedText, history);
  if (maxSimilarity < EXACT_MATCH_THRESHOLD) return null;
  return result.rows.find((r) => r.worry_text === closestMatches[0]) || null;
}

/**
 * LEVEL 2 (category+subcategory+language, applied as the WHERE filter below)
 * + LEVEL 3 (keyword/semantic/vector similarity, applied as the embedding
 * ORDER BY + threshold) of the lookup cascade - see humorService.js. Only
 * reached once findExactWorryMatch (Level 1) has already missed. Returns
 * null on a miss - caller falls back to LEVEL 4: generating live
 * (freshHumorWriter.js) and storing the result via storeHumor() so the next
 * similar worry hits this cache instead.
 */
async function findSuitableHumor(pool, { userId, motherTongue, category, subcategory, mechanism, embedding }) {
  const vectorLiteral = toVectorLiteral(embedding);
  const result = await pool.query(
    `SELECT h.id, h.humor_text, h.perspective_text, h.action_text, h.song_text, h.humor_style, h.quality_score,
            1 - (h.embedding <=> $1::vector) AS similarity
     FROM humors h
     WHERE h.active = true
       AND h.mother_tongue = $2
       AND h.category = $3
       AND h.subcategory = $4
       AND h.humor_style IS NOT DISTINCT FROM $5
       AND h.quality_score >= $6
       AND h.id NOT IN (
         SELECT humor_id FROM user_humor_history
         WHERE user_id = $7 AND created_at > NOW() - make_interval(days => $8)
       )
     ORDER BY h.embedding <=> $1::vector
     LIMIT 1`,
    [vectorLiteral, motherTongue, category, subcategory, mechanism || null, MIN_QUALITY_TO_REUSE, userId, RECENT_HISTORY_DAYS]
  );

  const row = result.rows[0];
  if (!row || row.similarity < REUSE_SIMILARITY_THRESHOLD) return null;
  return row;
}

async function storeHumor(pool, {
  motherTongue, category, subcategory, emotion, mechanism, topicKeywords, worryText,
  humorText, perspectiveText, actionText, songText, embedding, qualityScore, generationModel,
}) {
  const vectorLiteral = toVectorLiteral(embedding);
  const normalizedWorryTokens = normalizedTokenString(worryText);
  const result = await pool.query(
    `INSERT INTO humors
       (mother_tongue, category, subcategory, emotion, humor_style, topic_keywords, worry_text,
        normalized_worry_tokens, humor_text, perspective_text, action_text, song_text, embedding,
        quality_score, source, generation_model, version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::vector,$14,'ai_generated',$15,1)
     RETURNING id`,
    [motherTongue, category, subcategory, emotion, mechanism, topicKeywords, worryText, normalizedWorryTokens,
      humorText, perspectiveText, actionText, songText, vectorLiteral, qualityScore, generationModel]
  );
  return result.rows[0].id;
}

// Called for BOTH a reuse hit and a freshly-generated+stored humor, so
// usage_count/last_used_at and the per-user "recently shown" exclusion stay
// correct either way.
async function recordHumorUsage(pool, { userId, humorId }) {
  await pool.query(
    'UPDATE humors SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1',
    [humorId]
  );
  await pool.query(
    'INSERT INTO user_humor_history (user_id, humor_id) VALUES ($1, $2)',
    [userId, humorId]
  );
}

// This is how the library actually gets better over time instead of just
// bigger: every "not feeling it" / regenerate on a REUSED joke increments
// its rejection_count, and once a joke racks up enough real rejections
// (from any user, not just one) it's auto-retired from the reuse pool -
// nobody is served that joke again, though it's kept (not deleted) for audit.
const REJECTION_LIMIT = parseInt(process.env.HUMOR_REJECTION_LIMIT || '2', 10);

async function recordRejection(pool, humorId) {
  const result = await pool.query(
    'UPDATE humors SET rejection_count = rejection_count + 1 WHERE id = $1 RETURNING rejection_count',
    [humorId]
  );
  const rejectionCount = result.rows[0]?.rejection_count;
  if (rejectionCount >= REJECTION_LIMIT) {
    await pool.query('UPDATE humors SET active = false WHERE id = $1', [humorId]);
  }
}

module.exports = {
  findExactWorryMatch, findSuitableHumor, storeHumor, recordHumorUsage, recordRejection,
  REUSE_SIMILARITY_THRESHOLD, EXACT_MATCH_THRESHOLD, MIN_QUALITY_TO_REUSE,
};
