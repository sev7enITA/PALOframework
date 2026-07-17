#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { sha256 } from "../../packages/palo-mcp-server/core.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gatewayUrl = (process.env.PALO_GATEWAY_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const token = process.env.PALO_GATEWAY_TOKEN;
const autoApprove = process.argv.includes("--auto-approve");
const seedN8n = process.argv.includes("--seed-n8n");

if (!token || Buffer.byteLength(token) < 24) {
  throw new Error("Set PALO_GATEWAY_TOKEN to the same 24+ byte token used by the local PALO Gateway");
}

const colors = {
  blue: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  bold: "\u001b[1m",
  reset: "\u001b[0m"
};

function headline(number, title) {
  console.log(`\n${colors.bold}${colors.blue}${number}. ${title}${colors.reset}`);
}

function decision(label, value) {
  const color = value.status === "allowed" ? colors.green : value.status === "pending_approval" ? colors.yellow : colors.red;
  console.log(`${colors.bold}${label}:${colors.reset} ${color}${value.status}${colors.reset}`);
  console.log(`Reason: ${value.reasons?.join("; ") || "not supplied"}`);
  if (value.approvalId) console.log(`Approval ID: ${value.approvalId}`);
}

async function gateway(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${gatewayUrl}${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${pathname} returned HTTP ${response.status}: ${payload.message || payload.error || "unknown error"}`);
  return payload;
}

async function loadProfile(filename) {
  return JSON.parse(await readFile(path.join(repositoryRoot, "examples/n8n-demo/profiles", filename), "utf8"));
}

async function seedN8nProfiles() {
  headline("PREP", "Register the three visual n8n demo profiles");
  for (const filename of ["agent-demo-autonomous.json", "agent-demo-supervised.json", "agent-demo-restricted.json"]) {
    const profile = await loadProfile(filename);
    await gateway("/v1/agents/register", { method: "POST", body: { caseId: "case-n8n-demo", profile } });
    console.log(`Registered ${profile.agentId}`);
  }
  console.log(`${colors.green}n8n demo profiles are ready.${colors.reset}`);
}

function makeClaim({ agentId, caseId, sequenceNumber, requestedScope, nonce = randomBytes(24).toString("base64url") }) {
  const argumentSchema = {
    type: "object",
    required: ["path"],
    properties: { path: { type: "string" } },
    additionalProperties: false
  };
  const argumentsValue = { path: "/workspace/support-docs/refund-policy.txt" };
  const requestedAt = new Date();
  return {
    format: "palo-agentic-action-claim",
    schemaVersion: "1.1.0",
    claimId: `claim-${randomUUID()}`,
    agentId,
    caseId,
    action: {
      tool: "read_file",
      operation: "read",
      resource: "file:support-knowledge",
      path: argumentsValue.path,
      networkIntent: "none",
      arguments: argumentsValue,
      argumentsDigest: sha256(argumentsValue),
      argumentSchemaDigest: sha256(argumentSchema)
    },
    requestedScopes: { read: [requestedScope], write: [] },
    externalNetwork: false,
    delegation: { depth: 0, subagentCount: 0 },
    requestedAt: requestedAt.toISOString(),
    expiresAt: new Date(requestedAt.getTime() + 5 * 60 * 1000).toISOString(),
    nonce,
    idempotencyKey: `demo:${agentId}:${randomUUID()}`,
    sequenceNumber,
    metadata: { platform: "hands-on-demo", scenario: "fictional-support-knowledge-access" }
  };
}

async function waitForReviewer() {
  if (autoApprove || !process.stdin.isTTY) return;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  await terminal.question(`${colors.yellow}Reviewer: inspect the immutable claim, then press Enter to approve it...${colors.reset}`);
  terminal.close();
}

async function runSupportCase() {
  const runId = Date.now().toString(36);
  const agentId = `agent-support-demo-${runId}`;
  const caseId = `case-support-demo-${runId}`;
  const profile = await loadProfile("agent-demo-supervised.json");
  profile.agentId = agentId;
  profile.identity.role = "Human-supervised support knowledge assistant";
  profile.identity.lineage = `com.fabriziodegni.paloframework.demo.support.${runId}`;
  profile.evidence.auditTrailId = `ledger-support-demo-${runId}`;

  console.log(`${colors.bold}PALO-AI hands-on case: governed support knowledge access${colors.reset}`);
  console.log("Synthetic data and a mock executor only. No production action is called.");
  console.log(`Gateway: ${gatewayUrl}`);
  console.log(`Case: ${caseId}`);

  headline(1, "Register a trusted authority profile");
  const registration = await gateway("/v1/agents/register", { method: "POST", body: { caseId, profile } });
  console.log(`Agent: ${registration.profile.agentId}`);
  console.log(`Profile digest: ${registration.profileDigest}`);
  console.log("Authority: read_file + read + /workspace/support-docs; human validation required");

  headline(2, "Attempt an action outside the registered scope");
  const outsideScopeClaim = makeClaim({ agentId, caseId, sequenceNumber: 1, requestedScope: "/finance/private" });
  const denied = await gateway("/v1/actions/verify", { method: "POST", body: { claim: outsideScopeClaim } });
  decision("PALO decision", denied);

  headline(3, "Propose a legitimate support knowledge read");
  const claim = makeClaim({ agentId, caseId, sequenceNumber: 2, requestedScope: "/workspace/support-docs" });
  const pending = await gateway("/v1/actions/verify", { method: "POST", body: { claim } });
  decision("PALO decision", pending);
  if (pending.status !== "pending_approval" || !pending.approvalId) throw new Error("The supervised action did not create an approval request");
  console.log(`Immutable claim digest: ${pending.claimDigest}`);

  headline(4, "Bind a human decision to the exact immutable claim");
  const approvalBefore = await gateway(`/v1/approvals/${encodeURIComponent(pending.approvalId)}`);
  console.log(`Approval state: ${approvalBefore.status}`);
  console.log(`Bound claim: ${approvalBefore.claimId}`);
  console.log(`Bound digest: ${approvalBefore.claimDigest}`);
  await waitForReviewer();
  const approval = await gateway("/v1/approvals/resolve", {
    method: "POST",
    body: {
      approvalId: pending.approvalId,
      status: "approved",
      resolvedBy: "demo-reviewer@example.invalid",
      rationale: "Synthetic support document; exact tool, scope and arguments reviewed"
    }
  });
  console.log(`${colors.green}Approval state: ${approval.status}${colors.reset}`);
  console.log(`Reviewer: ${approval.resolvedBy}`);

  headline(5, "Resume the same claim and execute only after allow");
  const allowed = await gateway("/v1/actions/verify", { method: "POST", body: { claim, approvalId: pending.approvalId } });
  decision("PALO decision", allowed);
  if (allowed.status !== "allowed") throw new Error("The approved claim was not allowed");
  const document = await readFile(path.join(repositoryRoot, "examples/hands-on-demo/refund-policy.txt"), "utf8");
  const result = { executor: "mock-read-file", bytes: Buffer.byteLength(document), preview: document.split("\n").slice(0, 3).join(" ") };
  console.log(`${colors.green}Mock tool executed:${colors.reset} ${result.preview}`);

  headline(6, "Sign and append execution evidence");
  const evidence = await gateway("/v1/evidence", {
    method: "POST",
    body: {
      claim,
      decision: allowed,
      outcome: "executed",
      payload: { result, customerEmail: "fictional.customer@example.invalid" }
    }
  });
  console.log(`Evidence event: ${evidence.eventId}`);
  console.log(`Signature: ${evidence.signature.slice(0, 36)}...`);
  console.log(`Redacted customer email: ${evidence.redactedPayload.customerEmail}`);

  headline(7, "Demonstrate replay protection and verify the ledger");
  const replay = makeClaim({ agentId, caseId, sequenceNumber: 3, requestedScope: "/workspace/support-docs", nonce: claim.nonce });
  const replayDecision = await gateway("/v1/actions/verify", { method: "POST", body: { claim: replay } });
  decision("Replay attempt", replayDecision);
  const ledger = await gateway("/v1/evidence/verify-ledger");
  console.log(`${ledger.valid ? colors.green : colors.red}Ledger valid: ${ledger.valid}${colors.reset}`);
  console.log(`Ledger entries: ${ledger.entries}`);
  console.log(`Ledger head: ${ledger.headDigest}`);

  console.log(`\n${colors.bold}${colors.green}Demo complete: deny → approval → allow → mock execute → sign → persist → replay deny → verify.${colors.reset}`);
}

await gateway("/health");
if (seedN8n) await seedN8nProfiles();
else await runSupportCase();
