import test from "node:test";
import assert from "node:assert/strict";
import { PaloGuideAgent } from "./guide-agent.js";

const agent = new PaloGuideAgent();

test("PALO guide explanations are grounded in released semantic records", () => {
  const result = agent.explainFramework({ query: "How do I govern an agent that uses tools?", audience: "product engineering", limit: 5 });
  assert.equal(result.format, "palo-guide-explanation");
  assert.equal(result.frameworkRelease, "3.1.0");
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
    systemType: "agentic",
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
  assert.equal(result.owaspGenAi2026.applicable, true);
  assert.equal(result.owaspGenAi2026.inScopeRiskIds.length, 10);
  assert.ok(result.owaspGenAi2026.priorityRiskIds.includes("LLM03:2026"));
  assert.match(result.owaspGenAi2026.authorityBoundary, /Human review required/i);
  assert.match(result.authorityBoundary, /starting hypothesis/i);
});

test("LLM architecture signals prioritize OWASP retrieval and output extensions", () => {
  const result = agent.inferRoute({
    useCase: "A generative support assistant uses RAG and sends a drafted email through an external API",
    role: "product security",
    systemType: "generative",
    currentState: "pilot",
    signals: { usesLlm: true, retrievalOrMemory: true, outputToDownstream: true }
  });
  assert.equal(result.owaspGenAi2026.applicable, true);
  assert.deepEqual(result.owaspGenAi2026.inScopeRiskIds, ["LLM01:2026", "LLM02:2026", "LLM03:2026", "LLM04:2026", "LLM05:2026", "LLM06:2026", "LLM07:2026", "LLM08:2026", "LLM09:2026", "LLM10:2026"]);
  assert.ok(result.owaspGenAi2026.priorityRiskIds.includes("LLM05:2026"));
  assert.ok(result.owaspGenAi2026.priorityRiskIds.includes("LLM09:2026"));
  assert.ok(result.owaspGenAi2026.priorityRiskIds.includes("LLM10:2026"));
  assert.deepEqual(result.owaspGenAi2026.targetedExtensions, ["LLM09:2026", "LLM10:2026"]);
  assert.deepEqual(result.owaspGenAi2026.routeFitSummary.union, { direct: 8, supporting: 2 });
  assert.equal(result.owaspGenAi2026.referenceHref, "PALO_OWASPGenAI2026.html");
  assert.ok(result.route.some((step) => step.id === "control"));
  assert.ok(result.route.some((step) => step.id === "prove"));
  assert.ok(result.openQuestions.some((question) => /adversarial/i.test(question)));
});

test("generic non-LLM AI routes explicitly exclude the OWASP LLM profile", () => {
  const result = agent.inferRoute({
    useCase: "A predictive model scores equipment maintenance risk",
    role: "operations",
    systemType: "predictive",
    currentState: "idea",
    signals: { needsMetrics: true }
  });
  assert.equal(result.owaspGenAi2026.applicable, false);
  assert.match(result.owaspGenAi2026.applicabilityReason, /Generic AI use alone/i);
  assert.ok(!result.openQuestions.some((question) => /adversarial/i.test(question)));
});

test("established OWASP security testing closes the testing question without closing human review", () => {
  const result = agent.inferRoute({
    useCase: "A generative assistant supports internal research",
    systemType: "generative",
    signals: { usesLlm: true, adversarialTestingEstablished: true, architectureSecurityTestingEstablished: true }
  });
  assert.ok(!result.openQuestions.some((question) => /adversarial/i.test(question)));
  assert.match(result.owaspGenAi2026.authorityBoundary, /Human review required/i);
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
