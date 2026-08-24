import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const semanticVersion = "3.1.0";
const releaseDate = "2026-08-23";
const namespace = "https://paloframework.org/semantic/";
const mappingPath = "data/semantic-mappings.json";
const manifestPath = "data/semantic-release-manifest.json";

const loadJson = async (file) => JSON.parse(await readFile(path.join(projectRoot, file), "utf8"));
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const semanticRef = (type, id, version) => ({ entityType: type, entityId: id, semanticId: `${namespace}${type}/${id}?v=${version}`, version });
const clean = (value) => value.replace(/[^a-z0-9-]+/g, "-");

function mappingRecord(mappingType, source, target, coverageType, generatedFrom, rationale, conditions = []) {
  return {
    mappingId: `${namespace}mapping/${mappingType}/${clean(source.entityId)}/${clean(target.entityId)}`,
    mappingVersion: "1.0.0",
    mappingType,
    source,
    target,
    coverageType,
    conditions,
    rationale,
    basis: `Declared relationship in ${generatedFrom}; no legal-equivalence or compliance claim is created.`,
    approval: {
      status: "approved",
      scope: "PALO framework publication only; not a legal applicability or certification decision.",
      decidedAt: "2026-08-23T08:00:00Z",
      decidedBy: "PALO framework release process",
    },
    validFrom: "2026-08-23T00:00:00Z",
    provenance: { generatedFrom, generationRule: `${mappingType}: one immutable source-target pair per declared ID reference.` },
  };
}

async function generateMappings() {
  const [controls, indicators, gates] = await Promise.all([loadJson("data/control-library.json"), loadJson("data/kpi-kri-registry.json"), loadJson("data/decision-gates.json")]);
  const records = [];
  for (const control of controls.controls) {
    const source = semanticRef("control", control.controlId, semanticVersion);
    for (const id of control.sourceIds) records.push(mappingRecord("control-to-source", source, semanticRef("source", id, "1.0.0"), "supporting", "data/control-library.json", "The registered source informs the control objective and tailoring context."));
    for (const id of control.indicatorIds) records.push(mappingRecord("control-to-indicator", source, semanticRef("indicator", id, semanticVersion), "supporting", "data/control-library.json", "The indicator can provide a signal about the control without proving control effectiveness."));
    for (const id of control.lifecycleGates) records.push(mappingRecord("control-to-gate", source, semanticRef("gate", id, semanticVersion), "conditional", "data/control-library.json", "The control is relevant to the named gate when the case scope activates it.", ["Confirm applicability and ownership for the actual case."]));
  }
  for (const indicator of indicators.indicators) {
    const source = semanticRef("indicator", indicator.indicatorId, semanticVersion);
    for (const id of indicator.sourceIds) records.push(mappingRecord("indicator-to-source", source, semanticRef("source", id, "1.0.0"), "supporting", "data/kpi-kri-registry.json", "The source informs the indicator definition; the published threshold remains illustrative."));
    for (const id of indicator.gateIds) records.push(mappingRecord("indicator-to-gate", source, semanticRef("gate", id, semanticVersion), "supporting", "data/kpi-kri-registry.json", "The indicator can inform the named gate but cannot make the gate decision."));
  }
  for (const gate of gates.gates) {
    const source = semanticRef("gate", gate.gateId, semanticVersion);
    for (const id of gate.sourceIds) records.push(mappingRecord("gate-to-source", source, semanticRef("source", id, "1.0.0"), "supporting", "data/decision-gates.json", "The source provides context for accountable gate deliberation."));
  }
  records.sort((a, b) => a.mappingId.localeCompare(b.mappingId));
  return {
    format: "palo-semantic-mapping-registry",
    schemaVersion: "1.0.0",
    semanticVersion,
    releasedAt: releaseDate,
    status: "approved-for-release",
    authorityBoundary: "Mappings express versioned PALO relationships and rationale. They do not establish legal equivalence, compliance, certification, or deployment authorization.",
    mappings: records,
  };
}

const releaseItems = [
  ["semantic-spine", "data/semantic-spine.json", "canonical-catalog", "schemas/palo-semantic-spine.schema.json"],
  ["lifecycle-core", "data/lifecycle-core.json", "lifecycle-definition", "schemas/palo-lifecycle-definition.schema.json"],
  ["control-library", "data/control-library.json", "control-registry", "schemas/palo-control-library.schema.json"],
  ["indicator-registry", "data/kpi-kri-registry.json", "indicator-registry", "schemas/palo-kpi-kri-registry.schema.json"],
  ["decision-gates", "data/decision-gates.json", "gate-registry", "schemas/palo-decision-gates.schema.json"],
  ["source-registry", "data/source-registry.json", "source-registry", "schemas/palo-source-registry.schema.json"],
  ["governance-control-packs", "data/governance-control-packs.json", "control-pack-registry", "schemas/palo-governance-control-packs.schema.json"],
  ["semantic-mappings", mappingPath, "mapping-registry", "schemas/palo-semantic-mapping-registry.schema.json"],
  ["semantic-invariants", "data/semantic-invariants.json", "invariant-registry", null],
  ["semantic-context", "data/palo-semantic-context.jsonld", "json-ld-context", null],
  ["palo-ontology-v3", "formal/palo-ontology-v3.ttl", "ontology", null],
  ["palo-shacl-v3", "formal/palo-ontology-v3.shacl.ttl", "constraint-profile", null],
  ["semantic-change-impact-v3", "data/semantic-change-impact-v3.json", "change-impact", "schemas/palo-semantic-change-impact.schema.json"],
  ["semantic-spine-schema", "schemas/palo-semantic-spine.schema.json", "schema", null],
  ["lifecycle-definition-schema", "schemas/palo-lifecycle-definition.schema.json", "schema", null],
  ["semantic-mapping-schema", "schemas/palo-semantic-mapping-registry.schema.json", "schema", null],
  ["semantic-release-schema", "schemas/palo-semantic-release-manifest.schema.json", "schema", null],
  ["semantic-change-impact-schema", "schemas/palo-semantic-change-impact.schema.json", "schema", null],
  ["gate-instance-schema", "schemas/palo-gate-instance.schema.json", "schema", null],
  ["gate-decision-schema", "schemas/palo-gate-decision-record.schema.json", "schema", null],
  ["evidence-artifact-schema", "schemas/palo-evidence-artifact.schema.json", "schema", null],
  ["evidence-claim-schema", "schemas/palo-evidence-claim.schema.json", "schema", null],
  ["evidence-evaluation-schema", "schemas/palo-evidence-evaluation.schema.json", "schema", null],
  ["evidence-bundle-manifest-schema", "schemas/palo-evidence-bundle-manifest.schema.json", "schema", null],
  ["governance-control-packs-schema", "schemas/palo-governance-control-packs.schema.json", "schema", null],
  ["governance-assurance-record-schema", "schemas/palo-governance-assurance-record.schema.json", "schema", null],
  ["system-card-schema", "schemas/palo-system-card.schema.json", "schema", null],
  ["affected-person-case-schema", "schemas/palo-affected-person-case.schema.json", "schema", null],
  ["article50-transparency-record-schema", "schemas/palo-article50-transparency-record.schema.json", "schema", null],
  ["data-lineage-record-schema", "schemas/palo-data-lineage-record.schema.json", "schema", null],
  ["gpai-systemic-risk-record-schema", "schemas/palo-gpai-systemic-risk-record.schema.json", "schema", null],
  ["serious-incident-record-schema", "schemas/palo-serious-incident-record.schema.json", "schema", null],
  ["decommission-record-schema", "schemas/palo-decommission-record.schema.json", "schema", null],
  ["aims-overlay-record-schema", "schemas/palo-aims-overlay-record.schema.json", "schema", null],
  ["production-profile-schema", "schemas/palo-production-profile.schema.json", "schema", null],
];

async function generateManifest(mappingContent) {
  const items = [];
  for (const [id, file, role, schemaPath] of releaseItems) {
    const content = file === mappingPath ? mappingContent : await readFile(path.join(projectRoot, file));
    items.push({
      itemId: `${namespace}release-item/${id}`,
      path: file,
      role,
      ...(schemaPath ? { schemaPath } : {}),
      semanticVersion,
      status: role === "schema" ? "compatibility-contract" : "approved-for-release",
      sha256: sha256(content),
    });
  }
  const unsigned = {
    format: "palo-semantic-release-manifest",
    schemaVersion: "1.0.0",
    releaseId: `${namespace}release/${semanticVersion}`,
    semanticVersion,
    releasedAt: releaseDate,
    status: "approved-for-release",
    digestAlgorithm: "sha256",
    items,
    authorityBoundary: "This manifest freezes the exact semantic and governance-control artifacts used by PALO v3.1. It proves file identity, not legal applicability, compliance, certification, operating effectiveness, or production authorization.",
  };
  return { ...unsigned, manifestDigest: `sha256:${sha256(JSON.stringify(unsigned))}` };
}

const mappings = await generateMappings();
const mappingContent = serialize(mappings);
const manifestContent = serialize(await generateManifest(mappingContent));
if (check) {
  const actualMappings = await readFile(path.join(projectRoot, mappingPath), "utf8");
  const actualManifest = await readFile(path.join(projectRoot, manifestPath), "utf8");
  if (actualMappings !== mappingContent) throw new Error("Semantic mapping registry is stale. Run npm run semantic:release.");
  if (actualManifest !== manifestContent) throw new Error("Semantic release manifest is stale or a pinned artifact changed. Run npm run semantic:release.");
  console.log(`Semantic release exactness passed (${mappings.mappings.length} atomic mappings, ${releaseItems.length} digest-bound items).`);
} else {
  await writeFile(path.join(projectRoot, mappingPath), mappingContent);
  await writeFile(path.join(projectRoot, manifestPath), manifestContent);
  console.log(`Generated semantic release (${mappings.mappings.length} atomic mappings, ${releaseItems.length} digest-bound items).`);
}
