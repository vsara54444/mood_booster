const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT user_id, email, display_name, user_type, reminder_time,
              notifications_on, share_default, created_at
       FROM users WHERE user_id = $1 AND is_deleted = false`,
      [req.userId]
    );
    const user = result.rows[0];
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
    const pool = getPool();
    await pool.query(
      `UPDATE users SET
         display_name      = COALESCE($2, display_name),
         user_type         = COALESCE($3, user_type),
         reminder_time     = COALESCE($4::TIME, reminder_time),
         notifications_on  = $5,
         share_default     = $6
       WHERE user_id = $1`,
      [req.userId, displayName ?? null, userType ?? null, reminderTime ?? null,
       notificationsOn ?? true, shareDefault ?? false]
    );
    res.json({ updated: true });
  } catch (err) {
    console.error('[profile/update]', err);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM votes WHERE user_id = $1', [req.userId]);
      await client.query('DELETE FROM entries WHERE user_id = $1', [req.userId]);
      await client.query('DELETE FROM streaks WHERE user_id = $1', [req.userId]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.userId]);
      await client.query(
        `UPDATE users SET
           is_deleted = true, deleted_at = NOW(),
           email = 'deleted-' || user_id::TEXT || '@relol.local',
           password_hash = '', display_name = NULL
         WHERE user_id = $1`,
        [req.userId]
      );
      await client.query('COMMIT');
      res.json({ deleted: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[profile/delete]', err);
    res.status(500).json({ error: 'Could not delete your account. Please try again.' });
  }
});

module.exports = router;
