#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createCopilotApp } from "./app.js";
import { loadCopilotConfig } from "./config.js";
import { createGrounder } from "./model.js";
import { CopilotOidcManager } from "./oidc.js";
import { PaloReaderClient } from "./reader-client.js";
import { PaloKnowledgeCopilotService } from "./service.js";
import { createCopilotStore } from "./store.js";
import { createReaderTokenProvider } from "./token-provider.js";

const config = loadCopilotConfig();
const store = await createCopilotStore(config);
if (config.runMigrations) await store.migrate();
const storageHealth = await store.health();
if (!storageHealth.schemaCurrent) throw new Error("PALO Knowledge Copilot session schema is not current; run the explicit migration command");
const tokenProvider = createReaderTokenProvider(config.reader);
const reader = new PaloReaderClient({ ...config.reader, timeoutMs: config.readerTimeoutMs, responseMaximumBytes: config.readerResponseMaximumBytes }, tokenProvider);
const grounder = createGrounder(config.model);
const service = new PaloKnowledgeCopilotService({ config, reader, grounder });
const oidc = new CopilotOidcManager(config, store);
const app = createCopilotApp({ config, store, oidc, service, logger: (entry) => process.stderr.write(`${JSON.stringify(entry)}\n`) });
await store.purgeExpired();
const cleanup = setInterval(() => store.purgeExpired().catch((error) => process.stderr.write(`Copilot session cleanup failed: ${error.message}\n`)), 15 * 60 * 1000);
cleanup.unref();

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  process.stderr.write(`PALO Knowledge Copilot listening on http://${info.address}:${info.port} in ${config.mode} mode; production qualification is not inferred from availability.\n`);
});
const shutdown = () => { clearInterval(cleanup); server.close(async () => { await store.close(); process.exit(0); }); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
