import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertRequestTenant, evaluateProductionAdmission, validateProductionProfile } from "./production-admission.js";

const fixture = async () => JSON.parse(await readFile("schemas/fixtures/palo-production-profile.valid.json", "utf8"));

test("a schema-valid production profile is denied by the reference SQLite and in-process runtime", async () => {
  const profile = await fixture();
  const options = { now: Date.parse("2026-08-24T00:00:00Z") };
  assert.equal(validateProductionProfile(profile, options).environment, "production");
  const result = evaluateProductionAdmission(profile, undefined, options);
  assert.equal(result.status, "denied");
  assert.ok(result.reasons.some((reason) => /persistence driver postgresql/.test(reason)));
  assert.ok(result.reasons.some((reason) => /private signing material/.test(reason)));
  assert.ok(result.reasons.some((reason) => /connector mode remote-attested/.test(reason)));
});

test("production admission rejects placeholders and expired decisions", async () => {
  const profile = await fixture();
  profile.keyCustody.attestationRef = "none";
  assert.throws(() => validateProductionProfile(profile, { now: Date.parse("2026-08-24T00:00:00Z") }), /concrete evidence references/);
  const expired = await fixture();
  expired.decision.validUntil = "2026-08-22T00:00:00Z";
  assert.throws(() => validateProductionProfile(expired, { now: Date.parse("2026-08-24T00:00:00Z") }), /expired/);
});

test("OIDC tenant is bound to every Action Claim 1.3 and 1.4 tenant location", () => {
  const authInfo = { extra: { authMode: "oidc", tenantId: "tenant-a" } };
  const claim = {
    schemaVersion: "1.3.0",
    authorityContext: { tenantId: "tenant-a" },
    effectContract: { resourceSelector: { tenantId: "tenant-a" } },
    metadata: { tenantId: "tenant-a" }
  };
  assert.equal(assertRequestTenant(authInfo, claim), claim);
  assert.equal(assertRequestTenant(authInfo, { ...claim, schemaVersion: "1.4.0" }).schemaVersion, "1.4.0");
  assert.throws(() => assertRequestTenant(authInfo, { ...claim, effectContract: { resourceSelector: { tenantId: "tenant-b" } } }), /does not match/);
  assert.throws(() => assertRequestTenant({ extra: { authMode: "oidc" } }, claim), /missing the configured tenant claim/);
  assert.throws(() => assertRequestTenant(authInfo, { ...claim, schemaVersion: "1.2.0" }), /Action Claim 1.3 or 1.4/);
});
