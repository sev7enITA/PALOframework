import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { GovernanceRuntime } from "./core.js";
import { createAuthenticatedMcpApp, listenMcpApp, parseAllowedHosts } from "./http.js";

const listenTestApp = (app) => new Promise((resolve) => {
  const listener = listenMcpApp(app, { port: 0, host: "127.0.0.1" }, (info) => resolve({ listener, port: info.port }));
});

const expectedTools = [
  "palo_execute_governed_action", "palo_explain_framework", "palo_get_approval_status", "palo_get_assurance_task", "palo_get_execution_status", "palo_get_incident", "palo_get_operational_snapshot", "palo_get_registry", "palo_infer_governance_route", "palo_list_approvals", "palo_list_assurance_tasks", "palo_list_incidents",
  "palo_plan_product_integration",
  "palo_process_due_tasks", "palo_register_agent", "palo_register_executor", "palo_register_policy", "palo_register_verifier", "palo_request_approval", "palo_resolve_approval", "palo_resolve_incident",
  "palo_submit_evidence", "palo_verify_action_authority", "palo_verify_evidence", "palo_verify_ledger", "palo_verify_outcome"
];

test("remote MCP binding requires an explicit host allowlist", () => {
  assert.deepEqual(parseAllowedHosts("governance.example.org, localhost,governance.example.org"), ["governance.example.org", "localhost"]);
  assert.throws(() => createAuthenticatedMcpApp({ runtime: {}, token: "test-streamable-http-token-32-bytes", host: "0.0.0.0" }), /allowed_hosts/i);
  assert.throws(() => createAuthenticatedMcpApp({ runtime: {}, token: "test-streamable-http-token-32-bytes", host: "192.0.2.10" }), /allowed_hosts/i);
  assert.throws(() => createAuthenticatedMcpApp({ runtime: {}, token: "test-streamable-http-token-32-bytes", host: "203.0.113.10" }), /allowed_hosts/i);
  for (const host of ["127.0.0.1", "localhost", "LOCALHOST", "::1"]) {
    assert.doesNotThrow(() => createAuthenticatedMcpApp({ runtime: {}, token: "test-streamable-http-token-32-bytes", host }));
  }
  assert.doesNotThrow(() => createAuthenticatedMcpApp({ runtime: {}, token: "test-streamable-http-token-32-bytes", host: "192.0.2.10", allowedHosts: ["governance.example.org"] }));
});

test("remote MCP can expose a least-privilege tool subset", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-http-subset-")); const runtime = new GovernanceRuntime({ dataDir }); const token = "test-streamable-http-token-32-bytes";
  const exposedTools = ["palo_get_registry", "palo_verify_action_authority"];
  const app = createAuthenticatedMcpApp({ runtime, token, exposedTools }); const { listener, port } = await listenTestApp(app);
  t.after(async () => { await app.closeMcp(); await new Promise((resolve) => listener.close(resolve)); runtime.close(); await rm(dataDir, { recursive: true, force: true }); });
  const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
  const transport = new StreamableHTTPClientTransport(endpoint, { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  const client = new Client({ name: "palo-http-subset-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), exposedTools);
    assert.deepEqual((await client.listPrompts()).prompts, []);
  }
  finally { await client.close(); }
});

test("stdio MCP server advertises the complete governance toolkit", async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ["packages/palo-mcp-server/index.js"], cwd: process.cwd(), stderr: "pipe", env: { ...process.env, PALO_DATA_DIR: path.join(os.tmpdir(), `palo-stdio-${crypto.randomUUID()}`) } });
  const client = new Client({ name: "palo-stdio-contract-test", version: "1.0.0" }, { versionNegotiation: { mode: { pin: "2026-07-28" } } });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), expectedTools);
    assert.ok(response.tools.every((tool) => tool.inputSchema?.type === "object"));
    const prompts = await client.listPrompts();
    assert.ok(prompts.prompts.some((prompt) => prompt.name === "palo_guide_agent"));
    const guide = await client.callTool({ name: "palo_infer_governance_route", arguments: { useCase: "An agent can update a product catalog", signals: { systemCanAct: true, actionImpact: "reversible-write" } } });
    assert.equal(guide.structuredContent.integration.class, "governed-executor");
    assert.ok(guide.structuredContent.route.some((step) => step.id === "assess"));
  }
  finally { await client.close(); }
});

test("stdio MCP supports a guidance-only least-privilege allowlist", async () => {
  const exposedTools = ["palo_explain_framework", "palo_infer_governance_route", "palo_plan_product_integration"];
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["packages/palo-mcp-server/index.js"],
    cwd: process.cwd(),
    stderr: "pipe",
    env: {
      ...process.env,
      PALO_DATA_DIR: path.join(os.tmpdir(), `palo-guide-stdio-${crypto.randomUUID()}`),
      PALO_MCP_EXPOSED_TOOLS: exposedTools.join(",")
    }
  });
  const client = new Client({ name: "palo-guide-stdio-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), exposedTools);
    assert.ok(!response.tools.some((tool) => tool.name === "palo_register_agent"));
    const prompts = await client.listPrompts();
    assert.ok(prompts.prompts.some((prompt) => prompt.name === "palo_guide_agent"));
  } finally { await client.close(); }
});

test("authenticated Streamable HTTP rejects anonymous clients and exposes the same MCP tools", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-http-")); const runtime = new GovernanceRuntime({ dataDir }); const token = "test-streamable-http-token-32-bytes";
  const app = createAuthenticatedMcpApp({ runtime, token }); const { listener, port } = await listenTestApp(app);
  t.after(async () => { await app.closeMcp(); await new Promise((resolve) => listener.close(resolve)); runtime.close(); await rm(dataDir, { recursive: true, force: true }); });
  const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
  const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json());
  assert.equal(health.version, "2.6.0");
  assert.equal(health.frameworkRelease, "3.0.1");
  assert.equal(health.productionUse, false);
  const unauthorized = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "anonymous", version: "1" } } }) });
  assert.equal(unauthorized.status, 401);
  const legacy = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "legacy-contract-test", version: "1" } } })
  });
  assert.equal(legacy.status, 200);
  const legacyText = await legacy.text();
  const legacyMessage = legacyText.startsWith("event:")
    ? JSON.parse(legacyText.split("\n").find((line) => line.startsWith("data: ")).slice(6))
    : JSON.parse(legacyText);
  assert.equal(legacyMessage.result.protocolVersion, "2025-06-18");
  const requests = [];
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push({ headers: Object.fromEntries(request.headers), body: await request.clone().text() });
      return fetch(request);
    }
  });
  const client = new Client({ name: "palo-http-contract-test", version: "1.0.0" }, { versionNegotiation: { mode: { pin: "2026-07-28" } } });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), expectedTools);
    const modernToolsRequest = requests.find((request) => {
      try { return JSON.parse(request.body).method === "tools/list" && request.headers["mcp-protocol-version"] === "2026-07-28"; }
      catch { return false; }
    });
    assert.ok(modernToolsRequest, "the v2 client must negotiate the modern 2026 protocol");
    const mismatchedHeaders = new Headers(modernToolsRequest.headers);
    mismatchedHeaders.set("mcp-method", "tools/call");
    const mismatch = await fetch(endpoint, { method: "POST", headers: mismatchedHeaders, body: modernToolsRequest.body });
    assert.equal(mismatch.status, 400);
  }
  finally { await client.close(); }
});
