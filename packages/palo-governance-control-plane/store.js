import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "./crypto.js";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const INITIAL_MIGRATION_VERSION = "001_initial";
const INITIAL_MIGRATION_SQL = readFileSync(path.join(packageDirectory, "migrations/001_initial.sql"), "utf8");
const INITIAL_MIGRATION_DIGEST = sha256(INITIAL_MIGRATION_SQL);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class MemoryControlPlaneStore {
  constructor() {
    this.transactions = new Map();
    this.sessions = new Map();
    this.simulations = new Map();
    this.bundles = new Map();
    this.audit = [];
  }

  async migrate() {}
  async close() {}
  async health() { return { driver: "memory", reachable: true, durable: false, schemaCurrent: true, rowLevelSecurity: false }; }
  async purgeExpired(now = new Date()) {
    let transactions = 0; let sessions = 0;
    for (const [key, value] of this.transactions) if (new Date(value.expiresAt) <= now) { this.transactions.delete(key); transactions += 1; }
    for (const [key, value] of this.sessions) if (new Date(value.expiresAt) <= now) { this.sessions.delete(key); sessions += 1; }
    return { transactions, sessions };
  }

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

  async putSimulation(record) { this.simulations.set(record.receiptId, clone(record)); }
  async putSimulationWithAudit(record, event) { await this.putSimulation(record); return { record: clone(record), auditEvent: await this.appendAudit(event) }; }
  async getSimulation(receiptId, tenantId) {
    const record = this.simulations.get(receiptId);
    return record?.tenantId === tenantId ? clone(record) : undefined;
  }

  async createBundle(record) {
    if ([...this.bundles.values()].some((item) => item.tenantId === record.tenantId && item.inputDigest === record.inputDigest && item.status !== "rejected")) throw Object.assign(new Error("A current bundle already exists for this input digest"), { status: 409 });
    this.bundles.set(record.bundleId, clone(record));
    return clone(record);
  }
  async createBundleWithAudit(record, event) { const stored = await this.createBundle(record); return { record: stored, auditEvent: await this.appendAudit(event) }; }
  async getBundle(bundleId, tenantId) {
    const record = this.bundles.get(bundleId);
    return record?.tenantId === tenantId ? clone(record) : undefined;
  }
  async listBundles(tenantId, { status = "all", limit = 50, before } = {}) {
    return [...this.bundles.values()]
      .filter((item) => item.tenantId === tenantId && (status === "all" || item.status === status) && (!before || item.createdAt < before))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.bundleId.localeCompare(left.bundleId))
      .slice(0, limit).map(clone);
  }
  async transitionBundle(bundleId, tenantId, expectedStatus, patch) {
    const current = await this.getBundle(bundleId, tenantId);
    if (!current) return undefined;
    if (current.status !== expectedStatus) throw Object.assign(new Error(`Bundle is ${current.status}; expected ${expectedStatus}`), { status: 409 });
    const updated = { ...current, ...clone(patch), updatedAt: new Date().toISOString() };
    this.bundles.set(bundleId, updated);
    return clone(updated);
  }
  async transitionBundleWithAudit(bundleId, tenantId, expectedStatus, patch, event) {
    const record = await this.transitionBundle(bundleId, tenantId, expectedStatus, patch);
    if (!record) return undefined;
    return { record, auditEvent: await this.appendAudit(event) };
  }

  async appendAudit(event) {
    const previousDigest = this.audit.findLast((item) => item.tenantId === event.tenantId)?.eventDigest || null;
    const unsigned = { eventId: event.eventId || randomUUID(), ...clone(event), previousDigest };
    const stored = { ...unsigned, eventDigest: sha256(unsigned) };
    this.audit.push(stored);
    return clone(stored);
  }

  async listAudit(tenantId, limit = 100) {
    return this.audit.filter((item) => item.tenantId === tenantId).slice(-limit).reverse().map(clone);
  }
}

export class PostgresControlPlaneStore {
  constructor(pool) { this.pool = pool; }

  static async connect({ connectionString, ssl, ca }) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : undefined, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    await pool.query("SELECT 1");
    return new PostgresControlPlaneStore(pool);
  }

  async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('palo-hub-schema-migrations'))");
      await client.query("CREATE TABLE IF NOT EXISTS palo_hub_schema_migrations (version text PRIMARY KEY, migration_digest text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
      const existing = await client.query("SELECT migration_digest FROM palo_hub_schema_migrations WHERE version = $1", [INITIAL_MIGRATION_VERSION]);
      if (existing.rows[0] && existing.rows[0].migration_digest !== INITIAL_MIGRATION_DIGEST) throw new Error("Applied control-plane migration digest does not match the repository migration");
      if (!existing.rows[0]) {
        await client.query(INITIAL_MIGRATION_SQL);
        await client.query("INSERT INTO palo_hub_schema_migrations (version, migration_digest) VALUES ($1, $2)", [INITIAL_MIGRATION_VERSION, INITIAL_MIGRATION_DIGEST]);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async close() { await this.pool.end(); }
  async health() {
    const started = Date.now();
    await this.pool.query("SELECT 1");
    let schemaCurrent = false;
    try {
      const result = await this.pool.query("SELECT migration_digest FROM palo_hub_schema_migrations WHERE version = $1", [INITIAL_MIGRATION_VERSION]);
      schemaCurrent = result.rows[0]?.migration_digest === INITIAL_MIGRATION_DIGEST;
    } catch (error) { if (error.code !== "42P01") throw error; }
    return { driver: "postgresql", reachable: true, durable: true, schemaCurrent, rowLevelSecurity: schemaCurrent, migrationVersion: schemaCurrent ? INITIAL_MIGRATION_VERSION : undefined, latencyMs: Date.now() - started };
  }

  async withTenant(tenantId, operation) {
    if (!tenantId) throw new Error("A tenant identifier is required for a row-level-security transaction");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('palo.tenant_id', $1, true)", [tenantId]);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async putLoginTransaction(transaction) {
    await this.pool.query("INSERT INTO palo_hub_login_transactions VALUES ($1, $2, $3)", [transaction.stateHash, transaction, transaction.expiresAt]);
  }
  async takeLoginTransaction(stateHash) {
    const result = await this.pool.query("DELETE FROM palo_hub_login_transactions WHERE state_hash = $1 AND expires_at > now() RETURNING transaction_json", [stateHash]);
    return result.rows[0]?.transaction_json;
  }
  async putSession(session) {
    await this.pool.query("INSERT INTO palo_hub_sessions VALUES ($1, $2, $3, $4, $5)", [session.sessionHash, session, session.principal.tenantId, session.principal.subject, session.expiresAt]);
  }
  async getSession(sessionHash) {
    const result = await this.pool.query("SELECT session_json FROM palo_hub_sessions WHERE session_hash = $1 AND expires_at > now()", [sessionHash]);
    return result.rows[0]?.session_json;
  }
  async deleteSession(sessionHash) { await this.pool.query("DELETE FROM palo_hub_sessions WHERE session_hash = $1", [sessionHash]); }
  async purgeExpired() {
    const transactions = await this.pool.query("DELETE FROM palo_hub_login_transactions WHERE expires_at <= now()");
    const sessions = await this.pool.query("DELETE FROM palo_hub_sessions WHERE expires_at <= now()");
    return { transactions: transactions.rowCount, sessions: sessions.rowCount };
  }
  async putSimulation(record) {
    await this.withTenant(record.tenantId, (client) => client.query("INSERT INTO palo_hub_simulations VALUES ($1, $2, $3, $4, $5, $6)", [record.receiptId, record.tenantId, record.actorId, record.inputDigest, record, record.createdAt]));
  }
  async putSimulationWithAudit(record, event) {
    return this.withTenant(record.tenantId, async (client) => {
      await client.query("INSERT INTO palo_hub_simulations VALUES ($1, $2, $3, $4, $5, $6)", [record.receiptId, record.tenantId, record.actorId, record.inputDigest, record, record.createdAt]);
      return { record, auditEvent: await this.appendAuditUsing(client, event) };
    });
  }
  async getSimulation(receiptId, tenantId) {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query("SELECT record_json FROM palo_hub_simulations WHERE receipt_id = $1 AND tenant_id = $2", [receiptId, tenantId]);
      return result.rows[0]?.record_json;
    });
  }
  async createBundle(record) {
    try { await this.withTenant(record.tenantId, (client) => client.query("INSERT INTO palo_hub_bundles VALUES ($1, $2, $3, $4, $5, $6, $6)", [record.bundleId, record.tenantId, record.inputDigest, record.status, record, record.createdAt]));
    } catch (error) {
      if (error.code === "23505") throw Object.assign(new Error("A current bundle already exists for this input digest"), { status: 409 });
      throw error;
    }
    return record;
  }
  async createBundleWithAudit(record, event) {
    try {
      return await this.withTenant(record.tenantId, async (client) => {
        await client.query("INSERT INTO palo_hub_bundles VALUES ($1, $2, $3, $4, $5, $6, $6)", [record.bundleId, record.tenantId, record.inputDigest, record.status, record, record.createdAt]);
        return { record, auditEvent: await this.appendAuditUsing(client, event) };
      });
    } catch (error) {
      if (error.code === "23505") throw Object.assign(new Error("A current bundle already exists for this input digest"), { status: 409 });
      throw error;
    }
  }
  async getBundle(bundleId, tenantId) {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query("SELECT record_json FROM palo_hub_bundles WHERE bundle_id = $1 AND tenant_id = $2", [bundleId, tenantId]);
      return result.rows[0]?.record_json;
    });
  }
  async listBundles(tenantId, { status = "all", limit = 50, before } = {}) {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query("SELECT record_json FROM palo_hub_bundles WHERE tenant_id = $1 AND ($2 = 'all' OR status = $2) AND ($3::timestamptz IS NULL OR created_at < $3::timestamptz) ORDER BY created_at DESC, bundle_id DESC LIMIT $4", [tenantId, status, before || null, limit]);
      return result.rows.map((row) => row.record_json);
    });
  }
  async transitionBundle(bundleId, tenantId, expectedStatus, patch) {
    return this.withTenant(tenantId, async (client) => {
      const selected = await client.query("SELECT record_json FROM palo_hub_bundles WHERE bundle_id = $1 AND tenant_id = $2 FOR UPDATE", [bundleId, tenantId]);
      const current = selected.rows[0]?.record_json;
      if (!current) return undefined;
      if (current.status !== expectedStatus) throw Object.assign(new Error(`Bundle is ${current.status}; expected ${expectedStatus}`), { status: 409 });
      const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
      await client.query("UPDATE palo_hub_bundles SET status = $3, record_json = $4, updated_at = $5 WHERE bundle_id = $1 AND tenant_id = $2", [bundleId, tenantId, updated.status, updated, updated.updatedAt]);
      return updated;
    });
  }
  async transitionBundleWithAudit(bundleId, tenantId, expectedStatus, patch, event) {
    return this.withTenant(tenantId, async (client) => {
      const selected = await client.query("SELECT record_json FROM palo_hub_bundles WHERE bundle_id = $1 AND tenant_id = $2 FOR UPDATE", [bundleId, tenantId]);
      const current = selected.rows[0]?.record_json;
      if (!current) return undefined;
      if (current.status !== expectedStatus) throw Object.assign(new Error(`Bundle is ${current.status}; expected ${expectedStatus}`), { status: 409 });
      const record = { ...current, ...patch, updatedAt: new Date().toISOString() };
      await client.query("UPDATE palo_hub_bundles SET status = $3, record_json = $4, updated_at = $5 WHERE bundle_id = $1 AND tenant_id = $2", [bundleId, tenantId, record.status, record, record.updatedAt]);
      return { record, auditEvent: await this.appendAuditUsing(client, event) };
    });
  }
  async appendAuditUsing(client, event) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`palo-hub-audit-chain:${event.tenantId}`]);
    const latest = await client.query("SELECT event_digest FROM palo_hub_audit_events ORDER BY sequence DESC LIMIT 1");
    const previousDigest = latest.rows[0]?.event_digest || null;
    const unsigned = { eventId: event.eventId || randomUUID(), ...event, previousDigest };
    const stored = { ...unsigned, eventDigest: sha256(unsigned) };
    await client.query("INSERT INTO palo_hub_audit_events (event_id, tenant_id, actor_id, action, target_id, event_json, previous_digest, event_digest, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [stored.eventId, stored.tenantId, stored.actorId, stored.action, stored.targetId || null, stored, previousDigest, stored.eventDigest, stored.createdAt]);
    return stored;
  }
  async appendAudit(event) {
    return this.withTenant(event.tenantId, async (client) => {
      return this.appendAuditUsing(client, event);
    });
  }
  async listAudit(tenantId, limit = 100) {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query("SELECT event_json FROM palo_hub_audit_events WHERE tenant_id = $1 ORDER BY sequence DESC LIMIT $2", [tenantId, Math.max(1, Math.min(limit, 500))]);
      return result.rows.map((row) => row.event_json);
    });
  }
}

export async function createControlPlaneStore(config) {
  if (config.databaseUrl) return PostgresControlPlaneStore.connect({ connectionString: config.databaseUrl, ssl: config.databaseSsl, ca: config.databaseCa });
  if (config.mode !== "development") throw new Error("PostgreSQL is required outside development");
  return new MemoryControlPlaneStore();
}
