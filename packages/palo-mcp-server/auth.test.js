import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client, InsufficientScopeError, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import {
  TOOL_SCOPE_REQUIREMENTS,
  authorizedToolNames,
  createPaloAuth,
  hasScope,
  isHttpResponse,
  oidcConfigurationFromEnvironment
} from "./auth.js";
import { GovernanceRuntime } from "./core.js";
import { createAuthenticatedMcpApp, listenMcpApp } from "./http.js";

test("HTTP responses are recognized across Fetch implementation realms", () => {
  assert.equal(isHttpResponse(new Response(null, { status: 401 })), true);
  assert.equal(isHttpResponse({
    status: 401,
    headers: { get() {} },
    async arrayBuffer() { return new ArrayBuffer(0); }
  }), true);
  assert.equal(isHttpResponse({ clientId: "palo-client", scopes: [] }), false);
});

async function oidcFixture(t) {
  const issuer = "https://identity.example.test";
  const audience = "https://governance.example.test/mcp";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = "palo-test-key";
  jwk.use = "sig";
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "public, max-age=60" });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const sign = (claims = {}, protectedHeader = {}) => new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid, ...protectedHeader })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(claims.sub || "reviewer-42")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  const signExpired = (claims = {}, protectedHeader = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid, ...protectedHeader })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(claims.sub || "reviewer-42")
      .setIssuedAt(now - 600)
      .setExpirationTime(now - 300)
      .sign(privateKey);
  };
  return {
    issuer,
    audience,
    sign,
    signExpired,
    oidc: { issuer, audience, resourceUrl: audience, jwksUri: `http://127.0.0.1:${port}/jwks`, algorithms: ["RS256"] }
  };
}

test("data-assurance tools are covered by explicit least-privilege scopes", () => {
  const expected = {
    palo_explain_framework: "palo:guide",
    palo_infer_governance_route: "palo:guide",
    palo_plan_product_integration: "palo:guide",
    palo_list_knowledge_sources: "palo:knowledge:read",
    palo_search_knowledge: "palo:knowledge:read",
    palo_get_knowledge_record: "palo:knowledge:read",
    palo_submit_knowledge_draft: "palo:knowledge:write",
    palo_list_knowledge_drafts: "palo:knowledge:write",
    palo_get_knowledge_draft: "palo:knowledge:write",
    palo_review_knowledge_draft: "palo:knowledge:review",
    palo_import_context_evidence: "palo:admin",
    palo_list_context_evidence: "palo:read",
    palo_register_data_fitness_policy: "palo:admin",
    palo_evaluate_data_fitness: "palo:execute",
    palo_get_data_fitness_decision: "palo:read",
    palo_register_disclosure_contract: "palo:admin",
    palo_get_disclosure_contract: "palo:read",
    palo_register_ai_system: "palo:admin",
    palo_get_ai_system: "palo:read",
    palo_list_ai_systems: "palo:read",
    palo_ingest_assurance_signal: "palo:admin",
    palo_list_assurance_signals: "palo:audit"
  };
  for (const [tool, scope] of Object.entries(expected)) assert.equal(TOOL_SCOPE_REQUIREMENTS[tool], scope);
  assert.equal(Object.keys(TOOL_SCOPE_REQUIREMENTS).length, 45);
});

test("knowledge scopes filter Reader and Curator least-privilege catalogs", () => {
  const reader = { scopes: ["palo:guide", "palo:knowledge:read"] };
  assert.deepEqual(authorizedToolNames(reader).sort(), [
    "palo_explain_framework",
    "palo_get_knowledge_record",
    "palo_infer_governance_route",
    "palo_list_knowledge_sources",
    "palo_plan_product_integration",
    "palo_search_knowledge"
  ]);
  const curator = { scopes: ["palo:guide", "palo:knowledge:read", "palo:knowledge:write", "palo:knowledge:review"] };
  const curatorTools = authorizedToolNames(curator);
  assert.equal(curatorTools.length, 10);
  assert.ok(curatorTools.includes("palo_submit_knowledge_draft"));
  assert.ok(curatorTools.includes("palo_review_knowledge_draft"));
  assert.ok(!curatorTools.includes("palo_execute_governed_action"));
});

test("OIDC access tokens are issuer/audience bound and roles expand to least-privilege scopes", async (t) => {
  const fixture = await oidcFixture(t);
  const auth = createPaloAuth({ oidc: fixture.oidc });
  const token = await fixture.sign({ azp: "palo-review-ui", roles: ["palo-reviewer"], scope: "palo:audit" });
  const result = await auth.authenticate(new Request(fixture.audience, { headers: { authorization: `Bearer ${token}` } }));
  assert.ok(!(result instanceof Response));
  assert.equal(result.clientId, "palo-review-ui");
  assert.equal(result.extra.subject, "reviewer-42");
  assert.ok(hasScope(result.scopes, "palo:review"));
  assert.ok(hasScope(result.scopes, "palo:audit"));
  assert.ok(!hasScope(result.scopes, "palo:execute"));
  const tools = authorizedToolNames(result);
  assert.ok(tools.includes("palo_resolve_approval"));
  assert.ok(tools.includes("palo_verify_ledger"));

  const expiredToken = await fixture.signExpired({ azp: "palo-review-ui", roles: ["palo-reviewer"] });
  const expiredResult = await auth.authenticate(new Request(fixture.audience, {
    headers: { authorization: `Bearer ${expiredToken}` }
  }));
  assert.ok(expiredResult instanceof Response);
  assert.equal(expiredResult.status, 401);
  assert.ok(!tools.includes("palo_execute_governed_action"));
});

test("OIDC tenant binding supports an explicitly configured claim name", async (t) => {
  const fixture = await oidcFixture(t);
  const auth = createPaloAuth({ oidc: { ...fixture.oidc, tenantClaim: "org_id" } });
  const token = await fixture.sign({ azp: "palo-tenant-client", scope: "palo:read", org_id: "tenant-configured" });
  const result = await auth.authenticate(new Request(fixture.audience, { headers: { authorization: `Bearer ${token}` } }));
  assert.ok(!(result instanceof Response));
  assert.equal(result.extra.tenantId, "tenant-configured");
});

test("strict OIDC policy binds access-token type, configured client and tenant", async (t) => {
  const fixture = await oidcFixture(t);
  const strictOidc = {
    ...fixture.oidc,
    tokenType: "at+jwt",
    allowedClientIds: ["approved-reader"],
    allowedTenantIds: ["tenant-a"]
  };
  const auth = createPaloAuth({ oidc: strictOidc });
  const requestFor = (token) => new Request(fixture.audience, { headers: { authorization: `Bearer ${token}` } });

  const valid = await auth.authenticate(requestFor(await fixture.sign({
    azp: "approved-reader",
    tid: "tenant-a",
    scope: "palo:guide palo:knowledge:read"
  }, { typ: "at+jwt" })));
  assert.ok(!(valid instanceof Response));
  assert.equal(valid.clientId, "approved-reader");
  assert.equal(valid.extra.tenantId, "tenant-a");

  for (const token of [
    await fixture.sign({ azp: "approved-reader", tid: "tenant-a", scope: "palo:*" }),
    await fixture.sign({ azp: "wrong-client", tid: "tenant-a", scope: "palo:*" }, { typ: "at+jwt" }),
    await fixture.sign({ sub: "approved-reader", tid: "tenant-a", scope: "palo:*" }, { typ: "at+jwt" }),
    await fixture.sign({ azp: "approved-reader", tid: "wrong-tenant", scope: "palo:*" }, { typ: "at+jwt" }),
    await fixture.sign({ azp: "approved-reader", tid: ["tenant-a"], scope: "palo:*" }, { typ: "at+jwt" })
  ]) {
    const result = await auth.authenticate(requestFor(token));
    assert.ok(result instanceof Response);
    assert.equal(result.status, 401);
  }

  const customClaimsAuth = createPaloAuth({
    oidc: {
      ...fixture.oidc,
      clientIdClaim: "appid",
      tenantClaim: "org_id",
      allowedClientIds: ["custom-client"],
      allowedTenantIds: ["custom-tenant"]
    }
  });
  const customClaims = await customClaimsAuth.authenticate(requestFor(await fixture.sign({
    appid: "custom-client",
    org_id: "custom-tenant",
    scope: "palo:guide"
  })));
  assert.ok(!(customClaims instanceof Response));
  assert.equal(customClaims.clientId, "custom-client");
  assert.equal(customClaims.extra.tenantId, "custom-tenant");

  const wrongClaimNames = await customClaimsAuth.authenticate(requestFor(await fixture.sign({
    azp: "custom-client",
    tid: "custom-tenant",
    scope: "palo:guide"
  })));
  assert.ok(wrongClaimNames instanceof Response);
  assert.equal(wrongClaimNames.status, 401);
});

test("OIDC rejects a token minted for another MCP audience and advertises resource metadata", async (t) => {
  const fixture = await oidcFixture(t);
  const auth = createPaloAuth({ oidc: fixture.oidc });
  const token = await new SignJWT({ azp: "wrong-audience-client", scope: "palo:*" })
    .setProtectedHeader({ alg: "RS256", kid: "untrusted-key" })
    .setIssuer(fixture.issuer)
    .setAudience("https://another-resource.example.test")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign((await generateKeyPair("RS256")).privateKey);
  const result = await auth.authenticate(new Request(fixture.audience, { headers: { authorization: `Bearer ${token}` } }));
  assert.ok(result instanceof Response);
  assert.equal(result.status, 401);
  assert.match(result.headers.get("www-authenticate"), /resource_metadata=/);
  assert.equal(auth.metadata.authorization_servers[0], fixture.issuer);
  assert.deepEqual(auth.metadata.bearer_methods_supported, ["header"]);
});

test("OIDC configuration rejects insecure remote metadata and supports an exact audience distinct from the resource URL", () => {
  assert.throws(() => createPaloAuth({ oidc: {
    issuer: "http://identity.example.test",
    audience: "https://governance.example.test/mcp",
    resourceUrl: "https://governance.example.test/mcp",
    jwksUri: "https://identity.example.test/jwks"
  } }), /HTTPS/);
  const distinctAudience = createPaloAuth({ oidc: {
    issuer: "https://identity.example.test",
    audience: "11111111-2222-3333-4444-555555555555",
    resourceUrl: "https://governance.example.test/mcp",
    jwksUri: "https://identity.example.test/jwks"
  } });
  assert.equal(distinctAudience.metadata.resource, "https://governance.example.test/mcp");
  assert.equal(oidcConfigurationFromEnvironment({ PALO_AUTH_MODE: "shared-token", PALO_OIDC_ISSUER: "https://identity.example.test" }), undefined);
  assert.equal(oidcConfigurationFromEnvironment({
    PALO_AUTH_MODE: "oidc",
    PALO_OIDC_ISSUER: "https://identity.example.test",
    PALO_OIDC_AUDIENCE: "https://governance.example.test/mcp",
    PALO_OIDC_JWKS_URI: "https://identity.example.test/jwks",
    PALO_MCP_PUBLIC_URL: "https://governance.example.test/mcp",
    PALO_OIDC_TENANT_CLAIM: "org_id",
    PALO_OIDC_TOKEN_TYPE: "at+jwt",
    PALO_OIDC_ADVERTISED_SCOPES: "https://governance.example.test/mcp/palo:guide https://governance.example.test/mcp/palo:knowledge:read",
    PALO_OIDC_ALLOWED_CLIENT_IDS: "client-a,client-b",
    PALO_OIDC_ALLOWED_TENANTS: "tenant-a tenant-b"
  }).tenantClaim, "org_id");
  const strict = oidcConfigurationFromEnvironment({
    PALO_AUTH_MODE: "oidc",
    PALO_OIDC_ISSUER: "https://identity.example.test",
    PALO_OIDC_AUDIENCE: "https://governance.example.test/mcp",
    PALO_OIDC_JWKS_URI: "https://identity.example.test/jwks",
    PALO_MCP_PUBLIC_URL: "https://governance.example.test/mcp",
    PALO_OIDC_TOKEN_TYPE: "at+jwt",
    PALO_OIDC_ADVERTISED_SCOPES: "https://governance.example.test/mcp/palo:guide https://governance.example.test/mcp/palo:knowledge:read",
    PALO_OIDC_ALLOWED_CLIENT_IDS: "client-a,client-b",
    PALO_OIDC_ALLOWED_TENANTS: "tenant-a tenant-b"
  });
  assert.equal(strict.tokenType, "at+jwt");
  assert.deepEqual(strict.advertisedScopes, [
    "https://governance.example.test/mcp/palo:guide",
    "https://governance.example.test/mcp/palo:knowledge:read"
  ]);
  assert.deepEqual(strict.allowedClientIds, ["client-a", "client-b"]);
  assert.deepEqual(strict.allowedTenantIds, ["tenant-a", "tenant-b"]);
  assert.throws(() => oidcConfigurationFromEnvironment({ PALO_AUTH_MODE: "anonymous" }), /oidc or shared-token/);
});

test("OIDC scopes filter the MCP catalog and produce a step-up challenge for protected tools", async (t) => {
  const fixture = await oidcFixture(t);
  const token = await fixture.sign({ azp: "palo-observer-ui", roles: ["palo-observer"], tid: "tenant-a" });
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-oidc-http-"));
  const runtime = new GovernanceRuntime({ dataDir });
  const app = createAuthenticatedMcpApp({ runtime, oidc: fixture.oidc });
  const { listener, port } = await new Promise((resolve) => {
    const listener = listenMcpApp(app, { port: 0, host: "127.0.0.1" }, (info) => resolve({ listener, port: info.port }));
  });
  t.after(async () => {
    await app.closeMcp();
    await new Promise((resolve) => listener.close(resolve));
    runtime.close();
    await rm(dataDir, { recursive: true, force: true });
  });
  const metadata = await fetch(`http://127.0.0.1:${port}/.well-known/oauth-protected-resource/mcp`).then((response) => response.json());
  assert.equal(metadata.resource, fixture.audience);
  const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
    onInsufficientScope: "throw"
  });
  const client = new Client({ name: "palo-oidc-scope-test", version: "1.0.0" }, { versionNegotiation: { mode: { pin: "2026-07-28" } } });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const expected = Object.entries(TOOL_SCOPE_REQUIREMENTS)
      .filter(([, scope]) => ["palo:guide", "palo:read"].includes(scope))
      .map(([name]) => name)
      .sort();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), expected);
    await assert.rejects(
      () => client.callTool({ name: "palo_execute_governed_action", arguments: {} }),
      (error) => error instanceof InsufficientScopeError && error.requiredScope === "palo:execute"
    );
    const ownTenant = await client.callTool({
      name: "palo_list_context_evidence",
      arguments: { tenantId: "tenant-a", subjectType: "dataset", subjectId: "dataset-empty" }
    });
    assert.equal(ownTenant.isError, undefined);
    assert.deepEqual(ownTenant.structuredContent, []);
    const crossTenant = await client.callTool({
      name: "palo_list_context_evidence",
      arguments: { tenantId: "tenant-b", subjectType: "dataset", subjectId: "dataset-empty" }
    });
    assert.equal(crossTenant.isError, true);
    assert.match(crossTenant.content[0].text, /OIDC tenant does not match/i);
  } finally {
    await client.close();
  }
});
