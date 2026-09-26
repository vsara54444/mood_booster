// One-off fix: regenerates emoji_clue for every existing song_riddles row
// using the shared, context-aware clue writer (see ../services/songClueWriter.js)
// instead of the old pure literal-word-translation approach, which collapsed
// into generic filler for abstract/philosophical titles. Song/movie/singer
// metadata is left untouched - only the clue changes. Run once: node src/scripts/fixSongClues.js
require('dotenv').config();

const { getPool } = require('../config/db');
const { writeCluesForBatch } = require('../services/songClueWriter');

// Smaller than before (was 20) - the richer prompt produces longer per-song
// reasoning/output, and Groq (now the working fallback since Anthropic is
// out of credit) truncates large batches mid-JSON more easily than Claude did.
const BATCH_SIZE = 8;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const pool = getPool();
  const { rows } = await pool.query('SELECT id, song_name, movie_name FROM song_riddles WHERE active = true ORDER BY created_at');
  console.log(`Fixing clues for ${rows.length} songs...`);

  let total = 0;
  const failedBatches = [];
  const batches = chunk(rows, BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    // Anthropic is out of credit right now, so every batch falls through to
    // Groq's free tier, which caps at 8000 tokens/minute - pace requests so
    // a full run doesn't blow through that and lose the back half to 429s.
    if (i > 0) await sleep(12000);
    try {
      const fixed = await writeCluesForBatch(batch);
      for (const item of fixed) {
        const row = batch[item.index];
        if (!row || !item.emojiClue) continue;
        await pool.query('UPDATE song_riddles SET emoji_clue = $1 WHERE id = $2', [item.emojiClue, row.id]);
        total += 1;
      }
      process.stdout.write('.');
    } catch (err) {
      process.stdout.write('x');
      console.error(`\nbatch starting with "${batch[0].song_name}" failed:`, err.message);
      failedBatches.push(batch);
    }
  }
  console.log(`\nDone. Fixed ${total}/${rows.length} clues.`);
  if (failedBatches.length) {
    console.log(`${failedBatches.length} batch(es) failed and kept their previous clue - rerun the script to retry just those (it re-selects all active rows each time).`);
  }

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
