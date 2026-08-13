#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GovernanceRuntime } from "./core.js";
import { createPaloMcpServer, parseExposedTools } from "./server.js";
import { loadEnforcementProviderFromEnvironment } from "./providers/from-environment.js";

const enforcementProvider = await loadEnforcementProviderFromEnvironment();
const runtime = new GovernanceRuntime({ enforcementProvider });
const exposedTools = parseExposedTools(process.env.PALO_MCP_EXPOSED_TOOLS);
const server = createPaloMcpServer(runtime, { exposedTools: exposedTools.length ? exposedTools : undefined });
process.stderr.write("PALO-AI v2.5 FULL-CYCLE DEVELOPER PREVIEW - isolated testing only; not a production authorization or execution boundary.\n");
await server.connect(new StdioServerTransport());
process.on("exit", () => runtime.close());
