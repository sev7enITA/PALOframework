import assert from "node:assert/strict";

const endpoint = new URL(process.argv[2] || "https://guide-api.paloframework.org/mcp-guide");
assert.equal(endpoint.protocol, "https:", "monitor endpoint must use HTTPS");
assert.match(endpoint.pathname, /\/mcp-guide\/?$/, "monitor endpoint must be the canonical Reader resource");

const timedFetch = async (url, options = {}) => {
  const started = performance.now();
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(10_000)
  });
  return { response, latencyMs: Math.round(performance.now() - started) };
};

const healthUrl = new URL(endpoint);
healthUrl.pathname = endpoint.pathname.replace(/\/mcp-guide\/?$/, "/mcp-guide-health");
const healthResult = await timedFetch(healthUrl);
assert.equal(healthResult.response.status, 200, "health must return 200");
assert.ok(healthResult.latencyMs < 5_000, "health probe exceeded 5 seconds");
const health = await healthResult.response.json();
assert.equal(health.status, "ok");
assert.equal(health.service, "palo-knowledge-reader");
assert.equal(health.frameworkRelease, "3.1.0");
assert.equal(health.contentPolicy, "canonical-immutable-only");
assert.equal(health.integrityVerified, true);
assert.equal(health.toolCount, 6);
assert.equal(health.mutationCapabilities, false);
assert.equal(health.persistence, "none");
assert.equal(health.authentication, "oidc");
assert.equal(health.runtimeMode, "production");

const metadataUrl = new URL(endpoint);
metadataUrl.pathname = "/.well-known/oauth-protected-resource/mcp-guide";
const metadataResult = await timedFetch(metadataUrl);
assert.equal(metadataResult.response.status, 200, "OAuth metadata must return 200");
const metadata = await metadataResult.response.json();
assert.equal(metadata.resource, endpoint.href.replace(/\/$/, ""));
assert.deepEqual(metadata.bearer_methods_supported, ["header"]);
assert.ok(Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length === 1);
assert.ok(Array.isArray(metadata.scopes_supported) && metadata.scopes_supported.length === 2);

const anonymousResult = await timedFetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: "synthetic-anonymous",
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "palo-synthetic-monitor", version: "1.0.0" }
    }
  })
});
assert.equal(anonymousResult.response.status, 401, "anonymous initialize must return 401");
assert.match(anonymousResult.response.headers.get("www-authenticate") || "", /^Bearer\b/i, "401 must include a Bearer challenge");

process.stdout.write(`${JSON.stringify({
  checkedAt: new Date().toISOString(),
  endpoint: endpoint.href.replace(/\/$/, ""),
  result: "PASS",
  healthLatencyMs: healthResult.latencyMs,
  metadataLatencyMs: metadataResult.latencyMs,
  anonymousChallengeLatencyMs: anonymousResult.latencyMs,
  bundleSha256: health.bundleSha256,
  serviceVersion: health.serviceVersion
})}\n`);
