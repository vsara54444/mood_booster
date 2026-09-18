const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_TYPES = ['break', 'learned', 'laughed', 'done', 'helped', 'self_care', 'other'];

// No daily limit, no streak, one tap logs it - deliberately pressure-free.
router.post('/', async (req, res) => {
  try {
    const { winType } = req.body;
    if (!VALID_TYPES.includes(winType)) return res.status(400).json({ error: 'Invalid win type.' });

    const pool = getPool();
    await pool.query('INSERT INTO tiny_wins (user_id, win_type) VALUES ($1, $2)', [req.userId, winType]);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[tiny-wins/create]', err);
    res.status(500).json({ error: 'Could not log that right now.' });
  }
});

// Light growth view, not a pressure mechanic - total count + this week's
// count (framed as progress, never as a gap) + a handful of recent ones.
router.get('/summary', async (req, res) => {
  try {
    const pool = getPool();
    const [total, thisWeek, recent] = await Promise.all([
      pool.query('SELECT count(*) FROM tiny_wins WHERE user_id = $1', [req.userId]),
      pool.query(
        `SELECT count(*) FROM tiny_wins WHERE user_id = $1 AND created_at > NOW() - interval '7 days'`,
        [req.userId]
      ),
      pool.query(
        'SELECT win_type, created_at FROM tiny_wins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
        [req.userId]
      ),
    ]);
    res.json({
      total: Number(total.rows[0].count),
      thisWeek: Number(thisWeek.rows[0].count),
      recent: recent.rows,
    });
  } catch (err) {
    console.error('[tiny-wins/summary]', err);
    res.status(500).json({ error: 'Could not load your tiny wins right now.' });
  }
});

module.exports = router;
