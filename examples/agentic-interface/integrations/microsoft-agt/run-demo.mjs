import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GovernanceRuntime, sha256 } from "../../../../packages/palo-mcp-server/core.js";
import { installDemoCatalog, demoCatalogArgumentSchema, demoCatalogExecutorManifest, demoCatalogVerifierManifest } from "../../../../packages/palo-mcp-server/demo-catalog.js";
import { createMicrosoftAgtAcsProvider } from "../../../../packages/palo-mcp-server/providers/microsoft-agt-acs.js";

let AgentControl;
try { ({ AgentControl } = await import("agent-control-specification")); }
catch (error) {
  throw new Error(`This demo requires agent-control-specification@0.3.1-beta.0. Install it with npm install --no-save agent-control-specification@0.3.1-beta.0. ${error.message}`);
}

const integrationRoot = path.dirname(fileURLToPath(import.meta.url));
const dataDir = await mkdtemp(path.join(os.tmpdir(), "palo-agt-demo-"));
const agentControl = AgentControl.fromPath(path.join(integrationRoot, "manifest.yaml"));
const enforcementProvider = createMicrosoftAgtAcsProvider({ agentControl });
const runtime = new GovernanceRuntime({
  dataDir,
  keys: { "key-catalog-demo": "palo-agt-demo-secret-material-32-bytes-minimum" },
  enforcementProvider
});

function makeClaim(sequenceNumber, expectedVersion, newPrice, simulateWrongEffect = false) {
  const argumentsValue = { tenantId: "tenant-a", itemId: "item-1", newPrice, expectedVersion, ...(simulateWrongEffect ? { simulateWrongEffect: true } : {}) };
  const pathValue = "/tenants/tenant-a/items/item-1";
  return {
    format: "palo-agentic-action-claim", schemaVersion: "1.2.0", claimId: `claim-${crypto.randomUUID()}`, agentId: "agent-catalog-demo", caseId: "case-catalog-demo",
    action: { tool: "catalog_update", operation: "update", resource: "catalog:item", path: pathValue, networkIntent: "none", arguments: argumentsValue, argumentsDigest: sha256(argumentsValue), argumentSchemaDigest: sha256(demoCatalogArgumentSchema) },
    requestedScopes: { read: [pathValue], write: [pathValue] }, externalNetwork: false, delegation: { depth: 0, subagentCount: 0 },
    requestedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), nonce: crypto.randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${crypto.randomUUID()}`, sequenceNumber,
    effectContract: {
      format: "palo-agentic-effect-contract", schemaVersion: "1.0.0", effectContractId: `effect-${crypto.randomUUID()}`,
      resourceSelector: { resource: "catalog:item", path: pathValue, tenantId: "tenant-a" },
      preconditions: [{ predicateId: "predicate-version-current", path: "/version", operator: "equals", value: expectedVersion }],
      expectedEffects: [{ predicateId: "predicate-price-updated", path: "/price", operator: "changedTo", value: newPrice }],
      forbiddenEffects: [{ predicateId: "predicate-tenant-unchanged", path: "/tenantId", operator: "changedTo", value: "tenant-b" }],
      verification: { windowSeconds: 30, onInconclusive: "hold_and_review", maxAttempts: 1 }
    },
    metadata: { tenantId: "tenant-a" }
  };
}

async function approveAndResume(claim) {
  const pending = await runtime.executeGovernedAction(claim, { executorId: demoCatalogExecutorManifest.executorId, verifierId: demoCatalogVerifierManifest.verifierId });
  assert.equal(pending.executed, false);
  assert.equal(pending.decision.status, "pending_approval");
  await runtime.resolveApproval(pending.decision.approvalId, "approved", "demo-reviewer@example.org", "Approved exact digest-bound PALO claim");
  return runtime.executeGovernedAction(claim, { approvalId: pending.decision.approvalId, executorId: demoCatalogExecutorManifest.executorId, verifierId: demoCatalogVerifierManifest.verifierId });
}

try {
  await installDemoCatalog(runtime);
  const verified = await approveAndResume(makeClaim(1, 3, 120));
  assert.equal(verified.status, "verified");
  const mismatched = await approveAndResume(makeClaim(2, 4, 140, true));
  assert.equal(mismatched.status, "review_required");
  assert.equal(mismatched.attestation.status, "mismatch");
  const registry = await runtime.getRegistry();
  process.stdout.write(`${JSON.stringify({
    provider: registry.enforcementProvider,
    allowedThenVerified: { decision: verified.decision.status, outcome: verified.attestation.status, executionId: verified.executionId },
    allowedButWrong: { decision: mismatched.decision.status, outcome: mismatched.attestation.status, incidentId: mismatched.incident.incidentId, resourceHold: mismatched.incident.resourceHold },
    ledger: await runtime.verifyLedger()
  }, null, 2)}\n`);
} finally {
  runtime.close();
  await rm(dataDir, { recursive: true, force: true });
}
