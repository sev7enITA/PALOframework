import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CONNECTION_ENVIRONMENTS,
  CONNECTION_PLATFORMS,
  authorityDefaultsForAgent,
  buildScenarioSuite,
  enumerateSelectableConfigurations,
  evaluateSyntheticAction,
  generateSandboxBundle,
  runBoundarySimulation,
  runConnectionCheck,
  sha256,
  stableStringify,
  validateAuthorityConfiguration,
} from "./governanceVerification.js";

const purpose = { objective: "Maintain accurate catalog pricing", owner: "Commerce Platform", impact: "Material operational impact" };
const effect = { precondition: "Catalog version is unchanged", expected: "Price changes to the proposed value", forbidden: "Tenant and product identity remain unchanged" };
const connection = { platform: "n8n self-hosted", environment: "Sandbox" };

function fullInput(authority = authorityDefaultsForAgent("Catalog Assistant"), oversight = "approval") {
  return { connection, authority, oversight, purpose, effect };
}

test("every connection choice reports its real static boundary and never claims readiness", async () => {
  for (const platform of CONNECTION_PLATFORMS) {
    for (const environment of CONNECTION_ENVIRONMENTS) {
      const receipt = await runConnectionCheck({ platform: platform.label, environment });
      assert.equal(receipt.result.status, "not-configured");
      assert.equal(receipt.network.requests, 0);
      assert.equal(receipt.network.credentialsUsed, false);
      assert.equal(receipt.steps.at(-1).status, "not-run");
      assert.doesNotMatch(JSON.stringify(receipt), /\bready\b/i);
    }
  }
});

test("all 3,528 selectable guided configurations are compatible by construction", () => {
  const configurations = enumerateSelectableConfigurations();
  assert.equal(configurations.length, 3528);
  for (const configuration of configurations) {
    const result = validateAuthorityConfiguration({ ...configuration, purpose, effect });
    assert.equal(result.valid, true, JSON.stringify({ configuration, findings: result.findings }));
    assert.ok(result.agent?.id);
    assert.ok(result.tool?.id);
    const input = { ...configuration, purpose, effect };
    const scenarios = buildScenarioSuite(input);
    assert.equal(scenarios.length, 7);
    for (const scenario of scenarios) assert.equal(evaluateSyntheticAction(input, scenario.synthetic), scenario.expected, JSON.stringify({ configuration, scenario }));
  }
});

test("corrupted or contradictory combinations fail with a specific finding", () => {
  const base = fullInput();
  const cases = [
    [{ ...base, authority: { ...base.authority, tool: "Refund Proposal" } }, "agent-tool-mismatch"],
    [{ ...base, authority: { ...base.authority, operation: "Read" } }, "tool-operation-mismatch"],
    [{ ...base, authority: { ...base.authority, resource: "Tenant B / Catalog items" } }, "resource-out-of-profile"],
    [{ ...base, authority: { ...base.authority, limit: "EUR 500" } }, "limit-out-of-profile"],
    [{ ...base, authority: { ...base.authority, network: "unreviewed.example" } }, "network-out-of-profile"],
    [{ ...base, authority: { ...base.authority, limit: "No automatic change" }, oversight: "automatic" }, "automatic-without-authority"],
  ];
  for (const [input, code] of cases) {
    const result = validateAuthorityConfiguration(input);
    assert.equal(result.valid, false);
    assert.ok(result.findings.some((item) => item.code === code), JSON.stringify(result.findings));
  }
});

test("assurance scenarios are derived from current selections and emit a verbose receipt", async () => {
  const input = fullInput({ ...authorityDefaultsForAgent("Catalog Assistant"), limit: "20%", network: "api.catalog.example" });
  const receipt = await runBoundarySimulation(input);
  assert.equal(receipt.result.status, "passed");
  assert.equal(receipt.result.scenarioCount, 7);
  assert.equal(receipt.result.scenarios.every((scenario) => scenario.passed), true);
  assert.match(receipt.result.scenarios.find((scenario) => scenario.id === "limit-boundary").name, /20%/);
  assert.equal(receipt.network.requests, 0);
  assert.ok(receipt.steps.length >= 3);
  assert.ok(receipt.boundaries.length >= 3);
  assert.ok(receipt.whatDidNotHappen.length >= 3);
  assert.match(receipt.inputDigest, /^[a-f0-9]{64}$/);
});

test("digest-bound evidence is invalidated by any authority change", async () => {
  const first = fullInput({ ...authorityDefaultsForAgent("Catalog Assistant"), limit: "10%" });
  const second = fullInput({ ...first.authority, limit: "20%" });
  const receipt = await runBoundarySimulation(first);
  assert.notEqual(receipt.inputDigest, await sha256(second));
  await assert.rejects(() => generateSandboxBundle(second, receipt), /current configuration/);
});

test("local bundle generation is explicit about everything it did not publish", async () => {
  const input = fullInput();
  const simulation = await runBoundarySimulation(input);
  const generated = await generateSandboxBundle(input, simulation);
  assert.equal(generated.bundle.authoritative, false);
  assert.equal(generated.bundle.sourceOfRecord, false);
  assert.deepEqual(generated.bundle.publication, { performed: false, target: null });
  assert.match(generated.bundle.bundleDigest, /^[a-f0-9]{64}$/);
  assert.equal(generated.receipt.result.status, "generated-locally");
  assert.equal(generated.receipt.steps.find((step) => step.id === "publish").status, "not-run");
  assert.ok(generated.receipt.whatDidNotHappen.includes("No registry write"));
});

test("canonical serialization and digest do not depend on object key order", async () => {
  const left = { b: 2, a: { z: 1, y: [3, 4] } };
  const right = { a: { y: [3, 4], z: 1 }, b: 2 };
  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(await sha256(left), await sha256(right));
});

test("setup source contains no timer-based readiness or fake publication copy", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setHealth\("ready"\)/);
  assert.doesNotMatch(source, /Bundle published to the sandbox registry/);
  assert.doesNotMatch(source, /PALO-AI discovered three agents/);
  assert.match(source, /What did not happen/);
  assert.match(source, /Generate and download local bundle/);
  assert.match(source, /Inspect the exact persisted bundle/);
  assert.match(source, /The review applies only to this immutable bundle digest/);
});
