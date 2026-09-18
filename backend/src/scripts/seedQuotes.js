// Seeds the `quotes` table (Boost page motivational quote card) with ~100
// varied quotes, so "Try another" pulls from a real pool instead of
// repeating the same 5 hardcoded lines. Run once: npm run seed-quotes
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

const BATCH_SIZE = 25;
const BATCH_COUNT = 4; // 4 x 25 = 100
const THEMES = [
  'resilience, getting through hard days, and self-compassion',
  'small steps, progress, and patience with yourself',
  'calm, mindfulness, and letting go of what you can\'t control',
  'gratitude, hope, and finding light in ordinary moments',
];

async function generateBatch(theme) {
  const system = `Generate ${BATCH_SIZE} DISTINCT short motivational/comforting quotes themed around: ${theme}.
Mix well-known real quotes (with their real, correctly-attributed author) and original short lines with author set to null. Never attribute a quote to the wrong person. Keep each quote under 25 words. Never repeat a quote or a near-identical rephrasing.
Respond ONLY with a JSON array: [{"text":"...","author":"..."|null}]`;
  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: 'Generate them now.' }],
    maxTokens: 70 * BATCH_SIZE,
    temperature: 0.9,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned);
}

async function main() {
  const pool = getPool();
  let total = 0;
  for (let i = 0; i < BATCH_COUNT; i++) {
    const theme = THEMES[i % THEMES.length];
    console.log(`Generating batch ${i + 1}/${BATCH_COUNT} (${theme})...`);
    const items = await generateBatch(theme);
    for (const item of items) {
      if (!item.text) continue;
      await pool.query('INSERT INTO quotes (text, author) VALUES ($1, $2)', [item.text, item.author || null]);
      total += 1;
    }
    console.log(`  stored ${items.length}`);
  }
  console.log(`Done. Total stored: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedQuotes] fatal:', err);
  process.exit(1);
});
