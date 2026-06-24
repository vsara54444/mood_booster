const express = require('express');
const { getPool, sql } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { processDailyEntry } = require('../services/aiService');

const router = express.Router();
const VALID_CATEGORIES = ['frustrated', 'angry', 'upset', 'tired', 'funny'];

router.use(requireAuth);

/** Has the user already checked in today? Returns that entry if so. */
router.get('/today', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT TOP 1 * FROM Entries
              WHERE UserId = @userId AND EntryDate = CAST(SYSUTCDATETIME() AS DATE)
              ORDER BY CreatedAt DESC`);

    res.json({ entry: result.recordset[0] || null });
  } catch (err) {
    console.error('[entries/today]', err);
    res.status(500).json({ error: 'Could not check today\'s status.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, text, mood } = req.body;

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    if (!text || text.trim().length < 3) {
      return res.status(400).json({ error: 'Tell us a little more about today.' });
    }
    if (!mood || mood < 1 || mood > 5) {
      return res.status(400).json({ error: 'Mood must be between 1 and 5.' });
    }

    const pool = await getPool();

    // Enforce one check-in per day.
    const already = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT TOP 1 EntryId FROM Entries
              WHERE UserId = @userId AND EntryDate = CAST(SYSUTCDATETIME() AS DATE)`);
    if (already.recordset.length) {
      return res.status(409).json({ error: 'You already checked in today. Come back tomorrow!' });
    }

    const ai = await processDailyEntry(text.trim(), category);

    const insert = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .input('category', sql.NVarChar(30), category)
      .input('rawText', sql.NVarChar(2000), text.trim())
      .input('cleanedText', sql.NVarChar(2000), ai.cleanedText)
      .input('mood', sql.TinyInt, mood)
      .input('humor', sql.NVarChar(500), ai.humor)
      .input('perspective', sql.NVarChar(500), ai.perspective)
      .input('action', sql.NVarChar(500), ai.action)
      .input('topicTag', sql.NVarChar(50), ai.topicTag)
      .query(`INSERT INTO Entries
                (UserId, Category, RawText, CleanedText, Mood, HumorText, PerspectiveText, ActionText)
              OUTPUT inserted.EntryId, inserted.CreatedAt
              VALUES (@userId, @category, @rawText, @cleanedText, @mood, @humor, @perspective, @action)`);

    const { EntryId, CreatedAt } = insert.recordset[0];

    await updateStreak(pool, req.userId);

    res.status(201).json({
      entryId: EntryId,
      createdAt: CreatedAt,
      cleanedText: ai.cleanedText,
      topicTag: ai.topicTag,
      humor: ai.humor,
      perspective: ai.perspective,
      action: ai.action,
    });
  } catch (err) {
    console.error('[entries/create]', err);
    res.status(500).json({ error: 'Could not process today\'s entry. Please try again.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = 20;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .input('offset', sql.Int, (page - 1) * pageSize)
      .input('pageSize', sql.Int, pageSize)
      .query(`SELECT EntryId, Category, CleanedText, Mood, HumorText, PerspectiveText, ActionText,
                     IsSharedAnonymously, CreatedAt
              FROM Entries WHERE UserId = @userId
              ORDER BY CreatedAt DESC
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);
    res.json({ entries: result.recordset, page });
  } catch (err) {
    console.error('[entries/history]', err);
    res.status(500).json({ error: 'Could not load history.' });
  }
});

async function updateStreak(pool, userId) {
  const result = await pool
    .request()
    .input('userId', sql.UniqueIdentifier, userId)
    .query('SELECT CurrentStreak, LongestStreak, LastCheckinDate FROM Streaks WHERE UserId = @userId');

  const row = result.recordset[0] || { CurrentStreak: 0, LongestStreak: 0, LastCheckinDate: null };
  const today = new Date();
  const last = row.LastCheckinDate ? new Date(row.LastCheckinDate) : null;

  let newStreak = 1;
  if (last) {
    const diffDays = Math.round((today.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0)) / 86400000);
    if (diffDays === 1) newStreak = row.CurrentStreak + 1;
    else if (diffDays === 0) newStreak = row.CurrentStreak; // already counted today
    else newStreak = 1; // streak broken
  }
  const longest = Math.max(newStreak, row.LongestStreak);

  await pool
    .request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('current', sql.Int, newStreak)
    .input('longest', sql.Int, longest)
    .query(`MERGE Streaks AS target
            USING (SELECT @userId AS UserId) AS src ON target.UserId = src.UserId
            WHEN MATCHED THEN UPDATE SET CurrentStreak = @current, LongestStreak = @longest,
                                          LastCheckinDate = CAST(SYSUTCDATETIME() AS DATE)
            WHEN NOT MATCHED THEN INSERT (UserId, CurrentStreak, LongestStreak, LastCheckinDate)
                                  VALUES (@userId, @current, @longest, CAST(SYSUTCDATETIME() AS DATE));`);
}

module.exports = router;
