#!/usr/bin/env node
import { loadControlPlaneDatabaseConfig } from "./config.js";
import { PostgresControlPlaneStore } from "./store.js";

const database = loadControlPlaneDatabaseConfig();
const store = await PostgresControlPlaneStore.connect(database);
try {
  await store.migrate();
  const applicationRole = String(process.env.PALO_HUB_DATABASE_APPLICATION_ROLE || "").trim();
  if (process.env.PALO_HUB_MODE === "production" && !applicationRole) throw new Error("PALO_HUB_DATABASE_APPLICATION_ROLE is required for production migration");
  if (applicationRole) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(applicationRole)) throw new Error("PALO_HUB_DATABASE_APPLICATION_ROLE is not a safe PostgreSQL identifier");
    await store.pool.query(`GRANT USAGE ON SCHEMA public TO ${applicationRole}`);
    await store.pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON palo_hub_login_transactions, palo_hub_sessions, palo_hub_simulations, palo_hub_bundles, palo_hub_audit_events TO ${applicationRole}`);
    await store.pool.query(`GRANT SELECT ON palo_hub_schema_migrations TO ${applicationRole}`);
    await store.pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${applicationRole}`);
  }
  const health = await store.health();
  if (!health.schemaCurrent) throw new Error("Control-plane schema did not reach the expected migration digest");
  process.stdout.write(`${JSON.stringify({ migrated: true, driver: health.driver, migrationVersion: health.migrationVersion, rowLevelSecurity: health.rowLevelSecurity, applicationRoleGranted: Boolean(applicationRole) })}\n`);
} finally { await store.close(); }
