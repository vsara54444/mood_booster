// Seeds song_riddles with Telugu songs verified against real Wikipedia
// soundtrack pages (same approach as rebuildSongsVerified.js for Tamil -
// pure AI-memory generation proved unreliable on movie/singer credits).
// Each entry below was checked against its film's actual Wikipedia page
// during this session.
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

const LANGUAGE = 'telugu';

// [songName, movieName, singer, era]
const VERIFIED_SONGS = [
  // Andala Ramudu (1973)
  ['Paluke Bangaramayera', 'Andala Ramudu', 'M. Balamuralikrishna, Madhavapeddi Satyam', '70s'],
  ['Edagadanikendukura', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Abbosi Chinnamma', 'Andala Ramudu', 'V. Ramakrishna, P. Susheela', '70s'],
  ['Maa Thalli Godavari', 'Andala Ramudu', 'V. Ramakrishna, J. V. Raghavulu', '70s'],
  ['Chakirevu Baana Emandi', 'Andala Ramudu', 'V. Ramakrishna, J. V. Raghavulu', '70s'],
  ['Ramudemannadoi', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Bhajana Chese Vidhamu', 'Andala Ramudu', 'V. Ramakrishna, Vijayalakshmi', '70s'],
  ['Kurise Vennello', 'Andala Ramudu', 'V. Ramakrishna, P. Susheela', '70s'],
  ['Mamu Brovamani Cheppave', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Shudha Brahma', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Samooha Bhojanammu', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Adigo Bhadradri', 'Andala Ramudu', 'V. Ramakrishna', '70s'],
  ['Sri Shankara', 'Andala Ramudu', 'M. Balamuralikrishna', '70s'],

  // Sankarabharanam (1980)
  ['Brochevarevarura', 'Sankarabharanam', 'S. P. Balasubrahmanyam, Vani Jayaram', '80s'],
  ['Dorakunaa Ituvanti Seva', 'Sankarabharanam', 'S. P. Balasubrahmanyam, Vani Jayaram', '80s'],
  ['Manasa Sancharare', 'Sankarabharanam', 'S. P. Balasubrahmanyam, Vani Jayaram', '80s'],
  ['Omkaara Naadaanusandhanamou', 'Sankarabharanam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Paluke Bangaaramaayena', 'Sankarabharanam', 'Vani Jayaram', '80s'],
  ['Raagam Taanam Pallavi', 'Sankarabharanam', 'S. P. Balasubrahmanyam', '80s'],
  ['Shankaraa Naadasareeraparaa', 'Sankarabharanam', 'S. P. Balasubrahmanyam', '80s'],
  ['Saamajavaragamana', 'Sankarabharanam', 'S. Janaki, S. P. Balasubrahmanyam', '80s'],
  ['Ey Teeruga Nanu', 'Sankarabharanam', 'Vani Jayaram', '80s'],
  // Sagara Sangamam (1983)
  ['Baala Kanakamaya Chela', 'Sagara Sangamam', 'S. Janaki', '80s'],
  ['Mounamelanoyi Ee Marapurani Reyi', 'Sagara Sangamam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Naada Vinodamu Natya Vilasamu', 'Sagara Sangamam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Om Namah Shivaaya', 'Sagara Sangamam', 'S. Janaki', '80s'],
  ['Thakita Thadimi', 'Sagara Sangamam', 'S. P. Balasubrahmanyam', '80s'],
  ['Vedam Anuvanuvuna Nadam', 'Sagara Sangamam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Vevela Gopemmala', 'Sagara Sangamam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  // Swathi Muthyam (1986)
  ['Suvvi Suvvi', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Vatapathra Saayiki', 'Swathi Muthyam', 'P. Susheela', '80s'],
  ['Ramaa Kanavemiraa', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Manasu Palike', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Chinnaari Ponnaari', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Dharmam Saranam', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  ['Pattu Cheera', 'Swathi Muthyam', 'S. P. Balasubrahmanyam, S. P. Sailaja', '80s'],
  // Swarnakamalam (1988)
  ['Ghallu Ghallu Ghallumantu', 'Swarnakamalam', 'P. Susheela, S. P. Balasubrahmanyam', '80s'],
  ['Aakasamlo Aasala Harivullu', 'Swarnakamalam', 'S. Janaki', '80s'],
  ['Kothaga Rekkalochena', 'Swarnakamalam', 'S. P. Balasubrahmanyam, S. Janaki', '80s'],
  ['Koluvaiyunnade Devadevudu', 'Swarnakamalam', 'P. Susheela, S. P. Balasubrahmanyam', '80s'],
  ['Andela Ravamidhi Padamulada', 'Swarnakamalam', 'S. P. Balasubrahmanyam, Vani Jairam', '80s'],
  ['Siva Poojaku Chivurinchina', 'Swarnakamalam', 'P. Susheela, S. P. Balasubrahmanyam', '80s'],
  ['Cheri Yasodaku Sisuvithadu', 'Swarnakamalam', 'S. P. Sailaja', '80s'],
  ['Aathmathvam', 'Swarnakamalam', 'S. Janaki', '80s'],
  ['Natarajane', 'Swarnakamalam', 'S. P. Sailaja', '80s'],

  // Ninne Pelladata (1996, Telugu version)
  ['Yeto Vellipoyindi', 'Ninne Pelladata', 'Rajesh Krishnan', '90s_2000s'],
  ['Greeku Veerudu', 'Ninne Pelladata', 'Sowmya', '90s_2000s'],
  ['Naa Mogudu Rampyari', 'Ninne Pelladata', 'Malgudi Subha, Sunitha, Rajesh Krishnan', '90s_2000s'],
  ['Kannulo Nee Roopame', 'Ninne Pelladata', 'Hariharan, K. S. Chithra', '90s_2000s'],
  ['Inka Edho', 'Ninne Pelladata', 'Hariharan, Sowmya', '90s_2000s'],
  ['Nathora Thamashalalo', 'Ninne Pelladata', 'Sanjeev Wadhwani, Sujatha', '90s_2000s'],
  // Tholi Prema (1998)
  ['Ee Manase Se Se', 'Tholi Prema', 'S. P. Balasubrahmanyam', '90s_2000s'],
  ['Yemaindo Yemo Ee Vela', 'Tholi Prema', 'S. P. Balasubrahmanyam', '90s_2000s'],
  ['Gagananiki Udayam', 'Tholi Prema', 'S. P. Balasubrahmanyam', '90s_2000s'],
  ['Romance Rhythms', 'Tholi Prema', 'Suresh Peters, P. Unnikrishnan', '90s_2000s'],
  // Bommarillu (2006)
  ['We Have a Romeo', 'Bommarillu', 'Ranjith, Andrea Jeremiah', '90s_2000s'],
  ['Bommani Geesthe', 'Bommarillu', 'Gopika Poornima, Jeans Srinivas', '90s_2000s'],
  ['Kaani Ippudu', 'Bommarillu', 'Devi Sri Prasad', '90s_2000s'],
  ['Laloo Darwaja', 'Bommarillu', 'Naveen, Murali, Priya Prakash', '90s_2000s'],
  ['Nammaka Thappani', 'Bommarillu', 'Sagar, Sumangali', '90s_2000s'],
  ['Appudo Ippudo', 'Bommarillu', 'Siddharth', '90s_2000s'],
];

const BATCH_SIZE = 20;
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function generateClues(batch) {
  const list = batch.map((r, i) => `${i}. "${r[0]}" (${r[1]})`).join('\n');
  const system = `For each Telugu film song below, write a 4-emoji CHARADES clue. Translate the literal key words/nouns in the song's TITLE into emoji first. Only use mood/scene emoji to fill remaining slots if the title itself doesn't give enough literal words to translate. The clue must be solvable by someone who knows what the title means, not a vague mood board.

${list}

Respond ONLY with a JSON array, same order: [{"index":0,"emojiClue":"..."}]`;
  const raw = await callClaude({
    system, messages: [{ role: 'user', content: 'Write them now.' }], maxTokens: 60 * batch.length, temperature: 0.7,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned);
}

async function main() {
  const pool = getPool();
  let total = 0;
  for (const batch of chunk(VERIFIED_SONGS, BATCH_SIZE)) {
    const clues = await generateClues(batch);
    for (const item of clues) {
      const row = batch[item.index];
      if (!row || !item.emojiClue) continue;
      const [songName, movieName, singer, era] = row;
      await pool.query(
        'INSERT INTO song_riddles (language, era, emoji_clue, song_name, movie_name, singer) VALUES ($1, $2, $3, $4, $5, $6)',
        [LANGUAGE, era, item.emojiClue, songName, movieName, singer]
      );
      total += 1;
    }
    process.stdout.write('.');
  }

  const dupes = await pool.query(
    "SELECT emoji_clue, array_agg(song_name || ' (' || movie_name || ')') AS songs FROM song_riddles WHERE active = true AND language = $1 GROUP BY emoji_clue HAVING count(*) > 1",
    [LANGUAGE]
  );
  console.log(`\nDone. Inserted ${total}/${VERIFIED_SONGS.length} verified Telugu songs.`);
  if (dupes.rows.length) {
    console.log(`WARNING: ${dupes.rows.length} clue(s) shared by multiple songs:`);
    dupes.rows.forEach((r) => console.log(`  ${r.emoji_clue} -> ${r.songs.join(', ')}`));
  }
  process.exit(0);
}

main().catch((err) => { console.error('[seedTeluguSongsVerified] fatal:', err); process.exit(1); });
