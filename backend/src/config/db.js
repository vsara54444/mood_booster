const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'ReLOL',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false', // true for Azure SQL, usually true is fine locally too
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false', // true for local dev / self-signed certs
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

/**
 * Returns a singleton MSSQL connection pool.
 * Reuse this everywhere instead of opening new connections per request -
 * this is the #1 thing that makes MSSQL apps hard to debug under load.
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] Connected to MSSQL at ${config.server}:${config.port}/${config.database}`);
        return pool;
      })
      .catch((err) => {
        console.error('[db] Connection failed:', err.message);
        poolPromise = null; // allow retry on next call
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
