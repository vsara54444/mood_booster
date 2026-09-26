// Adds a hand-picked set of quotes from well-known leaders and sportspeople
// to the `quotes` table (Boost page motivational quote card). Written by
// hand rather than AI-generated so every attribution is deliberate.
//
//   npm run seed-leader-quotes                 add these quotes (skips any already stored)
//   npm run seed-leader-quotes -- --only-leaders  also deactivate every other quote
//                                              (sets active = false - nothing is deleted)
require('dotenv').config();

const { getPool } = require('../config/db');

const LEADER_QUOTES = [
  { author: 'Che Guevara', text: 'At the risk of seeming ridiculous, let me say that the true revolutionary is guided by great feelings of love.' },
  { author: 'Che Guevara', text: 'If you tremble with indignation at every injustice, then you are a comrade of mine.' },
  { author: 'Sachin Tendulkar', text: "Chase your dreams, but make sure you don't find shortcuts." },
  { author: 'Sachin Tendulkar', text: 'People throw stones at you, and you convert them into milestones.' },
  { author: 'MS Dhoni', text: 'The process is more important than the results. If you take care of the process, you will get the results.' },
  { author: 'MS Dhoni', text: "You don't play for the crowd, you play for the country." },
  { author: 'Elon Musk', text: 'When something is important enough, you do it even if the odds are not in your favor.' },
  { author: 'Elon Musk', text: 'Persistence is very important. You should not give up unless you are forced to give up.' },
  { author: 'Satya Nadella', text: "Don't be a know-it-all; be a learn-it-all." },
  { author: 'Satya Nadella', text: 'Our industry does not respect tradition - it only respects innovation.' },
  { author: 'Karl Marx', text: 'The philosophers have only interpreted the world, in various ways; the point is to change it.' },
];

async function main() {
  const onlyLeaders = process.argv.includes('--only-leaders');
  const pool = getPool();

  let added = 0;
  for (const q of LEADER_QUOTES) {
    const existing = await pool.query('SELECT id FROM quotes WHERE text = $1', [q.text]);
    if (existing.rows.length) {
      await pool.query('UPDATE quotes SET active = true WHERE text = $1', [q.text]);
      continue;
    }
    await pool.query('INSERT INTO quotes (text, author) VALUES ($1, $2)', [q.text, q.author]);
    added += 1;
  }
  console.log(`Added ${added} new leader quotes (${LEADER_QUOTES.length - added} already stored).`);

  if (onlyLeaders) {
    const res = await pool.query('UPDATE quotes SET active = false WHERE NOT (text = ANY($1)) AND active', [
      LEADER_QUOTES.map((q) => q.text),
    ]);
    console.log(`Deactivated ${res.rowCount} other quotes (kept in the table, active = false).`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedLeaderQuotes] fatal:', err);
  process.exit(1);
});
