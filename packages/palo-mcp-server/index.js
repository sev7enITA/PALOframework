#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GovernanceRuntime } from "./core.js";
import { createPaloMcpServer } from "./server.js";

const runtime = new GovernanceRuntime();
const server = createPaloMcpServer(runtime);
process.stderr.write("PALO-AI v2.4.1 DEVELOPER PREVIEW — isolated testing only; not a production authorization or execution boundary.\n");
await server.connect(new StdioServerTransport());
process.on("exit", () => runtime.close());
