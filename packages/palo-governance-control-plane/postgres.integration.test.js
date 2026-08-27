import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PostgresControlPlaneStore } from "./store.js";

const databaseUrl = process.env.PALO_HUB_TEST_DATABASE_URL;

test("PostgreSQL migration is digest-bound and RLS denies cross-tenant access", { skip: !databaseUrl }, async () => {
  const administrator = await PostgresControlPlaneStore.connect({ connectionString: databaseUrl, ssl: false });
  const suffix = randomUUID().replaceAll("-", "");
  const role = `palo_app_${suffix}`;
  const password = `password-${suffix}`;
  try {
    await administrator.migrate();
    const health = await administrator.health();
    assert.equal(health.driver, "postgresql");
    assert.equal(health.schemaCurrent, true);
    assert.equal(health.rowLevelSecurity, true);
    await administrator.pool.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
    await administrator.pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await administrator.pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await administrator.pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    const appUrl = new URL(databaseUrl);
    appUrl.username = role;
    appUrl.password = password;
    const store = await PostgresControlPlaneStore.connect({ connectionString: appUrl.href, ssl: false });
    try {
      const createdAt = new Date().toISOString();
      const record = (tenantId, bundleId) => ({ bundleId, tenantId, inputDigest: `${tenantId}-digest-${suffix}`, status: "draft", authorId: `${tenantId}-author`, reviewerId: null, bundle: { bundleId }, signature: null, createdAt, updatedAt: createdAt });
      const tenantABundleId = `bundle-tenant-a-${suffix}`;
      const tenantBBundleId = `bundle-tenant-b-${suffix}`;
      await store.createBundle(record("tenant-a", tenantABundleId));
      await store.createBundle(record("tenant-b", tenantBBundleId));
      assert.equal((await store.getBundle(tenantABundleId, "tenant-a")).tenantId, "tenant-a");
      assert.equal(await store.getBundle(tenantABundleId, "tenant-b"), undefined);
      const unbound = await store.pool.query("SELECT count(*)::int AS count FROM palo_hub_bundles");
      assert.equal(unbound.rows[0].count, 0);
      const tenantRows = await store.withTenant("tenant-a", (client) => client.query("SELECT tenant_id FROM palo_hub_bundles ORDER BY bundle_id"));
      assert.ok(tenantRows.rows.every((row) => row.tenant_id === "tenant-a"));
      assert.ok(tenantRows.rows.some((row) => row.tenant_id === "tenant-a"));
    } finally { await store.close(); }
  } finally {
    await administrator.pool.query(`DROP OWNED BY ${role}`).catch(() => {});
    await administrator.pool.query(`DROP ROLE IF EXISTS ${role}`).catch(() => {});
    await administrator.close();
  }
});
