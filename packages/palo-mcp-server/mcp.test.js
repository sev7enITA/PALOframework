import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GovernanceRuntime } from "./core.js";
import { createAuthenticatedMcpApp } from "./http.js";

const expectedTools = [
  "palo_get_approval_status", "palo_get_registry", "palo_list_approvals", "palo_register_agent", "palo_register_policy",
  "palo_request_approval", "palo_resolve_approval", "palo_submit_evidence", "palo_verify_action_authority", "palo_verify_evidence", "palo_verify_ledger"
];

test("stdio MCP server advertises the complete governance toolkit", async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ["packages/palo-mcp-server/index.js"], cwd: process.cwd(), stderr: "pipe", env: { ...process.env, PALO_DATA_DIR: path.join(os.tmpdir(), `palo-stdio-${crypto.randomUUID()}`) } });
  const client = new Client({ name: "palo-stdio-contract-test", version: "1.0.0" });
  try { await client.connect(transport); const response = await client.listTools(); assert.deepEqual(response.tools.map((tool) => tool.name).sort(), expectedTools); assert.ok(response.tools.every((tool) => tool.inputSchema?.type === "object")); }
  finally { await client.close(); }
});

test("authenticated Streamable HTTP rejects anonymous clients and exposes the same MCP tools", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-http-")); const runtime = new GovernanceRuntime({ dataDir }); const token = "test-streamable-http-token-32-bytes";
  const app = createAuthenticatedMcpApp({ runtime, token }); const listener = await new Promise((resolve) => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); });
  t.after(async () => { await new Promise((resolve) => listener.close(resolve)); runtime.close(); await rm(dataDir, { recursive: true, force: true }); });
  const port = listener.address().port; const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
  const unauthorized = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "anonymous", version: "1" } } }) });
  assert.equal(unauthorized.status, 401);
  const transport = new StreamableHTTPClientTransport(endpoint, { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  const client = new Client({ name: "palo-http-contract-test", version: "1.0.0" });
  try { await client.connect(transport); const response = await client.listTools(); assert.deepEqual(response.tools.map((tool) => tool.name).sort(), expectedTools); }
  finally { await client.close(); }
});
