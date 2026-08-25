import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GovernanceRuntime, sha256 } from "./core.js";
import { evaluateDataDisclosureContract, evaluateDataFitnessPolicy, mapActianContextSnapshot } from "./data-assurance.js";

const secret = "unit-test-data-assurance-secret-32-bytes-minimum";
const tenantId = "tenant-a";
const subject = { type: "dataset", id: "actian:asset/customer-orders" };
const purpose = "support-analytics";
const argumentSchema = {
  type: "object",
  required: ["tenantId", "datasetId", "question"],
  properties: {
    tenantId: { const: tenantId },
    datasetId: { const: subject.id },
    question: { type: "string", minLength: 1 }
  },
  additionalProperties: false
};
const profile = {
  format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId: "agent-data-reader", status: "active",
  identity: { role: "Data analytics agent", lineage: "test.data.reader", baseModel: "deterministic-summary-v1", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0 },
  authority: {
    allowedTools: ["actian_query"], allowedOperations: ["read"], externalNetwork: true, allowedNetworkHosts: ["analytics.internal.example.org"],
    readScopes: ["/tenants/tenant-a/datasets/*"], writeScopes: [], requireVibeGate: false, argumentSchemas: { actian_query: argumentSchema }
  },
  delegation: { maxDepth: 1, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: false },
  evidence: { keyId: "key-data-assurance", algorithm: "HMAC-SHA256", auditTrailId: "ledger-data-assurance", redactFields: ["rawRows"] }
};
const executorManifest = { format: "palo-agentic-executor", schemaVersion: "1.0.0", executorId: "executor-actian-query", version: "1.0.0", status: "active", supportedTools: ["actian_query"], supportsIdempotency: true };
const verifierManifest = { format: "palo-agentic-verifier", schemaVersion: "1.0.0", verifierId: "verifier-actian-query", version: "1.0.0", status: "active", supportedResources: ["data:dataset"] };

function timestamps() {
  const now = Date.now();
  return {
    observedAt: new Date(now - 1000).toISOString(),
    effectiveAt: new Date(now - 1000).toISOString(),
    evidenceExpiry: new Date(now + 3600000).toISOString(),
    contractExpiry: new Date(now + 1800000).toISOString()
  };
}

function makeObservation({ mismatch = false } = {}) {
  return {
    format: "palo-data-disclosure-observation", schemaVersion: "1.0.0", sourceRefs: [subject.id],
    fieldsRead: mismatch ? ["order_status", "country", "email"] : ["order_status", "country"], rowsRead: 1000,
    egressFields: mismatch ? ["email"] : [], egressRows: mismatch ? 1 : 0,
    sensitiveCategories: mismatch ? ["personal-data"] : [], redactionsApplied: [],
    destination: { recipient: "support-agent", provider: mismatch ? "anthropic" : "local-rules", model: mismatch ? "claude" : "deterministic-summary-v1", region: mismatch ? "us-east-1" : "eu-west-1", endpointHost: mismatch ? "api.anthropic.com" : "analytics.internal.example.org" },
    trace: { mode: "metadata-only", retentionSeconds: 3600 }, exported: false,
    queryDigest: `sha256:${"b".repeat(64)}`, payloadDigest: `sha256:${"c".repeat(64)}`, observedAt: new Date().toISOString()
  };
}

function makeClaim(sequenceNumber, fitnessDecision, disclosureContract) {
  const requestedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 120000).toISOString();
  const actionArguments = { tenantId, datasetId: subject.id, question: "Summarize order status by country" };
  return {
    format: "palo-agentic-action-claim", schemaVersion: "1.4.0", claimId: `claim-${crypto.randomUUID()}`, agentId: profile.agentId, caseId: "case-data-assurance",
    action: { tool: "actian_query", operation: "read", resource: "data:dataset", path: "/tenants/tenant-a/datasets/customer-orders", networkIntent: "read", networkHost: "analytics.internal.example.org", arguments: actionArguments, argumentsDigest: sha256(actionArguments), argumentSchemaDigest: sha256(argumentSchema) },
    requestedScopes: { read: ["/tenants/tenant-a/datasets/customer-orders"], write: [] }, externalNetwork: true,
    delegation: { depth: 1, subagentCount: 0 },
    authorityContext: {
      authorityContextId: `authority-${crypto.randomUUID()}`,
      humanPrincipal: { subject: "user:data-owner@example.org", issuer: "https://identity.example.org", authenticatedAt: requestedAt, credentialDigest: `sha256:${"d".repeat(64)}` },
      workloadIdentity: { subject: "spiffe://example.org/palo/data-reader", issuer: "https://workload.example.org", audience: "palo-governance", proofType: "spiffe-svid", credentialDigest: `sha256:${"e".repeat(64)}` },
      agentIdentity: { agentId: profile.agentId, instanceId: "data-reader-instance-1" }, tenantId,
      delegationChain: [{
        delegationId: `delegation-${crypto.randomUUID()}`,
        from: "user:data-owner@example.org", to: profile.agentId,
        scopes: { read: ["/tenants/tenant-a/datasets/customer-orders"], write: [] },
        issuedAt: new Date(Date.parse(requestedAt) - 1000).toISOString(),
        expiresAt: new Date(Date.parse(expiresAt) + 60000).toISOString()
      }]
    },
    requestedAt, expiresAt, nonce: crypto.randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${crypto.randomUUID()}`, sequenceNumber,
    effectContract: {
      format: "palo-agentic-effect-contract", schemaVersion: "1.1.0", effectContractId: `effect-${crypto.randomUUID()}`,
      resourceSelector: { resource: "data:dataset", path: "/tenants/tenant-a/datasets/customer-orders", tenantId },
      preconditions: [{ predicateId: "predicate-dataset-available", path: "/available", operator: "equals", value: true }],
      expectedEffects: [{ predicateId: "predicate-query-count", path: "/queryCount", operator: "deltaWithin", minimumDelta: 1, maximumDelta: 1 }],
      forbiddenEffects: [{ predicateId: "predicate-source-mutated", path: "/mutated", operator: "changedTo", value: true }],
      verification: { windowSeconds: 60, onInconclusive: "hold_and_review", maxAttempts: 1 }, recovery: { onMismatch: "hold_and_review" }
    },
    dataGovernance: {
      subject, purpose, fitnessDecisionId: fitnessDecision.decisionId, fitnessDecisionDigest: sha256(fitnessDecision),
      disclosureContractId: disclosureContract.disclosureContractId, disclosureContractDigest: sha256(disclosureContract)
    },
    metadata: { tenantId }
  };
}

async function fixture(t, { mismatch = false, staleObservation = false } = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-data-assurance-")); const times = timestamps();
  const state = { available: true, queryCount: 0, mutated: false };
  const runtime = new GovernanceRuntime({
    dataDir, keys: { "key-data-assurance": secret },
    policyEvaluator: async () => ({ status: "allowed", reasons: ["authority and data governance bindings satisfied"], obligations: ["verify_data_disclosure"] }),
    identityPolicy: { audience: "palo-governance", trustedHumanIssuers: ["https://identity.example.org"], trustedWorkloadIssuers: ["https://workload.example.org"] },
    authorityVerifier: async () => ({ valid: true, verifierId: "test-authority-verifier", evidenceDigest: `sha256:${"f".repeat(64)}` }),
    executors: { [executorManifest.executorId]: async ({ claim }) => {
      state.queryCount += 1;
      const disclosureObservation = makeObservation({ mismatch });
      if (staleObservation) disclosureObservation.observedAt = claim.requestedAt;
      return { answer: "Synthetic summary", rawRows: [{ email: "secret-customer@example.org" }], disclosureObservation };
    } },
    verifiers: { [verifierManifest.verifierId]: async () => ({ state: structuredClone(state), resourceVersion: String(state.queryCount) }) }
  });
  t.after(() => { runtime.close(); return rm(dataDir, { recursive: true, force: true }); });
  await runtime.registerAgent("case-data-assurance", profile); runtime.registerExecutor(executorManifest); runtime.registerVerifier(verifierManifest);
  const snapshot = {
    assetId: "customer-orders", assetVersion: "42", catalogUri: "https://catalog.example.org/assets/customer-orders", observedAt: times.observedAt,
    qualityScore: 96, freshnessAt: times.observedAt, classifications: ["internal"], owner: "data-owner@example.org", approved: true,
    accessState: "granted", lineageComplete: true, permittedPurposes: [purpose], lifecycleState: "approved", incidentOpen: false,
    authorityVerified: true, sampleRows: [{ email: "must-not-be-imported@example.org" }]
  };
  const evidence = mapActianContextSnapshot(snapshot, { tenantId, subject, evidenceType: "quality", validUntil: times.evidenceExpiry });
  runtime.registerExternalEvidence(evidence);
  const fitnessPolicy = {
    format: "palo-data-fitness-policy", schemaVersion: "1.0.0", policyId: "fitness-policy-support-analytics", policyVersion: "1.0.0", tenantId,
    targetTypes: ["dataset"], requiredEvidenceTypes: ["quality"],
    requirements: { minQualityScore: 90, maxEvidenceAgeSeconds: 86400, requireVerifiedAuthority: true, requireOwner: true, requireApproved: true, requireLineage: true, requireAccessGranted: true, denyOpenIncident: true, prohibitedClassifications: ["special-category"], allowedPurposes: [purpose] },
    onMissing: "deny", effectiveAt: times.effectiveAt, status: "active"
  };
  runtime.registerDataFitnessPolicy(fitnessPolicy);
  const fitnessDecision = await runtime.evaluateDataFitness({ tenantId, subject, purpose, policyId: fitnessPolicy.policyId });
  const unsignedContract = {
    format: "palo-data-disclosure-contract", schemaVersion: "1.0.0", disclosureContractId: `disclosure-${crypto.randomUUID()}`, tenantId, subject, purpose,
    lawfulBasis: "legitimate-interests", dataScope: { sourceRefs: [subject.id], allowedFields: ["order_status", "country"], deniedFields: ["email"], maxRowsRead: 10000 },
    egressPolicy: { mode: "zero-row", maxRows: 0, allowedFields: [], prohibitedCategories: ["personal-data", "special-category"], requiredRedactions: [] },
    destinationPolicy: { allowedRecipients: ["support-agent"], allowedProviders: ["local-rules"], allowedModels: ["deterministic-summary-v1"], allowedRegions: ["eu-west-1"], allowedEndpointHosts: ["analytics.internal.example.org"] },
    tracePolicy: { allowedModes: ["metadata-only"], maxRetentionSeconds: 86400 }, outputPolicy: { exportAllowed: false },
    boundFitnessDecision: { decisionId: fitnessDecision.decisionId, decisionDigest: sha256(fitnessDecision) }, approvedBy: "privacy-owner@example.org",
    issuedAt: new Date().toISOString(), expiresAt: times.contractExpiry, status: "active", keyId: "key-data-assurance", algorithm: "HMAC-SHA256"
  };
  const disclosureContract = runtime.signContract("palo-data-disclosure-contract", unsignedContract, secret);
  runtime.registerDisclosureContract(disclosureContract);
  const aiSystem = {
    format: "palo-ai-system-record", schemaVersion: "1.0.0", systemId: "ai-system-support-analytics", recordVersion: "1.0.0", tenantId,
    name: "Support analytics agent", useCase: "Summarize order trends with zero row egress", status: "pilot", riskClass: "limited", jurisdictions: ["EU"], owners: ["ai-owner@example.org"],
    relationships: { models: ["deterministic-summary-v1"], agents: [profile.agentId], tools: ["actian_query"], dataSubjects: [subject.id], providers: ["local-rules"] },
    deployedVersion: "pilot-1", policyBundleDigest: `sha256:${"1".repeat(64)}`, evidenceRefs: [evidence.evidenceRefId], updatedAt: new Date().toISOString()
  };
  runtime.registerAiSystem(aiSystem);
  return { runtime, evidence, fitnessDecision, disclosureContract, aiSystem };
}

test("Actian Context Bridge minimizes payloads and produces an allowed purpose-bound Data Fitness Decision", async (t) => {
  const { runtime, evidence, fitnessDecision, aiSystem } = await fixture(t);
  assert.equal(fitnessDecision.status, "allowed");
  assert.ok(fitnessDecision.checks.every((check) => check.status === "pass"));
  assert.equal(JSON.stringify(evidence).includes("must-not-be-imported@example.org"), false);
  assert.equal((await runtime.listExternalEvidence({ tenantId, subjectType: subject.type, subjectId: subject.id })).length, 1);
  assert.deepEqual(await runtime.getAiSystem(aiSystem.systemId), aiSystem);
  assert.throws(() => runtime.db.prepare("UPDATE fitness_decisions SET decision_json = '{}' WHERE decision_id = ?").run(fitnessDecision.decisionId), /immutable/i);
  assert.throws(() => runtime.registerAiSystem({ ...aiSystem, systemId: "ai-system-cross-tenant", tenantId: "tenant-b" }), /cross-tenant evidence/i);
  const otherEvidence = structuredClone(evidence);
  otherEvidence.evidenceRefId = `evidence-ref-${crypto.randomUUID()}`;
  otherEvidence.tenantId = "tenant-b";
  runtime.registerExternalEvidence(otherEvidence);
  runtime.registerAiSystem({ ...structuredClone(aiSystem), systemId: "ai-system-tenant-b", tenantId: "tenant-b", evidenceRefs: [otherEvidence.evidenceRefId] });
  const registry = await runtime.getRegistry({ tenantId });
  assert.deepEqual(registry.aiSystems.map((record) => record.tenantId), [tenantId]);
  assert.ok(registry.dataFitnessPolicies.every((policy) => policy.tenantId === tenantId));
  assert.ok(registry.disclosureContracts.every((contract) => contract.tenantId === tenantId));
});

test("conflicting current source assertions fail the Data Fitness gate closed", async (t) => {
  const { runtime, evidence } = await fixture(t);
  const conflictingEvidence = structuredClone(evidence);
  conflictingEvidence.evidenceRefId = `evidence-ref-${crypto.randomUUID()}`;
  conflictingEvidence.normalizedClaims.qualityScore = 40;
  conflictingEvidence.normalizedClaims.approved = false;
  runtime.registerExternalEvidence(conflictingEvidence);
  const decision = await runtime.evaluateDataFitness({ tenantId, subject, purpose, policyId: "fitness-policy-support-analytics" });
  assert.equal(decision.status, "denied");
  assert.ok(decision.checks.some((check) => check.checkId === "fitness-check-quality" && check.status === "fail"));
  assert.ok(decision.checks.some((check) => check.checkId === "fitness-check-approved" && check.status === "fail"));
});

test("fitness freshness is conservative and caps decision lifetime at the evidence-age boundary", () => {
  const now = new Date();
  const recentObservedAt = new Date(now.getTime() - 30000).toISOString();
  const oldObservedAt = new Date(now.getTime() - 120000).toISOString();
  const validUntil = new Date(now.getTime() + 86400000).toISOString();
  const policy = {
    tenantId, targetTypes: [subject.type], requiredEvidenceTypes: ["quality"], onMissing: "deny",
    requirements: { maxEvidenceAgeSeconds: 60 }
  };
  const evidence = [recentObservedAt, oldObservedAt].map((observedAt) => ({
    evidenceRefId: `evidence-ref-${crypto.randomUUID()}`, tenantId, subject, evidenceType: "quality", status: "active",
    normalizedClaims: { qualityScore: 100 }, payloadDigest: `sha256:${"3".repeat(64)}`,
    authority: { verified: true }, observedAt, validUntil
  }));
  const denied = evaluateDataFitnessPolicy(policy, evidence, { subject, purpose, now: now.toISOString() });
  assert.equal(denied.status, "denied");
  assert.ok(denied.checks.some((check) => check.checkId === "fitness-check-freshness" && check.status === "fail"));
  const allowed = evaluateDataFitnessPolicy(policy, [evidence[0]], { subject, purpose, now: now.toISOString() });
  assert.equal(allowed.status, "allowed");
  assert.equal(allowed.expiresAt, new Date(Date.parse(recentObservedAt) + 60000).toISOString());
});

test("future-dated external evidence is rejected before registration", async (t) => {
  const { runtime, evidence } = await fixture(t);
  const future = structuredClone(evidence);
  future.evidenceRefId = `evidence-ref-${crypto.randomUUID()}`;
  future.observedAt = new Date(Date.now() + 3600000).toISOString();
  future.validUntil = new Date(Date.now() + 7200000).toISOString();
  future.connector.importedAt = future.observedAt;
  assert.throws(() => runtime.registerExternalEvidence(future), /timestamps cannot be in the future/i);
});

test("disclosure observations outside the signed contract window are mismatches", async (t) => {
  const { disclosureContract } = await fixture(t);
  const observation = makeObservation();
  observation.observedAt = new Date(Date.now() + 3600000).toISOString();
  const evaluated = evaluateDataDisclosureContract(disclosureContract, observation);
  assert.equal(evaluated.status, "mismatch");
  assert.ok(evaluated.checks.some((check) => check.predicateId === "predicate-disclosure.contract-window" && check.status === "fail"));
});

test("Action Claim 1.4 rejects untrusted identity issuers and delegation windows", async (t) => {
  await t.test("untrusted human issuer", async (subtest) => {
    const { runtime, fitnessDecision, disclosureContract } = await fixture(subtest);
    const claim = makeClaim(1, fitnessDecision, disclosureContract);
    claim.authorityContext.humanPrincipal.issuer = "https://untrusted.example.net";
    const decision = await runtime.verifyAction(claim);
    assert.equal(decision.status, "denied");
    assert.match(decision.reasons.join(" "), /issuer is not trusted/i);
    assert.ok(decision.obligations.includes("repair_authority_context"));
  });

  await t.test("delegation does not cover the claim window", async (subtest) => {
    const { runtime, fitnessDecision, disclosureContract } = await fixture(subtest);
    const claim = makeClaim(1, fitnessDecision, disclosureContract);
    claim.authorityContext.delegationChain[0].expiresAt = new Date(Date.parse(claim.expiresAt) - 1000).toISOString();
    const decision = await runtime.verifyAction(claim);
    assert.equal(decision.status, "denied");
    assert.match(decision.reasons.join(" "), /does not cover the full live claim window/i);
    assert.ok(decision.obligations.includes("repair_authority_context"));
  });
});

test("Action Claim 1.4 emits signed zero-row disclosure evidence and never persists executor row payloads", async (t) => {
  const { runtime, fitnessDecision, disclosureContract } = await fixture(t);
  const result = await runtime.executeGovernedAction(makeClaim(1, fitnessDecision, disclosureContract), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "verified");
  assert.equal(result.disclosureReceipt.status, "verified");
  assert.equal(result.disclosureReceipt.observedSummary.egressRows, 0);
  assert.equal(result.receipt.schemaVersion, "1.1.0");
  assert.equal(runtime.verifySignedContract("palo-data-disclosure-receipt", result.disclosureReceipt), true);
  const stored = runtime.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(result.executionId).execution_json;
  assert.equal(stored.includes("secret-customer@example.org"), false);
  assert.equal(JSON.parse(stored).result.payloadStored, false);
  assert.throws(() => runtime.db.prepare("UPDATE disclosure_receipts SET receipt_json = '{}' WHERE receipt_id = ?").run(result.disclosureReceipt.receiptId), /immutable/i);
  assert.equal((await runtime.getOperationalSnapshot()).dataAssurance.disclosureMismatches, 0);
});

test("post-effect disclosure receipt failure is held as inconclusive without persisting row payloads", async (t) => {
  const { runtime, fitnessDecision, disclosureContract } = await fixture(t);
  runtime.createDisclosureReceipt = () => { throw new Error(`simulated receipt signer outage ${"x".repeat(5000)}`); };
  const result = await runtime.executeGovernedAction(makeClaim(1, fitnessDecision, disclosureContract), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "review_required");
  assert.equal(result.receipt.status, "unknown");
  assert.equal(result.receipt.schemaVersion, "1.0.0");
  assert.equal(result.receipt.error.length, 4000);
  assert.equal(result.attestation.status, "inconclusive");
  assert.equal(result.incident.resourceHold, true);
  const stored = runtime.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(result.executionId).execution_json;
  assert.equal(stored.includes("secret-customer@example.org"), false);
  assert.equal(JSON.parse(stored).result.payloadStored, false);
});

test("row, field, provider and region egress mismatches open a high-severity held incident", async (t) => {
  const { runtime, fitnessDecision, disclosureContract } = await fixture(t, { mismatch: true });
  const result = await runtime.executeGovernedAction(makeClaim(1, fitnessDecision, disclosureContract), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "review_required");
  assert.equal(result.disclosureReceipt.status, "mismatch");
  assert.equal(result.attestation.status, "mismatch");
  assert.equal(result.incident.severity, "high");
  assert.equal(result.incident.resourceHold, true);
  assert.ok(result.disclosureReceipt.checks.some((check) => check.predicateId === "predicate-disclosure.provider" && check.status === "fail"));
});

test("a disclosure observation replayed from before execution opens a held mismatch", async (t) => {
  const { runtime, fitnessDecision, disclosureContract } = await fixture(t, { staleObservation: true });
  const result = await runtime.executeGovernedAction(makeClaim(1, fitnessDecision, disclosureContract), { executorId: executorManifest.executorId, verifierId: verifierManifest.verifierId });
  assert.equal(result.status, "review_required");
  assert.equal(result.disclosureReceipt.status, "mismatch");
  assert.ok(result.disclosureReceipt.checks.some((check) => check.predicateId === "predicate-disclosure.execution-window" && check.status === "fail"));
  assert.equal(result.incident.resourceHold, true);
});

test("continuous assurance invalidates fitness, revokes an unconsumed capability and denies stale claims", async (t) => {
  const { runtime, evidence, fitnessDecision, disclosureContract } = await fixture(t);
  const firstClaim = makeClaim(1, fitnessDecision, disclosureContract);
  const allowed = await runtime.verifyAction(firstClaim);
  assert.equal(allowed.status, "allowed");
  const capability = runtime.issueExecutionCapability(firstClaim, allowed, executorManifest.executorId, verifierManifest.verifierId);
  const revalidated = await runtime.verifyAction(firstClaim);
  assert.equal(revalidated.decisionId, allowed.decisionId);
  const signal = {
    format: "palo-assurance-signal", schemaVersion: "1.0.0", signalId: `assurance-signal-${crypto.randomUUID()}`, tenantId, subject,
    sourceSystem: "actian-data-observability", signalType: "quality-changed", severity: "high", observedAt: new Date().toISOString(),
    evidenceRefId: evidence.evidenceRefId, changeDigest: `sha256:${"2".repeat(64)}`, reason: "Quality score dropped below the governed threshold"
  };
  const invalidation = await runtime.ingestAssuranceSignal(signal);
  assert.deepEqual(invalidation.invalidatedDecisionIds, [fitnessDecision.decisionId]);
  assert.deepEqual(invalidation.revokedCapabilityIds, [capability.capabilityId]);
  assert.equal(runtime.db.prepare("SELECT status FROM execution_capabilities WHERE capability_id = ?").get(capability.capabilityId).status, "revoked");
  runtime.db.prepare("UPDATE execution_capabilities SET status = 'issued', capability_json = ? WHERE capability_id = ?").run(JSON.stringify(capability), capability.capabilityId);
  assert.throws(
    () => runtime.consumeCapabilityAndCreateExecution(capability, firstClaim, allowed, { available: true, queryCount: 0, mutated: false }, "0"),
    /denied by current data governance/i
  );
  const cached = await runtime.verifyAction(firstClaim);
  assert.equal(cached.status, "denied");
  assert.match(cached.reasons.join(" "), /invalidated/i);
  const stale = await runtime.verifyAction(makeClaim(2, fitnessDecision, disclosureContract));
  assert.equal(stale.status, "denied");
  assert.match(stale.reasons.join(" "), /invalidated/i);
  assert.equal((await runtime.getDataFitnessDecision(fitnessDecision.decisionId)).invalidationSignalId, signal.signalId);
});

test("tenant-aware incident lookup tolerates legacy and unscoped execution records", async (t) => {
  const { runtime } = await fixture(t);
  const stamp = new Date().toISOString();
  const insertLegacy = (boundTenant) => {
    const executionId = `execution-${crypto.randomUUID()}`;
    const claimId = `claim-${crypto.randomUUID()}`;
    const incidentId = `incident-${crypto.randomUUID()}`;
    const execution = {
      executionId,
      claim: {
        schemaVersion: "1.2.0", claimId,
        effectContract: { resourceSelector: { resource: "data:dataset", path: "/legacy/dataset", ...(boundTenant ? { tenantId: boundTenant } : {}) } }
      }
    };
    const incident = {
      format: "palo-agentic-assurance-incident", schemaVersion: "1.0.0", incidentId, executionId, claimId,
      caseId: "case-legacy-incident", status: "open", severity: "medium", reason: "legacy verification unavailable",
      resourceHold: true, createdAt: stamp, updatedAt: stamp
    };
    runtime.db.prepare("INSERT INTO executions VALUES (?, ?, ?, ?, ?, 'recorded', ?)").run(executionId, claimId, `capability-${crypto.randomUUID()}`, "inconclusive", JSON.stringify(execution), stamp);
    runtime.db.prepare("INSERT INTO incidents VALUES (?, ?, ?, ?, ?, ?)").run(incidentId, executionId, claimId, "open", JSON.stringify(incident), stamp);
    return { executionId, incidentId };
  };
  const scoped = insertLegacy(tenantId);
  const unscoped = insertLegacy(null);
  assert.equal(await runtime.getExecutionTenant(scoped.executionId), tenantId);
  assert.equal(await runtime.getIncidentTenant(scoped.incidentId), tenantId);
  assert.deepEqual((await runtime.listIncidents("all", { tenantId })).map((incident) => incident.incidentId), [scoped.incidentId]);
  await assert.rejects(runtime.getIncidentTenant(unscoped.incidentId), /not bound to a tenant-aware Action Claim/i);
});
