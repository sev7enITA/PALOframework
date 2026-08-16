import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), "utf8"));

const semanticSpine = readJson("data/semantic-spine.json");
const decisionGates = readJson("data/decision-gates.json");
const controlLibrary = readJson("data/control-library.json");
const indicatorRegistry = readJson("data/kpi-kri-registry.json");
const sourceRegistry = readJson("data/source-registry.json");
const owaspGenAiCrosswalk = readJson("data/owasp-genai-2026-crosswalk.json");

const stageOrder = ["frame", "classify", "assess", "control", "measure", "prove"];
const owaspRiskIds = owaspGenAiCrosswalk.risks.map((risk) => risk.riskId);
const baseOwaspPriorityIds = ["LLM01:2026", "LLM02:2026", "LLM04:2026", "LLM06:2026", "LLM07:2026", "LLM08:2026"];
const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it", "of", "on", "or", "the", "to", "we", "what", "with"]);

function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token)))];
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return String(value);
}

function publicHref(href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("../../")) return href.slice(6);
  if (href.startsWith("../")) return href.slice(3);
  return href;
}

function nodeScore(node, queryTokens, audienceTokens) {
  const fields = {
    label: normalize(node.label),
    role: normalize(node.role),
    action: normalize(node.action),
    intents: normalize(textOf(node.intents)),
    outputs: normalize(textOf(node.outputs)),
    properties: normalize(textOf(node.properties)),
    stakeholders: normalize(textOf(node.stakeholders)),
    phase: normalize(node.phaseId),
    type: normalize(node.type)
  };
  let score = 0;
  for (const token of queryTokens) {
    if (fields.label === token) score += 48;
    else if (fields.label.includes(token)) score += 32;
    if (fields.intents.includes(token)) score += 24;
    if (fields.action.includes(token)) score += 16;
    if (fields.role.includes(token)) score += 14;
    if (fields.outputs.includes(token)) score += 12;
    if (fields.properties.includes(token)) score += 9;
    if (fields.phase.includes(token) || fields.type.includes(token)) score += 7;
  }
  for (const token of audienceTokens) if (fields.stakeholders.includes(token) || fields.intents.includes(token)) score += 10;
  if (queryTokens.length && queryTokens.every((token) => Object.values(fields).some((field) => field.includes(token)))) score += 18;
  if (node.type === "stage") score += 3;
  return score;
}

function stageRecord(stageId) {
  const node = semanticSpine.nodes.find((item) => item.type === "stage" && item.id === stageId);
  const gate = decisionGates.gates.find((item) => item.gateId === stageId);
  const controls = controlLibrary.controls.filter((item) => item.lifecycleGates.includes(stageId));
  const indicators = indicatorRegistry.indicators.filter((item) => item.gateIds.includes(stageId));
  const modules = semanticSpine.nodes.filter((item) => item.type === "module" && item.phaseId === stageId);
  return {
    id: stageId,
    label: node.label,
    number: node.number,
    coreQuestion: node.properties?.["Core question"],
    purpose: gate?.purpose || node.role,
    action: node.action,
    expectedArtifacts: node.outputs || [],
    decisionOptions: gate?.decisionOptions || [],
    modules: modules.map((item) => ({ id: item.id, label: item.label, href: publicHref(item.href) })),
    controls: controls.map((item) => ({ controlId: item.controlId, title: item.title, controlType: item.controlType })),
    indicators: indicators.map((item) => ({ indicatorId: item.indicatorId, type: item.type, name: item.name })),
    semanticId: node.semanticId,
    evidenceClass: node.evidenceClass,
    authorityBoundary: node.authorityBoundary
  };
}

function addStageScore(scores, reasons, stageId, points, reason) {
  scores.set(stageId, (scores.get(stageId) || 0) + points);
  const list = reasons.get(stageId) || [];
  if (reason && !list.includes(reason)) list.push(reason);
  reasons.set(stageId, list);
}

function integrationClass({ systemCanAct, actionImpact, currentState }) {
  if (!systemCanAct || actionImpact === "guidance-only") return "guidance-only";
  if (actionImpact === "read-only") return "advisory-gate";
  if (actionImpact === "consequential-write" || currentState === "production") return "workflow-admission-and-governed-executor";
  return "governed-executor";
}

function classExplanation(value) {
  return {
    "guidance-only": "Expose PALO reasoning and released definitions without granting the guide any target-system authority.",
    "advisory-gate": "Ask PALO for a visible decision before the product proceeds, but do not present this as a non-bypassable enforcement boundary.",
    "governed-executor": "Keep target credentials behind a PALO-owned broker so an allowed claim is consumed before the protected action executes.",
    "workflow-admission-and-governed-executor": "Combine instance-level admission with a PALO-owned executor so alternate privileged paths are rejected and the outcome is separately verified."
  }[value];
}

function stableOwaspOrder(ids) {
  return owaspRiskIds.filter((riskId) => ids.includes(riskId));
}

function buildOwaspGenAiProfile({ cleanUseCase, systemType, signals, combined }) {
  const normalizedSystemType = normalize(systemType);
  const clearLlmUseCase = /\b(llm|large language model|generative|genai|chatbot|chat assistant|multimodal model|foundation model|rag|retrieval augmented|embedding|vector search|prompt injection)\b/.test(normalize(cleanUseCase));
  const applicable = Boolean(signals.usesLlm || /\b(generative|genai|llm|agentic)\b/.test(normalizedSystemType) || clearLlmUseCase);
  if (!applicable) {
    return {
      applicable: false,
      applicabilityReason: "No explicit LLM, generative, multimodal, or agentic model signal was detected. Generic AI use alone does not activate the OWASP LLM profile.",
      authorityBoundary: "This exclusion is a routing hypothesis. A human reviewer must reopen the profile if an LLM or generative model is part of the architecture."
    };
  }

  const agentic = /\b(agent|agentic|autonom|tool|workflow|delegat|action)\b/.test(combined) || Boolean(signals.systemCanAct);
  const priorityRiskIds = baseOwaspPriorityIds.slice();
  const targetedExtensions = [];
  if (agentic) priorityRiskIds.push("LLM03:2026");
  if (signals.retrievalOrMemory) {
    priorityRiskIds.push("LLM05:2026", "LLM09:2026");
    targetedExtensions.push("LLM09:2026");
  }
  if (signals.outputToDownstream) {
    priorityRiskIds.push("LLM10:2026");
    targetedExtensions.push("LLM10:2026");
  }

  return {
    applicable: true,
    sourceId: owaspGenAiCrosswalk.source.sourceId,
    sourceVersion: owaspGenAiCrosswalk.source.version,
    sourceStatus: owaspGenAiCrosswalk.source.editorialStatus,
    inScopeRiskIds: owaspRiskIds.slice(),
    priorityRiskIds: stableOwaspOrder(priorityRiskIds),
    targetedExtensions: stableOwaspOrder(targetedExtensions),
    routeFitSummary: {
      palo: owaspGenAiCrosswalk.routes.find((route) => route.routeId === "palo").counts,
      paloAm: owaspGenAiCrosswalk.routes.find((route) => route.routeId === "palo-am").counts,
      paloAi: owaspGenAiCrosswalk.routes.find((route) => route.routeId === "palo-ai").counts,
      union: { direct: owaspGenAiCrosswalk.summary.unionDirect, supporting: owaspGenAiCrosswalk.summary.unionSupporting }
    },
    referenceHref: "PALO_OWASPGenAI2026.html",
    pairingGuidance: agentic
      ? "Pair the LLM profile with the OWASP Agentic Top 10 and PALO-AM/PALO-AI. The Agentic Top 10 source is not present in this repository."
      : "Use this profile for the model-as-component boundary and reassess it if tools, delegation, persistent memory, or autonomous action are introduced.",
    authorityBoundary: "Human review required. All ten risks remain in scope; priority risks are architecture triage only. PALO does not establish implementation effectiveness, compliance, certification, OWASP endorsement, or production authorization."
  };
}

export class PaloGuideAgent {
  explainFramework({ query, audience = "general", limit = 6 } = {}) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) throw new Error("A question or topic is required");
    const queryTokens = tokens(cleanQuery);
    const audienceTokens = tokens(audience);
    const matches = semanticSpine.nodes
      .map((node) => ({ node, score: nodeScore(node, queryTokens, audienceTokens) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || stageOrder.indexOf(left.node.phaseId) - stageOrder.indexOf(right.node.phaseId))
      .slice(0, Math.max(1, Math.min(Number(limit) || 6, 12)))
      .map(({ node, score }) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        phaseId: node.phaseId,
        relevance: score,
        explanation: node.role || node.action || node.properties?.["Core question"],
        expectedArtifacts: node.outputs || [],
        href: publicHref(node.href),
        semanticId: node.semanticId,
        evidenceClass: node.evidenceClass,
        authorityBoundary: node.authorityBoundary
      }));

    return {
      format: "palo-guide-explanation",
      schemaVersion: "1.0.0",
      frameworkRelease: "3.0.1",
      semanticVersion: semanticSpine.semanticVersion,
      query: cleanQuery,
      audience,
      answerBoundary: "Source-grounded orientation over released PALO definitions. No legal conclusion, certification, case approval or deployment authorization is produced.",
      canonicalLoop: stageOrder.map(stageRecord),
      matches,
      sourceRegistry: {
        status: sourceRegistry.status,
        updatedAt: sourceRegistry.updatedAt,
        reminder: sourceRegistry.disclaimer
      }
    };
  }

  inferRoute({ useCase, role = "general", objectives = [], systemType = "ai-system", currentState = "idea", signals = {} } = {}) {
    const cleanUseCase = String(useCase || "").trim();
    if (cleanUseCase.length < 3) throw new Error("Describe the AI use case in at least 3 characters");
    const scores = new Map(stageOrder.map((stageId) => [stageId, 0]));
    const reasons = new Map(stageOrder.map((stageId) => [stageId, []]));
    const combined = normalize([cleanUseCase, role, objectives, systemType].join(" "));
    const owaspGenAi2026 = buildOwaspGenAiProfile({ cleanUseCase, systemType, signals, combined });

    addStageScore(scores, reasons, "frame", 18, "Every route starts with an explicit purpose, owner, affected people and operating boundary.");
    addStageScore(scores, reasons, "classify", 16, "The initial risk and obligation route must be recorded before controls are selected.");
    if (/risk|regulat|legal|classif|high impact|public|health|credit|employment|insurance/.test(combined) || signals.regulatedOrPublic || signals.highImpact) {
      addStageScore(scores, reasons, "classify", 24, "The context signals material regulatory, public-sector or impact classification questions.");
      addStageScore(scores, reasons, "assess", 18, "Potentially affected rights and people need a proportionate impact review.");
    }
    if (/agent|autonom|tool|workflow|delegat|action/.test(combined) || signals.systemCanAct) {
      addStageScore(scores, reasons, "assess", 30, "The system can use tools or take delegated actions, so identity, authority, autonomy and oversight must be bounded.");
      addStageScore(scores, reasons, "control", 26, "Delegated action needs owned technical and human controls before execution.");
      addStageScore(scores, reasons, "prove", 14, "Authorization and actual outcome evidence must remain separate and reviewable.");
    }
    if (/code|develop|software|copilot|vibe/.test(combined) || signals.aiAssistedDevelopment) {
      addStageScore(scores, reasons, "control", 24, "AI-assisted delivery needs a pre-tool control path and evidence of the development boundary.");
    }
    if (/metric|kpi|kri|monitor|drift|operate|production/.test(combined) || signals.needsMetrics || ["pilot", "production", "incident", "review"].includes(currentState)) {
      addStageScore(scores, reasons, "measure", 26, "The case needs observable indicators, thresholds, ownership and review cadence.");
    }
    if (/evidence|audit|board|review|dossier|prove/.test(combined) || signals.needsEvidence || ["production", "incident", "review"].includes(currentState)) {
      addStageScore(scores, reasons, "prove", 28, "The decision must be reconstructable from versioned evidence, exceptions and source status.");
    }
    if (currentState === "incident") {
      addStageScore(scores, reasons, "control", 20, "An incident requires containment, escalation and compensating-action controls.");
      addStageScore(scores, reasons, "measure", 24, "Incident signals and triage timing need to be measured.");
      addStageScore(scores, reasons, "prove", 30, "The incident, response and reopening decision require an accountable evidence record.");
    }
    if (signals.uncertainScope) {
      addStageScore(scores, reasons, "frame", 20, "Uncertain scope should be resolved before downstream governance choices are treated as stable.");
      addStageScore(scores, reasons, "classify", 12, "Unknown applicability must remain an explicit open review question.");
    }
    if (owaspGenAi2026.applicable) {
      addStageScore(scores, reasons, "control", 24, "The OWASP GenAI 2026 lens requires owned model, retrieval, output-sink and authority-boundary safeguards, including external technical controls where PALO is supporting-only.");
      addStageScore(scores, reasons, "prove", 26, "All ten OWASP LLM risks, architecture priorities, source pin, test status and unresolved LLM09 or LLM10 extensions must remain reviewable evidence.");
    }

    const selected = stageOrder
      .map((stageId) => ({ stageId, score: scores.get(stageId) || 0 }))
      .filter((item) => item.score >= 18)
      .sort((left, right) => right.score - left.score || stageOrder.indexOf(left.stageId) - stageOrder.indexOf(right.stageId))
      .slice(0, 4)
      .sort((left, right) => stageOrder.indexOf(left.stageId) - stageOrder.indexOf(right.stageId));
    const protectedStages = new Set(owaspGenAi2026.applicable ? ["control", "prove"] : ["prove"]);
    const ensureSelected = (stageId) => {
      if (selected.some((item) => item.stageId === stageId)) return;
      if (selected.length === 4) {
        const removable = selected
          .filter((item) => !protectedStages.has(item.stageId))
          .sort((left, right) => left.score - right.score || stageOrder.indexOf(right.stageId) - stageOrder.indexOf(left.stageId))[0];
        selected.splice(removable ? selected.indexOf(removable) : selected.length - 1, 1);
      }
      selected.push({ stageId, score: scores.get(stageId) || 18 });
    };
    if (owaspGenAi2026.applicable) {
      ensureSelected("control");
      ensureSelected("prove");
    } else if (signals.systemCanAct || signals.needsEvidence || ["production", "incident", "review"].includes(currentState)) {
      ensureSelected("prove");
    }
    selected.sort((left, right) => stageOrder.indexOf(left.stageId) - stageOrder.indexOf(right.stageId));

    const actionImpact = signals.actionImpact || (signals.systemCanAct ? "reversible-write" : "guidance-only");
    const recommendedIntegrationClass = integrationClass({ systemCanAct: Boolean(signals.systemCanAct), actionImpact, currentState });
    return {
      format: "palo-governance-route-inference",
      schemaVersion: "1.0.0",
      frameworkRelease: "3.0.1",
      semanticVersion: semanticSpine.semanticVersion,
      input: { useCase: cleanUseCase, role, objectives, systemType, currentState, signals: { ...signals, actionImpact } },
      inferenceMethod: "Deterministic signal-to-phase rules over released PALO semantic, gate, control and indicator registries, with the version-pinned OWASP GenAI 2026 crosswalk when applicable.",
      route: selected.map(({ stageId, score }, index) => ({
        position: index + 1,
        score,
        reasons: reasons.get(stageId),
        ...stageRecord(stageId)
      })),
      integration: {
        class: recommendedIntegrationClass,
        explanation: classExplanation(recommendedIntegrationClass),
        nextTool: "palo_plan_product_integration"
      },
      owaspGenAi2026,
      openQuestions: [
        !signals.accountableOwner ? "Who owns the case and can accept, condition, hold, redesign or stop it?" : null,
        signals.systemCanAct && !signals.humanReviewDefined ? "Which actions require human review, and can the reviewer actually pause or change the outcome?" : null,
        signals.highImpact && !signals.officialSourcesReviewed ? "Which current official sources establish applicability for this context?" : null,
        owaspGenAi2026.applicable && (!signals.adversarialTestingEstablished || !signals.architectureSecurityTestingEstablished) ? "What adaptive adversarial, retrieval, output-sink and authority-boundary security testing is established, and where are the results retained?" : null,
        !signals.evidenceLocationDefined ? "Where will versioned evidence, exceptions and review decisions be retained?" : null
      ].filter(Boolean),
      authorityBoundary: "This route is an explainable starting hypothesis. Accountable people must validate applicability, controls, evidence and the decision to proceed.",
      disclaimer: decisionGates.disclaimer
    };
  }

  planIntegration({ product, productCategory = "business-app", deployment = "local", transport = "auto", systemCanAct = false, actionImpact = "guidance-only" } = {}) {
    const cleanProduct = String(product || "").trim();
    if (!cleanProduct) throw new Error("A product or integration surface is required");
    const selectedClass = integrationClass({ systemCanAct: Boolean(systemCanAct), actionImpact, currentState: deployment === "production" ? "production" : "pilot" });
    const selectedTransport = transport !== "auto" ? transport : deployment === "local" ? "stdio" : "streamable-http";
    const guideTools = ["palo_explain_framework", "palo_infer_governance_route", "palo_plan_product_integration"];
    const protectedActionTools = selectedClass === "guidance-only" ? [] : ["palo_verify_action_authority", ...(selectedClass.includes("governed-executor") ? ["palo_execute_governed_action", "palo_get_execution_status"] : [])];
    const config = selectedTransport === "stdio"
      ? { command: "node", args: ["/absolute/path/to/PALO/packages/palo-mcp-server/index.js"], environment: { PALO_DATA_DIR: "/private/path/palo-runtime" } }
      : { url: "https://governance.example.org/mcp", headers: { Authorization: "Bearer <secret-from-your-secret-manager>" } };
    return {
      format: "palo-product-integration-plan",
      schemaVersion: "1.0.0",
      frameworkRelease: "3.0.1",
      product: cleanProduct,
      productCategory,
      deployment,
      integrationClass: selectedClass,
      integrationClassExplanation: classExplanation(selectedClass),
      transport: selectedTransport,
      architecture: [
        `${cleanProduct} MCP client`,
        "PALO guide tools (read-only inference)",
        "Released semantic spine, decision gates, control and indicator registries",
        ...(protectedActionTools.length ? ["PALO Action Claim and policy decision", "PALO-owned executor and outcome verifier"] : []),
        "Accountable human review and evidence record"
      ],
      exposedTools: [...guideTools, ...protectedActionTools],
      implementationSteps: [
        "Connect the product MCP client using the selected transport and an explicit least-privilege tool allowlist.",
        "Call palo_infer_governance_route with the use case and explicit signals; present its reasons and authority boundary to the user.",
        "Let the user confirm or correct the inferred route before creating or changing case state.",
        ...(selectedClass === "guidance-only" ? [] : ["Map every proposed tool call to a canonical Action Claim and fail closed on missing, malformed, unavailable or denied decisions."]),
        ...(selectedClass.includes("governed-executor") ? ["Keep the target credential behind the PALO-owned executor and verify the post-state separately from authorization."] : []),
        "Retain version, source status, user corrections, outputs and unresolved questions in the evidence record."
      ],
      exampleClientConfig: config,
      trustBoundaries: [
        "MCP transport authentication is not case approval or reviewer identity.",
        "The guide tools provide deterministic orientation and must not receive production secrets or raw sensitive records.",
        "The current PALO-AI runtime remains a developer preview and is not an audited production authorization boundary.",
        selectedClass === "advisory-gate" ? "An advisory gate remains bypassable if the product can still call the target tool directly." : null,
        selectedClass.includes("governed-executor") ? "Target credentials must not be exposed through a parallel ungoverned route." : null
      ].filter(Boolean),
      references: [
        "docs/palo-guide-agent-and-mcp.md",
        "docs/palo-ai-governance-integration-guide.md",
        "docs/palo-ai-vps-deployment.md",
        "PALO_AIProductionReadiness.html"
      ]
    };
  }
}

export const paloGuideAgent = new PaloGuideAgent();
