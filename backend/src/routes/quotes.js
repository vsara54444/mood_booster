const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/random', async (req, res) => {
  try {
    const { exclude } = req.query;
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, text, author FROM quotes
       WHERE active = true AND id IS DISTINCT FROM $1
       ORDER BY random() LIMIT 1`,
      [exclude || null]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No quotes available yet.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[quotes/random]', err);
    res.status(500).json({ error: 'Could not load a quote right now.' });
  }
});

module.exports = router;
