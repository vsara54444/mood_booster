const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Emoji clue only - the answer is fetched separately (GET /:id) so the
// Boost page never has it in hand until the user asks to reveal it.
router.get('/random', async (req, res) => {
  try {
    const { exclude, language } = req.query;
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, emoji_clue FROM song_riddles
       WHERE active = true AND language = $1 AND id IS DISTINCT FROM $2
       ORDER BY random() LIMIT 1`,
      [language || 'tamil', exclude || null]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No songs available yet.' });
    res.json({ id: result.rows[0].id, emojiClue: result.rows[0].emoji_clue });
  } catch (err) {
    console.error('[songs/random]', err);
    res.status(500).json({ error: 'Could not load a song clue right now.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, emoji_clue, song_name, movie_name, singer FROM song_riddles WHERE id = $1 AND active = true',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Song not found.' });
    const row = result.rows[0];
    res.json({ id: row.id, emojiClue: row.emoji_clue, songName: row.song_name, movieName: row.movie_name, singer: row.singer });
  } catch (err) {
    console.error('[songs/get]', err);
    res.status(500).json({ error: 'Could not load the answer right now.' });
  }
});

module.exports = router;
