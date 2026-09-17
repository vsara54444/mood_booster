// Full rebuild of song_riddles using ONLY songs verified against real
// Wikipedia soundtrack pages (see conversation - the original AI-memory
// seed had wrong singers on nearly every song, and several fully fabricated
// titles). Deactivates everything currently in the table, inserts this
// verified list, and generates literal-title emoji clues for each.
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

// [songName, movieName, singer, era] - each verified against a Wikipedia
// soundtrack/film page during this session.
const VERIFIED_SONGS = [
  // Aval Appadithan (1978)
  ['Uravugal Thodarkathai', 'Aval Appadithan', 'K. J. Yesudas', '70s'],
  ['Panneer Pushpangale', 'Aval Appadithan', 'Kamal Haasan', '70s'],
  ['Vaazhkai Odam', 'Aval Appadithan', 'S. Janaki', '70s'],
  // Moondru Mudichu (1978)
  ['Aadi Velli', 'Moondru Mudichu', 'P. Jayachandran, Vani Jairam', '70s'],
  ['Naanoru Kadhanayagi', 'Moondru Mudichu', 'P. Susheela, L. R. Eswari', '70s'],
  ['Vasantha Kaala', 'Moondru Mudichu', 'P. Jayachandran, Vani Jairam', '70s'],
  // Sigappu Rojakkal (1978)
  ['Minminikku Kannil Oru', 'Sigappu Rojakkal', 'S. Janaki, Malaysia Vasudevan', '70s'],
  ['Ninaivo Oru Paravai', 'Sigappu Rojakkal', 'Kamal Haasan, S. Janaki', '70s'],
  // Apoorva Raagangal (1975)
  ['Athisaya Raagam', 'Apoorva Raagangal', 'K. J. Yesudas', '70s'],
  ['Kai Kotti Siripaargal', 'Apoorva Raagangal', 'Siyak Mohammed', '70s'],
  ['Kelviyin Nayagane', 'Apoorva Raagangal', 'Vani Jairam, B. S. Sasirekha', '70s'],
  ['Yezhu Swarangalukkul', 'Apoorva Raagangal', 'Vani Jairam', '70s'],
  // Ninaithale Inikkum (1979)
  ['Namma Ooru Singari', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Sayonara Vesham Kalainthathu', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Nizhal Kandavan', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Ninaiththaale Inikkum', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam, S. Janaki', '70s'],
  ['Vaaniley Medai Amaithu', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Aananda Thaandavamo', 'Ninaithale Inikkum', 'L. R. Eswari', '70s'],
  ['Bharathi Kannamma', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam, Vani Jairam', '70s'],
  ['Inimai Nirainda Ulagam', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam, L. R. Eswari', '70s'],
  ['Kaaththirunthen', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Thattiketka Aalillai', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],
  ['Yaathum Oore', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam, P. Susheela', '70s'],
  ['Engeyum Eppothum', 'Ninaithale Inikkum', 'S. P. Balasubrahmanyam', '70s'],

  // Salangai Oli (1983) - Tamil version of Sagara Sangamam
  ['Mounamana Neram', 'Salangai Oli', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Nadha Vinodhangal Nadana Sandhoshangal', 'Salangai Oli', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Om Namah Shivaaya', 'Salangai Oli', 'S. Janaki', '80s'],
  ['Thakita Thadimi Thamdhaanaa', 'Salangai Oli', 'S. P. Balasubrahmanyam', '80s'],
  ['Vedham Anuvilum Oru Naadham', 'Salangai Oli', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Vaan Pole Vannam Kondu', 'Salangai Oli', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],

  // Roja (1992)
  ['Chinna Chinna Asai', 'Roja', 'Minmini', '90s_2000s'],
  ['Pudhu Vellai Mazhai', 'Roja', 'Unni Menon, Sujatha Mohan', '90s_2000s'],
  ['Kaadhal Rojave', 'Roja', 'S. P. Balasubrahmanyam, Sujatha Mohan', '90s_2000s'],
  ['Rukkumani Rukkumani', 'Roja', 'S. P. Balasubrahmanyam, K. S. Chithra', '90s_2000s'],
  ['Thamizha Thamizha', 'Roja', 'Hariharan', '90s_2000s'],
  // Alaipayuthey (2000)
  ['Endrendrum Punnagai', 'Alaipayuthey', 'Shankar Mahadevan, A. R. Rahman', '90s_2000s'],
  ['Pachchai Nirame', 'Alaipayuthey', 'Hariharan, Clinton Cerejo', '90s_2000s'],
  ['Kadhal Sadugudu', 'Alaipayuthey', 'S. P. B. Charan, Naveen', '90s_2000s'],
  ['Evano Oruvan', 'Alaipayuthey', 'Swarnalatha', '90s_2000s'],
  ['Snegithane Snegithane', 'Alaipayuthey', 'Sadhana Sargam, Srinivas', '90s_2000s'],
  ['Yaro Yarodi', 'Alaipayuthey', 'Mahalakshmi Iyer, Vaishali Samant, Richa Sharma', '90s_2000s'],
  ['September Madham', 'Alaipayuthey', 'Asha Bhosle, Shankar Mahadevan', '90s_2000s'],
  // Kandukondain Kandukondain (2000)
  ['Kannamoochi Yenada', 'Kandukondain Kandukondain', 'K. S. Chithra, Shahana', '90s_2000s'],
];

async function generateClue(songName) {
  const system = `Write a 4-emoji CHARADES clue for the Tamil film song titled "${songName}". Translate the literal key words/nouns in the TITLE into emoji first. Only use mood/scene emoji to fill remaining slots if the title itself doesn't give enough literal words.
Respond ONLY with JSON: {"emojiClue":"🌸🌬️🐦↩️"}`;
  const raw = await callClaude({ system, messages: [{ role: 'user', content: 'Write it now.' }], maxTokens: 60, temperature: 0.7 });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned).emojiClue;
}

async function main() {
  const pool = getPool();
  await pool.query('UPDATE song_riddles SET active = false WHERE active = true');
  console.log('Deactivated all previous (unverified) rows.');

  let total = 0;
  for (const [songName, movieName, singer, era] of VERIFIED_SONGS) {
    try {
      const emojiClue = await generateClue(songName);
      await pool.query(
        'INSERT INTO song_riddles (era, emoji_clue, song_name, movie_name, singer) VALUES ($1, $2, $3, $4, $5)',
        [era, emojiClue, songName, movieName, singer]
      );
      total += 1;
      process.stdout.write('.');
    } catch (err) {
      process.stdout.write('x');
      console.error(`\nfailed for "${songName}":`, err.message);
    }
  }
  console.log(`\nDone. Inserted ${total}/${VERIFIED_SONGS.length} verified songs.`);
  process.exit(0);
}

main().catch((err) => { console.error('[rebuildSongsVerified] fatal:', err); process.exit(1); });
