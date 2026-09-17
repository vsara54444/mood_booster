/**
 * Round-robin judge rotation, persisted in Postgres since serverless
 * functions don't keep in-memory state between requests.
 */
async function nextJudgeIndex(pool, providerCount) {
  const { rows } = await pool.query(
    `UPDATE judge_rotation SET last_index = (last_index + 1) % $1 WHERE id = 1 RETURNING last_index`,
    [providerCount]
  );
  return rows[0].last_index;
}

module.exports = { nextJudgeIndex };
