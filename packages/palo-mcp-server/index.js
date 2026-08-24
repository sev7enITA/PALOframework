#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { GovernanceRuntime } from "./core.js";
import { createPaloMcpServer, parseExposedTools } from "./server.js";
import { loadEnforcementProviderFromEnvironment } from "./providers/from-environment.js";
import { loadProductionProfileFromEnvironment } from "./production-admission.js";

loadProductionProfileFromEnvironment();
const enforcementProvider = await loadEnforcementProviderFromEnvironment();
const runtime = new GovernanceRuntime({ enforcementProvider });
const exposedTools = parseExposedTools(process.env.PALO_MCP_EXPOSED_TOOLS);
process.stderr.write("PALO-AI v2.6 IDENTITY-BOUND DURABLE DEVELOPER PREVIEW - isolated testing only; not a production authorization or execution boundary.\n");
const handle = serveStdio(() => createPaloMcpServer(runtime, { exposedTools: exposedTools.length ? exposedTools : undefined }));
const shutdown = async () => {
  await handle.close();
  runtime.close();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => runtime.close());
