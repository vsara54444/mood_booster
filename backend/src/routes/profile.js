const express = require('express');
const { getPool, sql } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .query(`SELECT UserId, Email, DisplayName, UserType, ReminderTime, NotificationsOn,
                     ShareDefault, CreatedAt
              FROM Users WHERE UserId = @userId AND IsDeleted = 0`);

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user });
  } catch (err) {
    console.error('[profile/get]', err);
    res.status(500).json({ error: 'Could not load your profile.' });
  }
});

router.patch('/', async (req, res) => {
  try {
    const { displayName, userType, reminderTime, notificationsOn, shareDefault } = req.body;
    const pool = await getPool();
    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.userId)
      .input('displayName', sql.NVarChar(100), displayName ?? null)
      .input('userType', sql.NVarChar(30), userType ?? null)
      .input('reminderTime', sql.VarChar(8), reminderTime ?? null)
      .input('notificationsOn', sql.Bit, notificationsOn ?? 1)
      .input('shareDefault', sql.Bit, shareDefault ?? 0)
      .query(`UPDATE Users SET
                DisplayName = COALESCE(@displayName, DisplayName),
                UserType = COALESCE(@userType, UserType),
                ReminderTime = COALESCE(@reminderTime, ReminderTime),
                NotificationsOn = @notificationsOn,
                ShareDefault = @shareDefault
              WHERE UserId = @userId`);
    res.json({ updated: true });
  } catch (err) {
    console.error('[profile/update]', err);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

/**
 * Full account + data deletion (privacy requirement).
 * Soft-deletes the user row (so emails can't be silently reused to dodge bans),
 * but hard-deletes every piece of personal content: raw entries, history.
 * Anything already shared anonymously to the community feed stays - by design
 * it no longer contains identifying data or a link back to the account.
 */
router.delete('/', async (req, res) => {
  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = new sql.Request(transaction);
      request.input('userId', sql.UniqueIdentifier, req.userId);

      await request.query('DELETE FROM Votes WHERE UserId = @userId');
      await request.query('DELETE FROM Entries WHERE UserId = @userId');
      await request.query('DELETE FROM Streaks WHERE UserId = @userId');
      await request.query('DELETE FROM RefreshTokens WHERE UserId = @userId');
      await request.query(`UPDATE Users SET
                              IsDeleted = 1, DeletedAt = SYSUTCDATETIME(),
                              Email = CONCAT('deleted-', CONVERT(NVARCHAR(36), UserId), '@relol.local'),
                              PasswordHash = '', DisplayName = NULL
                            WHERE UserId = @userId`);

      await transaction.commit();
      res.json({ deleted: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('[profile/delete]', err);
    res.status(500).json({ error: 'Could not delete your account. Please try again.' });
  }
});

module.exports = router;
