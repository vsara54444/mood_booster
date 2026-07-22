const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  try {
    const pool = getPool();

    const [streakRes, moodRes, catRes] = await Promise.all([
      pool.query(
        'SELECT current_streak, longest_streak FROM streaks WHERE user_id = $1',
        [req.userId]
      ),
      pool.query(
        `SELECT created_at::DATE AS entry_date, mood FROM entries
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 14`,
        [req.userId]
      ),
      pool.query(
        `SELECT category, COUNT(*)::INT AS count FROM entries
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY category ORDER BY count DESC LIMIT 5`,
        [req.userId]
      ),
    ]);

    res.json({
      streak: streakRes.rows[0] || { current_streak: 0, longest_streak: 0 },
      moodTrend: moodRes.rows.reverse(),
      topCategories: catRes.rows,
    });
  } catch (err) {
    console.error('[dashboard/summary]', err);
    res.status(500).json({ error: 'Could not load your dashboard.' });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT created_at::DATE AS entry_date, category, mood, humor_text, perspective_text, action_text
       FROM entries WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC`,
      [req.userId]
    );
    const entries = result.rows;
    const avgMood = entries.length
      ? Math.round((entries.reduce((s, e) => s + e.mood, 0) / entries.length) * 10) / 10
      : null;
    const categoryCounts = entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {});
    res.json({ checkInsThisWeek: entries.length, averageMood: avgMood, categoryCounts, entries });
  } catch (err) {
    console.error('[dashboard/weekly]', err);
    res.status(500).json({ error: 'Could not load your weekly report.' });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT created_at::DATE AS entry_date, category, mood FROM entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       ORDER BY created_at ASC`,
      [req.userId]
    );
    const entries = result.rows;
    const avgMood = entries.length
      ? Math.round((entries.reduce((s, e) => s + e.mood, 0) / entries.length) * 10) / 10
      : null;
    const mid = Math.floor(entries.length / 2);
    const firstHalf = mid ? entries.slice(0, mid).reduce((s, e) => s + e.mood, 0) / mid : null;
    const secondHalf = entries.length - mid
      ? entries.slice(mid).reduce((s, e) => s + e.mood, 0) / (entries.length - mid)
      : null;
    const moodDelta = firstHalf !== null && secondHalf !== null
      ? Math.round((secondHalf - firstHalf) * 10) / 10
      : null;
    res.json({ checkInsThisMonth: entries.length, averageMood: avgMood, moodDelta, entries });
  } catch (err) {
    console.error('[dashboard/monthly]', err);
    res.status(500).json({ error: 'Could not load your monthly report.' });
  }
});

module.exports = router;
