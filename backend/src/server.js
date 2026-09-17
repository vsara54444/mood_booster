require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const communityRoutes = require('./routes/community');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profile');
const interestsRoutes = require('./routes/interests');
const puzzlesRoutes = require('./routes/puzzles');
const songsRoutes = require('./routes/songs');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'MoodBooster API' }));
app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/puzzles', puzzlesRoutes);
app.use('/api/songs', songsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

// Local dev: node src/server.js starts the server directly.
// Vercel: api/index.js exports the app - no listen needed.
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`[server] MoodBooster API listening on port ${PORT}`));
}

module.exports = app;
// auto-deploy test 2026-09-17T21:37:07Z
