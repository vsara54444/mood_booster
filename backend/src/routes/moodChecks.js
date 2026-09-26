const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Boost page "Feeling any better?" answers - lets us see whether the Boost
// activities actually help. Email/name are copied onto each row so the table
// is readable on its own when reviewing it.
router.post('/', async (req, res) => {
  try {
    const { feelingBetter, emotion } = req.body;
    if (typeof feelingBetter !== 'boolean') return res.status(400).json({ error: 'feelingBetter must be true or false.' });

    const pool = getPool();
    const user = await pool.query('SELECT email, display_name FROM users WHERE user_id = $1', [req.userId]);
    await pool.query(
      `INSERT INTO mood_checks (user_id, email, display_name, emotion, feeling_better)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.userId,
        user.rows[0]?.email || null,
        user.rows[0]?.display_name || null,
        typeof emotion === 'string' ? emotion.slice(0, 20) : null,
        feelingBetter,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[mood-checks/create]', err);
    res.status(500).json({ error: 'Could not save that right now.' });
  }
});

module.exports = router;
