const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { nameFromEmail } = require('../utils/nameFromEmail');

const router = express.Router();

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
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

    res.status(201).json({
      accessToken: signAccessToken(userId),
      refreshToken: signRefreshToken(userId),
      userId,
    });
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
      'SELECT user_id, password_hash, is_deleted FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || user.is_deleted) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    res.json({
      accessToken: signAccessToken(user.user_id),
      refreshToken: signRefreshToken(user.user_id),
      userId: user.user_id,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    res.json({ accessToken: signAccessToken(payload.userId) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;
