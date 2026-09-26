const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { nameFromEmail } = require('../utils/nameFromEmail');
const { sendEmail } = require('../services/resendClient');

const router = express.Router();
const RESET_TOKEN_TTL_MINUTES = 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
}

// Persists a refresh token (hashed - never the raw value) so /refresh can
// check it against the DB and rotate it, instead of trusting the JWT alone.
// This is what lets an actively-used session keep renewing itself
// indefinitely: every refresh replaces the row with a new 30-day expiry.
async function storeRefreshToken(pool, userId, refreshToken) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(refreshToken), expiresAt]
  );
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, userType, motherTongue } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const pool = getPool();
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, user_type, mother_tongue)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      [email, passwordHash, displayName || nameFromEmail(email), userType || null, motherTongue === 'tamil' ? 'tamil' : 'other']
    );
    const userId = result.rows[0].user_id;

    await pool.query(
      'INSERT INTO streaks (user_id, current_streak, longest_streak) VALUES ($1, 0, 0)',
      [userId]
    );

    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);
    await storeRefreshToken(pool, userId, refreshToken);

    res.status(201).json({ accessToken, refreshToken, userId });
  } catch (err) {
    console.error('[auth/signup]', err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = getPool();
    const result = await pool.query(
      'SELECT user_id, email, password_hash, is_deleted FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || user.is_deleted) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const accessToken = signAccessToken(user.user_id);
    const refreshToken = signRefreshToken(user.user_id);
    await storeRefreshToken(pool, user.user_id, refreshToken);
    await pool.query('INSERT INTO login_events (user_id, email) VALUES ($1, $2)', [user.user_id, user.email]);

    res.json({ accessToken, refreshToken, userId: user.user_id });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// Always responds the same way regardless of whether the email exists, so
// this endpoint can't be used to check which emails have accounts.
router.post('/forgot-password', async (req, res) => {
  const GENERIC_RESPONSE = { message: 'If an account exists for that email, a reset link has been sent.' };
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const pool = getPool();
    const result = await pool.query('SELECT user_id, is_deleted FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || user.is_deleted) return res.json(GENERIC_RESPONSE);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, hashToken(rawToken), expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset your MoodBooster password',
      html: `<p>Someone requested a password reset for this account.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a> (expires in ${RESET_TOKEN_TTL_MINUTES} minutes).</p>
             <p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    res.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    // Still return the generic response - don't leak whether something broke
    // vs. the email just not existing.
    res.json(GENERIC_RESPONSE);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const pool = getPool();
    const result = await pool.query(
      `SELECT token_id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
      [hashToken(token)]
    );
    const row = result.rows[0];
    if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, row.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_id = $1', [row.token_id]);
    // A changed password should kill any session a stolen refresh token was keeping alive.
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [row.user_id]);

    res.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const pool = getPool();
    // Rotate: the old row is consumed here and a new one takes its place with
    // a fresh 30-day expiry, so a session that's actively being used never
    // hits its expiry - only a genuinely abandoned one (or a reset password,
    // see /reset-password) does.
    const deleted = await pool.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW() RETURNING token_id',
      [hashToken(refreshToken), payload.userId]
    );
    if (!deleted.rows.length) return res.status(401).json({ error: 'Invalid or expired refresh token.' });

    const newAccessToken = signAccessToken(payload.userId);
    const newRefreshToken = signRefreshToken(payload.userId);
    await storeRefreshToken(pool, payload.userId, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;
