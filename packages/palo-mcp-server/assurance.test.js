import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GovernanceRuntime, sha256 } from "./core.js";

const argumentSchema = {
  type: "object",
  required: ["tenantId", "itemId", "newPrice", "expectedVersion"],
  properties: {
    tenantId: { const: "tenant-a" }, itemId: { const: "item-1" }, newPrice: { type: "number", minimum: 0 }, expectedVersion: { type: "integer", minimum: 1 }
  },
  additionalProperties: false
};

const profile = {
  format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId: "agent-catalog-demo", status: "active",
  identity: { role: "Catalog agent", lineage: "demo.catalog.agent", baseModel: "demo-model", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0.1 },
  authority: { allowedTools: ["catalog_update"], allowedOperations: ["update"], externalNetwork: false, allowedNetworkHosts: [], readScopes: ["/tenants/tenant-a/items/*"], writeScopes: ["/tenants/tenant-a/items/*"], requireVibeGate: false, argumentSchemas: { catalog_update: argumentSchema } },
  delegation: { maxDepth: 0, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: false },
  evidence: { keyId: "key-catalog-demo", algorithm: "HMAC-SHA256", auditTrailId: "ledger-catalog-demo", redactFields: [] }
};

const executorManifest = { format: "palo-agentic-executor", schemaVersion: "1.0.0", executorId: "executor-catalog-demo", version: "1.0.0", status: "active", supportedTools: ["catalog_update"], supportsIdempotency: true };
const verifierManifest = { format: "palo-agentic-verifier", schemaVersion: "1.0.0", verifierId: "verifier-catalog-demo", version: "1.0.0", status: "active", supportedResources: ["catalog:item"] };

function makeClaim(sequenceNumber = 1, { expectedVersion = 3, newPrice = 120 } = {}) {
  const requestedAt = new Date().toISOString(); const argumentsValue = { tenantId: "tenant-a", itemId: "item-1", newPrice, expectedVersion };
  return {
    format: "palo-agentic-action-claim", schemaVersion: "1.2.0", claimId: `claim-${crypto.randomUUID()}`, agentId: profile.agentId, caseId: "case-catalog-demo",
    action: { tool: "catalog_update", operation: "update", resource: "catalog:item", path: "/tenants/tenant-a/items/item-1", networkIntent: "none", arguments: argumentsValue, argumentsDigest: sha256(argumentsValue), argumentSchemaDigest: sha256(argumentSchema) },
    requestedScopes: { read: ["/tenants/tenant-a/items/item-1"], write: ["/tenants/tenant-a/items/item-1"] }, externalNetwork: false,
    delegation: { depth: 0, subagentCount: 0 }, requestedAt, expiresAt: new Date(Date.now() + 60000).toISOString(), nonce: crypto.randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${crypto.randomUUID()}`, sequenceNumber,
    effectContract: {
      format: "palo-agentic-effect-contract", schemaVersion: "1.0.0", effectContractId: `effect-${crypto.randomUUID()}`,
      resourceSelector: { resource: "catalog:item", path: "/tenants/tenant-a/items/item-1", tenantId: "tenant-a" },
      preconditions: [{ predicateId: "predicate-version-current", path: "/version", operator: "equals", value: expectedVersion }],
      expectedEffects: [{ predicateId: "predicate-price-updated", path: "/price", operator: "changedTo", value: newPrice }],
      forbiddenEffects: [{ predicateId: "predicate-tenant-changed", path: "/tenantId", operator: "changedTo", value: "tenant-b" }],
      verification: { windowSeconds: 30, onInconclusive: "hold_and_review", maxAttempts: 1 }
    },
    metadata: { tenantId: "tenant-a" }
  };
}

async function allowPolicy(input) {
  if (!input.profile.authority.allowedTools.includes(input.claim.action.tool)) return { status: "denied", reasons: ["tool denied"], obligations: [] };
  return { status: "allowed", reasons: ["within registered authority"], obligations: ["verify_declared_effects"] };
}

async function runtimeFixture(t, { wrongEffect = false, verifierUnavailable = false } = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-assurance-"));
  const state = { tenantId: "tenant-a", itemId: "item-1", price: 100, version: 3 }; let executions = 0;
  const executor = async ({ arguments: args, resourceVersion }) => {
    executions += 1;
    if (String(state.version) !== String(resourceVersion)) { const error = new Error("optimistic concurrency conflict"); error.unknownOutcome = false; throw error; }
    state.price = wrongEffect ? args.newPrice + 10 : args.newPrice; state.version += 1;
    return { updated: true, version: state.version };
  };
  const verifier = async ({ phase }) => {
    if (verifierUnavailable && phase === "post") throw new Error("catalog read API unavailable");
    return { state: structuredClone(state), resourceVersion: String(state.version) };
  };
  const runtime = new GovernanceRuntime({ dataDir, keys: { "key-catalog-demo": "unit-test-catalog-secret-32-bytes-minimum" }, policyEvaluator: allowPolicy, executors: { [executorManifest.executorId]: executor }, verifiers: { [verifierManifest.verifierId]: verifier } });
  t.after(() => { runtime.close(); return rm(dataDir, { recursive: true, force: true }); });
  await runtime.registerAgent("case-catalog-demo", profile); runtime.registerExecutor(executorManifest); runtime.registerVerifier(verifierManifest);
  return { runtime, state, executions: () => executions };
}

test("full-cycle assurance signs the trusted receipt and verifies the intended effect", async (t) => {
  const { runtime, executions } = await runtimeFixture(t); const claim = makeClaim();
  const result = await runtime.executeGovernedAction(claim, { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "verified"); assert.equal(result.executed, true); assert.equal(executions(), 1);
  assert.equal(runtime.verifySignedContract("palo-agentic-execution-receipt", result.receipt), true);
  assert.equal(runtime.verifySignedContract("palo-agentic-outcome-attestation", result.attestation), true);
  const retry = await runtime.executeGovernedAction(claim, { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(retry.executionId, result.executionId); assert.equal(executions(), 1);
  assert.equal((await runtime.verifyLedger()).valid, true);
});

test("stale authoritative state fails the Effect Contract before tool execution", async (t) => {
  const { runtime, state, executions } = await runtimeFixture(t); state.version = 4;
  const result = await runtime.executeGovernedAction(makeClaim(), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "denied"); assert.match(result.reason, /preconditions/i); assert.equal(executions(), 0);
});

test("authorized but wrong execution becomes a held assurance incident", async (t) => {
  const { runtime } = await runtimeFixture(t, { wrongEffect: true });
  const result = await runtime.executeGovernedAction(makeClaim(), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "review_required"); assert.equal(result.attestation.status, "mismatch"); assert.equal(result.incident.status, "open"); assert.equal(result.incident.resourceHold, true);
  const resolved = await runtime.resolveIncident(result.incident.incidentId, "resolved", "reviewer@example.org", "Catalog corrected through a separately governed action");
  assert.equal(resolved.status, "resolved"); assert.equal(resolved.resourceHold, false);
});

test("unavailable authoritative post-state is inconclusive and never verified", async (t) => {
  const { runtime } = await runtimeFixture(t, { verifierUnavailable: true });
  const result = await runtime.executeGovernedAction(makeClaim(), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "review_required"); assert.equal(result.attestation.status, "inconclusive"); assert.equal(result.incident.severity, "medium");
});

test("governed execution revalidates the current authority profile instead of reusing a cached allow", async (t) => {
  const { runtime, executions } = await runtimeFixture(t); const claim = makeClaim();
  const firstDecision = await runtime.verifyAction(claim);
  assert.equal(firstDecision.status, "allowed");
  const inactive = structuredClone(profile); inactive.status = "inactive";
  runtime.db.prepare("UPDATE profiles SET status = 'inactive', profile_json = ? WHERE case_id = ? AND agent_id = ? AND is_current = 1").run(JSON.stringify(inactive), claim.caseId, claim.agentId);
  const result = await runtime.executeGovernedAction(claim, { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "denied"); assert.match(result.decision.reasons.join(" "), /not active/i); assert.equal(executions(), 0);
});

test("an expired one-time capability is persisted as expired even when consumption fails", async (t) => {
  const { runtime, state } = await runtimeFixture(t); const claim = makeClaim();
  const decision = await runtime.verifyAction(claim); const capability = runtime.issueExecutionCapability(claim, decision, executorManifest.executorId, verifierManifest.verifierId);
  capability.expiresAt = new Date(Date.now() - 1000).toISOString();
  const expired = runtime.signContract("palo-agentic-execution-capability", capability, "unit-test-catalog-secret-32-bytes-minimum");
  runtime.db.prepare("UPDATE execution_capabilities SET capability_json = ? WHERE capability_id = ?").run(JSON.stringify(expired), capability.capabilityId);
  assert.throws(() => runtime.consumeCapabilityAndCreateExecution(expired, claim, decision, state, state.version), /expired before consumption/i);
  assert.equal(runtime.db.prepare("SELECT status FROM execution_capabilities WHERE capability_id = ?").get(capability.capabilityId).status, "expired");
});

test("startup recovery turns an unfinished outbox entry into an unknown receipt and held review", async (t) => {
  const { runtime, state, executions } = await runtimeFixture(t); const claim = makeClaim();
  const decision = await runtime.verifyAction(claim); const capability = runtime.issueExecutionCapability(claim, decision, executorManifest.executorId, verifierManifest.verifierId);
  const pending = runtime.consumeCapabilityAndCreateExecution(capability, claim, decision, structuredClone(state), String(state.version));
  const result = await runtime.recoverPendingExecutions({ olderThanMs: 0 });
  assert.equal(result.recovered, 1); assert.equal(result.executions[0].executionId, pending.executionId); assert.equal(result.executions[0].receipt.status, "unknown");
  assert.equal(result.executions[0].status, "review_required"); assert.equal(result.executions[0].attestation.status, "inconclusive"); assert.equal(result.executions[0].incident.resourceHold, true); assert.equal(executions(), 0);
});

test("startup recovery completes post-state verification when a receipt was recorded before interruption", async (t) => {
  const { runtime, executions } = await runtimeFixture(t); const claim = makeClaim();
  const verifyOutcome = runtime.verifyOutcome.bind(runtime);
  runtime.verifyOutcome = async () => ({ status: "verification_deferred" });
  const deferred = await runtime.executeGovernedAction(claim, { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(deferred.status, "verification_deferred"); assert.equal(executions(), 1);
  runtime.verifyOutcome = verifyOutcome;
  const result = await runtime.recoverPendingExecutions({ olderThanMs: 0 });
  assert.equal(result.recovered, 1); assert.equal(result.executions[0].status, "verified"); assert.equal(result.executions[0].receipt.status, "succeeded");
});
