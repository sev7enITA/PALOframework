import test from "node:test";
import assert from "node:assert/strict";
import {
  createConcurrencyLimiter,
  createFixedWindowRateLimiter,
  createKnowledgeReaderApp,
  listenKnowledgeReaderApp,
  parseReaderAllowedHosts,
  readerConfigurationFromEnvironment
} from "./reader-http.js";

const evaluationToken = "reader-evaluation-token-32-bytes";
const productionEnvironment = Object.freeze({
  PALO_READER_RUNTIME_MODE: "production",
  PALO_AUTH_MODE: "oidc",
  PALO_MCP_HTTP_HOST: "0.0.0.0",
  PALO_MCP_ALLOWED_HOSTS: "reader.example.test",
  PALO_MCP_ALLOWED_ORIGINS: "console.example.test",
  PALO_MCP_PUBLIC_URL: "https://reader.example.test/mcp-guide",
  PALO_OIDC_ISSUER: "https://identity.example.test",
  PALO_OIDC_AUDIENCE: "11111111-2222-3333-4444-555555555555",
  PALO_OIDC_JWKS_URI: "https://identity.example.test/jwks",
  PALO_OIDC_TOKEN_TYPE: "at+jwt",
  PALO_OIDC_ADVERTISED_SCOPES: "https://reader.example.test/mcp-guide/palo:guide https://reader.example.test/mcp-guide/palo:knowledge:read",
  PALO_OIDC_ALLOWED_CLIENT_IDS: "approved-reader-client",
  PALO_OIDC_ALLOWED_TENANTS: "tenant-a"
});

const localOidc = Object.freeze({
  issuer: "http://[::1]:9000",
  audience: "api://palo-reader-local",
  jwksUri: "http://[::1]:9000/jwks",
  resourceUrl: "http://[::1]:8788/mcp-guide"
});

test("Knowledge Reader preserves loopback OIDC and rejects listener host changes", () => {
  for (const host of ["127.0.0.2", "0:0:0:0:0:0:0:1"]) {
    const app = createKnowledgeReaderApp({ host, oidc: localOidc });
    assert.throws(
      () => listenKnowledgeReaderApp(app, { port: 0, host: "0.0.0.0" }),
      /listener host must match/i
    );
    app.closeMcp();
  }
});

test("production Knowledge Reader admission requires OIDC, HTTPS and explicit host protection", () => {
  assert.deepEqual(parseReaderAllowedHosts("Reader.Example.Test,reader.example.test"), ["reader.example.test"]);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_AUTH_MODE: "shared-token",
    PALO_MCP_HTTP_TOKEN: evaluationToken
  }), /requires PALO_AUTH_MODE=oidc/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_MCP_PUBLIC_URL: "http://reader.example.test/mcp-guide",
    PALO_OIDC_AUDIENCE: "http://reader.example.test/mcp-guide"
  }), /must use HTTPS/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_MCP_ALLOWED_HOSTS: "another.example.test"
  }), /explicitly include/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_KNOWLEDGE_WRITE_ENABLED: "true"
  }), /forbidden/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_MCP_HTTP_TOKEN: evaluationToken
  }), /PALO_MCP_HTTP_TOKEN is forbidden/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_OIDC_TOKEN_TYPE: ""
  }), /access-token type/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_OIDC_ALLOWED_CLIENT_IDS: ""
  }), /client allowlist/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_OIDC_ALLOWED_TENANTS: "*"
  }), /tenant allowlist/i);
  assert.throws(() => readerConfigurationFromEnvironment({
    ...productionEnvironment,
    PALO_OIDC_AUDIENCE: "https://reader.example.test/mcp-guide another-audience"
  }), /one exact OIDC audience/i);
  const admitted = readerConfigurationFromEnvironment(productionEnvironment);
  assert.equal(admitted.runtimeMode, "production");
  assert.equal(admitted.oidc.resourceUrl, productionEnvironment.PALO_MCP_PUBLIC_URL);
  assert.equal(admitted.oidc.audience, productionEnvironment.PALO_OIDC_AUDIENCE);
  assert.throws(() => createKnowledgeReaderApp({ ...admitted, token: evaluationToken }), /forbids shared-token/i);
  assert.throws(() => createKnowledgeReaderApp({ ...admitted, maxBodyBytes: Number.NaN }), /maximum body size/i);
  assert.throws(() => createKnowledgeReaderApp({ ...admitted, maxConcurrency: Number.NaN }), /global concurrency limit/i);
  assert.throws(() => createKnowledgeReaderApp({
    ...admitted,
    oidc: { ...admitted.oidc, allowedClientIds: [""] }
  }), /client allowlist/i);
  assert.throws(() => createKnowledgeReaderApp({
    ...admitted,
    oidc: { ...admitted.oidc, allowedTenantIds: [123] }
  }), /tenant allowlist/i);
});

test("Knowledge Reader health, authentication and body limit work without a network listener", async (t) => {
  const app = createKnowledgeReaderApp({ token: evaluationToken, allowedHosts: ["localhost"], maxBodyBytes: 4096 });
  t.after(() => app.closeMcp());
  const healthResponse = await app.request("/health", { headers: { host: "localhost" } });
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.service, "palo-knowledge-reader");
  assert.equal(health.toolCount, 6);
  assert.equal(health.mutationCapabilities, false);
  assert.equal(health.persistence, "none");
  assert.equal(health.integrityVerified, true);
  assert.equal(health.productionQualified, false);
  assert.equal(health.liveQualification, "pending");
  assert.equal(healthResponse.headers.get("cache-control"), "no-store");

  const initialize = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } }
  });
  const unauthorized = await app.request("/mcp", {
    method: "POST",
    headers: { host: "localhost", "content-type": "application/json" },
    body: initialize
  });
  assert.equal(unauthorized.status, 401);

  const tooLarge = await app.request("/mcp", {
    method: "POST",
    headers: { host: "localhost", authorization: `Bearer ${evaluationToken}`, "content-type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(5000) })
  });
  assert.equal(tooLarge.status, 413);
});

test("production Knowledge Reader publishes only its two OAuth scopes", async (t) => {
  const configuration = readerConfigurationFromEnvironment(productionEnvironment);
  const app = createKnowledgeReaderApp(configuration);
  t.after(() => app.closeMcp());
  const response = await app.request("/.well-known/oauth-protected-resource/mcp-guide", {
    headers: { host: "reader.example.test" }
  });
  assert.equal(response.status, 200);
  const metadata = await response.json();
  assert.equal(metadata.resource, "https://reader.example.test/mcp-guide");
  assert.deepEqual(metadata.scopes_supported, [
    "https://reader.example.test/mcp-guide/palo:guide",
    "https://reader.example.test/mcp-guide/palo:knowledge:read"
  ]);
  assert.equal(metadata.resource_name, "PALO Knowledge Reader");
  const browserResponse = await app.request("/.well-known/oauth-protected-resource/mcp-guide", {
    headers: { host: "reader.example.test", origin: "https://console.example.test" }
  });
  assert.equal(browserResponse.status, 200);
  const rejectedOrigin = await app.request("/.well-known/oauth-protected-resource/mcp-guide", {
    headers: { host: "reader.example.test", origin: "https://untrusted.example.test" }
  });
  assert.equal(rejectedOrigin.status, 403);
});

test("Knowledge Reader rate limiter is deterministic per authenticated client", () => {
  let current = 1_000;
  const consume = createFixedWindowRateLimiter({ limit: 2, windowMs: 60_000, now: () => current });
  assert.equal(consume("client-a").allowed, true);
  assert.equal(consume("client-a").allowed, true);
  assert.equal(consume("client-a").allowed, false);
  assert.equal(consume("client-b").allowed, true);
  current += 60_001;
  assert.equal(consume("client-a").allowed, true);
});

test("Knowledge Reader concurrency limiter bounds global and per-client work", () => {
  const limiter = createConcurrencyLimiter({ globalLimit: 2, perClientLimit: 1 });
  const first = limiter.acquire("client-a");
  assert.equal(first.acquired, true);
  assert.equal(limiter.acquire("client-a").acquired, false);
  const second = limiter.acquire("client-b");
  assert.equal(second.acquired, true);
  assert.equal(limiter.acquire("client-c").acquired, false);
  first.release();
  first.release();
  const third = limiter.acquire("client-a");
  assert.equal(third.acquired, true);
  second.release();
  third.release();
  assert.deepEqual(limiter.snapshot(), { globalActive: 0, clients: 0 });
});

test("Knowledge Reader rejects JSON-RPC batches while preserving single-message legacy compatibility", async (t) => {
  const app = createKnowledgeReaderApp({
    token: evaluationToken,
    allowedHosts: ["localhost"],
    rateLimitPerMinute: 2
  });
  t.after(() => app.closeMcp());
  const headers = {
    host: "localhost",
    authorization: `Bearer ${evaluationToken}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json"
  };
  const toolList = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };
  const batch = await app.request("/mcp", { method: "POST", headers, body: JSON.stringify([toolList, { ...toolList, id: 2 }]) });
  assert.equal(batch.status, 400);
  assert.equal((await batch.json()).error.code, -32600);

  const single = await app.request("/mcp", { method: "POST", headers, body: JSON.stringify(toolList) });
  assert.equal(single.status, 200);
  const text = await single.text();
  assert.match(text, /palo_explain_framework/);

  const exhausted = await app.request("/mcp", { method: "POST", headers, body: JSON.stringify({ ...toolList, id: 3 }) });
  assert.equal(exhausted.status, 429);
});

test("Knowledge Reader holds concurrency until the MCP response body closes", async (t) => {
  const app = createKnowledgeReaderApp({
    token: evaluationToken,
    allowedHosts: ["localhost"],
    rateLimitPerMinute: 10,
    maxConcurrency: 1,
    maxConcurrencyPerClient: 1
  });
  t.after(() => app.closeMcp());
  const headers = {
    host: "localhost",
    authorization: `Bearer ${evaluationToken}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json"
  };
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  const first = await app.request("/mcp", { method: "POST", headers, body });
  assert.equal(first.status, 200);
  const blocked = await app.request("/mcp", { method: "POST", headers, body });
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "concurrency_limit_exceeded");
  await first.text();
  const admitted = await app.request("/mcp", { method: "POST", headers, body });
  assert.equal(admitted.status, 200);
  await admitted.text();
});
