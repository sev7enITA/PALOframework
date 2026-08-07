import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GovernanceRuntime, sha256 } from "./core.js";
import { defineEnforcementProvider, evaluateEnforcementProvider } from "./enforcement-provider.js";
import { buildMicrosoftAgtSnapshot, createMicrosoftAgtAcsProvider } from "./providers/microsoft-agt-acs.js";

const argumentSchema = {
  type: "object",
  required: ["path"],
  properties: { path: { type: "string", pattern: "^/workspace/support-docs/" } },
  additionalProperties: false
};

const profile = {
  format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId: "agent-support-copilot-sub-1", status: "active",
  identity: { role: "Support agent", lineage: "test.support.agent", baseModel: "test-model", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0.2 },
  authority: { allowedTools: ["read_file"], allowedOperations: ["read"], externalNetwork: false, allowedNetworkHosts: [], readScopes: ["/workspace/support-docs/*"], writeScopes: [], requireVibeGate: false, argumentSchemas: { read_file: argumentSchema } },
  delegation: { maxDepth: 0, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: true },
  evidence: { keyId: "key-support-test", algorithm: "HMAC-SHA256", auditTrailId: "ledger-support-test", redactFields: [] }
};

function makeClaim() {
  const argumentsValue = { path: "/workspace/support-docs/runbook.md" };
  return {
    format: "palo-agentic-action-claim", schemaVersion: "1.1.0", claimId: `claim-${crypto.randomUUID()}`, agentId: profile.agentId, caseId: "case-agt-provider-test",
    action: { tool: "read_file", operation: "read", resource: "/workspace/support-docs/runbook.md", path: "/workspace/support-docs/runbook.md", networkIntent: "none", arguments: argumentsValue, argumentsDigest: sha256(argumentsValue), argumentSchemaDigest: sha256(argumentSchema) },
    requestedScopes: { read: ["/workspace/support-docs/runbook.md"], write: [] }, externalNetwork: false, delegation: { depth: 0, subagentCount: 0 },
    requestedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), nonce: crypto.randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${crypto.randomUUID()}`, sequenceNumber: 1
  };
}

test("vendor-neutral provider contract fails closed on invalid decisions and exceptions", async () => {
  const manifest = {
    format: "palo-agentic-enforcement-provider", schemaVersion: "1.0.0", providerId: "provider-test-runtime", providerVersion: "1.0.0",
    displayName: "Test runtime", providerType: "test-policy-runtime", capabilities: ["pre_action_decision"], policyReference: "test/1"
  };
  const invalid = defineEnforcementProvider({ manifest, evaluate: async () => ({ status: "maybe" }) });
  const invalidDecision = await evaluateEnforcementProvider(invalid, {});
  assert.equal(invalidDecision.status, "denied");
  assert.match(invalidDecision.reasons[0], /invalid or undefined/i);
  const unavailable = defineEnforcementProvider({ manifest, evaluate: async () => { throw new Error("offline"); } });
  const unavailableDecision = await evaluateEnforcementProvider(unavailable, {});
  assert.equal(unavailableDecision.status, "denied");
  assert.match(unavailableDecision.reasons[0], /offline/i);
  const untrustedFields = defineEnforcementProvider({ manifest, evaluate: async () => ({ status: "allowed", reasons: ["ok"], obligations: [], approvalId: "approval-controlled-by-provider", unexpected: true }) });
  const normalized = await evaluateEnforcementProvider(untrustedFields, {});
  assert.equal("approvalId" in normalized, false);
  assert.equal("unexpected" in normalized, false);
});

test("Microsoft AGT snapshot preserves PALO identity, scope, approval and claim correlation", () => {
  const claim = makeClaim();
  const approval = { status: "approved", approvalId: `approval-${crypto.randomUUID()}` };
  const snapshot = buildMicrosoftAgtSnapshot({ claim, profile, approval });
  assert.equal(snapshot.tool_call.id, claim.claimId);
  assert.equal(snapshot.tool_call.name, claim.action.tool);
  assert.deepEqual(snapshot.tool_call.args, claim.action.arguments);
  assert.equal(snapshot.metadata.palo.case_id, claim.caseId);
  assert.equal(snapshot.metadata.palo.claim_digest, sha256(claim));
  assert.deepEqual(snapshot.metadata.palo.requested_scopes, claim.requestedScopes);
  assert.equal(snapshot.approvals, approval);
});

test("Microsoft AGT provider maps escalation to a digest-bound PALO approval and then allows", async (t) => {
  const calls = [];
  const fakeAgentControl = {
    async evaluateInterventionPoint(point, snapshot, mode) {
      calls.push({ point, snapshot, mode });
      const approved = snapshot.approvals?.status === "approved";
      return { verdict: { decision: approved ? "allow" : "escalate", reason: approved ? "bound_approval_present" : "human_review_required" }, actionIdentity: `agt-action:${snapshot.tool_call.id}` };
    }
  };
  const provider = createMicrosoftAgtAcsProvider({ agentControl: fakeAgentControl });
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-agt-provider-"));
  const runtime = new GovernanceRuntime({ dataDir, keys: { "key-support-test": "unit-test-secret-material-32-bytes-minimum" }, enforcementProvider: provider });
  t.after(() => { runtime.close(); return rm(dataDir, { recursive: true, force: true }); });
  await runtime.registerAgent("case-agt-provider-test", profile);
  const claim = makeClaim();
  const pending = await runtime.verifyAction(claim);
  assert.equal(pending.status, "pending_approval");
  assert.equal(pending.enforcementProvider.providerId, "provider-microsoft-agt-acs");
  await runtime.resolveApproval(pending.approvalId, "approved", "reviewer@example.org", "Reviewed the exact PALO Action Claim");
  const allowed = await runtime.verifyAction(claim, pending.approvalId);
  assert.equal(allowed.status, "allowed");
  assert.equal(allowed.enforcementProvider.decisionReference, `agt-action:${claim.claimId}`);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].point, "pre_tool_call");
  assert.equal(calls[0].mode, "enforce");
  assert.equal(calls[1].snapshot.approvals.status, "approved");
  assert.equal((await runtime.getRegistry()).enforcementProvider.providerId, "provider-microsoft-agt-acs");
});

test("AGT transforms are never applied behind an immutable PALO Action Claim", async () => {
  const provider = createMicrosoftAgtAcsProvider({
    agentControl: {
      async evaluateInterventionPoint() {
        return { verdict: { decision: "transform", reason: "rewrite", transform: { path: "$policy_target.path", value: "/other" } } };
      }
    }
  });
  const result = await provider.evaluate({ claim: makeClaim(), profile, approval: null });
  assert.equal(result.status, "denied");
  assert.deepEqual(result.obligations, ["submit_transformed_action_as_new_claim"]);
});

test("AGT runtime errors fail closed without escaping the provider boundary", async () => {
  const provider = createMicrosoftAgtAcsProvider({ agentControl: { async evaluateInterventionPoint() { throw new Error("native runtime unavailable"); } } });
  const result = await provider.evaluate({ claim: makeClaim(), profile, approval: null });
  assert.equal(result.status, "denied");
  assert.match(result.reasons[0], /failed closed.*native runtime unavailable/i);
});
