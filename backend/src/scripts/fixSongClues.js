// One-off fix: regenerates emoji_clue for every existing song_riddles row
// using the corrected charades/literal-title-translation approach (see
// seedSongs.js) instead of the old vague mood-board style. Song/movie/singer
// metadata is left untouched - only the clue changes. Run once: node src/scripts/fixSongClues.js
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

const BATCH_SIZE = 20;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fixBatch(rows) {
  const list = rows.map((r, i) => `${i}. "${r.song_name}" (${r.movie_name || 'unknown film'})`).join('\n');
  const system = `For each Tamil film song below, write a 4-emoji CHARADES clue. Translate the literal key words/nouns in the song's TITLE into emoji first (e.g. a title meaning "will the flower-breeze return" -> flower + wind + a return/turn-back symbol). Only use the song's mood or scene to fill remaining slots if the title itself doesn't give enough literal words to translate. The clue must be solvable by someone who knows what the title means, not a vague mood board.

${list}

Respond ONLY with a JSON array, same order, one per song: [{"index":0,"emojiClue":"🌸🌬️🐦↩️"}]`;
  const raw = await callClaude({
    system, messages: [{ role: 'user', content: 'Write them now.' }], maxTokens: 60 * rows.length, temperature: 0.7,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned);
}

async function main() {
  const pool = getPool();
  const { rows } = await pool.query('SELECT id, song_name, movie_name FROM song_riddles WHERE active = true ORDER BY created_at');
  console.log(`Fixing clues for ${rows.length} songs...`);

  let total = 0;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const fixed = await fixBatch(batch);
    for (const item of fixed) {
      const row = batch[item.index];
      if (!row || !item.emojiClue) continue;
      await pool.query('UPDATE song_riddles SET emoji_clue = $1 WHERE id = $2', [item.emojiClue, row.id]);
      total += 1;
    }
    process.stdout.write(`.`);
  }
  console.log(`\nDone. Fixed ${total}/${rows.length} clues.`);

  // Same-title songs from different films (e.g. multiple "Thillana Thillana"
  // dance numbers) can get an identical, non-distinguishing clue when a batch
  // has no other context to tell them apart - flag any duplicates left over
  // so they get manually disambiguated rather than silently shipping.
  const dupes = await pool.query(
    'SELECT emoji_clue, array_agg(song_name || \' (\' || COALESCE(movie_name, \'?\') || \')\') AS songs FROM song_riddles WHERE active = true GROUP BY emoji_clue HAVING count(*) > 1'
  );
  if (dupes.rows.length) {
    console.log(`\nWARNING: ${dupes.rows.length} clue(s) are shared by multiple songs - fix these manually:`);
    dupes.rows.forEach((r) => console.log(`  ${r.emoji_clue} -> ${r.songs.join(', ')}`));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[fixSongClues] fatal:', err);
  process.exit(1);
});
