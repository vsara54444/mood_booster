// Infers which Tamil comedic mechanism a user actually enjoys, without ever
// asking them to name a comedian or author. Signal comes entirely from
// behavior already captured elsewhere in the app:
//   - 'kept'       : a mechanism was used to generate a joke the user did not reject (weak positive)
//   - 'regenerated': the user hit "try a different joke" right after seeing it (negative)
//   - 'community_funny' / 'community_smile' / 'community_not_funny': this user voting
//     on someone else's shared joke, attributed to that joke's mechanism (the voter's
//     own reaction, not the original poster's taste)
//
// Selection is a simple epsilon-greedy bandit: mostly exploit the
// highest-scoring mechanism for this user, but keep exploring so preferences
// can be discovered (cold start) and can drift over time.

const MECHANISMS = ['escalation', 'duo_banter', 'wordplay', 'deadpan'];

const SIGNAL_WEIGHTS = {
  kept: 1,
  regenerated: -2,
  community_funny: 3,
  community_smile: 1,
  community_not_funny: -2,
};

const EXPLORATION_RATE = 0.2;

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function scoresByMechanism(pool, userId) {
  const result = await pool.query(
    `SELECT mechanism, signal, COUNT(*) AS cnt
     FROM humor_feedback
     WHERE user_id = $1
     GROUP BY mechanism, signal`,
    [userId]
  );
  const scores = new Map(MECHANISMS.map((m) => [m, 0]));
  for (const row of result.rows) {
    if (!scores.has(row.mechanism)) continue;
    const weight = SIGNAL_WEIGHTS[row.signal] || 0;
    scores.set(row.mechanism, scores.get(row.mechanism) + weight * Number(row.cnt));
  }
  return scores;
}

// exclude: mechanism to force away from (used on explicit "try a different
// joke" so a rejection can never just repeat the same mechanism).
async function pickMechanism(pool, userId, { exclude } = {}) {
  const candidates = exclude ? MECHANISMS.filter((m) => m !== exclude) : MECHANISMS;
  const scores = await scoresByMechanism(pool, userId);
  const hasAnySignal = [...scores.values()].some((v) => v !== 0);

  if (!hasAnySignal || Math.random() < EXPLORATION_RATE) {
    return pickRandom(candidates);
  }

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const m of candidates) {
    const score = scores.get(m);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

async function recordSignal(pool, { userId, entryId, mechanism, signal }) {
  if (!mechanism) return;
  await pool.query(
    `INSERT INTO humor_feedback (user_id, entry_id, mechanism, signal) VALUES ($1, $2, $3, $4)`,
    [userId, entryId || null, mechanism, signal]
  );
}

module.exports = { MECHANISMS, pickMechanism, recordSignal };
