// Seeds the `song_riddles` table (Boost page "Guess the Song" game) with
// 100 well-known Tamil film songs split by era: 30 from the 1970s, 40 from
// the 1980s, 30 from the 1990s/2000s. Each gets a 4-emoji clue. Run once:
// npm run seed-songs
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

const BATCHES = [
  { era: '70s', count: 30, range: '1970-1979' },
  { era: '80s', count: 40, range: '1980-1989' },
  { era: '90s_2000s', count: 30, range: '1990-2009' },
];

async function generateBatch({ era, count, range }) {
  const system = `You know classic Tamil film music well. List ${count} DISTINCT, genuinely well-known, iconic Tamil film songs released in ${range} - only real songs a Tamil-film-music fan would actually recognize, never invented ones. If you are not fully confident a song title, film, and singer are all real and correctly matched, skip it and pick a different song you are certain about instead - accuracy matters more than variety. Never list a composer's name or an album/soundtrack title as if it were a song title. Never repeat a song.
For each, write a "emojiClue": exactly 4 emoji, CHARADES-style - translate the literal key words/nouns in the song's TITLE into emoji first (e.g. a title meaning "will the flower-breeze return" -> flower + wind + a return/turn-back symbol), filling any remaining slots with the song's mood or scene only if the title itself doesn't give you enough literal words. The clue must be solvable by someone who knows the title's meaning, not just a vague mood board.
Also give "songName" (the real song title, Tamil script or common transliteration), "movieName" (the real film it's from), and "singer" (the real playback singer(s)).
Respond ONLY with a JSON array: [{"emojiClue":"🎸🌧️💔🚗","songName":"...","movieName":"...","singer":"..."}]`;
  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: 'List them now.' }],
    maxTokens: 120 * count,
    temperature: 0.8,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned).map((s) => ({ ...s, era }));
}

async function main() {
  const pool = getPool();
  let total = 0;
  for (const batch of BATCHES) {
    console.log(`Generating ${batch.count} songs from the ${batch.era}...`);
    const items = await generateBatch(batch);
    for (const item of items) {
      if (!item.emojiClue || !item.songName) continue;
      await pool.query(
        'INSERT INTO song_riddles (era, emoji_clue, song_name, movie_name, singer) VALUES ($1, $2, $3, $4, $5)',
        [item.era, item.emojiClue, item.songName, item.movieName || null, item.singer || null]
      );
      total += 1;
    }
    console.log(`  stored ${items.length}`);
  }
  console.log(`Done. Total stored: ${total}`);

  // Same-title songs from different films (e.g. multiple "Thillana Thillana"
  // dance numbers) can get an identical, non-distinguishing clue - flag any
  // duplicates so they get disambiguated (see fixSongClues.js) before shipping.
  const dupes = await pool.query(
    'SELECT emoji_clue, array_agg(song_name || \' (\' || COALESCE(movie_name, \'?\') || \')\') AS songs FROM song_riddles WHERE active = true GROUP BY emoji_clue HAVING count(*) > 1'
  );
  if (dupes.rows.length) {
    console.log(`\nWARNING: ${dupes.rows.length} clue(s) are shared by multiple songs - run fixSongClues.js or fix manually:`);
    dupes.rows.forEach((r) => console.log(`  ${r.emoji_clue} -> ${r.songs.join(', ')}`));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedSongs] fatal:', err);
  process.exit(1);
});
