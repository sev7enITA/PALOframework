import test from "node:test";
import assert from "node:assert/strict";
import { GovernanceControlPlaneClient } from "./controlPlaneClient.js";

test("client keeps the control-plane URL optional and reports a static build without network", async () => {
  let requests = 0;
  const client = new GovernanceControlPlaneClient("", { fetchImpl: async () => { requests += 1; }, location: { href: "https://hub.example/", origin: "https://hub.example" } });
  assert.deepEqual(await client.boot(), { state: "static", configured: false, authenticated: false });
  assert.equal(requests, 0);
});

test("client boot distinguishes an available unauthenticated control plane", async () => {
  const calls = [];
  const client = new GovernanceControlPlaneClient("https://control.example", {
    location: { href: "https://hub.example/", origin: "https://hub.example" },
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.endsWith("/v1/capabilities")) return new Response(JSON.stringify({ mode: "production", controls: { oidc: true } }), { status: 200, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { "content-type": "application/json" } });
    }
  });
  const state = await client.boot();
  assert.equal(state.state, "unauthenticated");
  assert.equal(state.reachable, true);
  assert.equal(calls.length, 2);
});

test("authenticated writes include the in-memory CSRF token and never a gateway credential", async () => {
  let observed;
  const client = new GovernanceControlPlaneClient("https://control.example", {
    location: { href: "https://hub.example/", origin: "https://hub.example" },
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return new Response(JSON.stringify({ result: { status: "checked" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  client.csrfToken = "csrf-only";
  await client.checkConnection({ platform: "n8n self-hosted", environment: "Sandbox" });
  assert.equal(observed.options.headers["x-palo-csrf"], "csrf-only");
  assert.equal("authorization" in observed.options.headers, false);
  assert.equal(observed.options.credentials, "include");
});
