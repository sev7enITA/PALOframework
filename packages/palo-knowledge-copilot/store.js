function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class MemoryCopilotStore {
  constructor() {
    this.transactions = new Map();
    this.sessions = new Map();
  }

  async migrate() {}
  async close() {}
  async health() { return { driver: "memory", reachable: true, durable: false, schemaCurrent: true }; }
  async putLoginTransaction(transaction) { this.transactions.set(transaction.stateHash, clone(transaction)); }
  async takeLoginTransaction(stateHash, now = new Date()) {
    const transaction = this.transactions.get(stateHash);
    this.transactions.delete(stateHash);
    return transaction && new Date(transaction.expiresAt) > now ? clone(transaction) : undefined;
  }
  async putSession(session) { this.sessions.set(session.sessionHash, clone(session)); }
  async getSession(sessionHash, now = new Date()) {
    const session = this.sessions.get(sessionHash);
    if (!session || new Date(session.expiresAt) <= now) return undefined;
    return clone(session);
  }
  async deleteSession(sessionHash) { this.sessions.delete(sessionHash); }
  async purgeExpired(now = new Date()) {
    let transactions = 0; let sessions = 0;
    for (const [key, value] of this.transactions) if (new Date(value.expiresAt) <= now) { this.transactions.delete(key); transactions += 1; }
    for (const [key, value] of this.sessions) if (new Date(value.expiresAt) <= now) { this.sessions.delete(key); sessions += 1; }
    return { transactions, sessions };
  }
}

const MIGRATION_VERSION = "001_session_boundary";
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS palo_copilot_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS palo_copilot_login_transactions (
  state_hash text PRIMARY KEY,
  transaction_json jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS palo_copilot_sessions (
  session_hash text PRIMARY KEY,
  session_json jsonb NOT NULL,
  tenant_digest text NOT NULL,
  subject_digest text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS palo_copilot_login_transactions_expiry ON palo_copilot_login_transactions(expires_at);
CREATE INDEX IF NOT EXISTS palo_copilot_sessions_expiry ON palo_copilot_sessions(expires_at);
`;

export class PostgresCopilotStore {
  constructor(pool) { this.pool = pool; }

  static async connect({ connectionString, ssl, ca }) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : undefined, max: 8, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    await pool.query("SELECT 1");
    return new PostgresCopilotStore(pool);
  }

  async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('palo-copilot-schema'))");
      await client.query(MIGRATION_SQL);
      await client.query("INSERT INTO palo_copilot_schema_migrations(version) VALUES ($1) ON CONFLICT (version) DO NOTHING", [MIGRATION_VERSION]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async close() { await this.pool.end(); }
  async health() {
    await this.pool.query("SELECT 1");
    let schemaCurrent = false;
    try { schemaCurrent = Boolean((await this.pool.query("SELECT 1 FROM palo_copilot_schema_migrations WHERE version=$1", [MIGRATION_VERSION])).rowCount); }
    catch (error) { if (error.code !== "42P01") throw error; }
    return { driver: "postgresql", reachable: true, durable: true, schemaCurrent };
  }
  async putLoginTransaction(transaction) {
    await this.pool.query("INSERT INTO palo_copilot_login_transactions VALUES ($1,$2,$3)", [transaction.stateHash, transaction, transaction.expiresAt]);
  }
  async takeLoginTransaction(stateHash) {
    const result = await this.pool.query("DELETE FROM palo_copilot_login_transactions WHERE state_hash=$1 AND expires_at>now() RETURNING transaction_json", [stateHash]);
    return result.rows[0]?.transaction_json;
  }
  async putSession(session) {
    await this.pool.query("INSERT INTO palo_copilot_sessions VALUES ($1,$2,$3,$4,$5)", [session.sessionHash, session, session.tenantDigest, session.subjectDigest, session.expiresAt]);
  }
  async getSession(sessionHash) {
    const result = await this.pool.query("SELECT session_json FROM palo_copilot_sessions WHERE session_hash=$1 AND expires_at>now()", [sessionHash]);
    return result.rows[0]?.session_json;
  }
  async deleteSession(sessionHash) { await this.pool.query("DELETE FROM palo_copilot_sessions WHERE session_hash=$1", [sessionHash]); }
  async purgeExpired() {
    const transactions = await this.pool.query("DELETE FROM palo_copilot_login_transactions WHERE expires_at<=now()");
    const sessions = await this.pool.query("DELETE FROM palo_copilot_sessions WHERE expires_at<=now()");
    return { transactions: transactions.rowCount, sessions: sessions.rowCount };
  }
}

export async function createCopilotStore(config) {
  if (!config.databaseUrl) return new MemoryCopilotStore();
  return PostgresCopilotStore.connect({ connectionString: config.databaseUrl, ssl: config.databaseSsl, ca: config.databaseCa });
}
