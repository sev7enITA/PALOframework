import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeyPair, SignJWT, jwtVerify } from "jose";
import { GovernanceRuntime, sha256 } from "../../../../packages/palo-mcp-server/core.js";
import { AnsVerifierProcess, ansClaimBytes, createAnsAuthorityVerifier } from "../../../../packages/palo-mcp-server/ans-bridge.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
export const audience = "https://palo.example.test/v1/actions/execute";
const issuer = "https://enterprise.example.test";
const tenantId = "tenant-ans-demo";
const agentId = "agent-ans-refund";
const resourcePath = "/tenants/tenant-ans-demo/refunds/demo-1";
const executorId = "executor-ans-refund";
const verifierId = "verifier-ans-refund";
const argumentSchema = { type: "object", required: ["amount"], properties: { amount: { type: "number", minimum: 1 } }, additionalProperties: false };

export async function createAnsDemo({ variant, amount = 50, wrongEffect = false, unavailableOutcome = false, beforePreRead } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "palo-ans-demo-"));
  const fixture = new AnsVerifierProcess(path.join(root, ".tools/ans/palo-ans-fixture"));
  let sdk; let runtime;
  const close = async () => { runtime?.close(); fixture.close(); sdk?.close(); await rm(dir, { recursive: true, force: true }); };
  try {
    const identity = await fixture.request({ op: "init" });
    const roots = path.join(dir, "roots.json"); await writeFile(roots, JSON.stringify(identity.roots), { mode: 0o600 });
    sdk = new AnsVerifierProcess(path.join(root, ".tools/ans/palo-ans-verify"), ["--roots", roots, "--audience", audience]);
    const keys = await generateKeyPair("ES256"); const issuedAt = Math.floor(Date.now() / 1000);
    const scopes = { read: [resourcePath], write: [resourcePath] };
    const grant = await new SignJWT({ tenantId, agentId, instanceId: "refund-instance-1", ansName: identity.ansName, fingerprint: identity.fingerprint, scopes })
      .setProtectedHeader({ alg: "ES256", typ: "JWT" }).setIssuer(issuer).setSubject("user:finance-owner").setAudience(audience).setIssuedAt(issuedAt).setExpirationTime(issuedAt + 300).sign(keys.privateKey);
    const requestedAt = new Date().toISOString(); const expiresAt = new Date(Date.now() + 60000).toISOString();
    const actionArguments = { amount };
    const claim = {
      format: "palo-agentic-action-claim", schemaVersion: "1.3.0", claimId: `claim-${randomUUID()}`, agentId, caseId: "case-ans-refund",
      action: { tool: "refund", operation: "update", resource: "demo:refund", path: resourcePath, networkIntent: "none", arguments: actionArguments, argumentsDigest: sha256(actionArguments), argumentSchemaDigest: sha256(argumentSchema) },
      requestedScopes: scopes, externalNetwork: false, delegation: { depth: 1, subagentCount: 0 },
      authorityContext: {
        authorityContextId: `authority-${randomUUID()}`,
        humanPrincipal: { subject: "user:finance-owner", issuer, authenticatedAt: requestedAt, credentialDigest: sha256(grant) },
        workloadIdentity: { subject: identity.ansName, issuer: "https://palo-synthetic-demo.test", audience, proofType: "dpop", credentialDigest: identity.fingerprint },
        agentIdentity: { agentId, instanceId: "refund-instance-1" }, tenantId,
        delegationChain: [{ delegationId: `delegation-${randomUUID()}`, from: "user:finance-owner", to: agentId, scopes, issuedAt: new Date(issuedAt * 1000).toISOString(), expiresAt: new Date((issuedAt + 300) * 1000).toISOString() }]
      },
      requestedAt, expiresAt, nonce: randomUUID().replaceAll("-", ""), idempotencyKey: `idem-${randomUUID()}`, sequenceNumber: 1,
      effectContract: { format: "palo-agentic-effect-contract", schemaVersion: "1.0.0", effectContractId: `effect-${randomUUID()}`,
        resourceSelector: { resource: "demo:refund", path: resourcePath, tenantId },
        preconditions: [{ predicateId: "predicate-refund-open", path: "/refunded", operator: "equals", value: 0 }],
        expectedEffects: [{ predicateId: "predicate-refund-amount", path: "/refunded", operator: "deltaWithin", minimumDelta: amount, maximumDelta: amount }],
        forbiddenEffects: [{ predicateId: "predicate-tenant-changed", path: "/tenantId", operator: "changedTo", value: "tenant-other" }],
        verification: { windowSeconds: 30, onInconclusive: "hold_and_review", maxAttempts: 1 }
      }, metadata: { tenantId }
    };
    let binding = { tenantId, agentId, instanceId: "refund-instance-1", ansName: identity.ansName, ansId: identity.ansId, fingerprint: identity.fingerprint, status: "active", revision: "1", expiresAt: new Date(Date.now() + 300000).toISOString() };
    let presentation = { ...await fixture.request({ op: "mint", audience, content: ansClaimBytes(claim).toString("base64"), variant }), grant };
    const authorityVerifier = createAnsAuthorityVerifier({
      client: sdk,
      getBinding: async () => binding,
      getPresentation: async () => presentation,
      verifyDelegation: async (context, candidate, proven, supplied) => {
        const { payload } = await jwtVerify(supplied.grant, keys.publicKey, { issuer, audience, algorithms: ["ES256"], requiredClaims: ["exp", "iat", "sub"] });
        const valid = context.humanPrincipal.issuer === issuer && payload.sub === context.humanPrincipal.subject && sha256(supplied.grant) === context.humanPrincipal.credentialDigest
          && payload.tenantId === context.tenantId && payload.agentId === candidate.agentId && payload.instanceId === context.agentIdentity.instanceId
          && payload.ansName === proven.ansName && payload.fingerprint === proven.fingerprint
          && ["read", "write"].every((kind) => candidate.requestedScopes[kind].every((scope) => payload.scopes[kind].includes(scope)));
        return { valid, expiresAt: new Date(payload.exp * 1000).toISOString() };
      }
    });
    const state = { tenantId, refunded: 0 }; let executions = 0;
    const profile = { format: "palo-agentic-interface", schemaVersion: "1.1.0", profileVersion: "1.0.0", agentId, status: "active",
      identity: { role: "Synthetic refund agent", lineage: "demo.ans.refund", baseModel: "deterministic-fixture", systemPromptHash: `sha256:${"a".repeat(64)}`, temperature: 0 },
      authority: { allowedTools: ["refund"], allowedOperations: ["update"], externalNetwork: false, allowedNetworkHosts: [], readScopes: scopes.read, writeScopes: scopes.write, requireVibeGate: false, argumentSchemas: { refund: argumentSchema } },
      delegation: { maxDepth: 1, maxSubagents: 0, allowedSubagentRoles: [], requireHumanValidation: false },
      evidence: { keyId: "key-ans-demo", algorithm: "HMAC-SHA256", auditTrailId: "ledger-ans-demo", redactFields: [] }
    };
    runtime = new GovernanceRuntime({ dataDir: dir, keys: { "key-ans-demo": "synthetic-demo-only-signing-secret-32-bytes" }, authorityVerifier,
      identityPolicy: { requireIdentityBoundClaims: true, audience, trustedHumanIssuers: [issuer], trustedWorkloadIssuers: ["https://palo-synthetic-demo.test"] },
      policyEvaluator: async ({ claim: candidate }) => ({ status: candidate.action.arguments.amount <= 100 ? "allowed" : "denied", reasons: ["Enterprise refund limit is 100 synthetic units"], obligations: [] }),
      executors: { [executorId]: async ({ arguments: args }) => { executions++; state.refunded += args.amount + (wrongEffect ? 1 : 0); return { updated: true }; } },
      verifiers: { [verifierId]: async ({ phase }) => {
        if (phase === "pre" && beforePreRead) await beforePreRead(() => { binding = { ...binding, status: "revoked", revision: "2" }; });
        if (phase === "post" && unavailableOutcome) throw new Error("Synthetic authoritative read unavailable");
        return { state: structuredClone(state), resourceVersion: String(executions) };
      } }
    });
    await runtime.registerAgent(claim.caseId, profile);
    runtime.registerExecutor({ format: "palo-agentic-executor", schemaVersion: "1.0.0", executorId, version: "1.0.0", status: "active", supportedTools: ["refund"], supportsIdempotency: true });
    runtime.registerVerifier({ format: "palo-agentic-verifier", schemaVersion: "1.0.0", verifierId, version: "1.0.0", status: "active", supportedResources: ["demo:refund"] });
    return { runtime, claim, state, identity, sdk, authorityVerifier, executions: () => executions, close,
      presentation: () => presentation,
      replacePresentation: (value) => { presentation = value; },
      revoke: () => { binding = { ...binding, status: "revoked", revision: "2" }; },
      execute: () => runtime.executeGovernedAction(claim, { executorId, verifierId }) };
  } catch (error) { await close(); throw error; }
}
