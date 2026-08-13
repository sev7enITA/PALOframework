import test from "node:test";
import assert from "node:assert/strict";
import { PaloGuideAgent } from "./guide-agent.js";

const agent = new PaloGuideAgent();

test("PALO guide explanations are grounded in released semantic records", () => {
  const result = agent.explainFramework({ query: "How do I govern an agent that uses tools?", audience: "product engineering", limit: 5 });
  assert.equal(result.format, "palo-guide-explanation");
  assert.equal(result.frameworkRelease, "3.0.1");
  assert.deepEqual(result.canonicalLoop.map((stage) => stage.id), ["frame", "classify", "assess", "control", "measure", "prove"]);
  assert.ok(result.matches.some((match) => match.id === "palo-am" || match.phaseId === "assess"));
  assert.ok(result.matches.every((match) => match.evidenceClass && match.authorityBoundary));
  assert.match(result.answerBoundary, /No legal conclusion/i);
});

test("agentic use cases receive an explainable bounded route", () => {
  const result = agent.inferRoute({
    useCase: "An invoice agent reads evidence and can draft then submit an exception resolution",
    role: "finance product owner",
    objectives: ["govern agent autonomy", "prepare evidence"],
    currentState: "pilot",
    signals: { systemCanAct: true, highImpact: true, needsEvidence: true, actionImpact: "reversible-write" }
  });
  assert.equal(result.format, "palo-governance-route-inference");
  assert.ok(result.route.length >= 2 && result.route.length <= 4);
  assert.ok(result.route.some((step) => step.id === "assess"));
  assert.ok(result.route.some((step) => step.id === "control"));
  assert.ok(result.route.some((step) => step.id === "prove"));
  assert.equal(result.integration.class, "governed-executor");
  assert.ok(result.route.every((step) => step.reasons.length && step.expectedArtifacts.length && step.authorityBoundary));
  assert.match(result.authorityBoundary, /starting hypothesis/i);
});

test("product integration planning separates guidance from protected execution", () => {
  const guidance = agent.planIntegration({ product: "Desktop design assistant", productCategory: "developer-tool", deployment: "local" });
  assert.equal(guidance.integrationClass, "guidance-only");
  assert.equal(guidance.transport, "stdio");
  assert.deepEqual(guidance.exposedTools, ["palo_explain_framework", "palo_infer_governance_route", "palo_plan_product_integration"]);
  assert.ok(!guidance.exposedTools.includes("palo_execute_governed_action"));

  const protectedPlan = agent.planIntegration({ product: "Procurement workflow", productCategory: "workflow", deployment: "production", systemCanAct: true, actionImpact: "consequential-write" });
  assert.equal(protectedPlan.integrationClass, "workflow-admission-and-governed-executor");
  assert.equal(protectedPlan.transport, "streamable-http");
  assert.ok(protectedPlan.exposedTools.includes("palo_execute_governed_action"));
  assert.ok(protectedPlan.trustBoundaries.some((boundary) => /parallel ungoverned route/i.test(boundary)));
});

test("guide inputs fail closed when the required context is missing", () => {
  assert.throws(() => agent.explainFramework({ query: "" }), /required/i);
  assert.throws(() => agent.inferRoute({ useCase: "AI" }), /at least 3/i);
  assert.throws(() => agent.planIntegration({ product: "" }), /required/i);
});
