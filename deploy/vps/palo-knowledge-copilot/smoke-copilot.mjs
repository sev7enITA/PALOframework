#!/usr/bin/env node
import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "https://copilot-api.paloframework.org");
const frontendOrigin = process.argv[3] || "https://paloframework.org";

async function json(path, init = {}) {
  const response = await fetch(new URL(path, base), { redirect: "manual", ...init });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const health = await json("/health");
assert.equal(health.response.status, 200, "health must be ready");
assert.equal(health.body.status, "ok");
assert.equal(health.body.mutationCapabilities, false);
assert.equal(health.body.reader?.toolCount, 6);
assert.equal(health.body.reader?.integrityVerified, true);
assert.equal(health.body.sessionStore?.durable, true);
assert.equal(health.body.productionQualified, false);
assert.equal(health.response.headers.get("cache-control"), "no-store");
assert.match(health.response.headers.get("strict-transport-security") || "", /max-age=/);

const session = await json("/api/copilot/session", { headers: { origin: frontendOrigin } });
assert.equal(session.response.status, 200);
assert.equal(session.body.authenticated, false);
assert.equal(session.response.headers.get("access-control-allow-origin"), frontendOrigin);
assert.equal(session.response.headers.get("access-control-allow-credentials"), "true");

const anonymous = await json("/api/copilot/ask", {
  method: "POST",
  headers: { origin: frontendOrigin, "content-type": "application/json" },
  body: JSON.stringify({ question: "What is PALO?", language: "en" })
});
assert.equal(anonymous.response.status, 401);
assert.equal(anonymous.body.error, "unauthenticated");

const wrongOrigin = await fetch(new URL("/api/copilot/session", base), {
  method: "OPTIONS",
  headers: { origin: "https://not-allowed.invalid", "access-control-request-method": "POST" }
});
assert.equal(wrongOrigin.status, 403);

const oversized = await fetch(new URL("/api/copilot/ask", base), {
  method: "POST",
  headers: { origin: frontendOrigin, "content-type": "application/json" },
  body: JSON.stringify({ question: "x".repeat(20000) })
});
assert.equal(oversized.status, 413);

process.stdout.write(`${JSON.stringify({ status: "pass", base: base.origin, checked: ["health", "durable-session-store", "six-tool-reader", "security-headers", "cors", "anonymous-401", "wrong-origin-403", "oversized-413"] }, null, 2)}\n`);
