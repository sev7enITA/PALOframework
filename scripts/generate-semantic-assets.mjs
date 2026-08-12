import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spinePath = path.join(projectRoot, "data/semantic-spine.json");
const graphPath = path.join(projectRoot, "designs/theory-to-practice-infographic/assets/graph-data.js");
const lifecyclePath = path.join(projectRoot, "data/lifecycle-core.json");
const bootstrap = process.argv.includes("--bootstrap");
const check = process.argv.includes("--check");
const namespace = "https://paloframework.org/semantic/";
const semanticVersion = "3.0.0";
const releaseDate = "2026-08-12";

const sourceRefsByNode = {
  "model-canvas": ["src-nist-ai-rmf"],
  "agency-map": ["src-oecd-ai-principles"],
  "tech-trends": ["src-nist-ai-rmf"],
  "risk-tiering": ["src-eu-ai-act"],
  comparison: ["src-nist-ai-rmf", "src-iso-42001"],
  "reg-watch": ["src-eu-ai-act"],
  fria: ["src-eu-ai-act"],
  "palo-am": ["src-nist-ai-rmf", "src-iso-42001"],
  "assessment-path": ["src-nist-ai-rmf"],
  vibe: ["src-nist-genai-profile", "src-owasp-llm-top10"],
  auditbench: ["src-nist-genai-profile"],
  poisoning: ["src-nist-ai-rmf"],
  kpi: ["src-nist-ai-rmf", "src-iso-42001"],
  "official-sources": ["src-eu-ai-act", "src-nist-ai-rmf", "src-iso-42001", "src-oecd-ai-principles"],
  "nav-tier": ["src-eu-ai-act"],
  "nav-fria": ["src-eu-ai-act"],
  "nav-monitor": ["src-eu-ai-act"],
};

function evidenceClassFor(node) {
  if (node.id === "nav-monitor") return "human-review-required";
  if (node.type === "source" || node.status === "Reviewed source" || node.status === "Reference") return "source-backed-context";
  if (node.status === "Foundation") return "illustrative-local-preview";
  return "canonical-definition";
}

function authorityBoundaryFor(node, evidenceClass) {
  if (evidenceClass === "human-review-required") return "Non-authoritative monitoring input; an accountable reviewer must verify the primary source and materiality.";
  if (evidenceClass === "source-backed-context") return "Source-backed context informs governance work but does not independently determine legal applicability, compliance, or deployment authorization.";
  if (evidenceClass === "illustrative-local-preview") return "Illustrative local foundation; it is not production state, approval evidence, or an authorization boundary.";
  return "Canonical PALO framework definition; it structures governance but does not create legal obligations or authorize deployment.";
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function enrichGraph(graph) {
  const nodes = graph.nodes.map((node) => {
    const evidenceClass = evidenceClassFor(node);
    return {
      ...node,
      semanticId: `${namespace}${node.type}/${node.id}`,
      definitionVersion: semanticVersion,
      evidenceClass,
      authorityBoundary: authorityBoundaryFor(node, evidenceClass),
      sourceRefs: sourceRefsByNode[node.id] || [],
      lastReviewed: releaseDate,
    };
  });
  const seen = new Map();
  const links = graph.links.map((link) => {
    const base = slug(`${link.source}-${link.verb}-${link.target}`);
    const occurrence = (seen.get(base) || 0) + 1;
    seen.set(base, occurrence);
    return {
      ...link,
      semanticId: `${namespace}relationship/${base}${occurrence > 1 ? `-${occurrence}` : ""}`,
      relationshipVersion: "1.0.0",
      mappingBasis: link.relationType === "navigation" ? "stakeholder-intent-route" : link.relationType === "context" || link.relationType === "support" ? "phase-support-assignment" : "canonical-lifecycle-flow",
    };
  });
  return {
    format: "palo-semantic-spine",
    schemaVersion: "1.0.0",
    semanticVersion,
    namespace,
    releasedAt: releaseDate,
    status: "approved-for-release",
    authorityClasses: {
      "canonical-definition": { label: "Canonical definition", meaning: "A versioned PALO framework definition.", authoritative: true },
      "source-backed-context": { label: "Source-backed context", meaning: "Context traceable to registered sources; applicability still requires accountable review.", authoritative: false },
      "illustrative-local-preview": { label: "Illustrative local preview", meaning: "Demonstration or foundation data that is not operational evidence.", authoritative: false },
      "human-review-required": { label: "Human review required", meaning: "A non-authoritative signal that cannot change governance state without accountable review.", authoritative: false },
    },
    workspaces: [
      { workspaceId: "public-catalog", label: "Public semantic catalog", purpose: "Explore versioned PALO definitions, relations and source boundaries.", authorityBoundary: "Read-only framework orientation; no case decision is made here." },
      { workspaceId: "case-workspace", label: "Case workspace", purpose: "Apply released definitions to a local governance case.", authorityBoundary: "Case state remains local and does not amend canonical framework definitions." },
      { workspaceId: "assurance-review", label: "Assurance review", purpose: "Review evidence, conditions, incidents and decision history.", authorityBoundary: "Review records accountability; it does not create legal conclusions or technical authority by implication." },
    ],
    nodes,
    links,
    stageIds: graph.stages.map((node) => node.id),
    navigationIds: graph.navigation.map((node) => node.id),
    weights: graph.weights,
  };
}

function graphProjection(spine) {
  const ids = new Set(spine.nodes.map((node) => node.id));
  return {
    format: spine.format,
    schemaVersion: spine.schemaVersion,
    semanticVersion: spine.semanticVersion,
    namespace: spine.namespace,
    releasedAt: spine.releasedAt,
    status: spine.status,
    authorityClasses: spine.authorityClasses,
    workspaces: spine.workspaces,
    nodes: spine.nodes,
    links: spine.links,
    stages: spine.stageIds.map((id) => spine.nodes.find((node) => node.id === id)).filter(Boolean),
    navigation: spine.navigationIds.map((id) => spine.nodes.find((node) => node.id === id)).filter(Boolean),
    weights: spine.weights,
    integrity: {
      nodeIdsUnique: ids.size === spine.nodes.length,
      linksResolved: spine.links.every((link) => ids.has(link.source) && ids.has(link.target)),
      generatedFrom: "data/semantic-spine.json",
    },
  };
}

function serializeProjection(spine) {
  return `/* Generated by scripts/generate-semantic-assets.mjs from data/semantic-spine.json. Do not edit manually. */\n(function () {\n  "use strict";\n  window.PALO_GRAPH_DATA = ${JSON.stringify(graphProjection(spine), null, 2)};\n}());\n`;
}

function lifecycleProjection(spine, gateRegistry) {
  const stageById = new Map(spine.nodes.filter((node) => node.type === "stage").map((node) => [node.id, node]));
  return {
    format: "palo-lifecycle-definition",
    schemaVersion: "1.0.0",
    lifecycleId: `${spine.namespace}lifecycle/palo-core`,
    definitionVersion: spine.semanticVersion,
    label: "PALO Core Lifecycle",
    status: spine.status,
    releasedAt: spine.releasedAt,
    frameworkRef: `${spine.namespace}framework/palo`,
    phases: spine.stageIds.map((id, index) => {
      const stage = stageById.get(id);
      return {
        phaseDefinitionId: `phase-${id}`,
        semanticId: stage.semanticId,
        definitionVersion: stage.definitionVersion,
        ordinal: index + 1,
        label: stage.label,
        purpose: stage.role,
        gateDefinitionRef: `${spine.namespace}gate/${id}?v=${spine.semanticVersion}`,
      };
    }),
    gateDefinitions: gateRegistry.gates.map((gate) => ({
      gateDefinitionId: `${spine.namespace}gate/${gate.gateId}?v=${spine.semanticVersion}`,
      gateId: gate.gateId,
      definitionVersion: spine.semanticVersion,
      label: gate.label,
      purpose: gate.purpose,
      entryCriteria: gate.entryCriteria,
      decisionOptions: gate.decisionOptions,
      requiredControlIds: gate.requiredControlIds,
      indicatorIds: gate.indicatorIds,
      sourceIds: gate.sourceIds,
      templateIds: gate.templateIds,
    })),
    provenance: {
      generatedFrom: ["data/semantic-spine.json", "data/decision-gates.json"],
      authorityBoundary: "This versioned lifecycle structures accountable governance decisions; it does not itself determine legal applicability or authorize deployment.",
    },
  };
}

if (bootstrap) {
  const current = await readFile(graphPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(current, context);
  const spine = enrichGraph(context.window.PALO_GRAPH_DATA);
  await writeFile(spinePath, `${JSON.stringify(spine, null, 2)}\n`);
}

const spine = JSON.parse(await readFile(spinePath, "utf8"));
const gateRegistry = JSON.parse(await readFile(path.join(projectRoot, "data/decision-gates.json"), "utf8"));
const generated = serializeProjection(spine);
const lifecycleGenerated = `${JSON.stringify(lifecycleProjection(spine, gateRegistry), null, 2)}\n`;
if (check) {
  const actual = await readFile(graphPath, "utf8");
  if (actual !== generated) throw new Error("Semantic graph projection is stale. Run npm run semantic:generate.");
  const lifecycleActual = await readFile(lifecyclePath, "utf8");
  if (lifecycleActual !== lifecycleGenerated) throw new Error("Lifecycle projection is stale. Run npm run semantic:generate.");
  console.log(`Semantic projection exactness passed (${spine.nodes.length} nodes, ${spine.links.length} relationships, ${spine.stageIds.length} lifecycle phases).`);
} else {
  await writeFile(graphPath, generated);
  await writeFile(lifecyclePath, lifecycleGenerated);
  console.log(`Generated semantic projections (${spine.nodes.length} nodes, ${spine.links.length} relationships, ${spine.stageIds.length} lifecycle phases).`);
}
