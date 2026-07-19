#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { demoCatalogArgumentSchema } from "../../packages/palo-mcp-server/demo-catalog.js";
import { sha256 } from "../../packages/palo-mcp-server/core.js";

const gatewayUrl = (process.env.PALO_GATEWAY_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const token = process.env.PALO_GATEWAY_TOKEN;
const autoApprove = process.argv.includes("--auto-approve");
const simulateWrongEffect = process.argv.includes("--wrong-effect");
const staleState = process.argv.includes("--stale-state");
if (!token || Buffer.byteLength(token) < 24) throw new Error("Set the same 24+ byte PALO_GATEWAY_TOKEN used by the demo gateway");

const colors = { blue: "\u001b[36m", green: "\u001b[32m", yellow: "\u001b[33m", red: "\u001b[31m", bold: "\u001b[1m", reset: "\u001b[0m" };
const headline = (number, title) => console.log(`\n${colors.bold}${colors.blue}${number}. ${title}${colors.reset}`);

async function gateway(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${gatewayUrl}${pathname}`, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${pathname} returned HTTP ${response.status}: ${payload.message || payload.error || "unknown error"}`);
  return payload;
}

function claim(expectedVersion = 3, newPrice = 120) {
  const now = new Date(); const argumentsValue = { tenantId: "tenant-a", itemId: "item-1", newPrice, expectedVersion, simulateWrongEffect };
  const target = "/tenants/tenant-a/items/item-1";
  return {
    format: "palo-agentic-action-claim", schemaVersion: "1.2.0", claimId: `claim-${randomUUID()}`, agentId: "agent-catalog-demo", caseId: "case-catalog-demo",
    action: { tool: "catalog_update", operation: "update", resource: "catalog:item", path: target, networkIntent: "none", arguments: argumentsValue, argumentsDigest: sha256(argumentsValue), argumentSchemaDigest: sha256(demoCatalogArgumentSchema) },
    requestedScopes: { read: [target], write: [target] }, externalNetwork: false, delegation: { depth: 0, subagentCount: 0 },
    requestedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 300000).toISOString(), nonce: randomBytes(24).toString("base64url"), idempotencyKey: `demo-catalog:${randomUUID()}`, sequenceNumber: 1,
    effectContract: {
      format: "palo-agentic-effect-contract", schemaVersion: "1.0.0", effectContractId: `effect-${randomUUID()}`,
      resourceSelector: { resource: "catalog:item", path: target, tenantId: "tenant-a" },
      preconditions: [{ predicateId: "predicate-current-version", path: "/version", operator: "equals", value: expectedVersion }],
      expectedEffects: [{ predicateId: "predicate-price-target", path: "/price", operator: "changedTo", value: newPrice }],
      forbiddenEffects: [{ predicateId: "predicate-cross-tenant", path: "/tenantId", operator: "changedTo", value: "tenant-b" }],
      verification: { windowSeconds: 30, onInconclusive: "hold_and_review", maxAttempts: 1 }
    },
    metadata: { platform: "palo-hands-on-demo", tenantId: "tenant-a", scenario: simulateWrongEffect ? "authorized-but-wrong" : staleState ? "stale-state" : "verified-effect" }
  };
}

async function waitForApproval() {
  if (autoApprove || !process.stdin.isTTY) return;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  await terminal.question(`${colors.yellow}Inspect the exact claim and Effect Contract, then press Enter to approve...${colors.reset}`);
  terminal.close();
}

const health = await gateway("/health");
if (health.version !== "2.5.0") throw new Error("The v2.5 full-cycle gateway is not running");
await gateway("/v1/demo/catalog/reset", { method: "POST", body: { price: 100, version: staleState ? 4 : 3 } });

console.log(`${colors.bold}PALO-AI v2.5 full-cycle assurance — synthetic catalog demo${colors.reset}`);
console.log("No production system, customer data or consequential tool is used.");

headline(0, "WITHOUT PALO — possession becomes permission");
const directState = { tenantId: "tenant-a", itemId: "item-1", price: 100, version: 3 };
directState.price = simulateWrongEffect ? 130 : 120; directState.version += 1;
console.log(`${colors.red}Direct tool executed without authority, policy, approval, capability or outcome verification.${colors.reset}`);
console.log(`Observed price: ${directState.price}; whether this matches the intended result is not checked.`);

headline(1, "WITH PALO — propose authority and intended effect together");
const actionClaim = claim();
console.log(`Claim: ${actionClaim.claimId}`);
console.log(`Expected effect: price changes from 100 to 120; tenant remains tenant-a.`);
const first = await gateway("/v1/actions/execute", { method: "POST", body: { claim: actionClaim, executorId: "executor-catalog-demo", verifierId: "verifier-catalog-demo" } });
console.log(`Decision path: ${colors.yellow}${first.status}${colors.reset}`);
if (first.status !== "review_required" || !first.decision?.approvalId) throw new Error(`Expected review_required, received ${first.status}`);

headline(2, "Approve the exact immutable claim");
await waitForApproval();
await gateway("/v1/approvals/resolve", { method: "POST", body: { approvalId: first.decision.approvalId, status: "approved", resolvedBy: "demo-reviewer@example.invalid", rationale: "Synthetic tenant, target, arguments and Effect Contract reviewed" } });
console.log(`${colors.green}Approval bound to ${first.decision.claimDigest}.${colors.reset}`);

headline(3, "Consume one capability and execute through the trusted connector");
const outcome = await gateway("/v1/actions/execute", { method: "POST", body: { claim: actionClaim, approvalId: first.decision.approvalId, executorId: "executor-catalog-demo", verifierId: "verifier-catalog-demo" } });
console.log(`Execution: ${outcome.executionId || "not executed"}`);
console.log(`Final PALO status: ${outcome.status}`);
if (outcome.receipt) console.log(`Receipt: ${outcome.receipt.status}; signature ${outcome.receipt.signature.slice(0, 34)}...`);

headline(4, "Verify the effect against authoritative post-state");
if (outcome.attestation) {
  console.log(`Attestation: ${outcome.attestation.status}`);
  for (const check of outcome.attestation.checks) console.log(`- ${check.category}/${check.predicateId}: ${check.status} — ${check.reason}`);
}
if (outcome.incident) console.log(`${colors.red}Incident ${outcome.incident.incidentId}: ${outcome.incident.reason}; resource hold=${outcome.incident.resourceHold}${colors.reset}`);

headline(5, "Verify the append-only evidence chain");
const ledger = await gateway("/v1/evidence/verify-ledger");
console.log(`${ledger.valid ? colors.green : colors.red}Ledger valid: ${ledger.valid}${colors.reset}; entries=${ledger.entries}; head=${ledger.headDigest}`);
console.log(`\n${colors.bold}${outcome.status === "verified" ? colors.green : colors.yellow}Demo complete: authorize → approve → capability → execute → receipt → verify → ${outcome.attestation?.status || outcome.status}.${colors.reset}`);
