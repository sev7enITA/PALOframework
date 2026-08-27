import test from "node:test";
import assert from "node:assert/strict";
import { createControlPlaneApp } from "./app.js";
import { AdapterRegistry } from "./adapters.js";
import { loadControlPlaneConfig } from "./config.js";
import { sha256 } from "./crypto.js";
import { OidcSessionManager } from "./oidc.js";
import { GovernanceControlPlaneService } from "./service.js";
import { RemoteBundleSigner } from "./signer.js";
import { MemoryControlPlaneStore } from "./store.js";

const origin = "http://127.0.0.1:4173";
const adapterSecret = "adapter-secret-with-at-least-32-bytes";
const principal = {
  subject: "operator-1", tenantId: "tenant-a", displayName: "Operator One",
  roles: ["palo-admin"], scopes: ["read", "operate", "review", "publish", "audit"], issuer: "development"
};
const reviewer = {
  subject: "reviewer-1", tenantId: "tenant-a", displayName: "Reviewer One",
  roles: ["palo-reviewer"], scopes: ["read", "review"], issuer: "test"
};

function environment(overrides = {}) {
  return {
    PALO_HUB_MODE: "development",
    PALO_HUB_PUBLIC_URL: "http://127.0.0.1:8790",
    PALO_HUB_ALLOWED_ORIGINS: origin,
    PALO_HUB_DEV_PRINCIPAL_JSON: JSON.stringify(principal),
    PALO_HUB_ADAPTER_TOKEN: adapterSecret,
    PALO_HUB_ADAPTERS_JSON: JSON.stringify([{ id: "gateway-sandbox", platformId: "n8n-self-hosted", environment: "Sandbox", baseUrl: "http://127.0.0.1:8787", tokenEnvironmentVariable: "PALO_HUB_ADAPTER_TOKEN", tenantIsolation: "none" }]),
    ...overrides
  };
}

function referenceInput() {
  return {
    connection: { platform: "n8n self-hosted", environment: "Sandbox" },
    authority: { agent: "Catalog Assistant", environment: "n8n - Sandbox", tool: "Catalog Update", operation: "Update", resource: "Tenant A / Catalog items", limit: "10%", network: "None" },
    oversight: "approval",
    purpose: { objective: "Maintain accurate catalog pricing", owner: "Commerce Platform", impact: "Material operational impact" },
    effect: { precondition: "Catalog version is unchanged", expected: "Price changes to the proposed value", forbidden: "Tenant and product identity remain unchanged" }
  };
}

function adapterFetch(url, options = {}) {
  assert.equal(new URL(url).origin, "http://127.0.0.1:8787");
  assert.equal(options.headers.authorization, `Bearer ${adapterSecret}`);
  if (new URL(url).pathname === "/health") return Promise.resolve(new Response(JSON.stringify({ status: "ok", service: "palo-governance-gateway", version: "2.7.0", productionUse: false }), { status: 200, headers: { "content-type": "application/json" } }));
  return Promise.resolve(new Response(JSON.stringify({
    profiles: [{ caseId: "case-1", agentId: "agent-1", profileVersion: "1.0.0", profileDigest: "a".repeat(64), status: "active", narrative: "must not cross boundary" }],
    policies: [{ policyId: "policy-1", policyVersion: "1.0.0", bundleDigest: "b".repeat(64), status: "active" }],
    executors: [], verifiers: []
  }), { status: 200, headers: { "content-type": "application/json" } }));
}

function fixture({ logger } = {}) {
  const config = loadControlPlaneConfig(environment());
  const store = new MemoryControlPlaneStore();
  const adapters = new AdapterRegistry(config.adapters, { fetchImpl: adapterFetch });
  const signer = {
    available: () => true,
    sign: async (bundle) => ({ format: "palo-remote-signature", schemaVersion: "1.0.0", digest: sha256(bundle), keyId: "kms-test-key", algorithm: "Ed25519", signature: "test-signature", signedAt: new Date().toISOString() })
  };
  const service = new GovernanceControlPlaneService({ config, store, adapters, signer });
  const oidc = { start: async () => "https://identity.example/authorize", callback: async () => { throw new Error("not used"); } };
  const app = createControlPlaneApp({ config, store, oidc, service, logger });
  return { config, store, adapters, signer, service, app };
}

test("production configuration fails closed when mandatory control-plane dependencies are absent", () => {
  assert.throws(() => loadControlPlaneConfig({ PALO_HUB_MODE: "production", PALO_HUB_PUBLIC_URL: "https://hub.example", PALO_HUB_ALLOWED_ORIGINS: "https://hub.example" }), /incomplete/);
  assert.throws(() => loadControlPlaneConfig({ ...environment(), PALO_HUB_MODE: "production", PALO_HUB_PUBLIC_URL: "http://127.0.0.1:8790" }), /must use HTTPS/);
});

test("OpenAPI contract exposes every lifecycle route without a browser bearer scheme", async () => {
  const { app } = fixture();
  const response = await app.request("/openapi.json");
  assert.equal(response.status, 200);
  const contract = await response.json();
  assert.equal(contract.openapi, "3.1.0");
  for (const path of ["/v1/setup/connection-check", "/v1/setup/inventory", "/v1/setup/simulations", "/v1/setup/bundles", "/v1/setup/bundles/{bundleId}/review", "/v1/setup/bundles/{bundleId}/publish"]) assert.ok(contract.paths[path]);
  assert.equal(contract.components.securitySchemes.cookieAuth.in, "cookie");
  assert.doesNotMatch(JSON.stringify(contract.components.securitySchemes), /bearer/i);
});

test("complete production configuration exposes controls without claiming independent assurance", () => {
  const config = loadControlPlaneConfig(environment({
    PALO_HUB_MODE: "production", PALO_HUB_PUBLIC_URL: "https://governance.example", PALO_HUB_ALLOWED_ORIGINS: "https://governance.example",
    PALO_HUB_DATABASE_URL: "postgresql://palo:secret@database.internal/palo",
    PALO_HUB_OIDC_ISSUER: "https://identity.example", PALO_HUB_OIDC_AUTHORIZATION_ENDPOINT: "https://identity.example/authorize",
    PALO_HUB_OIDC_TOKEN_ENDPOINT: "https://identity.example/token", PALO_HUB_OIDC_JWKS_URI: "https://identity.example/jwks",
    PALO_HUB_OIDC_CLIENT_ID: "palo-hub", PALO_HUB_OIDC_AUDIENCE: "palo-hub",
    PALO_HUB_ADAPTERS_JSON: JSON.stringify([{ id: "gateway-sandbox", platformId: "n8n-self-hosted", environment: "Sandbox", baseUrl: "https://gateway.example", tokenEnvironmentVariable: "PALO_HUB_ADAPTER_TOKEN", tenantIsolation: "upstream-enforced" }]),
    PALO_HUB_SIGNER_URL: "https://signer.example/v1/sign", PALO_HUB_SIGNER_TOKEN: "signer-secret-with-at-least-32-bytes",
    PALO_HUB_STEP_UP_ACR_VALUES: "urn:example:loa:2",
    PALO_HUB_TRUST_PROXY: "true",
    PALO_HUB_DEV_PRINCIPAL_JSON: ""
  }));
  assert.equal(config.mode, "production");
  assert.equal(config.adapters.length, 1);
  assert.equal(config.developmentPrincipal, undefined);
});

test("OIDC login uses PKCE and constrains return targets to an allowlisted origin", async () => {
  const config = loadControlPlaneConfig(environment({
    PALO_HUB_OIDC_ISSUER: "https://identity.example", PALO_HUB_OIDC_AUTHORIZATION_ENDPOINT: "https://identity.example/authorize",
    PALO_HUB_OIDC_TOKEN_ENDPOINT: "https://identity.example/token", PALO_HUB_OIDC_JWKS_URI: "https://identity.example/jwks",
    PALO_HUB_OIDC_CLIENT_ID: "palo-hub", PALO_HUB_OIDC_AUDIENCE: "palo-hub"
  }));
  const store = new MemoryControlPlaneStore();
  const manager = new OidcSessionManager(config, store);
  const location = new URL(await manager.start("https://attacker.example/callback"));
  assert.equal(location.origin, "https://identity.example");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.ok(location.searchParams.get("code_challenge"));
  assert.equal([...store.transactions.values()][0].returnTo.startsWith(origin), true);
});

test("HTTP boundary requires session, exact origin and CSRF while keeping adapter secrets server-side", async () => {
  const { app } = fixture();
  const unauthenticated = await app.request("/v1/setup/connection-check", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(referenceInput().connection) });
  assert.equal(unauthenticated.status, 401);

  const login = await app.request("/auth/development", { method: "POST", headers: { origin } });
  assert.equal(login.status, 200);
  const session = await login.json();
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const missingCsrf = await app.request("/v1/setup/connection-check", { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(referenceInput().connection) });
  assert.equal(missingCsrf.status, 403);
  const rejectedOrigin = await app.request("/v1/setup/connection-check", { method: "POST", headers: { origin: "https://attacker.example", cookie, "content-type": "application/json", "x-palo-csrf": session.csrfToken }, body: JSON.stringify(referenceInput().connection) });
  assert.equal(rejectedOrigin.status, 403);

  const checked = await app.request("/v1/setup/connection-check", { method: "POST", headers: { origin, cookie, "content-type": "application/json", "x-palo-csrf": session.csrfToken }, body: JSON.stringify(referenceInput().connection) });
  assert.equal(checked.status, 200);
  const receipt = await checked.json();
  assert.equal(receipt.result.status, "checked");
  assert.equal(receipt.network.requests, 1);
  assert.equal(receipt.result.productionUse, false);
  assert.doesNotMatch(JSON.stringify(receipt), new RegExp(adapterSecret));
  assert.equal(checked.headers.get("access-control-allow-origin"), origin);
});

test("structured access logs remain query-, payload- and credential-free", async () => {
  const logs = [];
  const { app } = fixture({ logger: (entry) => logs.push(entry) });
  const login = await app.request("/auth/development?credential=must-not-be-logged", { method: "POST", headers: { origin } });
  const session = await login.json();
  const cookie = login.headers.get("set-cookie").split(";")[0];
  await app.request("/v1/setup/connection-check?token=must-not-be-logged", { method: "POST", headers: { origin, cookie, "content-type": "application/json", "x-palo-csrf": session.csrfToken }, body: JSON.stringify({ ...referenceInput().connection, injectedSecret: "must-not-be-logged" }) });
  const serialized = JSON.stringify(logs);
  assert.ok(logs.length >= 2);
  assert.doesNotMatch(serialized, /must-not-be-logged/);
  assert.doesNotMatch(serialized, new RegExp(adapterSecret));
  assert.doesNotMatch(serialized, new RegExp(session.csrfToken));
  assert.ok(logs.every((entry) => entry.requestId && entry.path && Number.isInteger(entry.status)));
  assert.ok(logs.some((entry) => entry.outcome === "rejected"));
});

test("inventory is a capped safe projection and strips upstream narrative", async () => {
  const { service } = fixture();
  const result = await service.inventory(principal, referenceInput().connection, "request-inventory");
  assert.deepEqual(result.counts, { profiles: 1, policies: 1, executors: 0, verifiers: 0 });
  assert.equal(result.inventory.profiles[0].agentId, "agent-1");
  assert.equal("narrative" in result.inventory.profiles[0], false);
  assert.equal(result.tenantIsolation, "none");
  assert.match(result.authorityBoundary, /must not be represented as tenant-scoped/);
  assert.match(result.responseDigest, /^[a-f0-9]{64}$/);
});

test("draft lifecycle enforces digest binding, separation of duties and remote signing", async () => {
  const { service, store } = fixture();
  const input = referenceInput();
  const simulation = await service.simulate(principal, input, "request-simulate");
  assert.equal(simulation.result.status, "passed");
  assert.equal(simulation.evidenceClass, "server-deterministic-simulation");
  assert.ok(simulation.boundaries.includes("No protected executor"));

  const draft = await service.createDraft(principal, { input, simulationReceiptId: simulation.actionId }, "request-draft");
  assert.equal(draft.status, "draft");
  assert.equal(draft.bundle.authoritative, false);
  const queue = await service.listBundles(principal, { status: "draft" }, "request-list");
  assert.equal(queue.count, 1);
  assert.equal(queue.items[0].bundleId, draft.bundleId);
  assert.equal("bundle" in queue.items[0], false);
  const submitted = await service.submitReview(principal, draft.bundleId, "request-submit");
  assert.equal(submitted.status, "in-review");
  await assert.rejects(() => service.review(principal, draft.bundleId, { decision: "approved", rationale: "Author must not self approve this bundle." }, "request-self-review"), /Separation of duties/);
  const approved = await service.review(reviewer, draft.bundleId, { decision: "approved", rationale: "All seven boundary scenarios and ownership fields are supported." }, "request-review");
  assert.equal(approved.status, "approved");
  const published = await service.publish(principal, draft.bundleId, "request-publish");
  assert.equal(published.status, "published");
  assert.equal(published.bundle.authoritative, true);
  assert.equal(published.bundle.publication.performed, true);
  assert.equal(published.bundle.bundleDigest, published.signature.digest);
  assert.equal(published.signature.keyId, "kms-test-key");

  const events = await store.listAudit("tenant-a", 100);
  assert.ok(events.some((event) => event.action === "bundle.publish"));
  for (const event of events) {
    const { eventDigest, ...unsigned } = event;
    assert.equal(eventDigest, sha256(unsigned));
  }
});

test("tenant boundary hides bundles from another tenant", async () => {
  const { service } = fixture();
  const input = referenceInput();
  const simulation = await service.simulate(principal, input, "request-simulate");
  const draft = await service.createDraft(principal, { input, simulationReceiptId: simulation.actionId }, "request-draft");
  const outsider = { ...principal, subject: "operator-other", tenantId: "tenant-b" };
  await assert.rejects(() => service.getBundle(outsider, draft.bundleId, "request-read"), /not found in this tenant/);
});

test("strict setup input rejects unsupported fields before persistence", async () => {
  const { service, store } = fixture();
  const input = { ...referenceInput(), hiddenAuthority: { injected: true } };
  await assert.rejects(() => service.simulate(principal, input, "request-invalid"), /unsupported fields/);
  assert.equal(store.simulations.size, 0);
});

test("production review and publication require recent step-up authentication", async () => {
  const base = fixture();
  const config = { ...base.config, mode: "production", stepUpAcrValues: ["urn:example:loa:2"], stepUpMaximumAgeSeconds: 900 };
  const service = new GovernanceControlPlaneService({ config, store: base.store, adapters: base.adapters, signer: base.signer });
  const input = referenceInput();
  const simulation = await service.simulate(principal, input, "request-simulate");
  const draft = await service.createDraft(principal, { input, simulationReceiptId: simulation.actionId }, "request-draft");
  await service.submitReview(principal, draft.bundleId, "request-submit");
  await assert.rejects(() => service.review(reviewer, draft.bundleId, { decision: "approved", rationale: "The digest and boundary scenarios were reviewed." }, "request-review"), (error) => error.code === "step_up_required");
  const strongReviewer = { ...reviewer, authenticationContext: "urn:example:loa:2", authenticatedAt: new Date().toISOString() };
  await service.review(strongReviewer, draft.bundleId, { decision: "approved", rationale: "The digest and boundary scenarios were reviewed." }, "request-review-strong");
  await assert.rejects(() => service.publish(principal, draft.bundleId, "request-publish"), (error) => error.code === "step_up_required");
  const strongPublisher = { ...principal, authenticationMethods: ["mfa"], authenticatedAt: new Date().toISOString() };
  assert.equal((await service.publish(strongPublisher, draft.bundleId, "request-publish-strong")).status, "published");
});

test("remote signer validates capped digest-bound attestations", async () => {
  const signer = new RemoteBundleSigner({ url: "https://signer.example/v1/sign", token: "signer-secret-with-at-least-32-bytes", timeoutMs: 1000 }, {
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      return new Response(JSON.stringify({ digest: request.digest, keyId: "kms-production-key-1", algorithm: "Ed25519", signature: "A".repeat(86), signedAt: new Date().toISOString(), providerAttestation: "kms-attestation-1" }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  const result = await signer.sign({ bundleId: "bundle-1" }, { tenantId: "tenant-a" });
  assert.equal(result.keyId, "kms-production-key-1");
  assert.match(result.digest, /^[a-f0-9]{64}$/);

  const mismatched = new RemoteBundleSigner({ url: "https://signer.example/v1/sign", token: "signer-secret-with-at-least-32-bytes", timeoutMs: 1000 }, { fetchImpl: async () => new Response(JSON.stringify({ digest: "0".repeat(64), keyId: "kms-production-key-1", algorithm: "Ed25519", signature: "A".repeat(86), signedAt: new Date().toISOString() }), { status: 200, headers: { "content-type": "application/json" } }) });
  await assert.rejects(() => mismatched.sign({ bundleId: "bundle-1" }, { tenantId: "tenant-a" }), /invalid or mismatched/);
});
