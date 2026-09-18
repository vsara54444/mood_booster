const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { processDailyEntry, regenerateHumorPack } = require('../services/aiService');
const { generateMemeCaption } = require('../services/memeService');
const { captionMeme } = require('../services/imgflipClient');
const { getInterestContext } = require('./interests');
const { pickMechanism, recordSignal } = require('../services/mechanismPreference');
const { recordRejection } = require('../services/humorRepository');

const router = express.Router();
router.use(requireAuth);

const VALID_CATEGORIES = ['calm', 'frustrated', 'angry', 'upset', 'anxious', 'stressed', 'sad', 'tired', 'grateful', 'funny'];
const DAILY_ENTRY_LIMIT = parseInt(process.env.DAILY_ENTRY_LIMIT || '3', 10);
const UNLIMITED_DISPLAY_LIMIT = 9999;
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || 'vsara5444@gmail.com').toLowerCase();

async function getUserForEntry(pool, userId) {
  const result = await pool.query('SELECT email, mother_tongue FROM users WHERE user_id = $1', [userId]);
  const user = result.rows[0];
  return {
    email: user?.email || '',
    motherTongue: user?.mother_tongue || 'other',
    isTestAccount: (user?.email || '').toLowerCase() === TEST_ADMIN_EMAIL,
  };
}

router.get('/today', async (req, res) => {
  try {
    const pool = getPool();
    const { isTestAccount } = await getUserForEntry(pool, req.userId);
    const result = await pool.query(
      `SELECT * FROM entries
       WHERE user_id = $1 AND created_at::DATE = CURRENT_DATE
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({
      entry: result.rows[0] || null,
      count: result.rows.length,
      limit: isTestAccount ? UNLIMITED_DISPLAY_LIMIT : DAILY_ENTRY_LIMIT,
    });
  } catch (err) {
    console.error('[entries/today]', err);
    res.status(500).json({ error: "Could not check today's status." });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, text, mood } = req.body;
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category.' });
    if (!text || text.trim().length < 3) return res.status(400).json({ error: 'Tell us a little more about today.' });
    if (!mood || mood < 1 || mood > 5) return res.status(400).json({ error: 'Mood must be between 1 and 5.' });

    const pool = getPool();
    const { motherTongue, isTestAccount } = await getUserForEntry(pool, req.userId);

    // Limited check-ins per day (exempt the test account)
    const already = await pool.query(
      `SELECT entry_id FROM entries WHERE user_id = $1 AND created_at::DATE = CURRENT_DATE`,
      [req.userId]
    );
    if (!isTestAccount && already.rows.length >= DAILY_ENTRY_LIMIT) {
      return res.status(409).json({ error: `You've used all ${DAILY_ENTRY_LIMIT} check-ins for today. Come back tomorrow!` });
    }

    const favorites = await getInterestContext(pool, req.userId);
    const mechanism = motherTongue === 'tamil' ? await pickMechanism(pool, req.userId) : null;
    const ai = await processDailyEntry(text.trim(), category, motherTongue, favorites, mechanism, req.userId);

    const insert = await pool.query(
      `INSERT INTO entries
         (user_id, category, raw_text, cleaned_text, mood, humor_text, perspective_text, action_text, topic_tag, humor_provider, song_text, humor_mechanism, humor_id, story_slots, subcategory, emotion, topic_keywords)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING entry_id, created_at`,
      [req.userId, category, text.trim(), ai.cleanedText, mood,
       ai.humor, ai.perspective, ai.action, ai.topicTag, ai.provider || null, ai.song || null, ai.mechanism || null,
       ai.humorId || null, JSON.stringify(ai.slots || {}), ai.subcategory || null, ai.emotion || null, ai.topicKeywords || []]
    );

    const { entry_id, created_at } = insert.rows[0];
    await updateStreak(pool, req.userId);
    if (ai.mechanism) {
      await recordSignal(pool, { userId: req.userId, entryId: entry_id, mechanism: ai.mechanism, signal: 'kept' });
    }

    res.status(201).json({
      entryId: entry_id,
      createdAt: created_at,
      cleanedText: ai.cleanedText,
      topicTag: ai.topicTag,
      humor: ai.humor,
      perspective: ai.perspective,
      action: ai.action,
      song: ai.song || null,
      provider: ai.provider || null,
      count: already.rows.length + 1,
      limit: isTestAccount ? UNLIMITED_DISPLAY_LIMIT : DAILY_ENTRY_LIMIT,
    });
  } catch (err) {
    console.error('[entries/create]', err);
    if (err.message?.startsWith('All AI providers failed') || err.message?.startsWith('No AI providers configured')) {
      return res.status(503).json({ error: "We couldn't reach any humor provider right now - please try again shortly." });
    }
    res.status(500).json({ error: "Could not process today's entry. Please try again." });
  }
});

// Optional, user-triggered - never generated automatically. Cached on the
// entry so a given day's sticker is generated at most once (cost control).
router.post('/:entryId/sticker', async (req, res) => {
  try {
    const { entryId } = req.params;
    const regenerate = !!req.body?.regenerate;
    const pool = getPool();
    const existing = await pool.query(
      `SELECT entry_id, category, topic_tag, cleaned_text, humor_text, sticker_image, sticker_template_id
       FROM entries WHERE entry_id = $1 AND user_id = $2`,
      [entryId, req.userId]
    );
    const entry = existing.rows[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    if (entry.sticker_image && !regenerate) return res.json({ stickerImage: entry.sticker_image });

    const { motherTongue } = await getUserForEntry(pool, req.userId);
    const recent = await pool.query(
      `SELECT sticker_template_id FROM entries
       WHERE user_id = $1 AND sticker_template_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 3`,
      [req.userId]
    );
    const excludeTemplateIds = recent.rows.map((r) => r.sticker_template_id);

    const scenario = entry.cleaned_text || entry.topic_tag || entry.category;
    const { templateId, text0, text1 } = await generateMemeCaption(scenario, entry.humor_text, motherTongue, excludeTemplateIds);
    const stickerImage = await captionMeme({ templateId, text0, text1 });

    await pool.query('UPDATE entries SET sticker_image = $2, sticker_template_id = $3 WHERE entry_id = $1', [entryId, stickerImage, templateId]);
    res.json({ stickerImage });
  } catch (err) {
    console.error('[entries/sticker]', err);
    res.status(500).json({ error: 'Could not generate a sticker right now.' });
  }
});

// User-triggered - regenerates humor/perspective/action for an existing
// entry, explicitly steering away from the current joke.
router.post('/:entryId/regenerate-humor', async (req, res) => {
  try {
    const { entryId } = req.params;
    const pool = getPool();
    const existing = await pool.query(
      `SELECT entry_id, category, cleaned_text, topic_tag, subcategory, emotion, topic_keywords,
              story_slots, humor_text, humor_mechanism, humor_id
       FROM entries WHERE entry_id = $1 AND user_id = $2`,
      [entryId, req.userId]
    );
    const entry = existing.rows[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    const { motherTongue } = await getUserForEntry(pool, req.userId);
    const favorites = await getInterestContext(pool, req.userId);

    // "Not feeling it" is a direct negative signal on the mechanism just
    // shown - record it, and force the next pick away from that mechanism
    // so a rejection can never just repeat the same style.
    if (entry.humor_mechanism) {
      await recordSignal(pool, { userId: req.userId, entryId, mechanism: entry.humor_mechanism, signal: 'regenerated' });
    }
    // Also a direct negative signal on this exact stored joke - enough real
    // rejections (from any user) retires it from the reuse pool for good,
    // so the library's average quality rises over time instead of just its size.
    if (entry.humor_id) {
      await recordRejection(pool, entry.humor_id);
    }
    const mechanism = motherTongue === 'tamil'
      ? await pickMechanism(pool, req.userId, { exclude: entry.humor_mechanism })
      : null;
    const ai = await regenerateHumorPack({
      userId: req.userId,
      category: entry.category,
      motherTongue,
      mechanism,
      favorites,
      classification: {
        cleanedText: entry.cleaned_text,
        topicTag: entry.topic_tag,
        subcategory: entry.subcategory || 'general',
        emotion: entry.emotion,
        topicKeywords: entry.topic_keywords || [],
        slots: entry.story_slots || {},
      },
    });

    await pool.query(
      `UPDATE entries
         SET humor_text = $2, perspective_text = $3, action_text = $4,
             humor_provider = $5, song_text = $6, sticker_image = NULL, humor_mechanism = $7, humor_id = $8
       WHERE entry_id = $1`,
      [entryId, ai.humor, ai.perspective, ai.action, ai.provider || null, ai.song || null, ai.mechanism || null, ai.humorId || null]
    );
    if (ai.mechanism) {
      await recordSignal(pool, { userId: req.userId, entryId, mechanism: ai.mechanism, signal: 'kept' });
    }

    res.json({ humor: ai.humor, perspective: ai.perspective, action: ai.action, song: ai.song || null, provider: ai.provider || null });
  } catch (err) {
    console.error('[entries/regenerate-humor]', err);
    if (err.message?.startsWith('All AI providers failed') || err.message?.startsWith('No AI providers configured')) {
      return res.status(503).json({ error: "We couldn't reach any humor provider right now - please try again shortly." });
    }
    res.status(500).json({ error: 'Could not come up with a new joke right now.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = 20;
    const pool = getPool();
    const result = await pool.query(
      `SELECT entry_id, category, cleaned_text, mood, humor_text, perspective_text,
              action_text, is_shared_anonymously, created_at
       FROM entries WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, pageSize, (page - 1) * pageSize]
    );
    res.json({ entries: result.rows, page });
  } catch (err) {
    console.error('[entries/history]', err);
    res.status(500).json({ error: 'Could not load history.' });
  }
});

async function updateStreak(pool, userId) {
  const result = await pool.query(
    'SELECT current_streak, longest_streak, last_checkin_date FROM streaks WHERE user_id = $1',
    [userId]
  );
  const row = result.rows[0] || { current_streak: 0, longest_streak: 0, last_checkin_date: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = row.last_checkin_date ? new Date(row.last_checkin_date) : null;
  if (last) last.setHours(0, 0, 0, 0);

  let newStreak = 1;
  if (last) {
    const diffDays = Math.round((today - last) / 86400000);
    if (diffDays === 1) newStreak = row.current_streak + 1;
    else if (diffDays === 0) newStreak = row.current_streak;
    else newStreak = 1;
  }
  const longest = Math.max(newStreak, row.longest_streak);

  await pool.query(
    `INSERT INTO streaks (user_id, current_streak, longest_streak, last_checkin_date)
     VALUES ($1, $2, $3, CURRENT_DATE)
     ON CONFLICT (user_id) DO UPDATE SET
       current_streak = $2,
       longest_streak = $3,
       last_checkin_date = CURRENT_DATE`,
    [userId, newStreak, longest]
  );
}

module.exports = router;
