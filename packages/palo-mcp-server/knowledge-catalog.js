export const PALO_KNOWLEDGE_CANONICAL_FILES = Object.freeze([
  { sourceId: "semantic-spine", path: "data/semantic-spine.json", collection: "nodes", id: "id", title: "label", recordType: "semantic-node", authorityClass: "canonical-definition" },
  { sourceId: "decision-gates", path: "data/decision-gates.json", collection: "gates", id: "gateId", title: "label", recordType: "decision-gate", authorityClass: "canonical-definition" },
  { sourceId: "control-library", path: "data/control-library.json", collection: "controls", id: "controlId", title: "title", recordType: "control", authorityClass: "canonical-definition" },
  { sourceId: "indicator-registry", path: "data/kpi-kri-registry.json", collection: "indicators", id: "indicatorId", title: "name", recordType: "indicator", authorityClass: "canonical-definition" },
  { sourceId: "source-registry", path: "data/source-registry.json", collection: "sources", id: "sourceId", title: "title", recordType: "source", authorityClass: "source-backed-context" },
  { sourceId: "governance-control-packs", path: "data/governance-control-packs.json", collection: "domains", id: "domainId", title: "title", recordType: "control-pack", authorityClass: "canonical-definition" },
  { sourceId: "owasp-genai-2026-crosswalk", path: "data/owasp-genai-2026-crosswalk.json", collection: "risks", id: "riskId", title: "title", recordType: "security-crosswalk", authorityClass: "source-backed-context" }
]);
