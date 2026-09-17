const { SLOT_NAMES } = require('./slotExtraction');

const FAVORITE_SLOT_NAMES = ['favorite_comedian', 'favorite_musician'];
const ALL_SLOT_NAMES = [...SLOT_NAMES, ...FAVORITE_SLOT_NAMES];
const RECENT_HISTORY_DAYS = 60;

// getInterestContext() (routes/interests.js) returns [{label, values}] grouped
// by category label, not category_key - match on the fixed labels seeded in
// schema.sql (interest_categories) rather than re-deriving the key.
function buildFavoriteSlots(favorites) {
  const slots = { favorite_comedian: null, favorite_musician: null };
  for (const f of favorites || []) {
    if (f.label === 'Favorite Comedian' && f.values.length) slots.favorite_comedian = f.values[0];
    if (f.label === 'Favorite Musician' && f.values.length) slots.favorite_musician = f.values[0];
  }
  return slots;
}

function slotsSatisfied(requiredSlots, slotValues) {
  return (requiredSlots || []).every((name) => !!slotValues[name]);
}

function isGeneric(template) {
  return !template.required_slots || template.required_slots.length === 0;
}

function pickLeastUsed(candidates) {
  const minUsage = Math.min(...candidates.map((c) => c.usage_count));
  const leastUsed = candidates.filter((c) => c.usage_count === minUsage);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}

function fillTemplate(str, slotValues) {
  if (!str) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => (slotValues[name] != null ? slotValues[name] : ''));
}

async function fetchApprovedTemplates(pool, { category, motherTongue, mechanism }) {
  const result = await pool.query(
    `SELECT template_id, category, topic_tag, mother_tongue, mechanism,
            humor_template, perspective_template, action_template, song_template,
            required_slots, usage_count
     FROM joke_templates
     WHERE status = 'approved' AND category = $1 AND mother_tongue = $2
       AND mechanism IS NOT DISTINCT FROM $3`,
    [category, motherTongue, mechanism || null]
  );
  return result.rows;
}

async function fetchRecentTemplateIds(pool, userId) {
  const result = await pool.query(
    `SELECT DISTINCT template_id FROM user_template_history
     WHERE user_id = $1 AND created_at > NOW() - make_interval(days => $2)`,
    [userId, RECENT_HISTORY_DAYS]
  );
  return new Set(result.rows.map((r) => r.template_id));
}

/**
 * Picks the best curated template for this entry and merges story-derived
 * slots with profile-derived favorite slots. Dedupe/repeat-avoidance is
 * scoped to THIS user only (user_template_history is keyed by user_id) - a
 * different user can freely be shown the same template.
 */
async function selectTemplate(pool, { userId, category, motherTongue, mechanism, topicTag, storySlots, favorites, excludeTemplateId }) {
  const slotValues = { ...storySlots, ...buildFavoriteSlots(favorites) };
  const all = await fetchApprovedTemplates(pool, { category, motherTongue, mechanism });
  if (!all.length) return null;

  const recentIds = await fetchRecentTemplateIds(pool, userId);
  const notShownBefore = (t) => t.template_id !== excludeTemplateId && !recentIds.has(t.template_id);
  const notJustShown = (t) => t.template_id !== excludeTemplateId;
  const matchesTopic = (t) => t.topic_tag === topicTag;
  const satisfiesSlots = (t) => slotsSatisfied(t.required_slots, slotValues);

  // Each tier trades away one constraint at a time; the last tier guarantees
  // a result whenever any approved template exists for this category/language.
  const tiers = [
    all.filter((t) => matchesTopic(t) && satisfiesSlots(t) && notShownBefore(t)),
    all.filter((t) => satisfiesSlots(t) && notShownBefore(t)),
    all.filter((t) => isGeneric(t) && notShownBefore(t)),
    all.filter((t) => satisfiesSlots(t) && notJustShown(t)),
    all.filter((t) => isGeneric(t) && notJustShown(t)),
    all.filter(notJustShown),
    all,
  ];

  for (const candidates of tiers) {
    if (candidates.length) {
      return { template: pickLeastUsed(candidates), slotValues };
    }
  }
  return null;
}

async function recordTemplateUsage(pool, userId, templateId) {
  await pool.query('INSERT INTO user_template_history (user_id, template_id) VALUES ($1, $2)', [userId, templateId]);
  await pool.query('UPDATE joke_templates SET usage_count = usage_count + 1 WHERE template_id = $1', [templateId]);
}

module.exports = { selectTemplate, fillTemplate, recordTemplateUsage, buildFavoriteSlots, ALL_SLOT_NAMES };
