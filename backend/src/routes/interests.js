const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Small in-process cache for repeated search keystrokes. This backend runs as
// a single Vercel serverless function, so a warm container isn't guaranteed -
// this is a bonus on top of the pg_trgm GIN index, not the primary perf fix.
const SEARCH_CACHE_TTL_MS = 60_000;
const SEARCH_CACHE_MAX_ENTRIES = 500;
const searchCache = new Map();

function cacheGet(key) {
  const hit = searchCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    searchCache.delete(key);
    return undefined;
  }
  return hit.data;
}

function cacheSet(key, data) {
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
}

async function getCategory(pool, categoryKey) {
  const result = await pool.query(
    'SELECT category_key, label, is_multi_select FROM interest_categories WHERE category_key = $1 AND is_active = true',
    [categoryKey]
  );
  return result.rows[0] || null;
}

router.get('/categories', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT category_key, label, is_multi_select FROM interest_categories WHERE is_active = true ORDER BY sort_order ASC'
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('[interests/categories]', err);
    res.status(500).json({ error: 'Could not load interest categories.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const categoryKey = String(req.query.category || '');
    const q = String(req.query.q || '').trim();
    if (!categoryKey) return res.status(400).json({ error: 'Missing category.' });
    if (q.length < 2) return res.json({ results: [] });

    const pool = getPool();
    const category = await getCategory(pool, categoryKey);
    if (!category) return res.status(404).json({ error: 'Unknown category.' });

    const cacheKey = `${categoryKey}:${q.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ results: cached });

    const result = await pool.query(
      `SELECT item_id, name, image_url,
              similarity(name, $2) AS sim,
              (name ILIKE $2 || '%') AS is_prefix
       FROM interest_items
       WHERE category_key = $1
         AND is_active = true
         AND (name ILIKE '%' || $2 || '%'
              OR (aliases IS NOT NULL AND aliases ILIKE '%' || $2 || '%')
              OR similarity(name, $2) > 0.25)
       ORDER BY is_prefix DESC, sim DESC, name ASC
       LIMIT 10`,
      [categoryKey, q]
    );
    const results = result.rows.map((r) => ({ itemId: r.item_id, name: r.name, imageUrl: r.image_url }));
    cacheSet(cacheKey, results);
    res.json({ results });
  } catch (err) {
    console.error('[interests/search]', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, category_key, item_id, item_name FROM user_interests WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.userId]
    );
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.category_key]) grouped[row.category_key] = [];
      grouped[row.category_key].push({ id: row.id, itemId: row.item_id, itemName: row.item_name });
    }
    res.json({ interests: grouped });
  } catch (err) {
    console.error('[interests/me/get]', err);
    res.status(500).json({ error: 'Could not load your interests.' });
  }
});

router.put('/me/:categoryKey', async (req, res) => {
  const { categoryKey } = req.params;
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  try {
    const pool = getPool();
    const category = await getCategory(pool, categoryKey);
    if (!category) return res.status(404).json({ error: 'Unknown category.' });

    const cleanItems = items
      .filter((it) => it && typeof it.itemName === 'string' && it.itemName.trim())
      .map((it) => ({ itemId: it.itemId || null, itemName: it.itemName.trim() }));
    const toInsert = category.is_multi_select ? cleanItems.slice(0, 20) : cleanItems.slice(0, 1);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_interests WHERE user_id = $1 AND category_key = $2', [req.userId, categoryKey]);
      for (const item of toInsert) {
        await client.query(
          `INSERT INTO user_interests (user_id, category_key, item_id, item_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, category_key, item_name) DO NOTHING`,
          [req.userId, categoryKey, item.itemId, item.itemName]
        );
      }

      // Sync the existing AI script-routing flag from the richer language pick,
      // so users only answer "what language" once. See schema.sql migration note.
      if (categoryKey === 'mother_tongue') {
        let routingSlug = 'other';
        const chosen = toInsert[0];
        if (chosen?.itemId) {
          const meta = await client.query('SELECT metadata FROM interest_items WHERE item_id = $1', [chosen.itemId]);
          routingSlug = meta.rows[0]?.metadata?.routingSlug || 'other';
        }
        await client.query('UPDATE users SET mother_tongue = $2 WHERE user_id = $1', [req.userId, routingSlug]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ saved: true });
  } catch (err) {
    console.error('[interests/me/save]', err);
    res.status(500).json({ error: 'Could not save your selection.' });
  }
});

router.delete('/me/:categoryKey/:userInterestId', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      'DELETE FROM user_interests WHERE id = $1 AND user_id = $2 AND category_key = $3',
      [req.params.userInterestId, req.userId, req.params.categoryKey]
    );
    res.json({ deleted: true });
  } catch (err) {
    console.error('[interests/me/delete]', err);
    res.status(500).json({ error: 'Could not remove that selection.' });
  }
});

// Used by entries.js to build the humor-prompt personalization block.
// Deliberately excludes 'mother_tongue' - that already drives the script
// choice in aiService.js, so restating it as a plain interest would be redundant.
async function getInterestContext(pool, userId) {
  const result = await pool.query(
    `SELECT ui.category_key, ic.label, ui.item_name
     FROM user_interests ui
     JOIN interest_categories ic ON ic.category_key = ui.category_key
     WHERE ui.user_id = $1 AND ui.category_key != 'mother_tongue'
     ORDER BY ic.sort_order ASC, ui.created_at ASC`,
    [userId]
  );
  const grouped = new Map();
  for (const row of result.rows) {
    if (!grouped.has(row.category_key)) grouped.set(row.category_key, { label: row.label, values: [] });
    grouped.get(row.category_key).values.push(row.item_name);
  }
  return Array.from(grouped.values());
}

module.exports = router;
module.exports.getInterestContext = getInterestContext;
