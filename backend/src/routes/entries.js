const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { processDailyEntry } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

const VALID_CATEGORIES = ['frustrated', 'angry', 'upset', 'tired', 'funny'];

router.get('/today', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM entries
       WHERE user_id = $1 AND created_at::DATE = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );
    res.json({ entry: result.rows[0] || null });
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

    // One check-in per day
    const already = await pool.query(
      `SELECT entry_id FROM entries WHERE user_id = $1 AND created_at::DATE = CURRENT_DATE LIMIT 1`,
      [req.userId]
    );
    if (already.rows.length) {
      return res.status(409).json({ error: 'You already checked in today. Come back tomorrow!' });
    }

    const ai = await processDailyEntry(text.trim(), category);

    const insert = await pool.query(
      `INSERT INTO entries
         (user_id, category, raw_text, cleaned_text, mood, humor_text, perspective_text, action_text, topic_tag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING entry_id, created_at`,
      [req.userId, category, text.trim(), ai.cleanedText, mood,
       ai.humor, ai.perspective, ai.action, ai.topicTag]
    );

    const { entry_id, created_at } = insert.rows[0];
    await updateStreak(pool, req.userId);

    res.status(201).json({
      entryId: entry_id,
      createdAt: created_at,
      cleanedText: ai.cleanedText,
      topicTag: ai.topicTag,
      humor: ai.humor,
      perspective: ai.perspective,
      action: ai.action,
    });
  } catch (err) {
    console.error('[entries/create]', err);
    res.status(500).json({ error: "Could not process today's entry. Please try again." });
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
