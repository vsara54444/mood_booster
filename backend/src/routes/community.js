const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { aiAnonymize } = require('../services/anonymizer');
const { recordSignal } = require('../services/mechanismPreference');

const router = express.Router();
router.use(requireAuth);

router.post('/share/:entryId', async (req, res) => {
  try {
    const pool = getPool();
    const entryResult = await pool.query(
      `SELECT entry_id, category, cleaned_text, humor_text, perspective_text, is_shared_anonymously, humor_mechanism
       FROM entries WHERE entry_id = $1 AND user_id = $2`,
      [req.params.entryId, req.userId]
    );
    const entry = entryResult.rows[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    if (entry.is_shared_anonymously) return res.status(409).json({ error: 'Already shared.' });

    const anonymizedText = await aiAnonymize(entry.cleaned_text);

    // humor_mechanism is copied at share time (not joined later) so a future
    // regenerate on the original entry can't retroactively relabel a joke
    // that's already out on the feed collecting votes.
    await pool.query(
      `INSERT INTO community_posts (entry_id, category, anonymized_text, humor_text, perspective_text, humor_mechanism)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.entry_id, entry.category, anonymizedText, entry.humor_text, entry.perspective_text, entry.humor_mechanism]
    );
    await pool.query(
      'UPDATE entries SET is_shared_anonymously = true WHERE entry_id = $1',
      [entry.entry_id]
    );

    res.status(201).json({ shared: true, anonymizedText });
  } catch (err) {
    console.error('[community/share]', err);
    res.status(500).json({ error: 'Could not share to the community feed.' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = 20;
    const pool = getPool();
    const result = await pool.query(
      `SELECT post_id, category, anonymized_text, humor_text, perspective_text,
              funny_votes, smile_votes, not_funny_votes, created_at
       FROM community_posts
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize]
    );
    res.json({ posts: result.rows, page });
  } catch (err) {
    console.error('[community/feed]', err);
    res.status(500).json({ error: 'Could not load the community feed.' });
  }
});

const VOTE_COLUMNS = { funny: 'funny_votes', smile: 'smile_votes', not_funny: 'not_funny_votes' };

router.post('/feed/:postId/vote', async (req, res) => {
  try {
    const { voteType } = req.body;
    const column = VOTE_COLUMNS[voteType];
    if (!column) return res.status(400).json({ error: 'Invalid vote type.' });

    const pool = getPool();
    try {
      await pool.query(
        'INSERT INTO votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [req.params.postId, req.userId, voteType]
      );
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'You already voted on this post.' });
      throw err;
    }

    await pool.query(
      `UPDATE community_posts SET ${column} = ${column} + 1 WHERE post_id = $1`,
      [req.params.postId]
    );

    // Voting is the voter's own reaction, not the original poster's - this
    // feeds the VOTER's mechanism-preference profile.
    const post = await pool.query('SELECT entry_id, humor_mechanism FROM community_posts WHERE post_id = $1', [req.params.postId]);
    if (post.rows[0]?.humor_mechanism) {
      await recordSignal(pool, {
        userId: req.userId,
        entryId: post.rows[0].entry_id,
        mechanism: post.rows[0].humor_mechanism,
        signal: `community_${voteType}`,
      });
    }

    res.json({ voted: true });
  } catch (err) {
    console.error('[community/vote]', err);
    res.status(500).json({ error: 'Could not record your vote.' });
  }
});

module.exports = router;
