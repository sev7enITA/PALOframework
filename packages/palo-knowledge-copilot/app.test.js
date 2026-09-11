import test from "node:test";
import assert from "node:assert/strict";
import { createCopilotApp } from "./app.js";
import { MemoryCopilotStore } from "./store.js";

test("BFF keeps session and CSRF server-side and never logs the question", async () => {
  const config = {
    mode: "development", publicUrl: "http://127.0.0.1:8792", allowedOrigins: ["http://127.0.0.1:4173"],
    sessionTtlSeconds: 3600, requestMaximumBytes: 16384, rateLimitPerMinute: 100, trustProxy: false,
    developmentPrincipal: { subject: "user", tenantId: "tenant", displayName: "Test User" }
  };
  const store = new MemoryCopilotStore(); const logs = [];
  const service = {
    status: async () => ({ service: "palo-knowledge-copilot", serviceVersion: "1.0.0", mode: "development", modelProvider: "extractive", conversationPersistence: "none", mutationCapabilities: false, reader: { reachable: true, integrityVerified: true, toolCount: 6, mutationCapabilities: false } }),
    ask: async (_principal, _input, requestId) => ({ requestId, answer: "Grounded [1]", sufficiency: "partial", citations: [{ recordId: "a", sourcePath: "data/a.json" }] })
  };
  const oidc = { start: async () => "https://login.example.test", callback: async () => { throw new Error("not used"); } };
  const app = createCopilotApp({ config, store, oidc, service, logger: (entry) => logs.push(entry) });
  const origin = config.allowedOrigins[0];
  const login = await app.request("/api/copilot/auth/development", { method: "POST", headers: { origin } });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const loginBody = await login.json();
  assert.equal(loginBody.principal.displayName, "Test User");
  assert.equal(loginBody.principal.tenantId, undefined);

  const session = await app.request("/api/copilot/session", { headers: { origin, cookie } });
  assert.equal(session.status, 200);
  const sessionBody = await session.json();
  assert.equal(sessionBody.authenticated, true);
  assert.equal(sessionBody.displayName, "Test User");
  assert.equal(sessionBody.reader.toolCount, 6);
  assert.equal(sessionBody.reader.integrity, "checked");
  assert.equal(sessionBody.reader.catalogState, "checked");
  assert.equal(sessionBody.principal, undefined);

  const rejected = await app.request("/api/copilot/ask", { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify({ question: "secret board scenario" }) });
  assert.equal(rejected.status, 403);
  const accepted = await app.request("/api/copilot/ask", { method: "POST", headers: { origin, cookie, "content-type": "application/json", "x-palo-csrf": sessionBody.csrfToken }, body: JSON.stringify({ question: "secret board scenario" }) });
  assert.equal(accepted.status, 200);
  assert.ok(!JSON.stringify(logs).includes("secret board scenario"));
});

test("pre-authentication rate limiting cannot be bypassed with arbitrary session cookies", async () => {
  const config = {
    mode: "development", publicUrl: "http://127.0.0.1:8792", allowedOrigins: ["http://127.0.0.1:4173"],
    sessionTtlSeconds: 3600, requestMaximumBytes: 16384, rateLimitPerMinute: 1, trustProxy: false
  };
  const service = {
    status: async () => ({ reader: { reachable: true, integrityVerified: true, toolCount: 6, mutationCapabilities: false } })
  };
  const app = createCopilotApp({ config, store: new MemoryCopilotStore(), oidc: {}, service });
  const first = await app.request("/api/copilot/session", { headers: { cookie: "palo_copilot_session=random-one" } });
  const second = await app.request("/api/copilot/session", { headers: { cookie: "palo_copilot_session=random-two" } });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("ratelimit-remaining"), "0");
});
