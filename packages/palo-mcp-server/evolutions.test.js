import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyEvidenceEnvelope } from "./assurance-foundation.js";
import { GovernanceRuntime, sha256 } from "./core.js";

const argumentSchema = {
  type: "object",
  required: ["newPrice"],
  properties: { newPrice: { type: "number", minimum: 0 } },
  additionalProperties: false
};

const profile = {
  format: "palo-agentic-interface",
  schemaVersion: "1.1.0",
  profileVersion: "1.0.0",
  agentId: "agent-evolution-demo",
  status: "active",
  identity: { role: "Evolution test agent", lineage: "test.evolution.agent", baseModel: "deterministic-test", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0 },
  authority: {
    allowedTools: ["catalog_update"],
    allowedOperations: ["update"],
    externalNetwork: false,
    allowedNetworkHosts: [],
    readScopes: ["/tenants/tenant-a/items/*"],
    writeScopes: ["/tenants/tenant-a/items/*"],
    requireVibeGate: false,
    argumentSchemas: { catalog_update: argumentSchema }
  },
  delegation: { maxDepth: 1, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: false },
  evidence: { keyId: "key-evolution-demo", algorithm: "HMAC-SHA256", auditTrailId: "ledger-evolution-demo", redactFields: [] }
};

const executorManifest = { format: "palo-agentic-executor", schemaVersion: "1.0.0", executorId: "executor-evolution-demo", version: "1.0.0", status: "active", supportedTools: ["catalog_update"], supportsIdempotency: true };
const verifierManifest = { format: "palo-agentic-verifier", schemaVersion: "1.0.0", verifierId: "verifier-evolution-demo", version: "1.0.0", status: "active", supportedResources: ["catalog:item"] };
const secret = "unit-test-evolution-secret-material-32-bytes";

function makeClaim(sequenceNumber = 1, { delay = 0 } = {}) {
  const requestedAt = new Date().toISOString();
  const actionArguments = { newPrice: 120 };
  return {
    format: "palo-agentic-action-claim",
    schemaVersion: "1.3.0",
    claimId: `claim-${randomUUID()}`,
    agentId: profile.agentId,
    caseId: "case-evolution-demo",
    action: {
      tool: "catalog_update",
      operation: "update",
      resource: "catalog:item",
      path: "/tenants/tenant-a/items/item-1",
      networkIntent: "none",
      arguments: actionArguments,
      argumentsDigest: sha256(actionArguments),
      argumentSchemaDigest: sha256(argumentSchema)
    },
    requestedScopes: { read: ["/tenants/tenant-a/items/item-1"], write: ["/tenants/tenant-a/items/item-1"] },
    externalNetwork: false,
    delegation: { depth: 1, subagentCount: 0, parentAgentId: "agent-human-principal" },
    authorityContext: {
      authorityContextId: `authority-${randomUUID()}`,
      humanPrincipal: { subject: "user:release-owner@example.org", issuer: "https://identity.example.org", authenticatedAt: requestedAt, credentialDigest: `sha256:${"b".repeat(64)}` },
      workloadIdentity: { subject: "spiffe://example.org/palo/runtime", issuer: "https://workload.example.org", audience: "palo-governance", proofType: "spiffe-svid", credentialDigest: `sha256:${"c".repeat(64)}` },
      agentIdentity: { agentId: profile.agentId, instanceId: "agent-instance-evolution-1" },
      tenantId: "tenant-a",
      delegationChain: [{
        delegationId: `delegation-${randomUUID()}`,
        from: "user:release-owner@example.org",
        to: profile.agentId,
        scopes: { read: ["/tenants/tenant-a/items/item-1"], write: ["/tenants/tenant-a/items/item-1"] },
        issuedAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 120000).toISOString()
      }]
    },
    requestedAt,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    nonce: randomUUID().replaceAll("-", ""),
    idempotencyKey: `idem-${randomUUID()}`,
    sequenceNumber,
    effectContract: {
      format: "palo-agentic-effect-contract",
      schemaVersion: "1.1.0",
      effectContractId: `effect-${randomUUID()}`,
      resourceSelector: { resource: "catalog:item", path: "/tenants/tenant-a/items/item-1", tenantId: "tenant-a" },
      preconditions: [{ predicateId: "predicate-version", path: "/version", operator: "numberWithin", minimum: 3, maximum: 3 }],
      expectedEffects: [
        { predicateId: "predicate-price", path: "/price", operator: "numberWithin", minimum: 120, maximum: 120 },
        { predicateId: "predicate-tags", path: "/tags", operator: "containsAll", values: ["governed", "verified"] },
        { predicateId: "predicate-shape", path: "", operator: "typeIs", expectedType: "object" }
      ],
      forbiddenEffects: [{ predicateId: "predicate-secret", path: "/secret", operator: "exists" }],
      verification: { windowSeconds: 300, onInconclusive: "retry_then_review", maxAttempts: 2, initialDelaySeconds: delay, retryBackoffSeconds: 5 },
      recovery: { onMismatch: "propose_compensation", compensationAction: { tool: "catalog_update", operation: "update", resource: "catalog:item", path: "/tenants/tenant-a/items/item-1" } }
    },
    metadata: { tenantId: "tenant-a", traceparent: "00-11111111111111111111111111111111-2222222222222222-01" }
  };
}

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-evolutions-"));
  const state = { tenantId: "tenant-a", price: 100, version: 3, tags: ["governed"] };
  const events = [];
  let remainingVerifierFailures = options.verifierFailures || 0;
  const runtime = new GovernanceRuntime({
    dataDir,
    keys: { "key-evolution-demo": secret },
    policyEvaluator: options.policyEvaluator || (async () => ({ status: "allowed", reasons: ["test allow"], obligations: [] })),
    identityPolicy: { audience: "palo-governance", trustedHumanIssuers: ["https://identity.example.org"], trustedWorkloadIssuers: ["https://workload.example.org"] },
    authorityVerifier: options.disableAuthorityVerifier ? undefined : options.authorityVerifier || (async () => ({ valid: true, verifierId: "test-credential-verifier", evidenceDigest: `sha256:${"d".repeat(64)}` })),
    guardrails: options.guardrails,
    telemetry: (event) => events.push(event),
    evidenceSigning: options.evidenceSigning,
    executors: { [executorManifest.executorId]: async ({ arguments: input }) => { state.price = input.newPrice; state.version += 1; state.tags = ["governed", "verified"]; return { version: state.version }; } },
    verifiers: { [verifierManifest.verifierId]: async ({ phase }) => {
      if (phase === "post" && remainingVerifierFailures > 0) { remainingVerifierFailures -= 1; throw new Error("authoritative source temporarily unavailable"); }
      return { state: structuredClone(state), resourceVersion: String(state.version) };
    } }
  });
  t.after(() => { runtime.close(); return rm(dataDir, { recursive: true, force: true }); });
  await runtime.registerAgent("case-evolution-demo", profile);
  runtime.registerExecutor(executorManifest);
  runtime.registerVerifier(verifierManifest);
  return { runtime, state, events };
}

test("Action Claim 1.3 binds trusted human, workload, agent, tenant and delegation scope", async (t) => {
  const { runtime } = await fixture(t);
  const allowed = await runtime.verifyAction(makeClaim(1));
  assert.equal(allowed.status, "allowed");
  const expiredDelegation = makeClaim(2);
  expiredDelegation.authorityContext.delegationChain[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  const denied = await runtime.verifyAction(expiredDelegation);
  assert.equal(denied.status, "denied");
  assert.match(denied.reasons.join(" "), /full live claim window/i);
  const { runtime: unverifiedRuntime } = await fixture(t, { disableAuthorityVerifier: true });
  const unverified = await unverifiedRuntime.verifyAction(makeClaim(1));
  assert.equal(unverified.status, "denied");
  assert.match(unverified.reasons.join(" "), /cryptographic authority verifier/i);
});

test("approval work is represented by a durable task with a terminal resolution", async (t) => {
  const { runtime } = await fixture(t, { policyEvaluator: async (input) => input.approval?.status === "approved" ? { status: "allowed", reasons: ["approved"], obligations: [] } : { status: "pending_approval", reasons: ["review"], obligations: [] } });
  const claim = makeClaim(1);
  const pending = await runtime.verifyAction(claim);
  const tasks = await runtime.listTasks({ taskType: "approval", status: "input_required" });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].subjectId, pending.approvalId);
  await runtime.resolveApproval(pending.approvalId, "approved", "reviewer@example.org", "Exact claim reviewed");
  const completed = await runtime.getTask(tasks[0].taskId);
  assert.equal(completed.status, "completed");
  assert.equal(completed.result.status, "approved");
});

test("Effect Contract 1.1 schedules and completes delayed authoritative verification", async (t) => {
  const { runtime } = await fixture(t);
  const result = await runtime.executeGovernedAction(makeClaim(1, { delay: 60 }), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "verification_pending");
  assert.equal(result.task.status, "queued");
  const early = await runtime.verifyOutcome(result.executionId);
  assert.equal(early.status, "verification_pending");
  runtime.transitionTask(result.task.taskId, "queued", { availableAt: new Date(Date.now() - 1000).toISOString() });
  const processed = await runtime.processDueTasks();
  assert.equal(processed.processed, 1);
  assert.equal(processed.tasks[0].status, "completed");
  assert.equal(processed.tasks[0].result.attestation.status, "verified");
});

test("inconclusive verification retries durably and releases the hold after authoritative success", async (t) => {
  const { runtime } = await fixture(t, { verifierFailures: 1 });
  const result = await runtime.executeGovernedAction(makeClaim(1, { delay: 60 }), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  runtime.transitionTask(result.task.taskId, "queued", { availableAt: new Date(Date.now() - 1000).toISOString() });
  const firstAttempt = await runtime.processDueTasks();
  assert.equal(firstAttempt.tasks[0].status, "queued");
  assert.equal(firstAttempt.tasks[0].attempts, 1);
  assert.equal(firstAttempt.tasks[0].result.incident.status, "open");
  runtime.transitionTask(result.task.taskId, "queued", { availableAt: new Date(Date.now() - 1000).toISOString() });
  const secondAttempt = await runtime.processDueTasks();
  assert.equal(secondAttempt.tasks[0].status, "completed");
  assert.equal(secondAttempt.tasks[0].result.status, "verified");
  assert.equal(secondAttempt.tasks[0].result.incident.status, "resolved");
});

test("Evidence Envelope 2.0 is Ed25519 signed and independently verifiable", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signing = {
    keyId: "key-evolution-ed25519",
    verificationMethod: "https://identity.example.org/keys/evolution-ed25519",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: publicKey.export({ type: "spki", format: "pem" })
  };
  const { runtime } = await fixture(t, { evidenceSigning: signing });
  await runtime.verifyAction(makeClaim(1));
  const envelope = JSON.parse(runtime.db.prepare("SELECT envelope_json FROM evidence ORDER BY ledger_sequence DESC LIMIT 1").get().envelope_json);
  assert.equal(envelope.schemaVersion, "2.0.0");
  assert.equal(envelope.algorithm, "Ed25519");
  assert.equal(runtime.verifyEvidence(envelope), true);
  assert.equal(verifyEvidenceEnvelope(envelope, { publicKeys: { [signing.keyId]: signing.publicKey } }), true);
  assert.equal(verifyEvidenceEnvelope({ ...envelope, outcome: "denied" }, { publicKeys: { [signing.keyId]: signing.publicKey } }), false);
});

test("telemetry, rate guardrails and the operational snapshot remain non-authoritative and observable", async (t) => {
  const { runtime, events } = await fixture(t, { guardrails: { maxActionsPerMinute: 1, maxConcurrentExecutionsPerAgent: 1, maxDelegationDepth: 1 } });
  assert.equal((await runtime.verifyAction(makeClaim(1))).status, "allowed");
  const denied = await runtime.verifyAction(makeClaim(2));
  assert.equal(denied.status, "denied");
  assert.match(denied.reasons.join(" "), /claims per minute/i);
  assert.ok(events.some((event) => event.name === "palo.policy.decision"));
  assert.ok(events.every((event) => event.attributes.traceId));
  const snapshot = await runtime.getOperationalSnapshot();
  assert.equal(snapshot.guardrails.maxActionsPerMinute, 1);
  assert.equal(snapshot.evidenceLedger.valid, true);
});
