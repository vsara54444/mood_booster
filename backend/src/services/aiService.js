const { getPool } = require('../config/db');
const { getHumorForWorry, regenerateHumor } = require('./humorService');

// Request-time joke pipeline: classify the entry, then search the reusable
// humor library (humorService.js) before ever calling an AI writer. See
// humorRepository.js for the search-first/generate-on-miss logic.
async function processDailyEntry(rawText, category, motherTongue, favorites, mechanism, userId) {
  const pool = getPool();
  return getHumorForWorry(pool, { userId, rawText, category, motherTongue, mechanism, favorites });
}

// User-triggered "give me a different joke" for an existing entry. Reuses
// the classification captured at submit time (no AI call for that part).
async function regenerateHumorPack({ userId, category, motherTongue, mechanism, classification, favorites }) {
  const pool = getPool();
  return regenerateHumor(pool, { userId, category, motherTongue, mechanism, classification, favorites });
}

module.exports = { processDailyEntry, regenerateHumorPack };
