import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GovernanceRuntime, normalizeActionClaim, sha256 } from "./core.js";

const argumentSchema = { type: "object", required: ["path"], properties: { path: { type: "string", pattern: "^/workspace/support-docs/" } }, additionalProperties: false };
const profile = {
  format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId: "agent-support-copilot-sub-1", status: "active",
  identity: { role: "Support agent", lineage: "test.support.agent", baseModel: "test-model", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0.2 },
  authority: { allowedTools: ["read_file"], allowedOperations: ["read"], externalNetwork: false, allowedNetworkHosts: [], readScopes: ["/workspace/support-docs/*"], writeScopes: [], requireVibeGate: false, argumentSchemas: { read_file: argumentSchema } },
  delegation: { maxDepth: 0, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: true },
  evidence: { keyId: "key-support-test", algorithm: "HMAC-SHA256", auditTrailId: "ledger-support-test", redactFields: ["accessToken"] }
};

function makeClaim(sequenceNumber = 1, overrides = {}) {
  const requestedAt = new Date().toISOString(); const argumentsValue = { path: "/workspace/support-docs/runbook.md" };
  const claim = {
    format: "palo-agentic-action-claim", schemaVersion: "1.1.0", claimId: `claim-${crypto.randomUUID()}`, agentId: profile.agentId, caseId: "case-runtime-test",
    action: { tool: "read_file", operation: "read", resource: "/workspace/support-docs/runbook.md", path: "/workspace/support-docs/runbook.md", networkIntent: "none", arguments: argumentsValue, argumentsDigest: sha256(argumentsValue), argumentSchemaDigest: sha256(argumentSchema) },
    requestedScopes: { read: ["/workspace/support-docs/runbook.md"], write: [] }, externalNetwork: false, delegation: { depth: 0, subagentCount: 0 }, requestedAt, expiresAt: new Date(Date.now() + 60000).toISOString(), nonce: crypto.randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${crypto.randomUUID()}`, sequenceNumber
  };
  return { ...claim, ...overrides };
}

async function policy(input) {
  if (!input.profile.authority.allowedTools.includes(input.claim.action.tool)) return { status: "denied", reasons: ["tool denied"], obligations: [] };
  if (input.claim.externalNetwork && !input.profile.authority.externalNetwork) return { status: "denied", reasons: ["network denied"], obligations: [] };
  if (input.profile.delegation.requireHumanValidation && input.approval?.status !== "approved") return { status: "pending_approval", reasons: ["approval required"], obligations: [] };
  return { status: "allowed", reasons: ["within authority"], obligations: ["record_execution_outcome"] };
}

async function fixture(t, register = true) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-runtime-"));
  const runtime = new GovernanceRuntime({ dataDir, keys: { "key-support-test": "unit-test-secret-material-32-bytes-minimum" }, policyEvaluator: policy });
  t.after(() => { runtime.close(); return rm(dataDir, { recursive: true, force: true }); });
  if (register) await runtime.registerAgent("case-runtime-test", profile);
  return { runtime, dataDir };
}

test("normalization and trusted argument schema are enforced", async (t) => {
  const { runtime } = await fixture(t);
  const claim = makeClaim(1); claim.action.path = "/workspace/support-docs/../support-docs/runbook.md";
  const normalized = normalizeActionClaim(claim);
  assert.equal(normalized.action.path, "/workspace/support-docs/runbook.md");
  const malformed = makeClaim(1, { action: { ...claim.action, arguments: { path: "/etc/passwd" }, argumentsDigest: sha256({ path: "/etc/passwd" }) } });
  const decision = await runtime.verifyAction(malformed);
  assert.equal(decision.status, "denied");
  assert.match(decision.reasons[0], /arguments rejected/i);
});

test("missing profile and malformed claim fail closed", async (t) => {
  const { runtime } = await fixture(t, false);
  assert.equal((await runtime.verifyAction(makeClaim(1))).status, "denied");
  const malformed = await runtime.verifyAction({ claimId: `claim-${crypto.randomUUID()}`, agentId: profile.agentId });
  assert.equal(malformed.status, "denied");
  assert.match(malformed.reasons[0], /malformed/i);
});

test("nonce, idempotency and monotonic sequence prevent replay", async (t) => {
  const { runtime } = await fixture(t);
  const first = makeClaim(1); assert.equal((await runtime.verifyAction(first)).status, "pending_approval");
  assert.deepEqual(await runtime.verifyAction(first), await runtime.verifyAction(first));
  const nonceReplay = makeClaim(2, { nonce: first.nonce });
  assert.match((await runtime.verifyAction(nonceReplay)).reasons[0], /nonce replay/i);
  const sequenceGap = makeClaim(3);
  assert.match((await runtime.verifyAction(sequenceGap)).reasons[0], /sequence number must be 2/i);
  const idemReplay = makeClaim(2, { idempotencyKey: first.idempotencyKey });
  assert.match((await runtime.verifyAction(idemReplay)).reasons[0], /idempotency/i);
});

test("approval is immutable and bound to the exact Action Claim", async (t) => {
  const { runtime } = await fixture(t); const claim = makeClaim(1);
  const pending = await runtime.verifyAction(claim); const approval = await runtime.getApproval(pending.approvalId);
  assert.equal(approval.claimDigest, sha256(normalizeActionClaim(claim)));
  await runtime.resolveApproval(approval.approvalId, "approved", "human-reviewer@example.org", "Reviewed exact tool, arguments and scope");
  const allowed = await runtime.verifyAction(claim, approval.approvalId); assert.equal(allowed.status, "allowed");
  await assert.rejects(() => runtime.resolveApproval(approval.approvalId, "denied", "reviewer", "changed mind"), /terminal state/);
});

test("E2E register → deny → approval → execute → sign → persist → verify", async (t) => {
  const { runtime } = await fixture(t, false); await runtime.registerAgent("case-runtime-test", profile);
  const denied = await runtime.verifyAction(makeClaim(1, { action: { ...makeClaim().action, tool: "shell" } }));
  assert.equal(denied.status, "denied");
  const claim = makeClaim(1); const pending = await runtime.verifyAction(claim); assert.equal(pending.status, "pending_approval");
  await runtime.resolveApproval(pending.approvalId, "approved", "release-owner@example.org", "Approved exact read operation");
  const execution = await runtime.authorizeAndExecute(claim, pending.approvalId, async (normalized) => ({ bytes: 42, path: normalized.action.path }));
  assert.equal(execution.executed, true); assert.equal(execution.decision.status, "allowed"); assert.equal(runtime.verifyEvidence(execution.evidence), true);
  const ledger = await runtime.verifyLedger(); assert.equal(ledger.valid, true); assert.ok(ledger.entries >= 3);
  assert.throws(() => runtime.db.prepare("UPDATE evidence SET recorded_at = recorded_at").run(), /append-only/);
});

test("missing OPA configuration fails closed", async () => {
  const { createOpaEvaluator } = await import("./core.js"); const previous = process.env.PALO_OPA_URL; delete process.env.PALO_OPA_URL;
  try { assert.equal((await createOpaEvaluator()({})).status, "denied"); } finally { if (previous !== undefined) process.env.PALO_OPA_URL = previous; }
});
