const express = require('express');
const { getPool, sql } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { aiAnonymize } = require('../services/anonymizer');

const router = express.Router();
router.use(requireAuth);

/**
 * Opt in to sharing a specific entry to the anonymous community feed.
 * Names/company names are stripped before anything is stored in CommunityPosts.
 * The user's identity is never attached to the post.
 */
router.post('/share/:entryId', async (req, res) => {
  try {
    const pool = await getPool();
    const entryResult = await pool
      .request()
      .input('entryId', sql.UniqueIdentifier, req.params.entryId)
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT EntryId, Category, CleanedText, HumorText, PerspectiveText, IsSharedAnonymously
              FROM Entries WHERE EntryId = @entryId AND UserId = @userId`);

    const entry = entryResult.recordset[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    if (entry.IsSharedAnonymously) return res.status(409).json({ error: 'Already shared.' });

    const anonymizedText = await aiAnonymize(entry.CleanedText);

    await pool
      .request()
      .input('entryId', sql.UniqueIdentifier, entry.EntryId)
      .input('category', sql.NVarChar(30), entry.Category)
      .input('anonymizedText', sql.NVarChar(2000), anonymizedText)
      .input('humor', sql.NVarChar(500), entry.HumorText)
      .input('perspective', sql.NVarChar(500), entry.PerspectiveText)
      .query(`INSERT INTO CommunityPosts (EntryId, Category, AnonymizedText, HumorText, PerspectiveText)
              VALUES (@entryId, @category, @anonymizedText, @humor, @perspective)`);

    await pool
      .request()
      .input('entryId', sql.UniqueIdentifier, entry.EntryId)
      .query('UPDATE Entries SET IsSharedAnonymously = 1 WHERE EntryId = @entryId');

    res.status(201).json({ shared: true, anonymizedText });
  } catch (err) {
    console.error('[community/share]', err);
    res.status(500).json({ error: 'Could not share to the community feed.' });
  }
});

/** Public-to-logged-in-users feed, paginated, newest first. No author info ever returned. */
router.get('/feed', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = 20;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('offset', sql.Int, (page - 1) * pageSize)
      .input('pageSize', sql.Int, pageSize)
      .query(`SELECT PostId, Category, AnonymizedText, HumorText, PerspectiveText,
                     FunnyVotes, SmileVotes, NotFunnyVotes, CreatedAt
              FROM CommunityPosts
              ORDER BY CreatedAt DESC
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);
    res.json({ posts: result.recordset, page });
  } catch (err) {
    console.error('[community/feed]', err);
    res.status(500).json({ error: 'Could not load the community feed.' });
  }
});

const VALID_VOTES = { funny: 'FunnyVotes', smile: 'SmileVotes', not_funny: 'NotFunnyVotes' };

router.post('/feed/:postId/vote', async (req, res) => {
  try {
    const { voteType } = req.body;
    const column = VALID_VOTES[voteType];
    if (!column) return res.status(400).json({ error: 'Invalid vote type.' });

    const pool = await getPool();

    try {
      await pool
        .request()
        .input('postId', sql.UniqueIdentifier, req.params.postId)
        .input('userId', sql.UniqueIdentifier, req.userId)
        .input('voteType', sql.NVarChar(10), voteType)
        .query('INSERT INTO Votes (PostId, UserId, VoteType) VALUES (@postId, @userId, @voteType)');
    } catch (err) {
      if (err.number === 2627 || err.number === 2601) {
        return res.status(409).json({ error: 'You already voted on this post.' });
      }
      throw err;
    }

    await pool
      .request()
      .input('postId', sql.UniqueIdentifier, req.params.postId)
      .query(`UPDATE CommunityPosts SET ${column} = ${column} + 1 WHERE PostId = @postId`);

    res.json({ voted: true });
  } catch (err) {
    console.error('[community/vote]', err);
    res.status(500).json({ error: 'Could not record your vote.' });
  }
});

module.exports = router;
