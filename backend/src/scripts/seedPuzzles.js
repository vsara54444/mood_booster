// Seeds the `puzzles` table (Boost page brain puzzle) with 100 questions:
// 50 general-knowledge trivia (English, aimed at adults 25+) and 50 simple
// math puzzles. Run once: npm run seed-puzzles
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');

const BATCHES = [
  { category: 'trivia', count: 25, topic: 'general-knowledge trivia aimed at adults aged 25+ (history, geography, science, culture, famous people, everyday facts) - NOT childish or pop-teen-culture questions' },
  { category: 'trivia', count: 25, topic: 'general-knowledge trivia aimed at adults aged 25+ (history, geography, science, culture, famous people, everyday facts) - NOT childish or pop-teen-culture questions' },
  { category: 'math', count: 25, topic: 'simple, quick mental-math and logic puzzles anyone can attempt without paper (basic arithmetic, simple sequences, light logic) - keep them EASY, not competition-level' },
  { category: 'math', count: 25, topic: 'simple, quick mental-math and logic puzzles anyone can attempt without paper (basic arithmetic, simple sequences, light logic) - keep them EASY, not competition-level' },
];

async function generateBatch({ category, count, topic }) {
  const system = `Generate ${count} DISTINCT ${topic}.
Each needs a clear one-line question, a short correct answer, and a one-line explanation.
Never repeat the same question or fact across the list.
Respond ONLY with a JSON array: [{"question":"...","answer":"...","explain":"..."}]`;
  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: 'Generate them now.' }],
    maxTokens: 120 * count,
    temperature: 1,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned).map((q) => ({ ...q, category }));
}

async function main() {
  const pool = getPool();
  let total = 0;
  for (const batch of BATCHES) {
    console.log(`Generating ${batch.count} ${batch.category} questions...`);
    const items = await generateBatch(batch);
    for (const item of items) {
      if (!item.question || !item.answer) continue;
      await pool.query(
        'INSERT INTO puzzles (category, question, answer, explain) VALUES ($1, $2, $3, $4)',
        [item.category, item.question, item.answer, item.explain || null]
      );
      total += 1;
    }
    console.log(`  stored ${items.length}`);
  }
  console.log(`Done. Total stored: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedPuzzles] fatal:', err);
  process.exit(1);
});
