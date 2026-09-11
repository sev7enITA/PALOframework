#!/usr/bin/env node
import { loadCopilotConfig } from "./config.js";
import { createCopilotStore } from "./store.js";

const config = loadCopilotConfig();
if (!config.databaseUrl) throw new Error("PALO_COPILOT_DATABASE_URL is required for durable session migration");
const store = await createCopilotStore(config);
try { await store.migrate(); process.stdout.write("PALO Knowledge Copilot session schema is current.\n"); }
finally { await store.close(); }
