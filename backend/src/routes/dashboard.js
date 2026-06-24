const express = require('express');
const { getPool, sql } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  try {
    const pool = await getPool();

    const streakResult = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query('SELECT CurrentStreak, LongestStreak FROM Streaks WHERE UserId = @userId');

    const moodTrendResult = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT TOP 14 EntryDate, Mood FROM Entries
              WHERE UserId = @userId ORDER BY EntryDate DESC`);

    const categoryResult = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT TOP 5 Category, COUNT(*) AS Count FROM Entries
              WHERE UserId = @userId AND CreatedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
              GROUP BY Category ORDER BY Count DESC`);

    res.json({
      streak: streakResult.recordset[0] || { CurrentStreak: 0, LongestStreak: 0 },
      moodTrend: moodTrendResult.recordset.reverse(),
      topCategories: categoryResult.recordset,
    });
  } catch (err) {
    console.error('[dashboard/summary]', err);
    res.status(500).json({ error: 'Could not load your dashboard.' });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT EntryDate, Category, Mood, HumorText, PerspectiveText, ActionText
              FROM Entries
              WHERE UserId = @userId AND CreatedAt >= DATEADD(DAY, -7, SYSUTCDATETIME())
              ORDER BY EntryDate ASC`);

    const entries = result.recordset;
    const avgMood = entries.length
      ? Math.round((entries.reduce((sum, e) => sum + e.Mood, 0) / entries.length) * 10) / 10
      : null;

    const categoryCounts = entries.reduce((acc, e) => {
      acc[e.Category] = (acc[e.Category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      checkInsThisWeek: entries.length,
      averageMood: avgMood,
      categoryCounts,
      entries,
    });
  } catch (err) {
    console.error('[dashboard/weekly]', err);
    res.status(500).json({ error: 'Could not load your weekly report.' });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT EntryDate, Category, Mood FROM Entries
              WHERE UserId = @userId AND CreatedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
              ORDER BY EntryDate ASC`);

    const entries = result.recordset;
    const avgMood = entries.length
      ? Math.round((entries.reduce((sum, e) => sum + e.Mood, 0) / entries.length) * 10) / 10
      : null;

    // Compare first-half vs second-half average mood as a simple "growth" signal.
    const mid = Math.floor(entries.length / 2);
    const firstHalfAvg = mid
      ? entries.slice(0, mid).reduce((s, e) => s + e.Mood, 0) / mid
      : null;
    const secondHalfAvg = entries.length - mid
      ? entries.slice(mid).reduce((s, e) => s + e.Mood, 0) / (entries.length - mid)
      : null;

    const moodDelta =
      firstHalfAvg !== null && secondHalfAvg !== null
        ? Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10
        : null;

    res.json({
      checkInsThisMonth: entries.length,
      averageMood: avgMood,
      moodDelta,
      entries,
    });
  } catch (err) {
    console.error('[dashboard/monthly]', err);
    res.status(500).json({ error: 'Could not load your monthly report.' });
  }
});

module.exports = router;
