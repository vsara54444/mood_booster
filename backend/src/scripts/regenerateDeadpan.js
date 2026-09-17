// One-off backfill: regenerates the 'deadpan' mechanism jokes that were
// deactivated for reading as formal/literary written Tamil instead of
// natural spoken Tamil (see humorStyles.js deadpan fix). Reuses the exact
// same pipeline as seedHumorLibrary.js, just forcing mechanism='deadpan'
// and targeting the specific bucket counts that were deactivated.
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');
const { cleanAndExtractSlots } = require('../services/slotExtraction');
const { generateFreshHumor } = require('../services/freshHumorWriter');
const { embedText } = require('../services/geminiEmbeddingClient');
const { storeHumor } = require('../services/humorRepository');

const MOTHER_TONGUE = 'tamil';

const TARGETS = [
  { category: 'anxious', subcategory: 'work', count: 6, seed: 'someone about to go into a job interview and feeling nervous/anxious about it' },
  { category: 'stressed', subcategory: 'finance', count: 8, seed: 'someone stressed about salary, expenses, bills, or money in general' },
  { category: 'frustrated', subcategory: 'work', count: 19, seed: 'someone frustrated with their manager, office politics, or long/pointless work meetings' },
  { category: 'stressed', subcategory: 'family', count: 10, seed: 'someone stressed about parents pressuring them about marriage or family expectations' },
  { category: 'calm', subcategory: 'general', count: 14, seed: 'small, relatable everyday moments in daily life - chores, food, weather, little annoyances or joys, unrelated to work' },
  { category: 'anxious', subcategory: 'studies', count: 3, seed: 'someone anxious about an upcoming exam after having procrastinated studying for it' },
  { category: 'frustrated', subcategory: 'commute', count: 6, seed: 'someone frustrated being stuck in traffic during their commute' },
];

async function brainstormWorries(bucket) {
  const system = `You write short, realistic journal-entry lines for a mood-tracking app.
Generate ${bucket.count} DISTINCT realistic worries/moments about: ${bucket.seed}.
Each should sound like something a real person typed quickly. One sentence each, under 25 words. Never repeat the same specific detail twice.
Respond ONLY with a JSON array of ${bucket.count} strings.`;
  const raw = await callClaude({
    system, messages: [{ role: 'user', content: 'Generate them now.' }], maxTokens: 60 * bucket.count, temperature: 1,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned).slice(0, bucket.count);
}

async function seedOne(pool, bucket, rawWorryText) {
  const classification = await cleanAndExtractSlots(rawWorryText, bucket.category);
  const generated = await generateFreshHumor({
    category: bucket.category, motherTongue: MOTHER_TONGUE, mechanism: 'deadpan', worry: classification,
  });
  const embedding = await embedText(`${classification.cleanedText} ${(classification.topicKeywords || []).join(' ')}`.trim());
  return storeHumor(pool, {
    motherTongue: MOTHER_TONGUE, category: bucket.category, subcategory: bucket.subcategory,
    emotion: classification.emotion, mechanism: generated.mechanism, topicKeywords: classification.topicKeywords,
    worryText: classification.cleanedText, humorText: generated.humor, perspectiveText: generated.perspective,
    actionText: generated.action, songText: generated.song, embedding, qualityScore: generated.qualityScore,
    generationModel: generated.provider,
  });
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

async function main() {
  const pool = getPool();
  let total = 0;
  for (const bucket of TARGETS) {
    console.log(`\n=== ${bucket.category}/${bucket.subcategory} (${bucket.count}) ===`);
    const worries = await brainstormWorries(bucket);
    const results = await runWithConcurrency(worries, 4, async (w) => {
      try {
        const id = await seedOne(pool, bucket, w);
        process.stdout.write('.');
        return id;
      } catch (err) {
        process.stdout.write('x');
        console.error(`\nfailed for "${w}":`, err.message);
        return null;
      }
    });
    const ok = results.filter(Boolean).length;
    total += ok;
    console.log(`\nstored ${ok}/${worries.length}`);
  }
  console.log(`\nDone. Total deadpan jokes regenerated: ${total}`);
  process.exit(0);
}

main().catch((err) => { console.error('[regenerateDeadpan] fatal:', err); process.exit(1); });
