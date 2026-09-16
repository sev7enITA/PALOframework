import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAnsDemo, audience } from "../../examples/agentic-interface/integrations/ans/demo-fixture.mjs";
import { ansClaimBytes } from "./ans-bridge.js";
import { sha256 } from "./core.js";

const built = existsSync(fileURLToPath(new URL("../../.tools/ans/palo-ans-verify", import.meta.url))) && existsSync(fileURLToPath(new URL("../../.tools/ans/palo-ans-fixture", import.meta.url)));
if (process.env.PALO_ANS_TEST_REQUIRED === "1" && !built) throw new Error("Build the pinned ANS helper before running required integration tests");
const scenario = (name, fn) => test(name, { skip: built ? false : "Run npm run ans:build to enable SDK interoperability tests" }, async (t) => {
  const fixtures = [];
  t.after(async () => { for (const f of fixtures) await f.close(); });
  await fn(async (options) => { const f = await createAnsDemo(options); fixtures.push(f); return f; });
});

scenario("ANS: SDK receipt, status, DPoP and enterprise grant lead to a verified effect", async (make) => {
  const f = await make(); const result = await f.execute();
  assert.equal(result.status, "verified"); assert.equal(f.state.refunded, 50); assert.equal(f.executions(), 1);
  assert.equal(f.runtime.verifySignedContract("palo-agentic-execution-receipt", result.receipt), true);
  assert.equal((await f.runtime.verifyLedger()).valid, true);
  assert.equal((await f.execute()).executionId, result.executionId); assert.equal(f.executions(), 1);
});
scenario("ANS: valid identity cannot override enterprise refund policy", async (make) => {
  const f = await make({ amount: 150 }); assert.equal((await f.execute()).status, "denied"); assert.equal(f.executions(), 0);
});
scenario("ANS: legacy claim downgrade cannot bypass the required identity", async (make) => {
  const f = await make(); f.claim.schemaVersion = "1.2.0"; delete f.claim.authorityContext;
  const result = await f.execute();
  assert.equal(result.status, "denied"); assert.equal(f.executions(), 0);
  assert.match(result.decision.reasons.join(" "), /requires identity-bound Action Claims/);
  assert.equal((await f.runtime.verifyCryptographicAuthority(f.claim)).valid, false);
  assert.throws(() => f.runtime.assertCurrentVerifiedAuthority(f.claim), /requires identity-bound Action Claims/);
});
for (const variant of ["copied-identity", "tampered-receipt", "missing-receipt", "expired", "stale", "future", "revoked", "warning"]) {
  scenario(`ANS: ${variant} denies execution`, async (make) => {
    const f = await make({ variant }); const result = await f.execute();
    assert.equal(result.status, "denied"); assert.equal(f.executions(), 0);
    assert.match(result.decision.reasons.join(" "), /ANS verification denied/);
  });
}
scenario("ANS: proof binds the exact Action Claim content", async (make) => {
  const f = await make(); f.claim.action.arguments.amount = 51; f.claim.action.argumentsDigest = sha256(f.claim.action.arguments);
  assert.equal((await f.execute()).status, "denied"); assert.equal(f.executions(), 0);
});
scenario("ANS: enterprise grant must verify independently of identity", async (make) => {
  const f = await make(); f.replacePresentation({ ...f.presentation(), grant: "forged" });
  assert.equal((await f.execute()).status, "denied"); assert.equal(f.executions(), 0);
});
scenario("ANS: another tenant cannot inherit the enterprise binding", async (make) => {
  const f = await make(); const claim = structuredClone(f.claim); claim.authorityContext.tenantId = "tenant-other";
  const result = await f.authorityVerifier(claim.authorityContext, claim);
  assert.equal(result.valid, false); assert.match(result.reasons.join(" "), /binding mismatch/);
});
scenario("ANS: local revocation invalidates a cached allow", async (make) => {
  const f = await make(); assert.equal((await f.runtime.verifyAction(f.claim)).status, "allowed"); f.revoke();
  assert.equal((await f.execute()).status, "denied"); assert.equal(f.executions(), 0);
});
scenario("ANS: revocation during pre-state read revokes the issued capability", async (make) => {
  const f = await make({ beforePreRead: async (revoke) => revoke() }); const result = await f.execute();
  assert.equal(result.status, "denied"); assert.equal(f.executions(), 0);
  assert.equal(f.runtime.db.prepare("SELECT status FROM execution_capabilities").get().status, "revoked");
});
scenario("ANS: wrong outcome opens a held incident despite valid identity", async (make) => {
  const f = await make({ wrongEffect: true }); const result = await f.execute();
  assert.equal(result.attestation.status, "mismatch"); assert.equal(result.incident.resourceHold, true);
});
scenario("ANS: unavailable post-state remains inconclusive", async (make) => {
  const f = await make({ unavailableOutcome: true }); const result = await f.execute();
  assert.equal(result.attestation.status, "inconclusive"); assert.equal(result.incident.resourceHold, true);
});
scenario("ANS: SDK rejects replayed DPoP requests", async (make) => {
  const f = await make(); const request = { ...f.presentation(), content: ansClaimBytes(f.claim).toString("base64"), expectedAnsName: f.identity.ansName };
  assert.equal((await f.sdk.request(request)).valid, true);
  const replay = await f.sdk.request(request); assert.equal(replay.valid, false); assert.match(replay.reason, /replay/i);
});
scenario("ANS: another version of an agent does not match the name pin", async (make) => {
  const f = await make(); const request = { ...f.presentation(), content: ansClaimBytes(f.claim).toString("base64"), expectedAnsName: f.identity.ansName.replace("v1.0.0", "v2.0.0") };
  assert.equal((await f.sdk.request(request)).valid, false);
});
scenario("ANS: verifier failure fails closed", async (make) => {
  const f = await make(); f.sdk.close(); assert.equal((await f.execute()).status, "denied"); assert.equal(f.executions(), 0);
});
