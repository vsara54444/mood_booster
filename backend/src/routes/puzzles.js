const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_CATEGORIES = ['trivia', 'math'];

// Question only - answer/explain are fetched separately (GET /:id) so the
// Boost page never has the answer in hand until the user asks to reveal it.
router.get('/random', async (req, res) => {
  try {
    const { category, exclude } = req.query;
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category.' });

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, question FROM puzzles
       WHERE active = true AND category = $1 AND id IS DISTINCT FROM $2
       ORDER BY random() LIMIT 1`,
      [category, exclude || null]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No puzzles available for this category yet.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[puzzles/random]', err);
    res.status(500).json({ error: 'Could not load a puzzle right now.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, question, answer, explain FROM puzzles WHERE id = $1 AND active = true', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Puzzle not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[puzzles/get]', err);
    res.status(500).json({ error: 'Could not load the answer right now.' });
  }
});

module.exports = router;
