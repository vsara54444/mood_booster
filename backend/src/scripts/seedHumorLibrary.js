// Bulk-seeds the reusable humor library (`humors` table) with a curated
// spread of common everyday worries, in Tamil, per product spec. This is a
// thin driver only - it does not write, judge, embed, or store anything
// itself. Every step reuses the SAME modules the live request path uses
// (slotExtraction.classifyWorry, freshHumorWriter.generateFreshHumor,
// geminiEmbeddingClient.embedText, humorRepository.storeHumor), so seeded
// content goes through the identical quality gate real user worries do and
// is immediately reusable by the Level 1-3 lookup in humorService.js.
//
// Usage:
//   npm run seed-humor-library
//   npm run seed-humor-library -- --language=telugu
//   npm run seed-humor-library -- --bucket="Daily Life"   (one bucket only)
//   npm run seed-humor-library -- --concurrency=6
require('dotenv').config();

const { getPool } = require('../config/db');
const { callClaude } = require('../services/anthropicClient');
const { cleanAndExtractSlots } = require('../services/slotExtraction');
const { generateFreshHumor } = require('../services/freshHumorWriter');
const { embedText } = require('../services/geminiEmbeddingClient');
const { storeHumor } = require('../services/humorRepository');
const { MECHANISMS } = require('../services/mechanismPreference');

const DEFAULT_MOTHER_TONGUE = 'tamil';

const BUCKETS = [
  { label: 'Interview + Anxiety', category: 'anxious', subcategory: 'work', count: 30,
    seed: 'someone about to go into a job interview and feeling nervous/anxious about it' },
  { label: 'Salary + Money', category: 'stressed', subcategory: 'finance', count: 30,
    seed: 'someone stressed about salary, expenses, bills, or money in general' },
  { label: 'Manager + Office', category: 'frustrated', subcategory: 'work', count: 30,
    seed: 'someone frustrated with their manager, boss, or office politics/environment' },
  { label: 'Parents + Marriage', category: 'stressed', subcategory: 'family', count: 30,
    seed: 'someone stressed about parents pressuring them about marriage or family expectations' },
  { label: 'Exam + Procrastination', category: 'anxious', subcategory: 'studies', count: 30,
    seed: 'someone anxious about an upcoming exam after having procrastinated studying for it' },
  { label: 'Traffic + Frustration', category: 'frustrated', subcategory: 'commute', count: 30,
    seed: 'someone frustrated being stuck in traffic during their commute' },
  { label: 'Work + Meetings', category: 'frustrated', subcategory: 'work', count: 30,
    seed: 'someone frustrated with long, pointless, or poorly-run work meetings' },
  { label: 'Daily Life', category: 'calm', subcategory: 'general', count: 50,
    seed: 'small, relatable everyday moments in daily life - chores, food, weather, little annoyances or joys, unrelated to work' },
];

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key) args[key] = value;
  }
  return args;
}

// One cheap Claude call per bucket to get varied, realistic worry phrasings
// to seed from - NOT joke-writing, just source material for the same
// classify -> write -> judge -> embed -> store pipeline every live entry goes through.
async function brainstormWorries(bucket) {
  const system = `You write short, realistic journal-entry lines for a mood-tracking app.
Generate ${bucket.count} DISTINCT realistic worries/moments about: ${bucket.seed}.
Each should sound like something a real person typed quickly - vary the specific detail, angle, and phrasing register (some plain English, some Tanglish/colloquial Indian English) so none feel repetitive of each other. One sentence each, under 25 words. Never repeat the same specific detail twice across the list.
Respond ONLY with a JSON array of ${bucket.count} strings.`;
  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: 'Generate them now.' }],
    maxTokens: 60 * bucket.count,
    temperature: 1,
  });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const arr = JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned);
  return arr.slice(0, bucket.count);
}

async function seedOne(pool, motherTongue, bucket, rawWorryText) {
  const classification = await cleanAndExtractSlots(rawWorryText, bucket.category);
  // Mechanism (escalation/duo_banter/wordplay/deadpan) is a Tamil-only
  // concept - other languages pick their comedic voice from
  // LOCAL_LANGUAGE_STYLES instead, same as the live request path
  // (routes/entries.js: mechanism is null for anything but Tamil).
  const mechanism = motherTongue === 'tamil' ? MECHANISMS[Math.floor(Math.random() * MECHANISMS.length)] : null;
  const generated = await generateFreshHumor({
    category: bucket.category, motherTongue, mechanism, worry: classification,
  });
  const embedding = await embedText(`${classification.cleanedText} ${(classification.topicKeywords || []).join(' ')}`.trim());
  return storeHumor(pool, {
    motherTongue,
    category: bucket.category,
    subcategory: bucket.subcategory,
    emotion: classification.emotion,
    mechanism: generated.mechanism,
    topicKeywords: classification.topicKeywords,
    worryText: classification.cleanedText,
    humorText: generated.humor,
    perspectiveText: generated.perspective,
    actionText: generated.action,
    songText: generated.song,
    embedding,
    qualityScore: generated.qualityScore,
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
  const args = parseArgs();
  const concurrency = parseInt(args.concurrency || '4', 10);
  const motherTongue = args.language || DEFAULT_MOTHER_TONGUE;
  const buckets = args.bucket ? BUCKETS.filter((b) => b.label === args.bucket) : BUCKETS;
  if (args.bucket && !buckets.length) {
    console.error(`Unknown bucket "${args.bucket}". Valid: ${BUCKETS.map((b) => b.label).join(', ')}`);
    process.exit(1);
  }

  const pool = getPool();
  let grandTotal = 0;

  for (const bucket of buckets) {
    console.log(`\n=== ${bucket.label} (target ${bucket.count}, category=${bucket.category}, subcategory=${bucket.subcategory}, language=${motherTongue}) ===`);
    const worries = await brainstormWorries(bucket);
    console.log(`brainstormed ${worries.length} worry variations`);

    const results = await runWithConcurrency(worries, concurrency, async (worryText) => {
      try {
        const id = await seedOne(pool, motherTongue, bucket, worryText);
        process.stdout.write('.');
        return id;
      } catch (err) {
        process.stdout.write('x');
        console.error(`\n[seed] failed for "${worryText}":`, err.message);
        return null;
      }
    });

    const ok = results.filter(Boolean).length;
    grandTotal += ok;
    console.log(`\n${bucket.label}: stored ${ok}/${worries.length}`);
  }

  console.log(`\nDone. Total humors stored: ${grandTotal}`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seedHumorLibrary] fatal:', err);
    process.exit(1);
  });
}

module.exports = { BUCKETS };
