import assert from "node:assert/strict";
import { createAnsDemo } from "./demo-fixture.mjs";

const cases = [
  ["Valid ANS identity, enterprise grant and correct effect", {}, "verified"],
  ["Valid identity, action above enterprise limit", { amount: 150 }, "denied"],
  ["Copied identity, different proof key", { variant: "copied-identity" }, "denied"],
  ["Revoked status token", { variant: "revoked" }, "denied"],
  ["Expired status token", { variant: "expired" }, "denied"],
  ["Local revocation during pre-state read", { beforePreRead: async (revoke) => revoke() }, "denied"],
  ["Authorized action, wrong effect", { wrongEffect: true }, "review_required"],
  ["Outcome not observable", { unavailableOutcome: true }, "review_required"]
];
const report = { format: "palo-ans-demo-report", generatedAt: new Date().toISOString(),
  boundary: "Synthetic offline ANS SDK interoperability; no GoDaddy registration, live feed, checkpoint verification or production qualification", cases: [] };
for (const [name, options, expected] of cases) {
  const fixture = await createAnsDemo(options);
  try {
    const result = await fixture.execute(); assert.equal(result.status, expected);
    if (expected === "denied") assert.equal(fixture.executions(), 0);
    if (expected === "review_required") assert.equal(result.incident.resourceHold, true);
    report.cases.push({ name, expected, actual: result.status, executions: fixture.executions(), outcome: result.attestation?.status || null, resourceHold: result.incident?.resourceHold || false, passed: true });
  } finally { await fixture.close(); }
}
console.log(JSON.stringify(report, null, 2));
