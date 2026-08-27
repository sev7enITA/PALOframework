#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createControlPlaneApp } from "./app.js";
import { AdapterRegistry } from "./adapters.js";
import { loadControlPlaneConfig } from "./config.js";
import { OidcSessionManager } from "./oidc.js";
import { GovernanceControlPlaneService } from "./service.js";
import { RemoteBundleSigner } from "./signer.js";
import { createControlPlaneStore } from "./store.js";

const config = loadControlPlaneConfig();
const store = await createControlPlaneStore(config);
if (config.runMigrations) await store.migrate();
const storageHealth = await store.health();
if (!storageHealth.schemaCurrent) throw new Error("PALO Governance Hub database schema is not current; run the explicit migration command before startup");
const adapters = new AdapterRegistry(config.adapters);
const signer = new RemoteBundleSigner(config.signer);
const oidc = new OidcSessionManager(config, store);
const service = new GovernanceControlPlaneService({ config, store, adapters, signer });
const logger = (entry) => process.stderr.write(`${JSON.stringify(entry)}\n`);
const app = createControlPlaneApp({ config, store, oidc, service, logger });
await store.purgeExpired();
const cleanup = setInterval(() => store.purgeExpired().catch((error) => process.stderr.write(`PALO Hub session cleanup failed: ${error.message}\n`)), 15 * 60 * 1000);
cleanup.unref();

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  process.stderr.write(`PALO Governance Hub control plane listening on http://${info.address}:${info.port} in ${config.mode} mode; productionUse is not inferred from availability.\n`);
});

const shutdown = () => { clearInterval(cleanup); server.close(async () => { await store.close(); process.exit(0); }); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
