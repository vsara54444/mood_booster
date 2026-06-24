const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

const router = express.Router();

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, userType } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const pool = await getPool();
    const existing = await pool.request().input('email', sql.NVarChar(256), email).query(
      'SELECT UserId FROM Users WHERE Email = @email'
    );
    if (existing.recordset.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool
      .request()
      .input('email', sql.NVarChar(256), email)
      .input('passwordHash', sql.NVarChar(256), passwordHash)
      .input('displayName', sql.NVarChar(100), displayName || null)
      .input('userType', sql.NVarChar(30), userType || null)
      .query(`INSERT INTO Users (Email, PasswordHash, DisplayName, UserType)
              OUTPUT inserted.UserId
              VALUES (@email, @passwordHash, @displayName, @userType)`);

    const userId = result.recordset[0].UserId;
    await pool.request().input('userId', sql.UniqueIdentifier, userId).query(
      'INSERT INTO Streaks (UserId, CurrentStreak, LongestStreak) VALUES (@userId, 0, 0)'
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
    const pool = await getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar(256), email)
      .query('SELECT UserId, PasswordHash, IsDeleted FROM Users WHERE Email = @email');

    const user = result.recordset[0];
    if (!user || user.IsDeleted) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({
      accessToken: signAccessToken(user.UserId),
      refreshToken: signRefreshToken(user.UserId),
      userId: user.UserId,
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
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;
