#!/usr/bin/env node
import assert from "node:assert/strict";

const endpoint = new URL(process.argv[2] || process.env.PALO_GUIDE_PUBLIC_URL || "https://governance.paloframework.org/mcp-guide");
const token = String(process.env.PALO_READER_TEST_ACCESS_TOKEN || "").trim();
assert.ok(token, "PALO_READER_TEST_ACCESS_TOKEN is required");

const healthUrl = new URL(endpoint);
healthUrl.pathname = /\/mcp-guide(?:\/mcp)?\/?$/.test(endpoint.pathname)
  ? endpoint.pathname.replace(/\/mcp-guide(?:\/mcp)?\/?$/, "/mcp-guide-health")
  : endpoint.pathname.replace(/\/mcp\/?$/, "/health");
const healthResponse = await fetch(healthUrl);
assert.equal(healthResponse.status, 200, "Knowledge Reader health endpoint must return HTTP 200");
const health = await healthResponse.json();
assert.equal(health.service, "palo-knowledge-reader");
assert.equal(health.frameworkRelease, "3.1.0");
assert.equal(health.releaseStatus, "production-candidate");
assert.equal(health.integrityVerified, true);
assert.equal(health.toolCount, 6);
assert.equal(health.mutationCapabilities, false);
assert.equal(health.persistence, "none");
assert.equal(health.jsonRpcBatching, "rejected");
assert.ok(Number.isInteger(health.maxConcurrency) && health.maxConcurrency >= 1 && health.maxConcurrency <= 64);
assert.ok(Number.isInteger(health.maxConcurrencyPerClient) && health.maxConcurrencyPerClient >= 1 && health.maxConcurrencyPerClient <= 8);
assert.ok(health.maxConcurrencyPerClient <= health.maxConcurrency);

const headers = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  "mcp-protocol-version": "2025-06-18"
};
const rpc = async (payload, authenticated = true) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: authenticated ? headers : { "content-type": "application/json", accept: headers.accept },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
  return { response, message: text ? JSON.parse(dataLine ? dataLine.slice(6) : text) : null };
};

const anonymous = await rpc({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "anonymous-smoke", version: "1.0.0" } }
}, false);
assert.equal(anonymous.response.status, 401, "Anonymous Knowledge Reader requests must be rejected");

const initialized = await rpc({
  jsonrpc: "2.0",
  id: 2,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "palo-reader-smoke", version: "1.0.0" } }
});
assert.equal(initialized.response.status, 200);
assert.equal(initialized.message.result.serverInfo.name, "palo-knowledge-reader");

const expectedTools = [
  "palo_explain_framework",
  "palo_get_knowledge_record",
  "palo_infer_governance_route",
  "palo_list_knowledge_sources",
  "palo_plan_product_integration",
  "palo_search_knowledge"
];
const tools = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} });
assert.equal(tools.response.status, 200);
assert.deepEqual(tools.message.result.tools.map((tool) => tool.name).sort(), expectedTools);
assert.ok(tools.message.result.tools.every((tool) => tool.annotations?.readOnlyHint === true));

const batch = await rpc([
  { jsonrpc: "2.0", id: 31, method: "tools/list", params: {} },
  { jsonrpc: "2.0", id: 32, method: "tools/list", params: {} }
]);
assert.equal(batch.response.status, 400, "JSON-RPC batches must be rejected before MCP dispatch");
assert.equal(batch.message.error.code, -32600);

const search = await rpc({
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: { name: "palo_search_knowledge", arguments: { query: "human oversight control", limit: 3 } }
});
assert.equal(search.response.status, 200);
assert.ok(search.message.result.structuredContent.matches.length > 0);
assert.ok(search.message.result.structuredContent.matches.every((record) => record.sourcePath.startsWith("data/")));

const italianSearch = await rpc({
  jsonrpc: "2.0",
  id: 5,
  method: "tools/call",
  params: { name: "palo_search_knowledge", arguments: { query: "supervisione umana", limit: 3 } }
});
assert.equal(italianSearch.response.status, 200);
assert.ok(italianSearch.message.result.structuredContent.matches.length > 0);

const unknownSearch = await rpc({
  jsonrpc: "2.0",
  id: 6,
  method: "tools/call",
  params: { name: "palo_search_knowledge", arguments: { query: "termineinventatochenonesiste", limit: 3 } }
});
assert.equal(unknownSearch.response.status, 200);
assert.deepEqual(unknownSearch.message.result.structuredContent.matches, []);

console.log(`PALO Knowledge Reader smoke passed at ${endpoint.origin}${endpoint.pathname}: integrity, OIDC, batch rejection, exact six-tool catalog and canonical/Italian fail-closed search.`);
