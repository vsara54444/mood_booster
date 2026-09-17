// Offline batch-generation entry point for the curated joke database.
// Usage:
//   npm run generate-jokes
//   npm run generate-jokes -- --category=frustrated --motherTongue=tamil --count=6
require('dotenv').config();

const { getPool } = require('../config/db');
const { authorAndStore } = require('../services/templateAuthoring');
const { CATEGORY_LABELS, TAMIL_MECHANISMS } = require('../services/humorStyles');

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);
const ALL_LANGUAGES = ['other', 'tamil', 'telugu', 'kannada', 'malayalam', 'hindi'];

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key) args[key] = value;
  }
  return args;
}

function combosFor(motherTongue) {
  if (motherTongue === 'tamil') {
    return Object.keys(TAMIL_MECHANISMS).map((mechanism) => ({ motherTongue, mechanism }));
  }
  return [{ motherTongue, mechanism: null }];
}

async function main() {
  const args = parseArgs();
  const categories = args.category ? [args.category] : ALL_CATEGORIES;
  const languages = args.motherTongue ? [args.motherTongue] : ALL_LANGUAGES;
  const count = parseInt(args.count || '6', 10);

  const badCategory = categories.find((c) => !ALL_CATEGORIES.includes(c));
  if (badCategory) {
    console.error(`Unknown category "${badCategory}". Valid: ${ALL_CATEGORIES.join(', ')}`);
    process.exit(1);
  }
  const badLanguage = languages.find((l) => !ALL_LANGUAGES.includes(l));
  if (badLanguage) {
    console.error(`Unknown motherTongue "${badLanguage}". Valid: ${ALL_LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  const pool = getPool();
  const summary = [];

  for (const category of categories) {
    for (const motherTongue of languages) {
      for (const { mechanism } of combosFor(motherTongue)) {
        const label = `${category} / ${motherTongue}${mechanism ? ` / ${mechanism}` : ''}`;
        process.stdout.write(`Authoring ${label} ... `);
        try {
          const result = await authorAndStore(pool, { category, motherTongue, mechanism, count });
          console.log(`approved ${result.approved}, rejected ${result.rejected} (of ${result.total})`);
          summary.push({ label, ...result });
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
          summary.push({ label, approved: 0, rejected: 0, total: 0, error: err.message });
        }
      }
    }
  }

  const totals = summary.reduce(
    (acc, s) => ({ approved: acc.approved + s.approved, rejected: acc.rejected + s.rejected }),
    { approved: 0, rejected: 0 }
  );
  console.log(`\nDone. Total approved: ${totals.approved}, rejected: ${totals.rejected}, across ${summary.length} combo(s).`);
  const failures = summary.filter((s) => s.error);
  if (failures.length) {
    console.log(`${failures.length} combo(s) failed outright:`, failures.map((f) => f.label).join(', '));
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[generateJokeTemplates] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { main };
