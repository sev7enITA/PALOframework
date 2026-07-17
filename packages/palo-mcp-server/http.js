#!/usr/bin/env node
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { GovernanceRuntime } from "./core.js";
import { createPaloMcpServer } from "./server.js";

function authorized(header, token) {
  const actual = Buffer.from(header || ""); const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseAllowedHosts(value) {
  return [...new Set(String(value || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean))];
}

export function createAuthenticatedMcpApp({ runtime, token, host = "127.0.0.1", allowedHosts = [], exposedTools }) {
  if (!token || Buffer.byteLength(token) < 24) throw new Error("PALO_MCP_HTTP_TOKEN must contain at least 24 bytes");
  if (["0.0.0.0", "::"].includes(host) && allowedHosts.length === 0) throw new Error("PALO_MCP_ALLOWED_HOSTS is required when MCP binds to a non-local interface");
  const app = createMcpExpressApp({ host, ...(allowedHosts.length ? { allowedHosts } : {}) });
  app.get("/health", (_request, response) => response.json({ status: "ok", service: "palo-mcp-streamable-http", version: "2.4.1", releaseStatus: "developer-preview", productionUse: false }));
  app.all("/mcp", async (request, response) => {
    if (!authorized(request.headers.authorization, token)) return response.status(401).set("WWW-Authenticate", "Bearer").json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
    if (request.method !== "POST") return response.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
    const server = createPaloMcpServer(runtime, { exposedTools });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      if (!response.headersSent) response.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
    } finally {
      response.on("close", async () => { await transport.close(); await server.close(); });
    }
  });
  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.PALO_MCP_HTTP_TOKEN;
  const host = process.env.PALO_MCP_HTTP_HOST || "127.0.0.1";
  const port = Number(process.env.PALO_MCP_HTTP_PORT || 8788);
  const allowedHosts = parseAllowedHosts(process.env.PALO_MCP_ALLOWED_HOSTS);
  const exposedTools = parseAllowedHosts(process.env.PALO_MCP_EXPOSED_TOOLS);
  const runtime = new GovernanceRuntime();
  const app = createAuthenticatedMcpApp({ runtime, token, host, allowedHosts, exposedTools: exposedTools.length ? exposedTools : undefined });
  const listener = app.listen(port, host, () => process.stderr.write(`PALO-AI DEVELOPER PREVIEW listening on http://${host}:${port}/mcp — isolated testing only; not a production authorization boundary.\n`));
  const shutdown = () => listener.close(() => { runtime.close(); process.exit(0); });
  process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
}
